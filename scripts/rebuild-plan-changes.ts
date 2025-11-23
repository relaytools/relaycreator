import { PrismaClient } from '@prisma/client';

// Prisma will automatically load environment variables from .env file
const prisma = new PrismaClient();

/**
 * SIMPLEST FIX: Delete ALL plan changes for a relay and rebuild from orders
 * This is the safest approach - we have the source of truth (orders)
 */
async function rebuildPlanChanges(relayId: string, dryRun: boolean = true) {
  console.log(`\n=== ${dryRun ? 'DRY RUN' : 'REBUILDING'} Plan Changes for relay: ${relayId} ===\n`);

  // Get the relay info
  const relay = await prisma.relay.findUnique({
    where: { id: relayId },
    select: { name: true, created_at: true }
  });

  if (!relay) {
    console.error(`Relay ${relayId} not found!`);
    return;
  }

  console.log(`Relay: ${relay.name}`);
  console.log(`Created: ${relay.created_at}\n`);

  // Get current plan changes
  const currentPlanChanges = await prisma.relayPlanChange.findMany({
    where: { relayId: relayId },
    orderBy: { started_at: 'asc' }
  });

  console.log(`Current plan changes: ${currentPlanChanges.length}\n`);
  currentPlanChanges.forEach((pc, i) => {
    const duration = pc.ended_at 
      ? `${Math.round((pc.ended_at.getTime() - pc.started_at.getTime()) / (1000 * 60 * 60 * 24))} days`
      : 'ongoing';
    console.log(`${i + 1}. ${pc.plan_type.toUpperCase()} - Started: ${pc.started_at.toISOString()} - ${duration}`);
  });

  // Get all paid orders (source of truth)
  const orders = await prisma.order.findMany({
    where: {
      relayId: relayId,
      paid: true,
      paid_at: {
        not: null // Only orders with valid paid_at dates
      },
      order_type: {
        in: ['standard', 'premium']
      }
    },
    select: {
      id: true,
      amount: true,
      order_type: true,
      paid_at: true
    },
    orderBy: {
      paid_at: 'asc'
    }
  });

  console.log(`\nPaid orders (source of truth): ${orders.length}\n`);
  orders.forEach((order, i) => {
    console.log(`${i + 1}. ${order.order_type?.toUpperCase()} - ${order.amount} sats - ${order.paid_at?.toISOString()}`);
  });

  console.log(`\n=== Plan ===`);
  console.log(`1. Delete all ${currentPlanChanges.length} existing plan changes`);
  console.log(`2. Create ${orders.length} new plan changes from orders with correct dates`);

  if (dryRun) {
    console.log(`\n⚠️  DRY RUN MODE - No changes will be made`);
    console.log(`\nExpected result:`);
    orders.forEach((order, i) => {
      const nextOrder = orders[i + 1];
      const duration = nextOrder
        ? `${Math.round((nextOrder.paid_at!.getTime() - order.paid_at!.getTime()) / (1000 * 60 * 60 * 24))} days`
        : 'ongoing';
      console.log(`${i + 1}. ${order.order_type?.toUpperCase()} - Started: ${order.paid_at?.toISOString()} - ${duration}`);
    });
    console.log(`\nRun with dryRun=false to apply changes\n`);
    return;
  }

  // Actually fix the data
  console.log(`\n=== Applying Fix ===\n`);

  // Step 1: Delete ALL existing plan changes
  console.log(`Deleting all ${currentPlanChanges.length} plan changes...`);
  const deleted = await prisma.relayPlanChange.deleteMany({
    where: { relayId: relayId }
  });
  console.log(`✓ Deleted ${deleted.count} records\n`);

  // Step 2: Recreate from orders with correct dates
  console.log(`Creating ${orders.length} plan changes from orders...\n`);
  
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const nextOrder = orders[i + 1];
    const orderType = order.order_type || 'standard';

    // Create plan change with correct dates
    await prisma.relayPlanChange.create({
      data: {
        relayId: relayId,
        plan_type: orderType,
        amount_paid: order.amount,
        started_at: order.paid_at!,
        ended_at: nextOrder ? nextOrder.paid_at : null, // End when next payment starts
        orderId: order.id
      }
    });

    const duration = nextOrder
      ? `${Math.round((nextOrder.paid_at!.getTime() - order.paid_at!.getTime()) / (1000 * 60 * 60 * 24))} days`
      : 'ongoing';
    console.log(`  ✓ Created ${orderType} plan: ${order.paid_at?.toISOString()} - ${duration}`);
  }

  console.log(`\n✅ Rebuild complete!\n`);

  // Verify
  const finalPlanChanges = await prisma.relayPlanChange.findMany({
    where: { relayId: relayId },
    orderBy: { started_at: 'asc' }
  });

  console.log(`=== Final State ===`);
  console.log(`Total plan changes: ${finalPlanChanges.length} (should be ${orders.length})\n`);
  finalPlanChanges.forEach((pc, i) => {
    const duration = pc.ended_at 
      ? `${Math.round((pc.ended_at.getTime() - pc.started_at.getTime()) / (1000 * 60 * 60 * 24))} days`
      : 'ongoing';
    console.log(`${i + 1}. ${pc.plan_type.toUpperCase()} - ${pc.started_at.toISOString()} - ${duration}`);
  });

  console.log(`\n✅ Done!\n`);
}

async function rebuildAllRelays(dryRun: boolean = true) {
  console.log(`\n=== ${dryRun ? 'DRY RUN' : 'REBUILDING'} Plan Changes for ALL Relays ===\n`);

  // Get all relays that have orders
  const relays = await prisma.relay.findMany({
    where: {
      Order: {
        some: {
          paid: true,
          order_type: {
            in: ['standard', 'premium']
          }
        }
      }
    },
    select: {
      id: true,
      name: true
    }
  });

  console.log(`Found ${relays.length} relays with paid orders\n`);

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const relay of relays) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${relay.name} (${relay.id})`);
      console.log('='.repeat(60));
      
      await rebuildPlanChanges(relay.id, dryRun);
      processedCount++;
      
      // Add a small delay between relays to avoid overwhelming the DB
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`\n❌ Error processing relay ${relay.name}:`, error);
      errorCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`=== SUMMARY ===`);
  console.log(`Total relays: ${relays.length}`);
  console.log(`Processed: ${processedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('='.repeat(60));
}

// Run for all relays or a specific one
const SPECIFIC_RELAY_ID = process.env.RELAY_ID; // Set RELAY_ID=xxx to run for specific relay
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Set DRY_RUN=false to actually apply changes

if (SPECIFIC_RELAY_ID) {
  console.log(`Running for specific relay: ${SPECIFIC_RELAY_ID}`);
  rebuildPlanChanges(SPECIFIC_RELAY_ID, DRY_RUN)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
} else {
  console.log('Running for ALL relays');
  rebuildAllRelays(DRY_RUN)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
