import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Add basic authentication check
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_MIGRATION_KEY) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    console.log('Checking current plan amounts...');
    
    // Get current pricing from environment variables
    const currentStandardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '21');
    const currentPremiumPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');
    
    // Check PlanChange records (client subscriptions)
    const planChangeAmounts = await prisma.planChange.groupBy({
      by: ['plan_type', 'amount_paid'],
      _count: {
        id: true
      },
      orderBy: [
        { plan_type: 'asc' },
        { amount_paid: 'asc' }
      ]
    });

    // Check RelayPlanChange records (relay owner subscriptions)
    const relayPlanChangeAmounts = await prisma.relayPlanChange.groupBy({
      by: ['plan_type', 'amount_paid'],
      _count: {
        id: true
      },
      orderBy: [
        { plan_type: 'asc' },
        { amount_paid: 'asc' }
      ]
    });

    // Get some sample records for debugging
    const samplePlanChanges = await prisma.planChange.findMany({
      take: 5,
      select: {
        id: true,
        plan_type: true,
        amount_paid: true,
        started_at: true,
        relayId: true,
        pubkey: true
      },
      orderBy: {
        started_at: 'desc'
      }
    });

    const sampleRelayPlanChanges = await prisma.relayPlanChange.findMany({
      take: 5,
      select: {
        id: true,
        plan_type: true,
        amount_paid: true,
        started_at: true,
        relayId: true
      },
      orderBy: {
        started_at: 'desc'
      }
    });

    console.log('Plan amount check completed');
    
    return res.status(200).json({ 
      success: true,
      currentEnvironmentPricing: {
        standard: currentStandardPrice,
        premium: currentPremiumPrice
      },
      clientSubscriptionAmounts: planChangeAmounts,
      relaySubscriptionAmounts: relayPlanChangeAmounts,
      sampleClientRecords: samplePlanChanges,
      sampleRelayRecords: sampleRelayPlanChanges,
      analysis: {
        clientSubscriptionsNeedNormalization: planChangeAmounts.some(
          group => (group.plan_type === 'standard' && group.amount_paid !== currentStandardPrice) ||
                   (group.plan_type === 'premium' && group.amount_paid !== currentPremiumPrice)
        ),
        relaySubscriptionsNeedNormalization: relayPlanChangeAmounts.some(
          group => (group.plan_type === 'standard' && group.amount_paid !== currentStandardPrice) ||
                   (group.plan_type === 'premium' && group.amount_paid !== currentPremiumPrice)
        )
      }
    });

  } catch (error) {
    console.error('Plan amount check failed:', error);
    return res.status(500).json({ 
      error: 'Plan amount check failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
