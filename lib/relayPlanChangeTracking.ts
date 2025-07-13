import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Records a plan change when a relay owner upgrades/downgrades their plan
 */
export async function recordRelayPlanChange(
  relayId: string,
  newPlanType: string,
  amountPaid: number,
  orderId?: string
) {
  const now = new Date();
  
  // End the current plan period (if any)
  await prisma.relayPlanChange.updateMany({
    where: {
      relayId,
      ended_at: null // Current active plan
    },
    data: {
      ended_at: now
    }
  });

  // Create new plan period
  const newPlanChange = await prisma.relayPlanChange.create({
    data: {
      relayId,
      plan_type: newPlanType,
      amount_paid: amountPaid,
      started_at: now,
      orderId
    }
  });

  return newPlanChange;
}

/**
 * Gets the plan history for a relay owner for accurate billing calculation
 */
export async function getRelayPlanHistory(relayId: string) {
  return await prisma.relayPlanChange.findMany({
    where: {
      relayId
    },
    orderBy: {
      started_at: 'asc'
    }
  });
}

/**
 * Gets the current active plan for a relay owner
 */
export async function getCurrentRelayPlan(relayId: string) {
  return await prisma.relayPlanChange.findFirst({
    where: {
      relayId,
      ended_at: null
    },
    orderBy: {
      started_at: 'desc'
    }
  });
}

/**
 * Calculate time-based balance for relay owner using plan history
 */
export async function calculateRelayTimeBasedBalance(relayId: string, clientOrderAmount: number = 0) {
  const planHistory = await getRelayPlanHistory(relayId);
  
  if (planHistory.length === 0) {
    // No plan history, fall back to old calculation method
    return null;
  }

  const now = new Date();
  let totalCostAccrued = 0;
  let totalAmountPaid = 0;

  for (const planPeriod of planHistory) {
    totalAmountPaid += planPeriod.amount_paid;
    
    const periodStart = planPeriod.started_at;
    const periodEnd = planPeriod.ended_at || now;
    
    // Calculate days in this plan period
    const daysInPeriod = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    
    // Each payment gives 30 days of service at the rate paid
    const dailyCostForPeriod = planPeriod.amount_paid / 30;
    const costForPeriod = Math.min(daysInPeriod * dailyCostForPeriod, planPeriod.amount_paid);
    
    totalCostAccrued += costForPeriod;
  }

  // Balance = Total paid + client revenue - accrued costs
  return totalAmountPaid + clientOrderAmount - totalCostAccrued;
}

/**
 * Migrate existing relay orders to plan change tracking
 */
export async function migrateExistingRelayOrders() {
  const relaysWithOrders = await prisma.relay.findMany({
    include: {
      Order: {
        where: {
          paid: true
        },
        orderBy: {
          paid_at: 'asc'
        }
      }
    }
  });

  for (const relay of relaysWithOrders) {
    // Check if this relay already has plan change tracking
    const existingPlanChanges = await prisma.relayPlanChange.count({
      where: { relayId: relay.id }
    });

    if (existingPlanChanges > 0) {
      console.log(`Relay ${relay.name} already has plan change tracking, skipping...`);
      continue;
    }

    // Create plan change records for each paid order
    for (const order of relay.Order) {
      if (order.paid && order.paid_at) {
        await recordRelayPlanChange(
          relay.id,
          order.order_type || 'standard',
          order.amount,
          order.id
        );
        
        console.log(`Created plan change for relay ${relay.name}, order ${order.id}`);
      }
    }
  }
}
