import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Records a plan change when a relay owner upgrades/downgrades their plan
 */
export async function recordRelayPlanChange(
  relayId: string,
  newPlanType: string,
  amountPaid: number,
  orderId?: string,
  startedAt?: Date
) {
  const now = startedAt || new Date();
  
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
  console.log('calculateRelayTimeBasedBalance called with:', { relayId, clientOrderAmount });
  const planHistory = await getRelayPlanHistory(relayId);
  console.log('Relay plan history found:', planHistory.length, 'periods');
  console.log('Plan history details:', planHistory.map(p => ({ amount_paid: p.amount_paid, plan_type: p.plan_type, started_at: p.started_at, ended_at: p.ended_at })));
  
  if (planHistory.length === 0) {
    console.log('No relay plan history found, returning null');
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
    // Remove Math.min cap - allow cost to exceed payment if service time exceeds paid period
    const costForPeriod = daysInPeriod * dailyCostForPeriod;
    
    console.log('Processing relay plan period:', {
      amount_paid: planPeriod.amount_paid,
      daysInPeriod,
      dailyCostForPeriod,
      costForPeriod
    });
    
    totalCostAccrued += costForPeriod;
  }

  // Balance = Total paid + client revenue - accrued costs
  const finalBalance = totalAmountPaid + clientOrderAmount - totalCostAccrued;
  console.log('Relay balance calculation result:', {
    totalAmountPaid,
    clientOrderAmount,
    totalCostAccrued,
    finalBalance
  });
  return finalBalance;
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

    // Create plan change records for each paid order (only standard and premium, not custom)
    for (const order of relay.Order) {
      if (order.paid && order.paid_at) {
        const orderType = order.order_type || 'standard';
        
        // Only create plan changes for standard and premium orders, skip custom payments
        if (orderType === 'standard' || orderType === 'premium') {
          await recordRelayPlanChange(
            relay.id,
            orderType,
            order.amount,
            order.id,
            order.paid_at // Use the actual payment date as start date
          );
          
          console.log(`Created plan change for relay ${relay.name}, order ${order.id}, type: ${orderType}`);
        } else {
          console.log(`Skipped custom payment for relay ${relay.name}, order ${order.id}, amount: ${order.amount}`);
        }
      }
    }
  }
}
