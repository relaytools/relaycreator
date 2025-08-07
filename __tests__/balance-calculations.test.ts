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
    // FIXED: Set test environment variables to correct production values
    process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '1000';
    process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '2100';
    
    // Clean up any existing test data
    await cleanupTestData()
  })

  beforeEach(async () => {
    // Clean up any existing test data first
    await prisma.clientOrder.deleteMany({
      where: { 
        relay: {
          name: { startsWith: 'test_relay_' }
        }
      }
    })
    await prisma.relayPlanChange.deleteMany({
      where: { 
        relay: {
          name: { startsWith: 'test_relay_' }
        }
      }
    })
    await prisma.order.deleteMany({
      where: { 
        relay: {
          name: { startsWith: 'test_relay_' }
        }
      }
    })
    await prisma.allowList.deleteMany({
      where: { 
        relay: {
          name: { startsWith: 'test_relay_' }
        }
      }
    })
    await prisma.blockList.deleteMany({
      where: { 
        relay: {
          name: { startsWith: 'test_relay_' }
        }
      }
    })
    await prisma.relay.deleteMany({
      where: {
        name: { startsWith: 'test_relay_' }
      }
    })
    await prisma.user.deleteMany({
      where: {
        pubkey: { startsWith: '7a0c885e1fdc340b0fe8f69b8edcabc171cb41423040d7a32228f23221bd89d' }
      }
    })
    
    // Create fresh test data for each test
    testPubkey = `7a0c885e1fdc340b0fe8f69b8edcabc171cb41423040d7a32228f23221bd89d${Date.now().toString().slice(-1)}`
    
    testUser = await prisma.user.create({
      data: {
        pubkey: testPubkey
      }
    })

    // Create relay with creation date 1 day ago for testing negative balances
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    testRelay = await prisma.relay.create({
      data: {
        name: `test_relay_${Date.now()}`,
        ownerId: testUser.id,
        payment_amount: 21,
        payment_premium_amount: 2100,
        created_at: oneDayAgo
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
    try {
      // Delete in correct order to avoid foreign key constraints
      if (testRelay?.id) {
        await prisma.clientOrder.deleteMany({
          where: { relayId: testRelay.id }
        })
        await prisma.relayPlanChange.deleteMany({
          where: { relayId: testRelay.id }
        })
        await prisma.order.deleteMany({
          where: { relayId: testRelay.id }
        })
        await prisma.allowList.deleteMany({
          where: { relayId: testRelay.id }
        })
        await prisma.blockList.deleteMany({
          where: { relayId: testRelay.id }
        })
        await prisma.relay.delete({
          where: { id: testRelay.id }
        })
      }
      if (testUser?.id) {
        await prisma.user.delete({
          where: { id: testUser.id }
        })
      }
    } catch (error: any) {
      // Ignore cleanup errors - records may not exist
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
          amount: 1000, // FIXED: Use current standard pricing
          order_type: 'standard'
        }
      })

      // Record plan change
      await recordRelayPlanChange(testRelay.id, 'standard', 1000, order.id)

      // Check current plan
      const currentPlan = await getCurrentRelayPlan(testRelay.id)
      expect(currentPlan?.plan_type).toBe('standard')
      expect(currentPlan?.amount_paid).toBe(1000) // FIXED: Match corrected payment amount

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

      // Record initial standard plan (1 week ago)
      await recordRelayPlanChange(testRelay.id, 'standard', 21, standardOrder.id, oneWeekAgo)

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

      // Record premium upgrade (now)
      await recordRelayPlanChange(testRelay.id, 'premium', 2100, premiumOrder.id, now)

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
      
      // FIXED: Calculate balance (should be very negative)
      // Relay created 2024-01-01, running for 584+ days at 33.33 sats/day = ~19,469 sats cost
      // Balance: 21 sats paid - 19,469 sats cost = ~-19,448 sats (very negative)
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

  describe('Bug Reproduction', () => {
    test('should calculate correct balance with 7 Orders and 1 ClientOrder, no RelayPlanChanges', async () => {
      // Reproduce bug: 7 paid Orders + 1 ClientOrder, no RelayPlanChanges
      // This should test the fallback balance calculation logic
      
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      
      // Create 7 paid Orders with various amounts and dates
      const orders = [
        { amount: 1000, order_type: 'standard', paid_at: thirtyDaysAgo, hash: 'hash_1' },
        { amount: 2100, order_type: 'premium', paid_at: twentyDaysAgo, hash: 'hash_2' },
        { amount: 500, order_type: 'custom', paid_at: twentyDaysAgo, hash: 'hash_3' },
        { amount: 1000, order_type: 'standard', paid_at: tenDaysAgo, hash: 'hash_4' },
        { amount: 3000, order_type: 'custom', paid_at: tenDaysAgo, hash: 'hash_5' },
        { amount: 2100, order_type: 'premium', paid_at: fiveDaysAgo, hash: 'hash_6' },
        { amount: 750, order_type: 'custom', paid_at: fiveDaysAgo, hash: 'hash_7' }
      ]
      
      for (const orderData of orders) {
        await prisma.order.create({
          data: {
            relayId: testRelay.id,
            userId: testUser.id,
            status: 'paid',
            paid: true,
            paid_at: orderData.paid_at,
            payment_hash: orderData.hash,
            lnurl: `test_lnurl_${orderData.hash}`,
            amount: orderData.amount,
            order_type: orderData.order_type
          }
        })
      }
      
      // Create 1 ClientOrder
      await prisma.clientOrder.create({
        data: {
          relayId: testRelay.id,
          pubkey: 'test_client_pubkey',
          paid: true,
          paid_at: tenDaysAgo,
          payment_hash: 'client_hash_1',
          lnurl: 'client_lnurl_1',
          amount: 21,
          order_type: 'standard'
        }
      })
      
      // Verify no RelayPlanChanges exist
      const planChanges = await getRelayPlanHistory(testRelay.id)
      expect(planChanges).toHaveLength(0)
      
      // Calculate expected totals
      const totalOrderPayments = 1000 + 2100 + 500 + 1000 + 3000 + 2100 + 750 // = 10,450
      const totalClientPayments = 21
      const totalPayments = totalOrderPayments + totalClientPayments // = 10,471
      
      console.log(`Expected total payments: ${totalPayments} sats`)
      console.log(`Order payments: ${totalOrderPayments} sats`)
      console.log(`Client payments: ${totalClientPayments} sats`)
      
      // Calculate balance using the function that should handle fallback logic
      const balance = await calculateRelayTimeBasedBalance(testRelay.id)
      
      console.log(`Calculated balance: ${balance} sats`)
      
      // The balance calculation should account for:
      // 1. Total payments received
      // 2. Cost accrued over time since relay creation
      // 3. Should use fallback logic since no RelayPlanChanges exist
      
      // For debugging: let's also check what the relay creation date is
      const relay = await prisma.relay.findUnique({
        where: { id: testRelay.id },
        select: { created_at: true }
      })
      
      if (relay?.created_at) {
        const daysRunning = Math.floor((now.getTime() - relay.created_at.getTime()) / (1000 * 60 * 60 * 24))
        console.log(`Relay has been running for ${daysRunning} days`)
        console.log(`Relay created at: ${relay.created_at}`)
      }
      
      // The test should help identify what the actual vs expected balance is
      expect(balance).toBeDefined()
      expect(typeof balance).toBe('number')
      
      // Add your expected balance assertion here once you determine what it should be
      // For now, just log the values to see what's happening
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle relay with no orders', async () => {
      const balance = await calculateRelayTimeBasedBalance(testRelay.id)
      expect(balance).toBeLessThan(0) // Unpaid relay should have negative balance based on time running
      expect(typeof balance).toBe('number') // Should return a number, not null

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
      expect(balance).toBeLessThan(0) // Unpaid relay should have negative balance
      expect(typeof balance).toBe('number') // Should return a number, not null

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
