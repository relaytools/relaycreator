import { PrismaClient } from '@prisma/client'
import { calculateTimeBasedBalance } from '../lib/planChangeTracking'
import { calculateRelayTimeBasedBalance } from '../lib/relayPlanChangeTracking'

// Test database instance
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
})

describe('Combined Revenue Calculations (Client + Relay Orders)', () => {
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
        payment_amount: 1000,
        payment_premium_amount: 2100,
        status: 'running'
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
    await prisma.relayPlanChange.deleteMany({})
    await prisma.clientOrder.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.relay.deleteMany({})
    await prisma.user.deleteMany({})
  }

  // Helper function to simulate the serverStatus.tsx revenue calculation logic
  async function calculateAdminRevenueData(relayId: string) {
    const relay = await prisma.relay.findUnique({
      where: { id: relayId },
      include: {
        Order: true,
        ClientOrder: true,
        owner: true,
        RelayPlanChange: true,
      }
    })

    if (!relay) throw new Error('Relay not found')

    // Filter paid relay orders (Order table)
    const paidRelayOrders = relay.Order.filter(order => order.paid === true)
    const unpaidRelayOrders = relay.Order.filter(
      order => order.expires_at && order.expires_at > new Date() && order.paid === false
    )

    // Calculate total amount from paid relay orders
    const relayOrderRevenue = paidRelayOrders.reduce((sum, order) => sum + order.amount, 0)

    // Filter paid client orders (ClientOrder table)
    const paidClientOrders = relay.ClientOrder.filter(order => order.paid === true)
    const unpaidClientOrders = relay.ClientOrder.filter(
      order => order.expires_at && order.expires_at > new Date() && order.paid === false
    )

    // Calculate total amount from paid client orders
    const clientOrderRevenue = paidClientOrders.reduce((sum, order) => sum + order.amount, 0)

    // Calculate unified balance using the same logic as serverStatus.tsx
    const balance = await calculateTimeBasedBalance(relay.id, relay.owner.pubkey)

    return {
      relayId: relay.id,
      relayName: relay.name,
      owner: relay.owner.pubkey,
      relayOrderRevenue,      // Revenue from relay payments (Order table)
      clientOrderRevenue,     // Revenue from client memberships (ClientOrder table)  
      totalRevenue: relayOrderRevenue + clientOrderRevenue,
      balance,
      paidRelayOrders: paidRelayOrders.length,
      unpaidRelayOrders: unpaidRelayOrders.length,
      paidClientOrders: paidClientOrders.length,
      unpaidClientOrders: unpaidClientOrders.length
    }
  }

  describe('Revenue Calculation Tests', () => {
    test('should calculate revenue from relay orders only', async () => {
      // Create paid relay orders (Order table)
      const relayOrder1 = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'relay_hash_1',
          lnurl: 'relay_lnurl_1',
          amount: 1000,
          order_type: 'standard'
        }
      })

      const relayOrder2 = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'relay_hash_2',
          lnurl: 'relay_lnurl_2',
          amount: 2100,
          order_type: 'premium'
        }
      })

      const revenueData = await calculateAdminRevenueData(testRelay.id)

      expect(revenueData.relayOrderRevenue).toBe(3100) // 1000 + 2100
      expect(revenueData.clientOrderRevenue).toBe(0)   // No client orders
      expect(revenueData.totalRevenue).toBe(3100)
      expect(revenueData.paidRelayOrders).toBe(2)
      expect(revenueData.paidClientOrders).toBe(0)
    })

    test('should calculate revenue from client orders only', async () => {
      // Create paid client orders (ClientOrder table)
      const clientOrder1 = await prisma.clientOrder.create({
        data: {
          amount: 500,
          relayId: testRelay.id,
          pubkey: testPubkey2, // Different user subscribing to the relay
          paid: true,
          paid_at: new Date(),
          payment_hash: 'client_hash_1',
          lnurl: 'client_lnurl_1',
          order_type: 'custom'
        }
      })

      const clientOrder2 = await prisma.clientOrder.create({
        data: {
          amount: 1000,
          relayId: testRelay.id,
          pubkey: testPubkey2,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'client_hash_2',
          lnurl: 'client_lnurl_2',
          order_type: 'standard'
        }
      })

      const revenueData = await calculateAdminRevenueData(testRelay.id)

      expect(revenueData.relayOrderRevenue).toBe(0)    // No relay orders
      expect(revenueData.clientOrderRevenue).toBe(1500) // 500 + 1000
      expect(revenueData.totalRevenue).toBe(1500)
      expect(revenueData.paidRelayOrders).toBe(0)
      expect(revenueData.paidClientOrders).toBe(2)
    })

    test('should calculate combined revenue from both relay and client orders', async () => {
      // Create paid relay orders (Order table) - relay owner payments
      const relayOrder = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'relay_hash_combined',
          lnurl: 'relay_lnurl_combined',
          amount: 2100,
          order_type: 'premium'
        }
      })

      // Create paid client orders (ClientOrder table) - client memberships
      const clientOrder1 = await prisma.clientOrder.create({
        data: {
          amount: 1000,
          relayId: testRelay.id,
          pubkey: testPubkey2, // Client subscribing to relay
          paid: true,
          paid_at: new Date(),
          payment_hash: 'client_hash_combined_1',
          lnurl: 'client_lnurl_combined_1',
          order_type: 'standard'
        }
      })

      const clientOrder2 = await prisma.clientOrder.create({
        data: {
          amount: 2100,
          relayId: testRelay.id,
          pubkey: 'another_client_pubkey_12345', // Another client
          paid: true,
          paid_at: new Date(),
          payment_hash: 'client_hash_combined_2',
          lnurl: 'client_lnurl_combined_2',
          order_type: 'premium'
        }
      })

      const revenueData = await calculateAdminRevenueData(testRelay.id)

      expect(revenueData.relayOrderRevenue).toBe(2100)  // Relay owner payment
      expect(revenueData.clientOrderRevenue).toBe(3100) // Client memberships: 1000 + 2100
      expect(revenueData.totalRevenue).toBe(5200)       // Combined: 2100 + 3100
      expect(revenueData.paidRelayOrders).toBe(1)
      expect(revenueData.paidClientOrders).toBe(2)
    })

    test('should exclude unpaid orders from revenue calculations', async () => {
      const now = new Date()
      const futureExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

      // Create paid orders
      await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: now,
          payment_hash: 'paid_relay_hash',
          lnurl: 'paid_relay_lnurl',
          amount: 1000,
          order_type: 'standard'
        }
      })

      await prisma.clientOrder.create({
        data: {
          amount: 500,
          relayId: testRelay.id,
          pubkey: testPubkey2,
          paid: true,
          paid_at: now,
          payment_hash: 'paid_client_hash',
          lnurl: 'paid_client_lnurl',
          order_type: 'custom'
        }
      })

      // Create unpaid orders (should be excluded from revenue)
      await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'pending',
          paid: false,
          expires_at: futureExpiry,
          payment_hash: 'unpaid_relay_hash',
          lnurl: 'unpaid_relay_lnurl',
          amount: 2100,
          order_type: 'premium'
        }
      })

      await prisma.clientOrder.create({
        data: {
          amount: 1000,
          relayId: testRelay.id,
          pubkey: testPubkey2,
          paid: false,
          expires_at: futureExpiry,
          payment_hash: 'unpaid_client_hash',
          lnurl: 'unpaid_client_lnurl',
          order_type: 'standard'
        }
      })

      const revenueData = await calculateAdminRevenueData(testRelay.id)

      // Should only count paid orders
      expect(revenueData.relayOrderRevenue).toBe(1000)  // Only paid relay order
      expect(revenueData.clientOrderRevenue).toBe(500)  // Only paid client order
      expect(revenueData.totalRevenue).toBe(1500)       // Combined paid only
      expect(revenueData.paidRelayOrders).toBe(1)
      expect(revenueData.paidClientOrders).toBe(1)
      expect(revenueData.unpaidRelayOrders).toBe(1)
      expect(revenueData.unpaidClientOrders).toBe(1)
    })
  })

  describe('Admin Invoice Display Logic Tests', () => {
    test('should match serverStatus.tsx revenue calculation format', async () => {
      // Create test data similar to production scenario
      const relayOrder = await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'admin_test_relay',
          lnurl: 'admin_test_relay_lnurl',
          amount: 1000,
          order_type: 'standard'
        }
      })

      const clientOrder = await prisma.clientOrder.create({
        data: {
          amount: 2100,
          relayId: testRelay.id,
          pubkey: testPubkey2,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'admin_test_client',
          lnurl: 'admin_test_client_lnurl',
          order_type: 'premium'
        }
      })

      const revenueData = await calculateAdminRevenueData(testRelay.id)

      // Verify the data structure matches what adminInvoices.tsx expects
      expect(revenueData).toHaveProperty('relayId')
      expect(revenueData).toHaveProperty('relayName')
      expect(revenueData).toHaveProperty('owner')
      expect(revenueData).toHaveProperty('clientOrderRevenue') // Maps to "clientPayments" in UI
      expect(revenueData).toHaveProperty('totalRevenue') // Should be sum of both revenue types
      expect(revenueData).toHaveProperty('balance')

      // Verify values
      expect(revenueData.clientOrderRevenue).toBe(2100) // Client membership revenue
      expect(revenueData.relayOrderRevenue).toBe(1000)  // Relay owner payment revenue
      expect(revenueData.totalRevenue).toBe(3100)       // Combined for admin display
    })

    test('should correctly calculate total revenue for admin statistics', async () => {
      // Simulate multiple relays with different revenue patterns
      const testRelay2 = await prisma.relay.create({
        data: {
          name: `test_relay_2_${Date.now()}`,
          ownerId: testUser2.id,
          payment_amount: 1000,
          payment_premium_amount: 2100,
          status: 'running'
        }
      })

      // Relay 1: Has both relay and client orders
      await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'stats_relay1_order',
          lnurl: 'stats_relay1_lnurl',
          amount: 1000,
          order_type: 'standard'
        }
      })

      await prisma.clientOrder.create({
        data: {
          amount: 500,
          relayId: testRelay.id,
          pubkey: testPubkey2,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'stats_relay1_client',
          lnurl: 'stats_relay1_client_lnurl',
          order_type: 'custom'
        }
      })

      // Relay 2: Has only client orders
      await prisma.clientOrder.create({
        data: {
          amount: 2100,
          relayId: testRelay2.id,
          pubkey: testPubkey,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'stats_relay2_client',
          lnurl: 'stats_relay2_client_lnurl',
          order_type: 'premium'
        }
      })

      const relay1Revenue = await calculateAdminRevenueData(testRelay.id)
      const relay2Revenue = await calculateAdminRevenueData(testRelay2.id)

      // Relay 1 totals
      expect(relay1Revenue.totalRevenue).toBe(1500) // 1000 + 500

      // Relay 2 totals  
      expect(relay2Revenue.totalRevenue).toBe(2100) // 0 + 2100

      // Combined platform revenue
      const totalPlatformRevenue = relay1Revenue.totalRevenue + relay2Revenue.totalRevenue
      expect(totalPlatformRevenue).toBe(3600) // 1500 + 2100

      // Verify breakdown
      const totalRelayOrderRevenue = relay1Revenue.relayOrderRevenue + relay2Revenue.relayOrderRevenue
      const totalClientOrderRevenue = relay1Revenue.clientOrderRevenue + relay2Revenue.clientOrderRevenue
      
      expect(totalRelayOrderRevenue).toBe(1000)  // Only relay 1 had relay orders
      expect(totalClientOrderRevenue).toBe(2600) // 500 + 2100 from client orders
      expect(totalRelayOrderRevenue + totalClientOrderRevenue).toBe(totalPlatformRevenue)
    })
  })

  describe('Edge Cases and Data Integrity', () => {
    test('should handle expired unpaid orders correctly', async () => {
      const now = new Date()
      const pastExpiry = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

      // Create expired unpaid orders (should not affect revenue)
      await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'expired',
          paid: false,
          expires_at: pastExpiry,
          payment_hash: 'expired_relay_hash',
          lnurl: 'expired_relay_lnurl',
          amount: 1000,
          order_type: 'standard'
        }
      })

      await prisma.clientOrder.create({
        data: {
          amount: 500,
          relayId: testRelay.id,
          pubkey: testPubkey2,
          paid: false,
          expires_at: pastExpiry,
          payment_hash: 'expired_client_hash',
          lnurl: 'expired_client_lnurl',
          order_type: 'custom'
        }
      })

      const revenueData = await calculateAdminRevenueData(testRelay.id)

      expect(revenueData.relayOrderRevenue).toBe(0)
      expect(revenueData.clientOrderRevenue).toBe(0)
      expect(revenueData.totalRevenue).toBe(0)
      expect(revenueData.unpaidRelayOrders).toBe(0) // Expired orders not counted as "unpaid"
      expect(revenueData.unpaidClientOrders).toBe(0)
    })

    test('should handle large revenue amounts without overflow', async () => {
      const largeAmount = 999999999 // Large but valid amount

      await prisma.order.create({
        data: {
          relayId: testRelay.id,
          userId: testUser.id,
          status: 'paid',
          paid: true,
          paid_at: new Date(),
          payment_hash: 'large_relay_hash',
          lnurl: 'large_relay_lnurl',
          amount: largeAmount,
          order_type: 'premium'
        }
      })

      await prisma.clientOrder.create({
        data: {
          amount: largeAmount,
          relayId: testRelay.id,
          pubkey: testPubkey2,
          paid: true,
          paid_at: new Date(),
          payment_hash: 'large_client_hash',
          lnurl: 'large_client_lnurl',
          order_type: 'premium'
        }
      })

      const revenueData = await calculateAdminRevenueData(testRelay.id)

      expect(revenueData.relayOrderRevenue).toBe(largeAmount)
      expect(revenueData.clientOrderRevenue).toBe(largeAmount)
      expect(revenueData.totalRevenue).toBe(largeAmount * 2)
      expect(revenueData.totalRevenue).toBeGreaterThan(0)
    })
  })
})
