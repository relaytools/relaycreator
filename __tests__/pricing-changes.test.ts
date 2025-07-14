import { PrismaClient } from '@prisma/client';
import { recordRelayPlanChange, getCurrentRelayPlan } from '../lib/relayPlanChangeTracking';
import { recordPlanChange, calculateTimeBasedBalance } from '../lib/planChangeTracking';

const prisma = new PrismaClient();

// Mock environment variables for testing
const originalEnv = process.env;

beforeEach(async () => {
  // Clean up test data in correct order (foreign key constraints)
  await prisma.relayPlanChange.deleteMany({});
  await prisma.planChange.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.clientOrder.deleteMany({});
  await prisma.relay.deleteMany({});
  await prisma.user.deleteMany({});
  
  // Reset environment variables
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Pricing Changes - Relay Invoices', () => {
  const testRelayId = 'test-relay-123';
  const testPubkey = 'relay-owner-1234567890abcdef1234567890abcdef12345678';
  let testUserId: string;

  beforeEach(async () => {
    // Create test user first
    const testUser = await prisma.user.create({
      data: {
        pubkey: testPubkey,
        name: 'Test User'
      }
    });
    testUserId = testUser.id;

    // Create test relay
    await prisma.relay.create({
      data: {
        id: testRelayId,
        name: 'test-relay',
        ownerId: testUserId
      }
    });
  });

  test('should preserve historical relay plan rates when prices increase', async () => {
    // Initial pricing: Standard = 21 sats, Premium = 2100 sats
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '21';
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '2100';

    // User starts with standard plan
    const standardOrder = await prisma.order.create({
      data: {
        userId: testUserId,
        relayId: testRelayId,
        order_type: 'standard',
        amount: 21,
        status: 'paid',
        paid: true,
        payment_hash: 'hash1',
        lnurl: 'lnurl1'
      }
    });

    // Record initial plan change
    await recordRelayPlanChange(testRelayId, 'standard', 21, standardOrder.id);

    // Wait 15 days, then increase prices
    const upgradeDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    
    // New pricing: Standard = 30 sats, Premium = 3000 sats
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '30';
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '3000';

    // User upgrades to premium at new price
    const premiumOrder = await prisma.order.create({
      data: {
        userId: testUserId,
        relayId: testRelayId,
        order_type: 'premium',
        amount: 3000,
        status: 'paid',
        paid: true,
        payment_hash: 'hash2',
        lnurl: 'lnurl2'
      }
    });

    await recordRelayPlanChange(testRelayId, 'premium', 3000, premiumOrder.id, upgradeDate);

    // Verify plan history
    const planHistory = await prisma.relayPlanChange.findMany({
      where: { relayId: testRelayId },
      orderBy: { started_at: 'asc' }
    });

    expect(planHistory).toHaveLength(2);
    
    // First period: Standard at old price (21 sats)
    expect(planHistory[0].plan_type).toBe('standard');
    expect(planHistory[0].amount_paid).toBe(21);
    expect(planHistory[0].ended_at).not.toBeNull();
    
    // Second period: Premium at new price (3000 sats)
    expect(planHistory[1].plan_type).toBe('premium');
    expect(planHistory[1].amount_paid).toBe(3000);
    expect(planHistory[1].ended_at).toBeNull();

    // Verify current plan reflects new pricing
    const currentPlan = await getCurrentRelayPlan(testRelayId);
    expect(currentPlan?.plan_type).toBe('premium');
    expect(currentPlan?.amount_paid).toBe(3000);
  });

  test('should use new pricing for new relay plans', async () => {
    // Set new pricing
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '50';
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '5000';

    // Create new relay plan at new pricing
    const newOrder = await prisma.order.create({
      data: {
        userId: testUserId,
        relayId: testRelayId,
        order_type: 'premium',
        amount: 5000,
        status: 'paid',
        paid: true,
        payment_hash: 'hash3',
        lnurl: 'lnurl3'
      }
    });

    await recordRelayPlanChange(testRelayId, 'premium', 5000, newOrder.id);

    const currentPlan = await getCurrentRelayPlan(testRelayId);
    expect(currentPlan?.amount_paid).toBe(5000);
  });

  test('should calculate time-based billing correctly with price changes', async () => {
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Historical standard plan
    const order1 = await prisma.order.create({
      data: {
        userId: testUserId,
        relayId: testRelayId,
        order_type: 'standard',
        amount: 21,
        status: 'paid',
        paid: true,
        payment_hash: 'hash1',
        lnurl: 'lnurl1'
      }
    });

    await recordRelayPlanChange(testRelayId, 'standard', 21, order1.id, thirtyDaysAgo);

    // Upgrade to premium
    const order2 = await prisma.order.create({
      data: {
        userId: testUserId,
        relayId: testRelayId,
        order_type: 'premium',
        amount: 2100,
        status: 'paid',
        paid: true,
        payment_hash: 'hash2',
        lnurl: 'lnurl2'
      }
    });

    await recordRelayPlanChange(testRelayId, 'premium', 2100, order2.id, fifteenDaysAgo);

    // Verify billing calculation
    const planHistory = await prisma.relayPlanChange.findMany({
      where: { relayId: testRelayId },
      orderBy: { started_at: 'asc' }
    });

    expect(planHistory).toHaveLength(2);
    expect(planHistory[0].amount_paid).toBe(21); // Historical rate
    expect(planHistory[1].amount_paid).toBe(2100); // New rate
  });
});

describe('Pricing Changes - Client Subscriptions', () => {
  const testRelayId = 'test-relay-456';
  const testPubkey = 'client-user-456789abcdef456789abcdef456789abcdef456789';
  const relayOwnerPubkey = 'relay-owner-456789abcdef456789abcdef456789abcdef456789';
  let testUserId: string;
  let relayOwnerId: string;

  beforeEach(async () => {
    // Create relay owner user
    const relayOwner = await prisma.user.create({
      data: {
        pubkey: relayOwnerPubkey,
        name: 'Relay Owner'
      }
    });
    relayOwnerId = relayOwner.id;

    // Create test relay
    await prisma.relay.create({
      data: {
        id: testRelayId,
        name: 'test-relay',
        ownerId: relayOwnerId
      }
    });
  });

  test('should preserve historical client subscription rates when prices increase', async () => {
    // Initial pricing
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '21';
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '2100';

    // User starts with standard subscription
    const standardOrder = await prisma.clientOrder.create({
      data: {
        relayId: testRelayId,
        pubkey: testPubkey,
        order_type: 'standard',
        amount: 21,
        paid: true,
        payment_hash: 'hash1',
        lnurl: 'lnurl1'
      }
    });

    await recordPlanChange(testRelayId, testPubkey, 'standard', 21, standardOrder.id);

    // Price increase
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '30';
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '3000';

    const upgradeDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    // User upgrades to premium at new price
    const premiumOrder = await prisma.clientOrder.create({
      data: {
        relayId: testRelayId,
        pubkey: testPubkey,
        order_type: 'premium',
        amount: 3000,
        paid: true,
        payment_hash: 'hash2',
        lnurl: 'lnurl2'
      }
    });

    await recordPlanChange(testRelayId, testPubkey, 'premium', 3000, premiumOrder.id, upgradeDate);

    // Verify plan history preserves historical rates
    const planHistory = await prisma.planChange.findMany({
      where: { relayId: testRelayId, pubkey: testPubkey },
      orderBy: { started_at: 'asc' }
    });

    expect(planHistory).toHaveLength(2);
    expect(planHistory[0].amount_paid).toBe(21); // Historical rate
    expect(planHistory[1].amount_paid).toBe(3000); // New rate
  });

  test('should calculate client balance correctly with price changes', async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    // Standard subscription 30 days ago
    const order1 = await prisma.clientOrder.create({
      data: {
        relayId: testRelayId,
        pubkey: testPubkey,
        order_type: 'standard',
        amount: 21,
        paid: true,
        payment_hash: 'hash1',
        lnurl: 'lnurl1'
      }
    });

    await recordPlanChange(testRelayId, testPubkey, 'standard', 21, order1.id, thirtyDaysAgo);

    // Premium upgrade 15 days ago
    const order2 = await prisma.clientOrder.create({
      data: {
        relayId: testRelayId,
        pubkey: testPubkey,
        order_type: 'premium',
        amount: 2100,
        paid: true,
        payment_hash: 'hash2',
        lnurl: 'lnurl2'
      }
    });

    await recordPlanChange(testRelayId, testPubkey, 'premium', 2100, order2.id, fifteenDaysAgo);

    // Calculate balance with time-based billing
    const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
    
    // Should account for different rates in different periods
    // 15 days at 0.7 sats/day + 15 days at 70 sats/day = 10.5 + 1050 = 1060.5 sats cost
    // Total paid: 21 + 2100 = 2121 sats
    // Balance: 2121 - 1060.5 = 1060.5 sats credit
    expect(balance).toBeCloseTo(1060.5, 1);
  });

  test('should use new pricing for new client subscriptions', async () => {
    // Set new pricing
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '50';
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '5000';

    // New user subscribes at new pricing
    const newUserPubkey = 'new-user-789abcdef789abcdef789abcdef789abcdef789abcdef';
    
    const newOrder = await prisma.clientOrder.create({
      data: {
        relayId: testRelayId,
        pubkey: newUserPubkey,
        order_type: 'premium',
        amount: 5000,
        paid: true,
        payment_hash: 'hash3',
        lnurl: 'lnurl3'
      }
    });

    await recordPlanChange(testRelayId, newUserPubkey, 'premium', 5000, newOrder.id);

    const planHistory = await prisma.planChange.findMany({
      where: { relayId: testRelayId, pubkey: newUserPubkey }
    });

    expect(planHistory).toHaveLength(1);
    expect(planHistory[0].amount_paid).toBe(5000);
  });

  test('should use current pricing for ongoing costs beyond paid coverage period', async () => {
    // Set initial pricing
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '21';
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '2100';

    // User pays at old pricing 45 days ago (beyond 30-day coverage)
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    const oldOrder = await prisma.clientOrder.create({
      data: {
        relayId: testRelayId,
        pubkey: testPubkey,
        order_type: 'standard',
        amount: 21,
        paid: true,
        paid_at: fortyFiveDaysAgo,
        payment_hash: 'hash-old',
        lnurl: 'lnurl-old'
      }
    });

    await recordPlanChange(testRelayId, testPubkey, 'standard', 21, oldOrder.id, fortyFiveDaysAgo);

    // Change pricing to new rates
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '50';
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '5000';

    // Calculate balance - should use old rate for first 30 days, new rate for remaining 15 days
    const balance = await calculateTimeBasedBalance(testRelayId, testPubkey);
    
    // Expected calculation:
    // - First 30 days: 30 * (21/30) = 21 sats cost (at old rate)
    // - Next 15 days: 15 * (50/30) = 25 sats cost (at new rate)
    // - Total cost: 21 + 25 = 46 sats
    // - Balance: 21 - 46 = -25 sats (negative balance due to higher new pricing)
    expect(balance).toBeCloseTo(-25, 1);
  });
});
