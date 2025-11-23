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
  
  // Check if a plan change already exists for this order to prevent duplicates
  if (orderId) {
    const existingPlanChange = await prisma.relayPlanChange.findFirst({
      where: {
        relayId,
        orderId
      }
    });
    
    if (existingPlanChange) {
      console.log(`Plan change already exists for order ${orderId}, skipping duplicate`);
      return existingPlanChange;
    }
  }
  
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
 * Gets actual payments from Order/ClientOrder tables, plan periods from RelayPlanChange table
 */
export async function calculateRelayTimeBasedBalance(relayId: string) {
  const planHistory = await getRelayPlanHistory(relayId);
  
  if (planHistory.length === 0) {
    // No plan history, fall back to order-based calculation
    return await calculateFallbackRelayBalance(relayId);
  }

  // Get actual payments from Order table (relay owner payments)
  const orders = await prisma.order.findMany({
    where: {
      relayId,
      paid: true
    },
    orderBy: {
      paid_at: 'asc'
    }
  });

  // Get client subscription payments (revenue for relay owner)
  const clientOrders = await prisma.clientOrder.findMany({
    where: {
      relayId,
      paid: true
    },
    orderBy: {
      paid_at: 'asc'
    }
  });

  // Calculate total: relay owner payments + client subscription revenue
  const totalAmountPaid = orders.reduce((sum, order) => sum + order.amount, 0) +
                         clientOrders.reduce((sum, order) => sum + order.amount, 0);

  const now = new Date();
  let totalCostAccrued = 0;

  // Get relay info including creation date
  const relay = await prisma.relay.findUnique({
    where: { id: relayId },
    select: { created_at: true }
  });
  
  if (!relay?.created_at) {
    return totalAmountPaid; // No creation date, can't calculate costs
  }

  // FIXED: Calculate costs per plan period using ENVIRONMENT VARIABLE pricing
  const standardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '7000');
  const premiumPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '15000');
  const standardDaily = standardPrice / 30;
  const premiumDaily = premiumPrice / 30;

  for (let i = 0; i < planHistory.length; i++) {
    const planPeriod = planHistory[i];
    const periodStart = planPeriod.started_at;
    const periodEnd = planPeriod.ended_at || now;
    
    // Calculate days in this period
    const daysInPeriod = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    
    // Use environment variable pricing for this period
    const dailyCostForPeriod = planPeriod.plan_type === 'premium' 
      ? premiumDaily 
      : standardDaily;
    
    const costForPeriod = daysInPeriod * dailyCostForPeriod;
    totalCostAccrued += costForPeriod;
  }

  // Balance = Total paid by relay owner - accrued costs
  const finalBalance = totalAmountPaid - totalCostAccrued;
  return finalBalance;
}

/**
 * Fallback balance calculation when no RelayPlanChanges exist
 * Uses only Order records (relay owner payments)
 */
export async function calculateFallbackRelayBalance(relayId: string) {
  
  // Get relay info including creation date
  const relay = await prisma.relay.findUnique({
    where: { id: relayId },
    select: { created_at: true, name: true }
  });
  
  if (!relay?.created_at) {
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

  const now = new Date();
  let totalPaid = 0;
  let totalCostAccrued = 0;
  
  if (orders.length === 0) {
    // No payments made, calculate negative balance based on time since relay creation
    const daysRunning = Math.max(0, (now.getTime() - relay.created_at.getTime()) / (1000 * 60 * 60 * 24));
    const dailyCost = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || "1000") / 30; // Standard pricing for unpaid relays
    totalCostAccrued = daysRunning * dailyCost;
    const negativeBalance = 0 - totalCostAccrued; // 0 payments - cost = negative
    
    return negativeBalance;
  } else {
    // Calculate total payments
    for (const order of orders) {
      totalPaid += order.amount;
    }
    
    // Calculate cost from relay creation date (not payment dates)
    const daysRunning = (now.getTime() - relay.created_at.getTime()) / (1000 * 60 * 60 * 24);
    
    // Determine daily cost based on most recent order type, or default to standard
    const mostRecentOrder = orders[orders.length - 1];
    const isRecentPremium = mostRecentOrder?.order_type === 'premium';
    
    const standardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000');
    const premiumPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');
    
    const dailyCost = isRecentPremium ? premiumPrice / 30 : standardPrice / 30;
    totalCostAccrued = daysRunning * dailyCost;
  }
  
  const balance = totalPaid - totalCostAccrued;
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
        }
      }
    }
  }
}
