# Testing Guide for Premium Plan Balance Calculations

This document provides comprehensive testing instructions for the premium plan billing system and balance calculations.

## Setup

### Prerequisites

1. **Node.js and npm/yarn** installed
2. **MySQL database** for testing
3. **Environment variables** configured

### Installation

```bash
# Install dependencies including test dependencies
npm install

# Install additional test dependencies if not already present
npm install --save-dev @types/jest jest-environment-node ts-jest

# Or if using yarn
yarn install
yarn add --dev @types/jest jest-environment-node ts-jest
```

## Test Suites

### 1. Balance Calculations Test (`__tests__/balance-calculations.test.ts`)

**Purpose**: Tests relay owner billing logic and balance calculations with plan changes over time.

**Coverage**: 11 comprehensive tests covering:
- New relay creation with standard/premium plans
- Plan upgrades and downgrades
- Time-based balance calculations with historical timestamps
- Migration of existing orders to plan change tracking
- Edge cases and error handling

### 2. Client Orders Balance Test (`__tests__/client-orders-balance.test.ts`)

**Purpose**: Tests client subscription billing logic and balance calculations for both standard and premium plans.

**Coverage**: 15 comprehensive tests covering:
- Basic client subscription tests (standard, premium, custom amounts)
- Client plan upgrades and downgrades
- Time-based balance calculations with historical timestamps
- Multiple users with separate subscriptions
- Migration of existing client orders to plan tracking
- Edge cases (unpaid orders, no subscription history)

## Test Scenarios

### Balance Calculation Tests

#### Relay Owner Tests (`balance-calculations.test.ts`)
1. **New Relay Creation**
   - Standard plan relay with correct initial balance
   - Premium plan relay with correct initial balance

2. **Plan Upgrades and Downgrades**
   - Standard to premium upgrade
   - Premium to standard downgrade

3. **Balance Accuracy Over Time**
   - Multiple plan changes with accurate billing
   - Historical timestamp handling
   - Negative balances when service exceeds payments

4. **Migration and Data Integrity**
   - Existing order migration to plan tracking
   - Data consistency validation

5. **Edge Cases**
   - Unpaid orders handling
   - No plan history scenarios
   - Error handling and fallbacks

#### Client Subscription Tests (`client-orders-balance.test.ts`)
1. **Basic Client Subscriptions**
   - Standard plan subscription (21 sats)
   - Premium plan subscription (2100 sats)
   - Custom amount subscriptions

2. **Client Plan Changes**
   - Standard to premium upgrades
   - Premium to standard downgrades
   - Multiple plan changes over time

3. **Time-Based Balance Calculations**
   - Accurate billing per plan period
   - Negative balances when service time exceeds payments
   - Premium plan time-based calculations

4. **Edge Cases and Error Handling**
   - Unpaid client orders
   - Users with no subscription history
   - Multiple users with separate subscriptions

5. **Migration and Data Integrity**
   - Existing client order migration to plan tracking
   - Data consistency with current plan tracking

## Running Tests

### All Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Individual Test Suites
```bash
# Run only balance calculation tests (relay owners)
npx jest balance-calculations.test.ts

# Run only client orders balance tests
npx jest client-orders-balance.test.ts

# Run specific test within a suite
npx jest balance-calculations.test.ts -t "should handle standard to premium upgrade"
npx jest client-orders-balance.test.ts -t "should allow negative balance when service time exceeds payment"
```

## Test Coverage

The test suite provides comprehensive coverage of:

#### Relay Owner Billing (`balance-calculations.test.ts`)
- **Plan Creation**: Standard and premium relay plans
- **Plan Changes**: Upgrades, downgrades, and multiple changes
- **Time-Based Billing**: Accurate cost calculation over time
- **Historical Data**: Custom timestamps for testing scenarios
- **Negative Balances**: Service time exceeding payments
- **Migration**: Existing order migration to plan tracking
- **Edge Cases**: Unpaid orders, no history, error handling

#### Client Subscription Billing (`client-orders-balance.test.ts`)
- **Subscription Types**: Standard, premium, and custom amount plans
- **Plan Changes**: Client upgrades, downgrades, and multiple changes
- **Time-Based Billing**: Accurate billing per plan period
- **Multi-User Support**: Separate subscriptions for different users
- **Historical Accuracy**: Custom timestamps for testing scenarios
- **Negative Balances**: Service time exceeding subscription payments
- **Migration**: Existing client order migration to plan tracking
- **Edge Cases**: Unpaid orders, no subscription history, error handling

#### Business Logic Validation
- **Standard Plan**: 21 sats / 30 days = 0.7 sats/day
- **Premium Plan**: 2100 sats / 30 days = 70 sats/day
- **Custom Plans**: Variable amounts with 30-day billing cycles
- **Plan Transitions**: Accurate billing during plan changes
- **Balance Calculations**: Total paid - accrued costs over time

## Key Testing Principles

### 1. Isolation
Each test creates fresh data and cleans up afterward to prevent test interference.

### 2. Realistic Scenarios
Tests simulate real user behavior including:
- New relay creation
- Plan changes
- Payment cycles
- Time-based calculations

### 3. Edge Case Coverage
Tests handle:
- Missing data
- Invalid inputs
- Database constraints
- Environment configuration issues

### 4. Performance Considerations
Tests verify that:
- Balance calculations complete in reasonable time
- Database queries are efficient
- Migration processes handle large datasets

## Debugging Test Failures

### Common Issues

1. **Database Connection Errors**
   - Verify TEST_DATABASE_URL is set correctly
   - Ensure test database exists and is accessible
   - Check database permissions

2. **Environment Variable Issues**
   - Verify all required env vars are set in jest.setup.js
   - Check for conflicts with production environment variables

3. **Timing Issues**
   - Some tests use setTimeout to ensure different timestamps
   - Database operations may need additional time in CI environments

4. **Data Cleanup Issues**
   - Tests should clean up in correct order (foreign key constraints)
   - Check for orphaned test data affecting subsequent tests

### Debug Commands

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test with debugging
npm test -- --testNamePattern="should create premium plan relay"

# Check test database state
mysql -u test -p -e "SELECT * FROM relay WHERE name LIKE 'test_%';"
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: relay_test
          MYSQL_USER: test
          MYSQL_PASSWORD: test
        ports:
          - 3306:3306
        options: >-
          --health-cmd mysqladmin ping
          --health-interval 10s
          --health-timeout 5s
          --health-retries 3
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
        env:
          TEST_DATABASE_URL: mysql://test:test@localhost:3306/relay_test
```

## Performance Benchmarks

### Expected Test Performance
- Balance calculation tests: < 5 seconds per test
- Full test suite: < 60 seconds
- Migration tests: < 30 seconds (depends on data volume)

### Optimization Tips
- Use database transactions for faster cleanup
- Mock external services to avoid network delays
- Use in-memory database for unit tests if needed
- Parallel test execution for independent test suites

## Monitoring and Alerts

### Key Metrics to Monitor
- Test execution time trends
- Test failure rates
- Coverage percentage
- Database query performance during tests

### Alerts to Set Up
- Test suite failure notifications
- Coverage drops below threshold
- Performance regression detection
- Database connection issues

## Contributing

When adding new tests:

1. **Follow naming conventions**: `describe` blocks should be descriptive
2. **Include both positive and negative test cases**
3. **Test edge cases and error conditions**
4. **Ensure proper cleanup** to avoid test interference
5. **Add documentation** for complex test scenarios
6. **Verify tests pass in CI environment**

## Troubleshooting

### Test Database Issues
```bash
# Reset test database
mysql -u test -p -e "DROP DATABASE relay_test; CREATE DATABASE relay_test;"
DATABASE_URL="mysql://test:test@localhost:3306/relay_test" npx prisma db push
```

### Environment Issues
```bash
# Check environment variables
node -e "console.log(process.env.TEST_DATABASE_URL)"
```

### Prisma Issues
```bash
# Regenerate Prisma client
npx prisma generate
```

This comprehensive test suite ensures the premium plan billing system works correctly across all scenarios and provides confidence in the accuracy of balance calculations and plan change tracking.
