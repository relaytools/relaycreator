import { PrismaClient } from '@prisma/client';
import { calculateTimeBasedBalance, getUserPlanHistory } from '../lib/planChangeTracking';

const prisma = new PrismaClient();

// Test environment variables
const STANDARD_PRICE = 1000;
const PREMIUM_PRICE = 2100;
const STANDARD_DAILY = STANDARD_PRICE / 30; // 33.33
const PREMIUM_DAILY = PREMIUM_PRICE / 30; // 70

describe('Client Balance Calculations', () => {
  let testRelayId: string;
  let testUserId: string;
  let testPubkey: string;

  beforeAll(() => {
    // Set test environment variables
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = STANDARD_PRICE.toString();
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = PREMIUM_PRICE.toString();
  });

  beforeEach(async () => {
    // Create test user with unique pubkey
    const user = await prisma.user.create({
      data: {
        pubkey: `test-pubkey-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: 'testuser'
      }
    });
    testUserId = user.id;
    testPubkey = user.pubkey;

    // Create test relay
    const relay = await prisma.relay.create({
      data: {
        id: `test-relay-${Date.now()}`,
        name: 'Test Relay',
        ownerId: testUserId,
        created_at: new Date('2024-01-01')
      }
    });
    testRelayId = relay.id;
  });

  afterEach(async () => {
    // Clean up only OUR test data in proper order
    try {
      if (testRelayId) {
        await prisma.planChange.deleteMany({
          where: { relayId: testRelayId }
        });
        await prisma.clientOrder.deleteMany({
          where: { relayId: testRelayId }
        });
        await prisma.order.deleteMany({
          where: { relayId: testRelayId }
        });
        await prisma.relayPlanChange.deleteMany({
          where: { relayId: testRelayId }
        });
        await prisma.relay.delete({
          where: { id: testRelayId }
        });
      }
      if (testUserId) {
        await prisma.user.delete({
          where: { id: testUserId }
        });
      }
    } catch (error) {
      // Ignore cleanup errors - records may already be deleted
      console.log('Cleanup error (ignored):', error instanceof Error ? error.message : String(error));
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Plan History Calculations', () => {
    test('should calculate correct daily costs using environment variables', async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      // Create standard plan change
      await prisma.planChange.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          plan_type: 'standard',
          amount_paid: 500, // Historical amount (should be ignored)
          started_at: startDate,
          ended_at: null
        }
      });

      const planHistory = await getUserPlanHistory(testRelayId, testPubkey);
      
      expect(planHistory).toHaveLength(1);
      expect(planHistory[0].daily_cost).toBeCloseTo(STANDARD_DAILY, 2);
      expect(planHistory[0].daily_cost).not.toBe(500 / 30); // Should NOT use historical amount
    });

    test('should calculate correct daily costs for premium plans', async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      // Create premium plan change
      await prisma.planChange.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          plan_type: 'premium',
          amount_paid: 1000, // Historical amount (should be ignored)
          started_at: startDate,
          ended_at: null
        }
      });

      const planHistory = await getUserPlanHistory(testRelayId, testPubkey);
      
      expect(planHistory).toHaveLength(1);
      expect(planHistory[0].daily_cost).toBeCloseTo(PREMIUM_DAILY, 2);
      expect(planHistory[0].daily_cost).not.toBe(1000 / 30); // Should NOT use historical amount
    });

    test('should calculate correct days in period', async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
      const endDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      await prisma.planChange.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          plan_type: 'standard',
          amount_paid: STANDARD_PRICE,
          started_at: startDate,
          ended_at: endDate
        }
      });

      const planHistory = await getUserPlanHistory(testRelayId, testPubkey);
      
      expect(planHistory).toHaveLength(1);
      expect(planHistory[0].days_in_period).toBeCloseTo(10, 1); // 10 days between start and end
    });
  });

  describe('Balance Calculations with Plan History', () => {
    test('should calculate correct balance for single standard plan', async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      // Create the plan change record
      await prisma.planChange.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          plan_type: 'standard',
          amount_paid: 0, // This field is ignored in balance calculations
          started_at: startDate,
          ended_at: null
        }
      });

      // Create the actual payment record (source of truth)
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: STANDARD_PRICE,
          order_type: 'standard',
          paid: true,
          paid_at: startDate,
          payment_hash: 'test_hash_1',
          lnurl: 'test_lnurl_1'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      const expectedCost = 10 * STANDARD_DAILY;
      const expectedBalance = STANDARD_PRICE - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
    });

    test('should calculate correct balance for multiple plan periods', async () => {
      const now = new Date();
      const start1 = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago
      const end1 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const start2 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      // First period: standard for 10 days
      await prisma.planChange.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          plan_type: 'standard',
          amount_paid: 0, // Ignored in balance calculations
          started_at: start1,
          ended_at: end1
        }
      });

      // Second period: premium for 10 days
      await prisma.planChange.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          plan_type: 'premium',
          amount_paid: 0, // Ignored in balance calculations
          started_at: start2,
          ended_at: null
        }
      });

      // Create payment records (source of truth)
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: STANDARD_PRICE,
          order_type: 'standard',
          paid: true,
          paid_at: start1,
          payment_hash: 'test_hash_2',
          lnurl: 'test_lnurl_2'
        }
      });

      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: PREMIUM_PRICE,
          order_type: 'premium',
          paid: true,
          paid_at: start2,
          payment_hash: 'test_hash_3',
          lnurl: 'test_lnurl_3'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      // FIXED: Calculate cost from first payment date (20 days ago) to now
      // using current plan pricing (premium, since most recent order is premium)
      const totalPaid = STANDARD_PRICE + PREMIUM_PRICE; // 3100 sats
      const daysSinceFirstPayment = 20; // First payment was 20 days ago
      const currentPlanCost = daysSinceFirstPayment * PREMIUM_DAILY; // 20 days × 70 sats/day = 1400 sats
      const expectedBalance = totalPaid - currentPlanCost; // 3100 - 1400 = 1700 sats
      
      expect(balance).toBeCloseTo(expectedBalance, 1);
    });

    test('should handle negative balances correctly', async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

      await prisma.planChange.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          plan_type: 'standard',
          amount_paid: 0, // Ignored in balance calculations
          started_at: startDate,
          ended_at: null
        }
      });

      // Create payment record (source of truth)
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: STANDARD_PRICE,
          order_type: 'standard',
          paid: true,
          paid_at: startDate,
          payment_hash: 'test_hash_4',
          lnurl: 'test_lnurl_4'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      const expectedCost = 60 * STANDARD_DAILY;
      const expectedBalance = STANDARD_PRICE - expectedCost; // Should be negative
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
      expect(balance).toBeLessThan(0);
    });
  });

  describe('Fallback Calculations (No Plan History)', () => {
    test('should return 0 for clients who never paid', async () => {
      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      expect(balance).toBe(0);
    });

    test('should calculate correct balance with daily cost logic', async () => {
      const now = new Date();
      const paymentDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

      // Create client order (standard plan)
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: STANDARD_PRICE,
          order_type: 'standard',
          paid: true,
          paid_at: paymentDate,
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      // Charge for ALL days since payment (45 days)
      const totalDays = 45;
      const expectedCost = totalDays * STANDARD_DAILY;
      const expectedBalance = STANDARD_PRICE - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
    });

    test('should handle multiple payments with daily cost logic', async () => {
      const now = new Date();
      const payment1Date = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000); // 50 days ago
      const payment2Date = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago

      // First payment: standard
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: STANDARD_PRICE,
          order_type: 'standard',
          paid: true,
          paid_at: payment1Date,
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1'
        }
      });

      // Second payment: custom (half price)
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: STANDARD_PRICE / 2,
          order_type: 'custom',
          paid: true,
          paid_at: payment2Date,
          payment_hash: 'test-hash-2',
          lnurl: 'test-lnurl-2'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      const totalPaid = STANDARD_PRICE + (STANDARD_PRICE / 2);
      // Charge for ALL days since first payment (50 days)
      // Since there's a standard plan order, use standard pricing
      const totalDays = 50;
      const expectedCost = totalDays * STANDARD_DAILY;
      const expectedBalance = totalPaid - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
    });

    test('should handle premium plan pricing correctly', async () => {
      const now = new Date();
      const standardDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      const premiumDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago

      // First: standard payment
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: STANDARD_PRICE,
          order_type: 'standard',
          paid: true,
          paid_at: standardDate,
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1'
        }
      });

      // Second: premium payment (upgrades to premium pricing)
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: PREMIUM_PRICE,
          order_type: 'premium',
          paid: true,
          paid_at: premiumDate,
          payment_hash: 'test-hash-2',
          lnurl: 'test-lnurl-2'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      const totalPaid = STANDARD_PRICE + PREMIUM_PRICE;
      // Charge for ALL days since first payment (40 days)
      // Since most recent plan order is premium, use premium pricing
      const totalDays = 40;
      const expectedCost = totalDays * PREMIUM_DAILY;
      const expectedBalance = totalPaid - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
      expect(balance).toBeGreaterThan(0); // Should be positive (overpaid)
    });

    test('should handle orders without payment dates', async () => {
      // Create order without payment date
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: STANDARD_PRICE,
          order_type: 'standard',
          paid: true,
          paid_at: null, // No payment date
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      expect(balance).toBe(0); // Should return 0 when no payment dates
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle zero amount payments', async () => {
      const now = new Date();
      const paymentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: 0,
          order_type: 'custom',
          paid: true,
          paid_at: paymentDate,
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      // Zero payment gives zero coverage, so all 10 days are uncovered
      const expectedCost = 10 * STANDARD_DAILY;
      const expectedBalance = 0 - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
      expect(balance).toBeLessThan(0);
    });

    test('should handle very large time periods', async () => {
      const now = new Date();
      const paymentDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: STANDARD_PRICE,
          order_type: 'standard',
          paid: true,
          paid_at: paymentDate,
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      // Charge for ALL days since payment (365 days)
      const totalDays = 365;
      const expectedCost = totalDays * STANDARD_DAILY;
      const expectedBalance = STANDARD_PRICE - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
      expect(balance).toBeLessThan(0); // Should be very negative
    });

    test('should handle custom payments with no plan orders', async () => {
      const now = new Date();
      const paymentDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

      // Only custom payment, no standard/premium orders
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: 500,
          order_type: 'custom',
          paid: true,
          paid_at: paymentDate,
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      // Charge for ALL days since payment (20 days)
      // Since no plan orders exist, defaults to standard pricing
      const totalDays = 20;
      const expectedCost = totalDays * STANDARD_DAILY;
      const expectedBalance = 500 - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
    });
  });

  describe('Environment Variable Integration', () => {
    test('should use environment variables for pricing', async () => {
      // Temporarily change environment variables
      const originalStandard = process.env.NEXT_PUBLIC_INVOICE_AMOUNT;
      const originalPremium = process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT;
      
      process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '2000';
      process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '4000';

      const now = new Date();
      const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      // Create actual payment record (source of truth)
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: 1000,
          payment_hash: 'test_hash_env',
          lnurl: 'test_lnurl_env',
          paid: true, // CRITICAL: Must be true for balance calculation
          paid_at: startDate
        }
      });

      await prisma.planChange.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          plan_type: 'standard',
          amount_paid: 1000, // Historical amount (should be ignored)
          started_at: startDate,
          ended_at: null
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      const expectedDailyCost = 2000 / 30;
      const expectedCost = 10 * expectedDailyCost;
      const expectedBalance = 1000 - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);

      // Restore original environment variables
      process.env.NEXT_PUBLIC_INVOICE_AMOUNT = originalStandard;
      process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = originalPremium;
    });

    test('should use fallback values when environment variables are missing', async () => {
      // Temporarily remove environment variables
      const originalStandard = process.env.NEXT_PUBLIC_INVOICE_AMOUNT;
      const originalPremium = process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT;
      
      delete process.env.NEXT_PUBLIC_INVOICE_AMOUNT;
      delete process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT;

      const now = new Date();
      const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      // Create actual payment record (source of truth)
      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          amount: 500,
          payment_hash: 'test_hash_fallback',
          lnurl: 'test_lnurl_fallback',
          paid: true, // CRITICAL: Must be true for balance calculation
          paid_at: startDate
        }
      });

      await prisma.planChange.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          plan_type: 'standard',
          amount_paid: 500,
          started_at: startDate,
          ended_at: null
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      // Should use fallback values: 1000 for standard, 2100 for premium
      const expectedDailyCost = 1000 / 30;
      const expectedCost = 10 * expectedDailyCost;
      const expectedBalance = 500 - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);

      // Restore original environment variables
      process.env.NEXT_PUBLIC_INVOICE_AMOUNT = originalStandard;
      process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = originalPremium;
    });
  });
});
