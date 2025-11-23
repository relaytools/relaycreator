import { PrismaClient } from '@prisma/client';
import { calculateTimeBasedBalance } from '../lib/planChangeTracking';

const prisma = new PrismaClient();

describe('Client Balance Calculations', () => {
  let testRelayId: string;
  let testUserId: string;
  let testPubkey: string;

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

    // Create test relay with explicit pricing
    const relay = await prisma.relay.create({
      data: {
        id: `test-relay-${Date.now()}`,
        name: 'Test Relay',
        ownerId: testUserId,
        payment_amount: 1000, // 1000 sats/month = 33.33 sats/day
        payment_premium_amount: 2100 // 2100 sats/month = 70 sats/day
      }
    });
    testRelayId = relay.id;
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await prisma.clientOrder.deleteMany({ where: { relayId: testRelayId } });
      await prisma.planChange.deleteMany({ where: { relayId: testRelayId } });
      await prisma.relay.deleteMany({ where: { id: testRelayId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Basic Balance Calculations', () => {
    test('should return 0 for clients who never paid', async () => {
      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      expect(balance).toBe(0);
    });

    test('should calculate balance for single standard payment', async () => {
      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() - 10); // 10 days ago

      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          order_type: 'standard',
          amount: 1000,
          paid: true,
          paid_at: paymentDate,
          payment_hash: 'test-hash-1',
          lnurl: 'test-lnurl-1'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      // 10 days × (1000/30) sats/day = 333.33 sats cost
      // Balance = 1000 - 333.33 = 666.67 sats
      expect(balance).toBeCloseTo(666.67, 1);
    });

    test('should calculate balance for single premium payment', async () => {
      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() - 15); // 15 days ago

      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          order_type: 'premium',
          amount: 2100,
          paid: true,
          paid_at: paymentDate,
          payment_hash: 'test-hash-2',
          lnurl: 'test-lnurl-2'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      // 15 days × (2100/30) sats/day = 1050 sats cost
      // Balance = 2100 - 1050 = 1050 sats
      expect(balance).toBeCloseTo(1050, 1);
    });

    test('should calculate balance for multiple payments', async () => {
      const firstPayment = new Date();
      firstPayment.setDate(firstPayment.getDate() - 20); // 20 days ago
      
      const secondPayment = new Date();
      secondPayment.setDate(secondPayment.getDate() - 10); // 10 days ago

      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          order_type: 'standard',
          amount: 1000,
          paid: true,
          paid_at: firstPayment,
          payment_hash: 'test-hash-3',
          lnurl: 'test-lnurl-3'
        }
      });

      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          order_type: 'standard',
          amount: 1000,
          paid: true,
          paid_at: secondPayment,
          payment_hash: 'test-hash-4',
          lnurl: 'test-lnurl-4'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      // Cost calculated from first payment (20 days ago)
      // 20 days × (1000/30) sats/day = 666.67 sats cost
      // Total paid = 2000 sats
      // Balance = 2000 - 666.67 = 1333.33 sats
      expect(balance).toBeGreaterThan(1200);
      expect(balance).toBeLessThan(1500);
    });

    test('should show negative balance for overdue payments', async () => {
      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() - 45); // 45 days ago

      await prisma.clientOrder.create({
        data: {
          relayId: testRelayId,
          pubkey: testPubkey,
          order_type: 'standard',
          amount: 1000,
          paid: true,
          paid_at: paymentDate,
          payment_hash: 'test-hash-5',
          lnurl: 'test-lnurl-5'
        }
      });

      const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
      
      // 45 days × (1000/30) sats/day = 1500 sats cost
      // Balance = 1000 - 1500 = -500 sats (overdue)
      expect(balance).toBeLessThan(-400);
      expect(balance).toBeGreaterThan(-600);
    });
  });

  describe('Relay-Specific Pricing', () => {
    test('should use relay-specific pricing for calculations', async () => {
      // Create relay with custom pricing
      const customRelay = await prisma.relay.create({
        data: {
          id: `custom-relay-${Date.now()}`,
          name: 'Custom Pricing Relay',
          ownerId: testUserId,
          payment_amount: 600, // Custom: 600 sats/month = 20 sats/day
          payment_premium_amount: 1800 // Custom: 1800 sats/month = 60 sats/day
        }
      });

      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() - 30); // 30 days ago

      await prisma.clientOrder.create({
        data: {
          relayId: customRelay.id,
          pubkey: testPubkey,
          order_type: 'standard',
          amount: 600,
          paid: true,
          paid_at: paymentDate,
          payment_hash: 'custom-hash',
          lnurl: 'custom-lnurl'
        }
      });

      const balance = await calculateTimeBasedBalance(customRelay.id, testPubkey);
      
      // 30 days × (600/30) sats/day = 600 sats cost
      // Balance = 600 - 600 = 0 sats (exactly covered)
      expect(balance).toBeGreaterThan(-100);
      expect(balance).toBeLessThan(100);

      // Cleanup
      await prisma.clientOrder.deleteMany({ where: { relayId: customRelay.id } });
      await prisma.relay.delete({ where: { id: customRelay.id } });
    });
  });

  describe('Error Handling', () => {
    test('should return 0 for non-existent relay with no payments', async () => {
      const nonExistentRelayId = `non-existent-relay-${Date.now()}`;
      const balance = await calculateTimeBasedBalance(nonExistentRelayId, testPubkey);
      expect(balance).toBe(0);
    });

    test('should throw error for non-existent relay with payments', async () => {
      const nonExistentRelayId = `non-existent-relay-${Date.now()}`;
      
      // Create a payment for non-existent relay
      await prisma.clientOrder.create({
        data: {
          relayId: nonExistentRelayId,
          pubkey: testPubkey,
          order_type: 'standard',
          amount: 1000,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'test-hash-error',
          lnurl: 'test-lnurl-error'
        }
      });

      await expect(calculateTimeBasedBalance(nonExistentRelayId, testPubkey))
        .rejects.toThrow('Relay not found');
        
      // Cleanup
      await prisma.clientOrder.deleteMany({ where: { relayId: nonExistentRelayId } });
    });

    test('should handle invalid pubkey gracefully', async () => {
      const balance = await calculateTimeBasedBalance(testRelayId, 'invalid-pubkey');
      expect(balance).toBe(0);
    });
  });
});
