import { PrismaClient } from '@prisma/client'
import { 
  recordPlanChange, 
  getUserPlanHistory, 
  calculateTimeBasedBalance,
  getCurrentPlan,
  migrateExistingSubscriptions
} from '../lib/planChangeTracking'

// Test database instance
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
})

describe('Client Orders Balance Calculations with Plan Changes', () => {
  let testRelay: any
  let testUser: any
  let testUser2: any
  let testPubkey: string
  let testPubkey2: string

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData()
  })

  beforeEach(async () => {
    // Create fresh test data for each test
    testPubkey = '7a0c885e1fdc340b0fe8f69b8edcabc171cb41423040d7a32228f23221bd89d7'
    testPubkey2 = '8b1d996f2efd451c1cf7f70c9f2e3dbc282dc52534051e8b43339f34332cae8e'
    
    testUser = await prisma.user.create({
      data: {
        pubkey: testPubkey
      }
    })

    testUser2 = await prisma.user.create({
      data: {
        pubkey: testPubkey2
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
    await prisma.planChange.deleteMany({})
    await prisma.clientOrder.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.relayPlanChange.deleteMany({})
    await prisma.relay.deleteMany({})
    await prisma.user.deleteMany({})
  }

  describe('Basic Client Subscription Tests', () => {
    test('should create standard plan client subscription with correct initial balance', async () => {
      // Create initial standard client order
      const clientOrder = await prisma.clientOrder.create({
        data: {
          amount: 21,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'test_hash_standard',
          lnurl: 'test_lnurl_standard',
          order_type: 'standard'
        }
      })

      // Record plan change for the subscription
      await recordPlanChange(testRelay.id, testPubkey, 'standard', 21, clientOrder.id)

      // Get plan history
      const planHistory = await getUserPlanHistory(testRelay.id, testPubkey)
      expect(planHistory).toHaveLength(1)
      expect(planHistory[0].plan_type).toBe('standard')
      expect(planHistory[0].amount_paid).toBe(21)

      // Calculate balance (should be positive initially)
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      expect(balance).toBeGreaterThan(0)
      expect(balance).toBeLessThanOrEqual(21)
    })

    test('should create premium plan client subscription with correct initial balance', async () => {
      // Create initial premium client order
      const clientOrder = await prisma.clientOrder.create({
        data: {
          amount: 2100,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'test_hash_premium',
          lnurl: 'test_lnurl_premium',
          order_type: 'premium'
        }
      })

      // Record plan change for the subscription
      await recordPlanChange(testRelay.id, testPubkey, 'premium', 2100, clientOrder.id)

      // Get plan history
      const planHistory = await getUserPlanHistory(testRelay.id, testPubkey)
      expect(planHistory).toHaveLength(1)
      expect(planHistory[0].plan_type).toBe('premium')
      expect(planHistory[0].amount_paid).toBe(2100)

      // Calculate balance (should be positive initially)
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      expect(balance).toBeGreaterThan(0)
      expect(balance).toBeLessThanOrEqual(2100)
    })

    test('should handle custom amount client subscription', async () => {
      const customAmount = 500
      
      // Create custom amount client order
      const clientOrder = await prisma.clientOrder.create({
        data: {
          amount: customAmount,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'test_hash_custom',
          lnurl: 'test_lnurl_custom',
          order_type: 'custom'
        }
      })

      // Record plan change for the subscription
      await recordPlanChange(testRelay.id, testPubkey, 'custom', customAmount, clientOrder.id)

      // Get plan history
      const planHistory = await getUserPlanHistory(testRelay.id, testPubkey)
      expect(planHistory).toHaveLength(1)
      expect(planHistory[0].plan_type).toBe('custom')
      expect(planHistory[0].amount_paid).toBe(customAmount)

      // Calculate balance
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      expect(balance).toBeGreaterThan(0)
      expect(balance).toBeLessThanOrEqual(customAmount)
    })
  })

  describe('Client Plan Upgrades and Downgrades', () => {
    test('should handle standard to premium upgrade correctly', async () => {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Create initial standard subscription
      const standardOrder = await prisma.clientOrder.create({
        data: {
          amount: 21,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: oneWeekAgo,
          payment_hash: 'test_hash_standard_upgrade',
          lnurl: 'test_lnurl_standard_upgrade',
          order_type: 'standard'
        }
      })

      // Record initial standard plan
      await recordPlanChange(testRelay.id, testPubkey, 'standard', 21, standardOrder.id)

      // Simulate upgrade to premium after one week
      const premiumOrder = await prisma.clientOrder.create({
        data: {
          amount: 2100,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: now,
          payment_hash: 'test_hash_premium_upgrade',
          lnurl: 'test_lnurl_premium_upgrade',
          order_type: 'premium'
        }
      })

      // Record upgrade to premium
      await recordPlanChange(testRelay.id, testPubkey, 'premium', 2100, premiumOrder.id)

      // Get plan history
      const planHistory = await getUserPlanHistory(testRelay.id, testPubkey)
      expect(planHistory).toHaveLength(2)
      
      // First period should be standard
      expect(planHistory[0].plan_type).toBe('standard')
      expect(planHistory[0].amount_paid).toBe(21)
      expect(planHistory[0].ended_at).not.toBeNull()
      
      // Second period should be premium
      expect(planHistory[1].plan_type).toBe('premium')
      expect(planHistory[1].amount_paid).toBe(2100)
      expect(planHistory[1].ended_at).toBeNull() // Current active plan

      // Calculate balance
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      expect(balance).toBeGreaterThan(0) // Should have positive balance from recent premium payment
    })

    test('should handle premium to standard downgrade correctly', async () => {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Create initial premium subscription
      const premiumOrder = await prisma.clientOrder.create({
        data: {
          amount: 2100,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: oneWeekAgo,
          payment_hash: 'test_hash_premium_downgrade',
          lnurl: 'test_lnurl_premium_downgrade',
          order_type: 'premium'
        }
      })

      // Record initial premium plan
      await recordPlanChange(testRelay.id, testPubkey, 'premium', 2100, premiumOrder.id)

      // Simulate downgrade to standard after one week
      const standardOrder = await prisma.clientOrder.create({
        data: {
          amount: 21,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: now,
          payment_hash: 'test_hash_standard_downgrade',
          lnurl: 'test_lnurl_standard_downgrade',
          order_type: 'standard'
        }
      })

      // Record downgrade to standard
      await recordPlanChange(testRelay.id, testPubkey, 'standard', 21, standardOrder.id)

      // Get plan history
      const planHistory = await getUserPlanHistory(testRelay.id, testPubkey)
      expect(planHistory).toHaveLength(2)
      
      // First period should be premium
      expect(planHistory[0].plan_type).toBe('premium')
      expect(planHistory[0].amount_paid).toBe(2100)
      expect(planHistory[0].ended_at).not.toBeNull()
      
      // Second period should be standard
      expect(planHistory[1].plan_type).toBe('standard')
      expect(planHistory[1].amount_paid).toBe(21)
      expect(planHistory[1].ended_at).toBeNull() // Current active plan

      // Calculate balance
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      expect(balance).toBeGreaterThan(0) // Should have positive balance from premium period
    })

    test('should handle multiple plan changes over time', async () => {
      const now = new Date()
      const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Create multiple client orders over time
      const order1 = await prisma.clientOrder.create({
        data: {
          amount: 21,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: threeWeeksAgo,
          payment_hash: 'test_hash_1',
          lnurl: 'test_lnurl_1',
          order_type: 'standard'
        }
      })

      const order2 = await prisma.clientOrder.create({
        data: {
          amount: 2100,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: twoWeeksAgo,
          payment_hash: 'test_hash_2',
          lnurl: 'test_lnurl_2',
          order_type: 'premium'
        }
      })

      const order3 = await prisma.clientOrder.create({
        data: {
          amount: 500,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: oneWeekAgo,
          payment_hash: 'test_hash_3',
          lnurl: 'test_lnurl_3',
          order_type: 'custom'
        }
      })

      // Record plan changes
      await recordPlanChange(testRelay.id, testPubkey, 'standard', 21, order1.id)
      await recordPlanChange(testRelay.id, testPubkey, 'premium', 2100, order2.id)
      await recordPlanChange(testRelay.id, testPubkey, 'custom', 500, order3.id)

      // Get plan history
      const planHistory = await getUserPlanHistory(testRelay.id, testPubkey)
      expect(planHistory).toHaveLength(3)
      
      // Verify plan progression
      expect(planHistory[0].plan_type).toBe('standard')
      expect(planHistory[1].plan_type).toBe('premium')
      expect(planHistory[2].plan_type).toBe('custom')
      
      // Only the last plan should be active
      expect(planHistory[0].ended_at).not.toBeNull()
      expect(planHistory[1].ended_at).not.toBeNull()
      expect(planHistory[2].ended_at).toBeNull()

      // Calculate balance
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      const totalPaid = 21 + 2100 + 500
      expect(balance).toBeLessThanOrEqual(totalPaid)
    })
  })

  describe('Time-Based Balance Calculations', () => {
    test('should calculate accurate balance with historical timestamps', async () => {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Create client order 30 days ago
      const clientOrder = await prisma.clientOrder.create({
        data: {
          amount: 21,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: thirtyDaysAgo,
          payment_hash: 'test_hash_30days',
          lnurl: 'test_lnurl_30days',
          order_type: 'standard'
        }
      })

      // Record plan change with historical timestamp
      await recordPlanChange(testRelay.id, testPubkey, 'standard', 21, clientOrder.id, thirtyDaysAgo)

      // Calculate balance (should be close to 0 after 30 days)
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      expect(balance).toBeCloseTo(0, 1) // Within 1 sat of 0
    })

    test('should allow negative balance when service time exceeds payment', async () => {
      const now = new Date()
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      // Create client order 60 days ago (payment for 30 days, but 60 days have passed)
      const clientOrder = await prisma.clientOrder.create({
        data: {
          amount: 21,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: sixtyDaysAgo,
          payment_hash: 'test_hash_60days',
          lnurl: 'test_lnurl_60days',
          order_type: 'standard'
        }
      })

      // Record plan change with historical timestamp
      await recordPlanChange(testRelay.id, testPubkey, 'standard', 21, clientOrder.id, sixtyDaysAgo)

      // Calculate balance (should be negative)
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      expect(balance).toBeLessThan(0)
      
      // Expected: 21 sats - (60 days × 0.7 sats/day) = 21 - 42 = -21 sats
      expect(balance).toBeCloseTo(-21, 1)
    })

    test('should handle premium plan time-based calculations correctly', async () => {
      const now = new Date()
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)

      // Create premium client order 15 days ago
      const clientOrder = await prisma.clientOrder.create({
        data: {
          amount: 2100,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: fifteenDaysAgo,
          payment_hash: 'test_hash_premium_15days',
          lnurl: 'test_lnurl_premium_15days',
          order_type: 'premium'
        }
      })

      // Record plan change with historical timestamp
      await recordPlanChange(testRelay.id, testPubkey, 'premium', 2100, clientOrder.id, fifteenDaysAgo)

      // Calculate balance
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      
      // Expected: 2100 sats - (15 days × 70 sats/day) = 2100 - 1050 = 1050 sats
      expect(balance).toBeCloseTo(1050, 1) // Within 1 sat
      expect(balance).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle unpaid client orders correctly', async () => {
      // Create unpaid client order
      const unpaidOrder = await prisma.clientOrder.create({
        data: {
          amount: 21,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: false,
          payment_hash: 'test_hash_unpaid',
          lnurl: 'test_lnurl_unpaid',
          order_type: 'standard'
        }
      })

      // Don't record plan change for unpaid order

      // Get plan history (should be empty)
      const planHistory = await getUserPlanHistory(testRelay.id, testPubkey)
      expect(planHistory).toHaveLength(0)

      // Calculate balance (should be 0 for no subscription history)
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      expect(balance).toBe(0)
    })

    test('should return 0 balance for user with no subscription history', async () => {
      // Calculate balance for user with no client orders
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      expect(balance).toBe(0)

      // Get plan history (should be empty)
      const planHistory = await getUserPlanHistory(testRelay.id, testPubkey)
      expect(planHistory).toHaveLength(0)

      // Get current plan (should be null)
      const currentPlan = await getCurrentPlan(testRelay.id, testPubkey)
      expect(currentPlan).toBeNull()
    })

    test('should handle multiple users with separate subscriptions', async () => {
      // Create subscriptions for both test users
      const order1 = await prisma.clientOrder.create({
        data: {
          amount: 21,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'test_hash_user1',
          lnurl: 'test_lnurl_user1',
          order_type: 'standard'
        }
      })

      const order2 = await prisma.clientOrder.create({
        data: {
          amount: 2100,
          relayId: testRelay.id,
          pubkey: testPubkey2,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'test_hash_user2',
          lnurl: 'test_lnurl_user2',
          order_type: 'premium'
        }
      })

      // Record plan changes for both users
      await recordPlanChange(testRelay.id, testPubkey, 'standard', 21, order1.id)
      await recordPlanChange(testRelay.id, testPubkey2, 'premium', 2100, order2.id)

      // Get plan histories (should be separate)
      const planHistory1 = await getUserPlanHistory(testRelay.id, testPubkey)
      const planHistory2 = await getUserPlanHistory(testRelay.id, testPubkey2)
      
      expect(planHistory1).toHaveLength(1)
      expect(planHistory2).toHaveLength(1)
      expect(planHistory1[0].plan_type).toBe('standard')
      expect(planHistory2[0].plan_type).toBe('premium')

      // Calculate balances (should be separate)
      const balance1 = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      const balance2 = await calculateTimeBasedBalance(testRelay.id, testPubkey2)
      
      expect(balance1).toBeGreaterThan(0)
      expect(balance2).toBeGreaterThan(0)
      expect(balance2).toBeGreaterThan(balance1) // Premium should have higher balance
    })
  })

  describe('Migration and Data Integrity', () => {
    test('should migrate existing client orders to plan change tracking', async () => {
      // Create client orders without plan change tracking (simulating old data)
      const order1 = await prisma.clientOrder.create({
        data: {
          amount: 21,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
          payment_hash: 'test_hash_migrate1',
          lnurl: 'test_lnurl_migrate1',
          order_type: 'standard'
        }
      })

      const order2 = await prisma.clientOrder.create({
        data: {
          amount: 2100,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          payment_hash: 'test_hash_migrate2',
          lnurl: 'test_lnurl_migrate2',
          order_type: 'premium'
        }
      })

      // Run migration
      await migrateExistingSubscriptions()

      // Verify plan changes were created
      const planHistory = await getUserPlanHistory(testRelay.id, testPubkey)
      expect(planHistory).toHaveLength(2)
      
      // Verify migration created correct plan periods
      expect(planHistory[0].plan_type).toBe('standard')
      expect(planHistory[0].amount_paid).toBe(21)
      expect(planHistory[0].ended_at).not.toBeNull() // Should be ended by second order
      
      expect(planHistory[1].plan_type).toBe('premium')
      expect(planHistory[1].amount_paid).toBe(2100)
      expect(planHistory[1].ended_at).toBeNull() // Should be current active plan

      // Calculate balance after migration
      const balance = await calculateTimeBasedBalance(testRelay.id, testPubkey)
      expect(balance).toBeGreaterThan(0)
    })

    test('should maintain data consistency with current plan tracking', async () => {
      // Create subscription with plan tracking
      const clientOrder = await prisma.clientOrder.create({
        data: {
          amount: 21,
          relayId: testRelay.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'test_hash_consistency',
          lnurl: 'test_lnurl_consistency',
          order_type: 'standard'
        }
      })

      await recordPlanChange(testRelay.id, testPubkey, 'standard', 21, clientOrder.id)

      // Get current plan
      const currentPlan = await getCurrentPlan(testRelay.id, testPubkey)
      expect(currentPlan).not.toBeNull()
      expect(currentPlan?.plan_type).toBe('standard')
      expect(currentPlan?.amount_paid).toBe(21)
      expect(currentPlan?.ended_at).toBeNull()

      // Verify plan history consistency
      const planHistory = await getUserPlanHistory(testRelay.id, testPubkey)
      expect(planHistory).toHaveLength(1)
      expect(planHistory[0].plan_type).toBe(currentPlan?.plan_type)
      expect(planHistory[0].amount_paid).toBe(currentPlan?.amount_paid)
    })
  })
})
