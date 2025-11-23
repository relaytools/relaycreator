import { PrismaClient } from '@prisma/client';
import { calculateRelayTimeBasedBalance } from '../lib/relayPlanChangeTracking';

const prisma = new PrismaClient();

// Test environment variables - MATCH PRODUCTION
const STANDARD_PRICE = 7000;
const PREMIUM_PRICE = 15000;
const STANDARD_DAILY = STANDARD_PRICE / 30; // 233.33
const PREMIUM_DAILY = PREMIUM_PRICE / 30; // 500

describe('Relay Owner Balance Calculations', () => {
  let testRelayId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Set test environment variables
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = STANDARD_PRICE.toString();
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = PREMIUM_PRICE.toString();
    
    // Clean up any leftover test data from previous failed runs
    try {
      await prisma.order.deleteMany({
        where: {
          OR: [
            { payment_hash: { startsWith: 'test_hash' } },
            { payment_hash: { startsWith: 'test-hash' } }
          ]
        }
      });
      await prisma.relayPlanChange.deleteMany({
        where: {
          relayId: { startsWith: 'test-relay' }
        }
      });
      await prisma.relay.deleteMany({
        where: {
          id: { startsWith: 'test-relay' }
        }
      });
      await prisma.user.deleteMany({
        where: {
          pubkey: { startsWith: 'test-' }
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
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

    // Create test relay with unique ID
    const relay = await prisma.relay.create({
      data: {
        id: `test-relay-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
        await prisma.relayPlanChange.deleteMany({
          where: { relayId: testRelayId }
        });
        await prisma.order.deleteMany({
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
    // Final cleanup of all test data
    try {
      await prisma.order.deleteMany({
        where: {
          OR: [
            { payment_hash: { startsWith: 'test_hash' } },
            { payment_hash: { startsWith: 'test-hash' } }
          ]
        }
      });
      await prisma.relayPlanChange.deleteMany({
        where: {
          relayId: { startsWith: 'test-relay' }
        }
      });
      await prisma.relay.deleteMany({
        where: {
          id: { startsWith: 'test-relay' }
        }
      });
      await prisma.user.deleteMany({
        where: {
          pubkey: { startsWith: 'test-' }
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
    await prisma.$disconnect();
  });

  describe('Plan History Calculations', () => {
    test('should calculate correct daily costs using environment variables', async () => {
      const currentTime = new Date();
      const startDate = new Date(currentTime.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      // Create actual payment record (source of truth)
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          status: 'completed',
          paid: true,
          payment_hash: 'test_hash_1',
          lnurl: 'test_lnurl_1',
          amount: 500,
          order_type: 'standard',
          paid_at: startDate
        }
      });

      // Create relay plan change (just tracks plan type and dates)
      await prisma.relayPlanChange.create({
        data: {
          relayId: testRelayId,
          plan_type: 'standard',
          amount_paid: 0, // This field is ignored now
          started_at: startDate,
          ended_at: null
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      // Calculate cost from PLAN PERIOD START (when payment was made), not relay creation
      const currentTime10 = new Date();
      const daysSincePlanStart = (currentTime10.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const expectedCost = daysSincePlanStart * STANDARD_DAILY;
      const expectedBalance = 500 - expectedCost; // Should be very negative
      
      expect(balance).toBeCloseTo(expectedBalance, 1);
      expect(balance).toBeLessThan(0); // Should be negative
    });

    test('should calculate correct daily costs for premium plans', async () => {
      const currentTime2 = new Date();
      const startDate = new Date(currentTime2.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      // Create actual payment record (source of truth)
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          status: 'completed',
          paid: true,
          payment_hash: 'test_hash_2',
          lnurl: 'test_lnurl_2',
          amount: 1000,
          order_type: 'premium',
          paid_at: startDate
        }
      });

      await prisma.relayPlanChange.create({
        data: {
          relayId: testRelayId,
          plan_type: 'premium',
          amount_paid: 0, // This field is ignored now
          started_at: startDate,
          ended_at: null
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      // Calculate cost from PLAN PERIOD START (when payment was made), not relay creation
      const currentTime8 = new Date();
      const daysSincePlanStart = (currentTime8.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const expectedCost = daysSincePlanStart * PREMIUM_DAILY;
      const expectedBalance = 1000 - expectedCost; // Should be very negative
      
      expect(balance).toBeCloseTo(expectedBalance, 1);
      expect(balance).toBeLessThan(0); // Should be negative
    });

    test('should calculate correct balance for multiple plan periods', async () => {
      const currentTime3 = new Date();
      const start1 = new Date(currentTime3.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago
      const end1 = new Date(currentTime3.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const start2 = new Date(currentTime3.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      // Create actual payment records (source of truth) - small amounts to ensure negative balance
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          status: 'completed',
          paid: true,
          payment_hash: 'test_hash_3',
          lnurl: 'test_lnurl_3',
          amount: 1000, // Small payment
          order_type: 'standard',
          paid_at: start1
        }
      });

      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          status: 'completed',
          paid: true,
          payment_hash: 'test_hash_4',
          lnurl: 'test_lnurl_4',
          amount: 2000, // Small payment
          order_type: 'premium',
          paid_at: start2
        }
      });

      // First period: standard for 10 days
      await prisma.relayPlanChange.create({
        data: {
          relayId: testRelayId,
          plan_type: 'standard',
          amount_paid: 0, // This field is ignored now
          started_at: start1,
          ended_at: end1
        }
      });

      // Second period: premium for 10 days
      await prisma.relayPlanChange.create({
        data: {
          relayId: testRelayId,
          plan_type: 'premium',
          amount_paid: 0, // This field is ignored now
          started_at: start2,
          ended_at: null
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      // Calculate cost per period: 10 days standard + 10 days premium
      const currentTime4 = new Date();
      const totalPaid = 1000 + 2000; // 3000 sats total
      const period1Days = (end1.getTime() - start1.getTime()) / (1000 * 60 * 60 * 24);
      const period2Days = (currentTime4.getTime() - start2.getTime()) / (1000 * 60 * 60 * 24);
      const expectedCost = (period1Days * STANDARD_DAILY) + (period2Days * PREMIUM_DAILY);
      const expectedBalance = totalPaid - expectedCost; // Should be very negative
      
      expect(balance).toBeCloseTo(expectedBalance, 1);
      expect(balance).toBeLessThan(0); // Should be negative
    });

    test('should handle negative balances correctly', async () => {
      const currentTime5 = new Date();
      const startDate = new Date(currentTime5.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

      // Create actual payment record (source of truth)
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          status: 'completed',
          paid: true,
          payment_hash: 'test_hash_5',
          lnurl: 'test_lnurl_5',
          amount: STANDARD_PRICE,
          order_type: 'standard',
          paid_at: startDate
        }
      });

      await prisma.relayPlanChange.create({
        data: {
          relayId: testRelayId,
          plan_type: 'standard',
          amount_paid: 0, // This field is ignored now
          started_at: startDate,
          ended_at: null
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      // Calculate cost from PLAN PERIOD START (when payment was made), not relay creation
      const currentTime9 = new Date();
      const daysSincePlanStart = (currentTime9.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const expectedCost = daysSincePlanStart * STANDARD_DAILY;
      const expectedBalance = STANDARD_PRICE - expectedCost; // Should be very negative
      
      expect(balance).toBeCloseTo(expectedBalance, 1);
      expect(balance).toBeLessThan(0);
    });
  });

  describe('Fallback Calculations (No Plan History)', () => {
    test('should calculate balance from relay creation date when no plan history', async () => {
      const currentTime7 = new Date();
      const createdAt = new Date(currentTime7.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago

      // Update relay creation date
      await prisma.relay.update({
        where: { id: testRelayId },
        data: { created_at: createdAt }
      });

      // Create relay owner order
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          amount: STANDARD_PRICE,
          paid: true,
          paid_at: new Date(currentTime7.getTime() - 10 * 24 * 60 * 60 * 1000),
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1',
          status: 'paid'
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      // Should calculate from relay creation date (15 days ago), not payment date
      const expectedCost = 15 * STANDARD_DAILY;
      const expectedBalance = STANDARD_PRICE - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
    });

    test('should return negative balance for relays with no payments and no plan history', async () => {
      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      // Unpaid relays should show negative balance based on time since creation
      expect(balance).toBeLessThan(0);
    });

    test('should handle multiple orders in fallback calculation', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago

      await prisma.relay.update({
        where: { id: testRelayId },
        data: { created_at: createdAt }
      });

      // First order
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          amount: STANDARD_PRICE,
          order_type: 'standard',
          paid: true,
          paid_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1',
          status: 'paid'
        }
      });

      // Second order
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          amount: PREMIUM_PRICE,
          order_type: 'premium',
          paid: true,
          paid_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          payment_hash: 'test-hash-2',
          lnurl: 'test-lnurl-2',
          status: 'paid'
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      const totalPaid = STANDARD_PRICE + PREMIUM_PRICE;
      // Should use standard pricing for fallback (most recent order determines plan)
      const expectedCost = 20 * PREMIUM_DAILY; // Uses premium pricing from most recent order
      const expectedBalance = totalPaid - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
    });

    test('should use current environment variable pricing in fallback', async () => {
      // Temporarily change environment variables
      const originalStandard = process.env.NEXT_PUBLIC_INVOICE_AMOUNT;
      process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '2000';

      const now = new Date();
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      await prisma.relay.update({
        where: { id: testRelayId },
        data: { created_at: createdAt }
      });

      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          amount: 1500,
          paid: true,
          paid_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1',
          status: 'paid'
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      // Should use current environment variable (2000), not historical payment amount
      const expectedDailyCost = 2000 / 30;
      const expectedCost = 10 * expectedDailyCost;
      const expectedBalance = 1500 - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);

      // Restore original environment variable
      process.env.NEXT_PUBLIC_INVOICE_AMOUNT = originalStandard;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle zero amount payments', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      await prisma.relay.update({
        where: { id: testRelayId },
        data: { created_at: createdAt }
      });

      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          amount: 0,
          paid: true,
          paid_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1',
          status: 'paid'
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      const expectedCost = 10 * STANDARD_DAILY;
      const expectedBalance = 0 - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
      expect(balance).toBeLessThan(0);
    });

    test('should handle very large time periods', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

      await prisma.relay.update({
        where: { id: testRelayId },
        data: { created_at: createdAt }
      });

      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          amount: STANDARD_PRICE,
          paid: true,
          paid_at: new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000),
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1',
          status: 'paid'
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      const expectedCost = 365 * STANDARD_DAILY;
      const expectedBalance = STANDARD_PRICE - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
      expect(balance).toBeLessThan(0); // Should be very negative
    });

    test('should handle orders without payment dates', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      await prisma.relay.update({
        where: { id: testRelayId },
        data: { created_at: createdAt }
      });

      // Create order without payment date
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          amount: STANDARD_PRICE,
          paid: true,
          paid_at: null,
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1',
          status: 'paid'
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      // Should still calculate from relay creation date
      const expectedCost = 10 * STANDARD_DAILY;
      const expectedBalance = STANDARD_PRICE - expectedCost;
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
    });

    test('should handle mixed paid and unpaid orders', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

      await prisma.relay.update({
        where: { id: testRelayId },
        data: { created_at: createdAt }
      });

      // Paid order
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          amount: STANDARD_PRICE,
          paid: true,
          paid_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1',
          status: 'paid'
        }
      });

      // Unpaid order (should be ignored)
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          amount: PREMIUM_PRICE,
          paid: false,
          paid_at: null,
          payment_hash: 'test-hash-2',
          lnurl: 'test-lnurl-2',
          status: 'pending'
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      // Should only count paid orders
      const expectedCost = 15 * STANDARD_DAILY;
      const expectedBalance = STANDARD_PRICE - expectedCost; // Only paid amount
      
      expect(balance).toBeCloseTo(expectedBalance, 2);
    });
  });

  describe('Plan Type Detection', () => {
    test('should detect standard plan type correctly', async () => {
      const currentTime15 = new Date();
      const startDate = new Date(currentTime15.getTime() - 10 * 24 * 60 * 60 * 1000);

      // Create actual payment record (source of truth)
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          status: 'completed',
          paid: true,
          payment_hash: 'test_hash_plan_1',
          lnurl: 'test_lnurl_plan_1',
          amount: 999, // Different from standard price
          order_type: 'standard',
          paid_at: startDate
        }
      });

      await prisma.relayPlanChange.create({
        data: {
          relayId: testRelayId,
          plan_type: 'standard',
          amount_paid: 0, // This field is ignored now
          started_at: startDate,
          ended_at: null
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      // Calculate cost from PLAN PERIOD START using standard pricing
      const currentTime16 = new Date();
      const daysSincePlanStart = (currentTime16.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const expectedCost = daysSincePlanStart * STANDARD_DAILY;
      const expectedBalance = 999 - expectedCost; // Should be very negative
      
      expect(balance).toBeCloseTo(expectedBalance, 1);
      expect(balance).toBeLessThan(0); // Should be negative
    });

    test('should detect premium plan type correctly', async () => {
      const currentTime17 = new Date();
      const startDate = new Date(currentTime17.getTime() - 10 * 24 * 60 * 60 * 1000);

      // Create actual payment record (source of truth)
      await prisma.order.create({
        data: {
          userId: testUserId,
          relayId: testRelayId,
          status: 'completed',
          paid: true,
          payment_hash: 'test_hash_plan_2',
          lnurl: 'test_lnurl_plan_2',
          amount: 1999, // Different from premium price
          order_type: 'premium',
          paid_at: startDate
        }
      });

      await prisma.relayPlanChange.create({
        data: {
          relayId: testRelayId,
          plan_type: 'premium',
          amount_paid: 0, // This field is ignored now
          started_at: startDate,
          ended_at: null
        }
      });

      const balance = await calculateRelayTimeBasedBalance(testRelayId);
      
      // Calculate cost from PLAN PERIOD START using premium pricing
      const currentTime18 = new Date();
      const daysSincePlanStart = (currentTime18.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const expectedCost = daysSincePlanStart * PREMIUM_DAILY;
      const expectedBalance = 1999 - expectedCost; // Should be very negative
      
      expect(balance).toBeCloseTo(expectedBalance, 1);
      expect(balance).toBeLessThan(0); // Should be negative
    });
  });

  describe('Real Customer Bug - Premium Upgrade', () => {
    test('REAL PRODUCTION DATA - should calculate balance correctly with actual customer payment history', async () => {
      // REAL CUSTOMER DATA FROM PRODUCTION
      // Using PRODUCTION environment variables: 7000 standard, 15000 premium
      // This test uses the EXACT payment dates and amounts from the real customer
      
      const customerUser = await prisma.user.create({
        data: {
          pubkey: `test-customer-owner-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: 'customer-relay-owner'
        }
      });

      const customerRelayId = `test-customer-relay-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      try {
        // REAL RELAY CREATION DATE
        const relayCreationDate = new Date('2024-09-29T06:52:24.170Z');
        
        await prisma.relay.create({
          data: {
            id: customerRelayId,
            name: 'Customer Relay',
            ownerId: customerUser.id,
            created_at: relayCreationDate
          }
        });

        // REAL CUSTOMER PAYMENT HISTORY - EXACT DATES AND AMOUNTS
        const orders = [
          { amount: 12000, order_type: 'standard', paid_at: new Date('2024-09-29T06:52:24.170Z') },
          { amount: 12000, order_type: 'standard', paid_at: new Date('2024-10-12T18:32:41.578Z') },
          { amount: 3735, order_type: 'standard', paid_at: new Date('2024-12-07T15:00:56.245Z') },  // Custom amount
          { amount: 24000, order_type: 'standard', paid_at: new Date('2024-12-08T00:10:00.298Z') },
          { amount: 20000, order_type: 'standard', paid_at: new Date('2025-02-24T15:00:44.832Z') },
          { amount: 20000, order_type: 'standard', paid_at: new Date('2025-03-31T08:30:59.311Z') },
          { amount: 15000, order_type: 'premium', paid_at: new Date('2025-10-15T13:42:12.761Z') }  // Upgraded to premium
        ];

        // Create Order records AND corresponding RelayPlanChange records
        for (let i = 0; i < orders.length; i++) {
          const order = orders[i];
          await prisma.order.create({
            data: {
              userId: customerUser.id,
              relayId: customerRelayId,
              order_type: order.order_type as any,
              amount: order.amount,
              paid: true,
              status: 'paid',
              paid_at: order.paid_at,
              payment_hash: `test-hash-${i}-${order.amount}`,
              lnurl: `test-lnurl-${i}-${order.amount}`
            }
          });

          // Only create plan changes for standard/premium orders (not custom amounts)
          if (order.order_type === 'standard' || order.order_type === 'premium') {
            // End the previous plan period
            await prisma.relayPlanChange.updateMany({
              where: {
                relayId: customerRelayId,
                ended_at: null
              },
              data: {
                ended_at: order.paid_at
              }
            });

            // Create new plan period
            await prisma.relayPlanChange.create({
              data: {
                relayId: customerRelayId,
                plan_type: order.order_type,
                amount_paid: order.amount,
                started_at: order.paid_at,
                ended_at: null
              }
            });
          }
        }

        // NO CLIENT ORDERS - relay has no revenue

        const balance = await calculateRelayTimeBasedBalance(customerRelayId);

        const totalPaid = orders.reduce((sum, o) => sum + o.amount, 0); // 106,735 sats
        const now = new Date();
        const premiumUpgradeDate = new Date('2025-10-15T13:42:12.761Z');
        
        // CORRECT CALCULATION: Use per-period rates with PRODUCTION pricing
        // Standard: 7000/30 = 233.33 sats/day
        // Premium: 15000/30 = 500 sats/day
        const daysOnStandard = (premiumUpgradeDate.getTime() - relayCreationDate.getTime()) / (1000 * 60 * 60 * 24);
        const daysOnPremium = (now.getTime() - premiumUpgradeDate.getTime()) / (1000 * 60 * 60 * 24);
        const correctCost = (daysOnStandard * STANDARD_DAILY) + (daysOnPremium * PREMIUM_DAILY);
        const correctBalance = totalPaid - correctCost;
        
        // BUGGY CALCULATION: Apply premium rate to entire history
        const daysSinceCreation = (now.getTime() - relayCreationDate.getTime()) / (1000 * 60 * 60 * 24);
        const buggyCost = daysSinceCreation * PREMIUM_DAILY;
        const buggyBalance = totalPaid - buggyCost;

        console.log('\n=== REAL PRODUCTION DATA TEST ===');
        console.log(`Relay Created: ${relayCreationDate.toISOString()}`);
        console.log(`Premium Upgrade: ${premiumUpgradeDate.toISOString()}`);
        console.log(`Total Paid: ${totalPaid.toLocaleString()} sats`);
        console.log(`\n--- CORRECT CALCULATION (per-period rates) ---`);
        console.log(`Days on Standard: ${daysOnStandard.toFixed(1)} @ ${STANDARD_DAILY.toFixed(2)} sats/day = ${(daysOnStandard * STANDARD_DAILY).toFixed(0)} sats`);
        console.log(`Days on Premium: ${daysOnPremium.toFixed(1)} @ ${PREMIUM_DAILY.toFixed(2)} sats/day = ${(daysOnPremium * PREMIUM_DAILY).toFixed(0)} sats`);
        console.log(`Total Cost: ${correctCost.toFixed(0)} sats`);
        console.log(`Correct Balance: ${correctBalance.toFixed(0)} sats`);
        console.log(`\n--- BUGGY CALCULATION (premium rate for entire history) ---`);
        console.log(`Days Since Creation: ${daysSinceCreation.toFixed(1)}`);
        console.log(`Buggy Cost (all @ premium): ${buggyCost.toFixed(0)} sats`);
        console.log(`Buggy Balance: ${buggyBalance.toFixed(0)} sats`);
        console.log(`\n--- ACTUAL RESULT ---`);
        console.log(`Actual Balance: ${balance.toFixed(0)} sats`);
        console.log(`Difference from correct: ${(balance - correctBalance).toFixed(0)} sats`);
        console.log(`Difference from buggy: ${(balance - buggyBalance).toFixed(0)} sats`);
        
        if (Math.abs(balance - buggyBalance) < 100) {
          console.log('\n🚨 BUG DETECTED: Balance matches buggy calculation!');
        } else if (Math.abs(balance - correctBalance) < 100) {
          console.log('\n✅ CORRECT: Balance matches per-period calculation!');
        } else {
          console.log('\n⚠️  UNEXPECTED: Balance matches neither calculation!');
        }

        // Verify it's a number
        expect(Number.isNaN(balance)).toBe(false);
        
        // Should match correct calculation (per-period rates), not buggy calculation
        expect(balance).toBeCloseTo(correctBalance, 0);
        
        // Should NOT match buggy calculation
        expect(Math.abs(balance - buggyBalance)).toBeGreaterThan(1000); // Should be significantly different
      } finally {
        // Cleanup - runs even if test fails
        try {
          await prisma.order.deleteMany({ where: { relayId: customerRelayId } });
          await prisma.relayPlanChange.deleteMany({ where: { relayId: customerRelayId } });
          await prisma.relay.delete({ where: { id: customerRelayId } });
          await prisma.user.delete({ where: { id: customerUser.id } });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });
});
