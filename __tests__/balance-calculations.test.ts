import { PrismaClient } from '@prisma/client'
import { 
  recordRelayPlanChange, 
  getRelayPlanHistory, 
  calculateRelayTimeBasedBalance,
  getCurrentRelayPlan,
  migrateExistingRelayOrders
} from '../lib/relayPlanChangeTracking'

// Test database instance
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
})

describe('Balance Calculations with Plan Changes', () => {
  let testRelay: any
  let testUser: any
  let testPubkey: string

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData()
  })

  beforeEach(async () => {
    // Create fresh test data for each test
    testPubkey = '7a0c885e1fdc340b0fe8f69b8edcabc171cb41423040d7a32228f23221bd89d7'
    
    testUser = await prisma.user.create({
      data: {
        pubkey: testPubkey
      }
    })

    testRelay = await prisma.relay.create({
      data: {
        name: `test_relay_${Date.now()}`,
        ownerId: testUser.id,
        payment_amount: 21,
        payment_premium_amount: 2100
      }
    })
  })

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  async function cleanupTestData() {
    // Delete in correct order to avoid foreign key constraints
    await prisma.relayPlanChange.deleteMany({
      where: { relayId: testRelay?.id }
    })
    await prisma.order.deleteMany({
      where: { relayId: testRelay?.id }
    })
    await prisma.allowList.deleteMany({
      where: { relayId: testRelay?.id }
    })
    await prisma.blockList.deleteMany({
      where: { relayId: testRelay?.id }
    })
    if (testRelay) {
      await prisma.relay.delete({
        where: { id: testRelay.id }
      })
    }
    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id }
      })
    }
  }

  describe('New Relay Creation', () => {
    test('should create standard plan relay with correct initial balance', async () => {
      // Create initial standard order
      const order = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'test_hash_1',
          lnurl: 'test_lnurl_1',
          amount: 21,
          order_type: 'standard'
        }
      })

      // Record plan change
      await recordRelayPlanChange(testRelay.id, 'standard', 21, order.id)

      // Check current plan
      const currentPlan = await getCurrentRelayPlan(testRelay.id)
      expect(currentPlan?.plan_type).toBe('standard')
      expect(currentPlan?.amount_paid).toBe(21)

      // Calculate balance (should be positive since just paid)
      const balance = await calculateRelayTimeBasedBalance(testRelay.id)
      expect(balance).toBeGreaterThan(0)
    })

    test('should create premium plan relay with correct initial balance', async () => {
      // Create initial premium order
      const order = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'test_hash_2',
          lnurl: 'test_lnurl_2',
          amount: 2100,
          order_type: 'premium'
        }
      })

      // Record plan change
      await recordRelayPlanChange(testRelay.id, 'premium', 2100, order.id)

      // Check current plan
      const currentPlan = await getCurrentRelayPlan(testRelay.id)
      expect(currentPlan?.plan_type).toBe('premium')
      expect(currentPlan?.amount_paid).toBe(2100)

      // Calculate balance (should be much higher than standard)
      const balance = await calculateRelayTimeBasedBalance(testRelay.id)
      expect(balance).toBeGreaterThan(1000) // Should have significant positive balance
    })
  })

  describe('Plan Upgrades and Downgrades', () => {
    test('should handle standard to premium upgrade correctly', async () => {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Create initial standard order (1 week ago)
      const standardOrder = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: oneWeekAgo,
          payment_hash: 'test_hash_standard',
          lnurl: 'test_lnurl_standard',
          amount: 21,
          order_type: 'standard'
        }
      })

      // Record initial standard plan
      await recordRelayPlanChange(testRelay.id, 'standard', 21, standardOrder.id)

      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))

      // Create premium upgrade order (now)
      const premiumOrder = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: now,
          payment_hash: 'test_hash_premium',
          lnurl: 'test_lnurl_premium',
          amount: 2100,
          order_type: 'premium'
        }
      })

      // Record premium upgrade
      await recordRelayPlanChange(testRelay.id, 'premium', 2100, premiumOrder.id)

      // Check plan history
      const history = await getRelayPlanHistory(testRelay.id)
      expect(history).toHaveLength(2)
      
      // First period should be standard
      expect(history[0].plan_type).toBe('standard')
      expect(history[0].ended_at).not.toBeNull()
      
      // Second period should be premium and current
      expect(history[1].plan_type).toBe('premium')
      expect(history[1].ended_at).toBeNull()

      // Current plan should be premium
      const currentPlan = await getCurrentRelayPlan(testRelay.id)
      expect(currentPlan?.plan_type).toBe('premium')

      // Balance should account for both periods
      const balance = await calculateRelayTimeBasedBalance(testRelay.id)
      expect(balance).toBeDefined()
      expect(typeof balance).toBe('number')
    })

    test('should handle premium to standard downgrade correctly', async () => {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Create initial premium order
      const premiumOrder = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: oneWeekAgo,
          payment_hash: 'test_hash_premium_first',
          lnurl: 'test_lnurl_premium_first',
          amount: 2100,
          order_type: 'premium'
        }
      })

      await recordRelayPlanChange(testRelay.id, 'premium', 2100, premiumOrder.id)

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 10))

      // Create standard downgrade order
      const standardOrder = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: now,
          payment_hash: 'test_hash_standard_downgrade',
          lnurl: 'test_lnurl_standard_downgrade',
          amount: 21,
          order_type: 'standard'
        }
      })

      await recordRelayPlanChange(testRelay.id, 'standard', 21, standardOrder.id)

      // Check plan history
      const history = await getRelayPlanHistory(testRelay.id)
      expect(history).toHaveLength(2)
      
      // First period should be premium (ended)
      expect(history[0].plan_type).toBe('premium')
      expect(history[0].ended_at).not.toBeNull()
      
      // Second period should be standard (current)
      expect(history[1].plan_type).toBe('standard')
      expect(history[1].ended_at).toBeNull()

      // Current plan should be standard
      const currentPlan = await getCurrentRelayPlan(testRelay.id)
      expect(currentPlan?.plan_type).toBe('standard')
    })
  })

  describe('Balance Accuracy Over Time', () => {
    test('should calculate accurate balance with multiple plan changes', async () => {
      const now = new Date()
      const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Week 1: Standard plan (21 sats)
      const order1 = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: threeWeeksAgo,
          payment_hash: 'test_hash_1',
          lnurl: 'test_lnurl_1',
          amount: 21,
          order_type: 'standard'
        }
      })
      await recordRelayPlanChange(testRelay.id, 'standard', 21, order1.id)

      await new Promise(resolve => setTimeout(resolve, 10))

      // Week 2: Upgrade to Premium (2100 sats)
      const order2 = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: twoWeeksAgo,
          payment_hash: 'test_hash_2',
          lnurl: 'test_lnurl_2',
          amount: 2100,
          order_type: 'premium'
        }
      })
      await recordRelayPlanChange(testRelay.id, 'premium', 2100, order2.id)

      await new Promise(resolve => setTimeout(resolve, 10))

      // Week 3: Another Premium payment (2100 sats)
      const order3 = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: oneWeekAgo,
          payment_hash: 'test_hash_3',
          lnurl: 'test_lnurl_3',
          amount: 2100,
          order_type: 'premium'
        }
      })
      await recordRelayPlanChange(testRelay.id, 'premium', 2100, order3.id)

      // Check plan history
      const history = await getRelayPlanHistory(testRelay.id)
      expect(history.length).toBeGreaterThanOrEqual(2)

      // Calculate balance
      const balance = await calculateRelayTimeBasedBalance(testRelay.id)
      expect(balance).toBeDefined()
      
      // Total payments: 21 + 2100 + 2100 = 4221 sats
      // Should have positive balance since payments are recent
      expect(balance).toBeGreaterThan(0)
    })

    test('should show negative balance when service time exceeds payments', async () => {
      const now = new Date()
      const longTimeAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) // 60 days ago

      // Create old standard payment
      const order = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: longTimeAgo,
          payment_hash: 'test_hash_old',
          lnurl: 'test_lnurl_old',
          amount: 21,
          order_type: 'standard'
        }
      })

      // Record plan change with the old timestamp
      await recordRelayPlanChange(testRelay.id, 'standard', 21, order.id, longTimeAgo)
      
      // Calculate balance (should be negative after 60 days)
      // 21 sats for 30 days = 0.7 sats/day
      // After 60 days: 60 * 0.7 = 42 sats cost
      // Balance: 21 - 42 = -21 sats
      const balance = await calculateRelayTimeBasedBalance(testRelay.id)
      
      expect(balance).toBeLessThan(0)
    })
  })

  describe('Migration and Data Integrity', () => {
    test('should migrate existing orders to plan change tracking', async () => {
      // Create orders without plan change tracking (simulating old data)
      const order1 = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          payment_hash: 'migration_test_1',
          lnurl: 'migration_lnurl_1',
          amount: 21,
          order_type: 'standard'
        }
      })

      const order2 = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'migration_test_2',
          lnurl: 'migration_lnurl_2',
          amount: 2100,
          order_type: 'premium'
        }
      })

      // Verify no plan changes exist yet
      const beforeMigration = await getRelayPlanHistory(testRelay.id)
      expect(beforeMigration).toHaveLength(0)

      // Run migration
      await migrateExistingRelayOrders()

      // Verify plan changes were created
      const afterMigration = await getRelayPlanHistory(testRelay.id)
      expect(afterMigration.length).toBeGreaterThan(0)

      // Verify current plan is correct
      const currentPlan = await getCurrentRelayPlan(testRelay.id)
      expect(currentPlan?.plan_type).toBe('premium')
    })

    test('should not duplicate plan changes on repeated migration', async () => {
      // Create order and migrate once
      const order = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'duplicate_test',
          lnurl: 'duplicate_lnurl',
          amount: 21,
          order_type: 'standard'
        }
      })

      await migrateExistingRelayOrders()
      const firstMigration = await getRelayPlanHistory(testRelay.id)
      const firstCount = firstMigration.length

      // Run migration again
      await migrateExistingRelayOrders()
      const secondMigration = await getRelayPlanHistory(testRelay.id)
      
      // Should have same number of plan changes
      expect(secondMigration).toHaveLength(firstCount)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle relay with no orders', async () => {
      const balance = await calculateRelayTimeBasedBalance(testRelay.id)
      expect(balance).toBeNull() // Function returns null when no plan history exists

      const currentPlan = await getCurrentRelayPlan(testRelay.id)
      expect(currentPlan).toBeNull()

      const history = await getRelayPlanHistory(testRelay.id)
      expect(history).toHaveLength(0)
    })

    test('should handle unpaid orders correctly', async () => {
      // Create unpaid order
      await prisma.order.create({
        data: {
          userId: testUser.id,
          id: 'unpaid-order-' + Date.now(),
          relayId: testRelay.id,
          amount: 21,
          paid: false,
          status: 'pending',
          order_type: 'standard',
          payment_hash: 'test-pay-hash',
          lnurl: 'test-lnurl'
        }
      })

      // Should not affect balance or plan
      const balance = await calculateRelayTimeBasedBalance(testRelay.id)
      expect(balance).toBeNull() // No paid orders means no plan history

      const currentPlan = await getCurrentRelayPlan(testRelay.id)
      expect(currentPlan).toBeNull()
    })

    test('should handle custom payment amounts', async () => {
      const customAmount = 500

      const order = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'custom_test',
          lnurl: 'custom_lnurl',
          amount: customAmount,
          order_type: 'custom'
        }
      })

      await recordRelayPlanChange(testRelay.id, 'custom', customAmount, order.id)

      const currentPlan = await getCurrentRelayPlan(testRelay.id)
      expect(currentPlan?.plan_type).toBe('custom')
      expect(currentPlan?.amount_paid).toBe(customAmount)

      const balance = await calculateRelayTimeBasedBalance(testRelay.id)
      expect(balance).toBeGreaterThan(0)
    })
  })
})
