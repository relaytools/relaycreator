// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Mock environment variables for testing
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'mysql://test:test@localhost:3307/relay_test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_INVOICE_AMOUNT = '21'
process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT = '2100'
process.env.PAYMENTS_ENABLED = 'false' // Disable payments for tests
process.env.NEXT_PUBLIC_CREATOR_DOMAIN = 'test.com'

// Ensure we're in Node.js environment for Prisma
process.env.NODE_ENV = 'test'

// Force Prisma to use Node.js client
if (typeof window !== 'undefined') {
  // This should not happen in Node.js test environment, but just in case
  throw new Error('Tests should run in Node.js environment, not browser')
}
