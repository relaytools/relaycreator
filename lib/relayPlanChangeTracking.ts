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
    console.log('No relay plan history found, using fallback calculation');
    // No plan history, fall back to order-based calculation
    return await calculateFallbackRelayBalance(relayId, clientOrderAmount);
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
 * Fallback balance calculation when no RelayPlanChanges exist
 * Uses Order and ClientOrder records directly
 */
async function calculateFallbackRelayBalance(relayId: string, clientOrderAmount: number = 0): Promise<number> {
  console.log('Using fallback relay balance calculation for relayId:', relayId);
  
  // Get relay info including creation date
  const relay = await prisma.relay.findUnique({
    where: { id: relayId },
    select: { created_at: true, name: true }
  });
  
  if (!relay?.created_at) {
    console.log('No relay creation date found, returning 0');
    return 0;
  }
  
  // Get all paid orders for this relay
  const orders = await prisma.order.findMany({
    where: {
      relayId: relayId,
      paid: true
    },
    select: {
      amount: true,
      order_type: true,
      paid_at: true
    },
    orderBy: {
      paid_at: 'asc'
    }
  });
  
  console.log(`Found ${orders.length} paid orders for relay ${relay.name}`);
  
  const now = new Date();
  let totalPaid = 0;
  let totalCostAccrued = 0;
  
  if (orders.length === 0) {
    // No payments made, calculate cost since relay creation using standard pricing
    const daysRunning = (now.getTime() - relay.created_at.getTime()) / (1000 * 60 * 60 * 24);
    const standardDailyCost = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || "1000") / 30;
    totalCostAccrued = daysRunning * standardDailyCost;
    console.log(`Fallback calculation debug:`);
    console.log(`  Relay created at: ${relay.created_at}`);
    console.log(`  Current time: ${now}`);
    console.log(`  Days running: ${daysRunning}`);
    console.log(`  Standard daily cost: ${standardDailyCost} sats/day`);
    console.log(`  Total cost accrued: ${totalCostAccrued} sats`);
  } else {
    // Calculate cost based on each payment period
    for (const order of orders) {
      totalPaid += order.amount;
      
      // Each payment gives 30 days of service at the rate paid
      const dailyCostForPayment = order.amount / 30;
      const daysSincePayment = (now.getTime() - order.paid_at!.getTime()) / (1000 * 60 * 60 * 24);
      const costForPayment = daysSincePayment * dailyCostForPayment;
      
      totalCostAccrued += costForPayment;
      
      console.log(`Order: ${order.amount} sats, ${daysSincePayment.toFixed(1)} days ago, cost: ${costForPayment.toFixed(2)} sats`);
    }
  }
  
  // Add client revenue
  totalPaid += clientOrderAmount;
  
  const balance = totalPaid - totalCostAccrued;
  
  console.log('Fallback calculation result:', {
    totalPaid,
    clientOrderAmount,
    totalCostAccrued,
    balance
  });
  
  return balance;
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
