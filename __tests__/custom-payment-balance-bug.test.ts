import { PrismaClient } from '@prisma/client';
import { calculateRelayTimeBasedBalance } from '../lib/relayPlanChangeTracking';

const prisma = new PrismaClient();

describe('Custom Payment Balance Bug Fix', () => {
  let testRelayId: string;
  const testPubkey = 'test-pubkey-custom-balance';

  beforeEach(async () => {
    // Create or find a test user first
    const testUserPubkey = `test-balance-user-${Date.now()}`;
    let testUser = await prisma.user.findFirst({
      where: { pubkey: testUserPubkey }
    });
    
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          pubkey: testUserPubkey,
          name: 'Test Balance User'
        }
      });
    }

    // Create a test relay
    const relay = await prisma.relay.create({
      data: {
        name: `Test Relay Custom Balance ${Date.now()}`,
        details: 'Test relay for custom payment balance testing',
        domain: `test-custom-balance-${Date.now()}.com`,
        created_at: new Date('2025-08-01'), // Recent date for testing
        status: 'running',
        ownerId: testUser.id
      }
    });
    testRelayId = relay.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testRelayId) {
      await prisma.order.deleteMany({
        where: { relayId: testRelayId }
      });
      await prisma.clientOrder.deleteMany({
        where: { relayId: testRelayId }
      });
      await prisma.relayPlanChange.deleteMany({
        where: { relayId: testRelayId }
      });
      await prisma.relay.delete({
        where: { id: testRelayId }
      });
    }
  });

  test('Custom payment should NOT be treated as monthly recurring cost', async () => {
    // Scenario: User buys standard plan, then makes custom top-up
    
    // Get the test user to create orders
    const testUser = await prisma.user.findFirst({
      where: { name: 'Test Balance User' }
    });
    if (!testUser) throw new Error('Test user not found');

    // Step 1: Buy standard plan (1000 sats)
    const standardOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        relayId: testRelayId,
        amount: 1000, // Use actual environment variable amount
        order_type: 'standard',
        paid: true,
        paid_at: new Date('2025-08-02'), // 1 day after relay creation
        status: 'completed',
        payment_hash: 'test-hash-standard',
        lnurl: 'test-lnurl-standard'
      }
    });

    // Step 2: Make custom top-up (10000 sats) - this should NOT change daily cost
    const customOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        relayId: testRelayId,
        amount: 10000,
        order_type: 'custom',
        paid: true,
        paid_at: new Date('2025-08-03'), // Custom top-up 1 day later standard plan
        status: 'completed',
        payment_hash: 'test-hash-custom',
        lnurl: 'test-lnurl-custom'
      }
    });

    // Calculate balance
    const balance = await calculateRelayTimeBasedBalance(testRelayId);

    // Expected calculation:
    // Total paid: 1000 + 10000 = 11000 sats
    // Daily cost should be standard: 1000/30 = 33.33 sats/day (NOT 10000/30 = 333 sats/day)
    // Days since creation: ~3 days (from 2025-08-01 to 2025-08-04)
    // Expected cost accrued: 3 * 33.33 = ~100 sats
    // - Expected balance: 11000 - 100 = ~10900 sats (positive!)
    // BUT if bug exists, it would use 10000/30 = 333 sats/day:
    // - Buggy cost accrued: 3 * 333 = ~999 sats
    // - Expected balance: 11000 - 999 = ~10001 sats (still positive but much lower)

    console.log('Balance calculation result:', balance);
    
    // Balance should be positive (around 9500 sats)
    // If the bug exists, balance would be much lower because it would use 10000/30 = 333 sats/day
    expect(balance).toBeGreaterThan(9000); // Should be around 9500, allowing for time variance
    expect(balance).toBeLessThan(10000);
  });

  test('Multiple custom payments should not compound the daily cost bug', async () => {
    // Scenario: Standard plan + multiple custom top-ups
    
    // Get the test user to create orders
    const testUser = await prisma.user.findFirst({
      where: { name: 'Test Balance User' }
    });
    if (!testUser) throw new Error('Test user not found');
    
    // Standard plan
    await prisma.order.create({
      data: {
        userId: testUser.id,
        relayId: testRelayId,
        amount: 1000, // Use actual environment variable amount
        order_type: 'standard',
        paid: true,
        paid_at: new Date('2025-08-02'),
        status: 'completed',
        payment_hash: 'test-hash-standard-1',
        lnurl: 'test-lnurl-standard-1'
      }
    });

    // First custom payment
    await prisma.order.create({
      data: {
        userId: testUser.id,
        relayId: testRelayId,
        amount: 5000,
        order_type: 'custom',
        paid: true,
        paid_at: new Date('2025-08-03'),
        status: 'completed',
        payment_hash: 'test-hash-custom-1',
        lnurl: 'test-lnurl-custom-1'
      }
    });

    // Second custom payment (most recent)
    await prisma.order.create({
      data: {
        userId: testUser.id,
        relayId: testRelayId,
        amount: 8000,
        order_type: 'custom',
        paid: true,
        paid_at: new Date('2025-08-04'),
        status: 'completed',
        payment_hash: 'test-hash-custom-2',
        lnurl: 'test-lnurl-custom-2'
      }
    });

    const balance = await calculateRelayTimeBasedBalance(testRelayId);

    // Total paid: 1000 + 5000 + 8000 = 14000 sats
    // Daily cost should still be standard: 1000/30 = 33.33 sats/day
    // Expected balance should be very positive

    console.log('Multiple custom payments balance:', balance);
    expect(balance).toBeGreaterThan(12000); // Should be around 12400+
  });

  test('Custom payment only (no plan orders) should use default standard pricing', async () => {
    // Scenario: Only custom payments, no standard/premium orders
    
    // Get the test user to create orders
    const testUser = await prisma.user.findFirst({
      where: { name: 'Test Balance User' }
    });
    if (!testUser) throw new Error('Test user not found');
    
    await prisma.order.create({
      data: {
        userId: testUser.id,
        relayId: testRelayId,
        amount: 15000,
        order_type: 'custom',
        paid: true,
        paid_at: new Date('2025-08-03'),
        status: 'completed',
        payment_hash: 'test-hash-custom-only',
        lnurl: 'test-lnurl-custom-only'
      }
    });

    const balance = await calculateRelayTimeBasedBalance(testRelayId);

    // Total paid: 15000 sats
    // Daily cost should default to standard: 1000/30 = 33.33 sats/day
    // Should NOT use 15000/30 = 500 sats/day

    console.log('Custom payment only balance:', balance);
    expect(balance).toBeGreaterThan(12500); // Should be positive with standard pricing
  });

  test('Premium plan with custom top-up should use premium daily cost', async () => {
    // Scenario: Premium plan + custom top-up
    
    // Get the test user to create orders
    const testUser = await prisma.user.findFirst({
      where: { name: 'Test Balance User' }
    });
    if (!testUser) throw new Error('Test user not found');
    
    // Premium plan
    await prisma.order.create({
      data: {
        userId: testUser.id,
        relayId: testRelayId,
        amount: 2100, // Use actual environment variable amount
        order_type: 'premium',
        paid: true,
        paid_at: new Date('2025-08-02'),
        status: 'completed',
        payment_hash: 'test-hash-premium-1',
        lnurl: 'test-lnurl-premium-1'
      }
    });

    // Custom top-up
    await prisma.order.create({
      data: {
        userId: testUser.id,
        relayId: testRelayId,
        amount: 12000,
        order_type: 'custom',
        paid: true,
        paid_at: new Date('2025-08-04'),
        status: 'completed',
        payment_hash: 'test-hash-custom-premium',
        lnurl: 'test-lnurl-custom-premium'
      }
    });

    const balance = await calculateRelayTimeBasedBalance(testRelayId);

    // Total paid: 2100 + 12000 = 14100 sats
    // Daily cost should be premium: 2100/30 = 70 sats/day (not 12000/30 = 400)
    // Days since creation: ~3 days, cost = 3 * 70 = ~210 sats
    // Expected balance: 14100 - 210 = ~13890 sats
    
    console.log('Premium + custom payment balance:', balance);
    expect(balance).toBeGreaterThan(12000); // Should be positive with premium pricing
  });
});
