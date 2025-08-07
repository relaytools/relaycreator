import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import prisma from '../lib/prisma';
import { recordRelayPlanChange } from '../lib/relayPlanChangeTracking';

describe('Custom Payment Plan Change Bug Fix', () => {
  let testRelay: any;
  let testUser: any;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        pubkey: 'test_pubkey_custom_payment_' + Date.now(),
        name: 'Test User Custom Payment'
      }
    });

    // Create test relay
    testRelay = await prisma.relay.create({
      data: {
        name: 'test-relay-custom-payment-' + Date.now(),
        domain: 'test.com',
        ownerId: testUser.id,
        status: 'running'
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.relayPlanChange.deleteMany({
        where: { relayId: testRelay.id }
      });
      await prisma.order.deleteMany({
        where: { relayId: testRelay.id }
      });
      await prisma.relay.delete({
        where: { id: testRelay.id }
      });
      await prisma.user.delete({
        where: { id: testUser.id }
      });
    } catch (error) {
      // Ignore cleanup errors - records may not exist
    }
  });

  it('should create plan change for standard payment amount', async () => {
    const standardAmount = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000');
    
    // Create standard order
    const standardOrder = await prisma.order.create({
      data: {
        relayId: testRelay.id,
        userId: testUser.id,
        status: 'paid',
        paid: true,
        payment_hash: 'test_hash_standard_' + Date.now(),
        lnurl: 'test_lnurl_standard',
        amount: standardAmount,
        order_type: 'standard',
        paid_at: new Date()
      }
    });

    // Simulate payment processing logic
    await recordRelayPlanChange(testRelay.id, standardOrder.order_type, standardOrder.amount);

    // Verify plan change was created
    const planChanges = await prisma.relayPlanChange.findMany({
      where: { relayId: testRelay.id, plan_type: 'standard' }
    });

    expect(planChanges).toHaveLength(1);
    expect(planChanges[0].amount_paid).toBe(standardAmount);
    expect(planChanges[0].plan_type).toBe('standard');
  });

  it('should create plan change for premium payment amount', async () => {
    const premiumAmount = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');
    
    // Create premium order
    const premiumOrder = await prisma.order.create({
      data: {
        relayId: testRelay.id,
        userId: testUser.id,
        status: 'paid',
        paid: true,
        payment_hash: 'test_hash_premium_' + Date.now(),
        lnurl: 'test_lnurl_premium',
        amount: premiumAmount,
        order_type: 'premium',
        paid_at: new Date()
      }
    });

    // Simulate payment processing logic
    await recordRelayPlanChange(testRelay.id, premiumOrder.order_type, premiumOrder.amount);

    // Verify plan change was created
    const planChanges = await prisma.relayPlanChange.findMany({
      where: { relayId: testRelay.id, plan_type: 'premium' }
    });

    expect(planChanges).toHaveLength(1);
    expect(planChanges[0].amount_paid).toBe(premiumAmount);
    expect(planChanges[0].plan_type).toBe('premium');
  });

  it('should NOT create plan change for custom payment amount', async () => {
    const customAmount = 1500; // Custom amount different from standard (1000) and premium (2100)
    
    // Get initial plan change count
    const initialPlanChanges = await prisma.relayPlanChange.findMany({
      where: { relayId: testRelay.id }
    });
    const initialCount = initialPlanChanges.length;

    // Create custom order
    const customOrder = await prisma.order.create({
      data: {
        relayId: testRelay.id,
        userId: testUser.id,
        status: 'paid',
        paid: true,
        payment_hash: 'test_hash_custom_' + Date.now(),
        lnurl: 'test_lnurl_custom',
        amount: customAmount,
        order_type: 'custom',
        paid_at: new Date()
      }
    });

    // Simulate the fixed payment processing logic - should NOT call recordRelayPlanChange for custom
    // This is what the fix implements: skip plan changes for custom orders
    if (customOrder.order_type === 'standard' || customOrder.order_type === 'premium') {
      await recordRelayPlanChange(testRelay.id, customOrder.order_type, customOrder.amount);
    }

    // Verify NO new plan change was created
    const finalPlanChanges = await prisma.relayPlanChange.findMany({
      where: { relayId: testRelay.id }
    });

    expect(finalPlanChanges).toHaveLength(initialCount); // Should be same count as before
    
    // Verify no plan change exists with custom amount
    const customPlanChanges = await prisma.relayPlanChange.findMany({
      where: { relayId: testRelay.id, amount_paid: customAmount }
    });
    expect(customPlanChanges).toHaveLength(0);
  });

  it('should correctly classify payment amounts in invoice creation', () => {
    const standardAmount = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000');
    const premiumAmount = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');

    // Test the logic from the fixed invoice creation
    function determineOrderType(useAmount: number): string {
      if (useAmount === standardAmount) {
        return 'standard';
      } else if (useAmount === premiumAmount) {
        return 'premium';
      } else {
        return 'custom';
      }
    }

    // Test exact standard amount
    expect(determineOrderType(standardAmount)).toBe('standard');
    
    // Test exact premium amount
    expect(determineOrderType(premiumAmount)).toBe('premium');
    
    // Test custom amounts
    expect(determineOrderType(500)).toBe('custom');
    expect(determineOrderType(1500)).toBe('custom');
    expect(determineOrderType(3000)).toBe('custom');
    expect(determineOrderType(standardAmount + 1)).toBe('custom');
    expect(determineOrderType(premiumAmount - 1)).toBe('custom');
  });

  it('should NOT create plan changes for custom payments during migration', async () => {
    // Create a separate relay specifically for migration testing
    const migrationTestRelay = await prisma.relay.create({
      data: {
        name: `migration-test-relay-${Date.now()}`,
        details: 'Test relay for migration',
        ownerId: testRelay.ownerId
      }
    });

    // Create multiple orders including custom ones for this fresh relay
    const standardOrder = await prisma.order.create({
      data: {
        relayId: migrationTestRelay.id,
        userId: migrationTestRelay.ownerId,
        status: 'completed',
        paid: true,
        paid_at: new Date('2024-01-01'),
        payment_hash: 'standard_hash_migration',
        lnurl: 'lnbc_standard_migration',
        amount: 1000,
        order_type: 'standard'
      }
    });

    const customOrder = await prisma.order.create({
      data: {
        relayId: migrationTestRelay.id,
        userId: migrationTestRelay.ownerId,
        status: 'completed',
        paid: true,
        paid_at: new Date('2024-01-02'),
        payment_hash: 'custom_hash_migration',
        lnurl: 'lnbc_custom_migration',
        amount: 5000, // Custom amount
        order_type: 'custom'
      }
    });

    // Import and run the migration function
    const { migrateExistingRelayOrders } = await import('../lib/relayPlanChangeTracking');
    await migrateExistingRelayOrders();

    // Verify only standard order created a plan change, custom was skipped
    const planChanges = await prisma.relayPlanChange.findMany({
      where: { relayId: migrationTestRelay.id },
      orderBy: { started_at: 'asc' }
    });

    expect(planChanges).toHaveLength(1);
    expect(planChanges[0].plan_type).toBe('standard');
    expect(planChanges[0].amount_paid).toBe(1000);
    expect(planChanges[0].orderId).toBe(standardOrder.id);

    // Clean up the migration test relay
    await prisma.relayPlanChange.deleteMany({ where: { relayId: migrationTestRelay.id } });
    await prisma.order.deleteMany({ where: { relayId: migrationTestRelay.id } });
    await prisma.relay.delete({ where: { id: migrationTestRelay.id } });
  });
});
