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
    
    // CRITICAL FIX: Don't use historical amount_paid for daily cost!
    // Use current environment variable pricing for daily cost calculation
    const standardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000');
    const premiumPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');
    
    const dailyCost = change.plan_type === 'premium' 
      ? premiumPrice / 30 
      : standardPrice / 30;
    
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

      // CRITICAL FIX: If client has never paid, their balance is 0
      // We don't charge clients for time before they start using the relay
      // Only relay owners are charged from relay creation date
      return 0;
    }
    
    // CRITICAL FIX: Proper payment coverage calculation!
    // Each payment gives coverage for a certain period, only charge for uncovered days
    

    
    let totalPaid = 0;
    let totalCoveredDays = 0;
    
    // Sort orders by payment date
    const sortedOrders = [...clientOrders]
      .filter(order => order.paid_at) // Only orders with payment dates
      .sort((a, b) => new Date(a.paid_at!).getTime() - new Date(b.paid_at!).getTime());
    
    if (sortedOrders.length === 0) {

      return 0;
    }
    
    // Calculate total paid and coverage days
    for (const order of sortedOrders) {
      totalPaid += order.amount;
      
      // Determine coverage days based on order type and amount
      let coverageDays = 30; // Default to 30 days
      
      if (order.order_type === 'standard' || order.order_type === 'premium') {
        // Standard and premium orders give 30 days coverage
        coverageDays = 30;
      } else {
        // Custom orders: calculate coverage based on current pricing
        const standardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000');
        const premiumPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');
        
        // Find most recent plan order to determine pricing tier
        const planOrders = sortedOrders.filter(o => 
          o.order_type === 'standard' || o.order_type === 'premium'
        );
        
        const currentPlanPrice = planOrders.length > 0 && 
          planOrders[planOrders.length - 1].order_type === 'premium' 
          ? premiumPrice : standardPrice;
        
        // Custom payment coverage = (amount / monthly_price) * 30 days
        coverageDays = (order.amount / currentPlanPrice) * 30;
      }
      
      totalCoveredDays += coverageDays;
    }
    
    // Calculate actual days since first payment
    const firstPaymentDate = new Date(sortedOrders[0].paid_at!);
    const now = new Date();
    const actualDaysSinceFirstPayment = (now.getTime() - firstPaymentDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Calculate uncovered days (days beyond paid coverage)
    const uncoveredDays = Math.max(0, actualDaysSinceFirstPayment - totalCoveredDays);
    
    // Calculate cost for uncovered days using current pricing
    let dailyCost = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000') / 30; // Default to standard
    
    // Determine current plan from most recent plan order
    const planOrders = sortedOrders.filter(order => 
      order.order_type === 'standard' || order.order_type === 'premium'
    );
    
    if (planOrders.length > 0) {
      const mostRecentPlanOrder = planOrders[planOrders.length - 1];
      if (mostRecentPlanOrder.order_type === 'premium') {
        dailyCost = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100') / 30;
      }
    }
    
    const totalCostAccrued = uncoveredDays * dailyCost;
    
    const fallbackBalance = totalPaid - totalCostAccrued;

    return fallbackBalance;
  }
  
  // Get actual payments from ClientOrder table (source of truth)
  const clientOrders = await prisma.clientOrder.findMany({
    where: {
      relayId,
      pubkey,
      paid: true
    }
  });
  
  const totalPaid = clientOrders.reduce((sum, order) => sum + order.amount, 0);
  let totalCostAccrued = 0;
  
  // Calculate costs based on plan periods and current environment pricing
  for (const period of planHistory) {
    const standardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '1000');
    const premiumPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');
    
    const dailyCost = period.plan_type === 'premium' 
      ? premiumPrice / 30 
      : standardPrice / 30;
    
    const costForPeriod = period.days_in_period * dailyCost;
    
    totalCostAccrued += costForPeriod;
  }
  
  const balance = totalPaid - totalCostAccrued;

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
