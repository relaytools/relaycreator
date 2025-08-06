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
  clientOrderId?: string,
  startedAt?: Date
) {
  const now = startedAt || new Date();
  
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
  console.log('calculateTimeBasedBalance called with:', { relayId, pubkey });
  
  const planHistory = await getUserPlanHistory(relayId, pubkey);
  console.log('Plan history found:', planHistory.length, 'periods');
  
  if (planHistory.length === 0) {
    console.log('No plan history found, trying fallback calculation');
    
    // Fallback: Use only client orders for client balance calculation
    const clientOrders = await prisma.clientOrder.findMany({
      where: {
        relayId,
        pubkey,
        paid: true
      },
      orderBy: {
        paid_at: 'asc'
      }
    });
    
    const totalPaidFromOrders = clientOrders.reduce((sum, order) => sum + order.amount, 0);
    
    if (clientOrders.length === 0) {
      console.log('No client orders found, calculating negative balance since relay creation');
      
      // Get relay creation date and payment amounts
      const relay = await prisma.relay.findUnique({
        where: { id: relayId },
        select: { 
          created_at: true,
          payment_amount: true, 
          payment_premium_amount: true 
        }
      });
      
      if (!relay || !relay.created_at) {
        console.log('Relay not found or no creation date, returning 0');
        return 0;
      }
      
      // Calculate days since relay creation
      const now = new Date();
      const daysSinceCreation = (now.getTime() - new Date(relay.created_at).getTime()) / (1000 * 60 * 60 * 24);
      
      // Use standard pricing as default for unpaid relays
      const standardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000');
      const dailyCost = standardPrice / 30;
      const totalCostAccrued = daysSinceCreation * dailyCost;
      
      // Balance = 0 (no payments) - total cost accrued = negative balance
      const negativeBalance = 0 - totalCostAccrued;
      
      console.log('Unpaid relay balance calculation:', {
        relayId,
        daysSinceCreation: Math.round(daysSinceCreation * 100) / 100,
        dailyCost,
        totalCostAccrued: Math.round(totalCostAccrued * 100) / 100,
        negativeBalance: Math.round(negativeBalance * 100) / 100
      });
      
      return negativeBalance;
    }
    
    // Get relay creation date for proper cost calculation
    const relay = await prisma.relay.findUnique({
      where: { id: relayId },
      select: { 
        created_at: true,
        payment_amount: true, 
        payment_premium_amount: true 
      }
    });
    
    if (!relay || !relay.created_at) {
      console.log('Relay not found or no creation date, returning 0');
      return 0;
    }
    
    // Calculate total paid from all orders
    let totalPaid = 0;
    for (const order of clientOrders) {
      totalPaid += order.amount;
    }
    
    // Calculate total cost since relay creation
    const now = new Date();
    const daysSinceCreation = (now.getTime() - new Date(relay.created_at).getTime()) / (1000 * 60 * 60 * 24);
    
    // Determine the plan type from the most recent order to calculate daily cost
    let dailyCost = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000') / 30; // Default to standard
    
    // Find the most recent client order to determine current plan type
    const allOrders = [...clientOrders].sort((a, b) => 
      new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime()
    );
    
    if (allOrders.length > 0) {
      const mostRecentOrder = allOrders[0];
      if (mostRecentOrder.order_type === 'premium') {
        dailyCost = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100') / 30;
      } else if (mostRecentOrder.order_type === 'standard') {
        dailyCost = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000') / 30;
      } else {
        // CRITICAL FIX: Custom payments are NOT monthly plans!
        // They are one-time top-ups. Use the CURRENT plan pricing for daily cost.
        // Find the most recent standard/premium order to determine actual plan type
        const planOrders = allOrders.filter(order => 
          order.order_type === 'standard' || order.order_type === 'premium'
        );
        
        if (planOrders.length > 0) {
          const mostRecentPlanOrder = planOrders[0];
          if (mostRecentPlanOrder.order_type === 'premium') {
            dailyCost = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100') / 30;
          } else {
            dailyCost = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000') / 30;
          }
        } else {
          // No plan orders found, default to standard pricing
          dailyCost = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000') / 30;
        }
      }
    }
    
    const totalCostAccrued = daysSinceCreation * dailyCost;
    
    const fallbackBalance = totalPaid - totalCostAccrued;
    console.log('Fallback balance calculation:', {
      totalPaid,
      totalCostAccrued,
      fallbackBalance,
      ordersCount: clientOrders.length
    });
    
    return fallbackBalance;
  }
  
  let totalPaid = 0;
  let totalCostAccrued = 0;
  
  for (const period of planHistory) {
    console.log('Processing period:', {
      plan_type: period.plan_type,
      amount_paid: period.amount_paid,
      days_in_period: period.days_in_period,
      daily_cost: period.daily_cost,
      cost_for_period: period.days_in_period * period.daily_cost
    });
    
    totalPaid += period.amount_paid;
    
    // Apply the same logic as serverStatus and balanceCalculations:
    // Use historical rate for first 30 days, current pricing for excess days
    const paidCoverageDays = 30;
    const dailyCostForPaidPeriod = period.amount_paid / 30;
    
    if (period.days_in_period <= paidCoverageDays) {
      // Still within paid coverage period - use historical rate
      const costForPeriod = period.days_in_period * dailyCostForPaidPeriod;
      totalCostAccrued += costForPeriod;
    } else {
      // Beyond paid coverage - use historical rate for paid period, current rate for excess
      const paidPeriodCost = paidCoverageDays * dailyCostForPaidPeriod;
      const excessDays = period.days_in_period - paidCoverageDays;
      
      // Get current pricing from environment variables
      const currentStandardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '21');
      const currentPremiumPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');
      
      // Use current pricing for excess days
      const currentDailyRate = period.plan_type === 'premium' 
        ? currentPremiumPrice / 30 
        : currentStandardPrice / 30;
      const excessCost = excessDays * currentDailyRate;
      
      totalCostAccrued += paidPeriodCost + excessCost;
    }
  }
  
  const balance = totalPaid - totalCostAccrued;
  console.log('Balance calculation result:', {
    totalPaid,
    totalCostAccrued,
    balance
  });
  
  // Balance = Total Paid - Total Cost Accrued Over Time
  return balance;
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
