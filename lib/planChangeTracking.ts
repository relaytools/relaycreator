import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PlanPeriod {
  plan_type: string;
  amount_paid: number;
  started_at: Date;
  ended_at: Date | null;
  days_in_period: number;
  daily_cost: number;
}

/**
 * Records a plan change when a user upgrades/downgrades their subscription
 */
export async function recordPlanChange(
  relayId: string,
  pubkey: string,
  newPlanType: string,
  amountPaid: number,
  clientOrderId?: string
) {
  const now = new Date();
  
  // End the current plan period (if any)
  await prisma.planChange.updateMany({
    where: {
      relayId,
      pubkey,
      ended_at: null // Current active plan
    },
    data: {
      ended_at: now
    }
  });
  
  // Create new plan period
  const planChange = await prisma.planChange.create({
    data: {
      relayId,
      pubkey,
      plan_type: newPlanType,
      amount_paid: amountPaid,
      started_at: now,
      ended_at: null, // Active plan
      clientOrderId
    }
  });
  
  return planChange;
}

/**
 * Gets all plan periods for a user's subscription to calculate accurate billing
 */
export async function getUserPlanHistory(relayId: string, pubkey: string): Promise<PlanPeriod[]> {
  const planChanges = await prisma.planChange.findMany({
    where: {
      relayId,
      pubkey
    },
    orderBy: {
      started_at: 'asc'
    }
  });
  
  const now = new Date();
  
  return planChanges.map(change => {
    const endDate = change.ended_at || now;
    const daysInPeriod = Math.max(1, (endDate.getTime() - change.started_at.getTime()) / (1000 * 60 * 60 * 24));
    const dailyCost = change.amount_paid / 30; // Assume 30-day billing cycles
    
    return {
      plan_type: change.plan_type,
      amount_paid: change.amount_paid,
      started_at: change.started_at,
      ended_at: change.ended_at,
      days_in_period: daysInPeriod,
      daily_cost: dailyCost
    };
  });
}

/**
 * Calculates accurate balance based on plan changes over time
 */
export async function calculateTimeBasedBalance(relayId: string, pubkey: string): Promise<number> {
  const planHistory = await getUserPlanHistory(relayId, pubkey);
  
  if (planHistory.length === 0) {
    return 0; // No subscription history
  }
  
  let totalPaid = 0;
  let totalCostAccrued = 0;
  
  for (const period of planHistory) {
    totalPaid += period.amount_paid;
    totalCostAccrued += period.days_in_period * period.daily_cost;
  }
  
  // Balance = Total Paid - Total Cost Accrued Over Time
  return totalPaid - totalCostAccrued;
}

/**
 * Gets the current active plan for a user
 */
export async function getCurrentPlan(relayId: string, pubkey: string) {
  const currentPlan = await prisma.planChange.findFirst({
    where: {
      relayId,
      pubkey,
      ended_at: null // Active plan
    },
    orderBy: {
      started_at: 'desc'
    }
  });
  
  return currentPlan;
}

/**
 * Migrates existing ClientOrders to PlanChange records
 * This should be run once to populate the new system with historical data
 */
export async function migrateExistingSubscriptions() {
  const clientOrders = await prisma.clientOrder.findMany({
    where: {
      paid: true
    },
    orderBy: [
      { relayId: 'asc' },
      { pubkey: 'asc' },
      { paid_at: 'asc' }
    ]
  });
  
  // Group orders by relay and pubkey
  const subscriptionGroups = new Map<string, any[]>();
  
  for (const order of clientOrders) {
    const key = `${order.relayId}-${order.pubkey}`;
    if (!subscriptionGroups.has(key)) {
      subscriptionGroups.set(key, []);
    }
    subscriptionGroups.get(key)!.push(order);
  }
  
  // Create PlanChange records for each subscription
  for (const [key, orders] of subscriptionGroups) {
    const [relayId, pubkey] = key.split('-');
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const nextOrder = orders[i + 1];
      
      await prisma.planChange.create({
        data: {
          relayId,
          pubkey,
          plan_type: order.order_type,
          amount_paid: order.amount,
          started_at: order.paid_at || new Date(),
          ended_at: nextOrder ? nextOrder.paid_at : null,
          clientOrderId: order.id
        }
      });
    }
  }
}
