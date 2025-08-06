import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Add basic authentication check
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_MIGRATION_KEY) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    console.log('Starting plan amount normalization...');
    
    // Get current pricing from environment variables
    const currentStandardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '21');
    const currentPremiumPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');
    
    console.log('Current pricing:', {
      standard: currentStandardPrice,
      premium: currentPremiumPrice
    });

    // Update PlanChange records (for client subscriptions)
    const planChangeUpdates = await prisma.planChange.updateMany({
      where: {
        plan_type: 'standard'
      },
      data: {
        amount_paid: currentStandardPrice
      }
    });

    const premiumPlanChangeUpdates = await prisma.planChange.updateMany({
      where: {
        plan_type: 'premium'
      },
      data: {
        amount_paid: currentPremiumPrice
      }
    });

    // Update RelayPlanChange records (for relay owner subscriptions)
    const relayPlanChangeUpdates = await prisma.relayPlanChange.updateMany({
      where: {
        plan_type: 'standard'
      },
      data: {
        amount_paid: currentStandardPrice
      }
    });

    const premiumRelayPlanChangeUpdates = await prisma.relayPlanChange.updateMany({
      where: {
        plan_type: 'premium'
      },
      data: {
        amount_paid: currentPremiumPrice
      }
    });

    // Get summary of what was updated
    const totalPlanChanges = await prisma.planChange.count();
    const totalRelayPlanChanges = await prisma.relayPlanChange.count();
    
    const standardPlanChanges = await prisma.planChange.count({
      where: { plan_type: 'standard' }
    });
    
    const premiumPlanChanges = await prisma.planChange.count({
      where: { plan_type: 'premium' }
    });
    
    const standardRelayPlanChanges = await prisma.relayPlanChange.count({
      where: { plan_type: 'standard' }
    });
    
    const premiumRelayPlanChanges = await prisma.relayPlanChange.count({
      where: { plan_type: 'premium' }
    });

    console.log('Plan amount normalization completed successfully');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Plan amounts normalized to current environment variable pricing',
      summary: {
        currentPricing: {
          standard: currentStandardPrice,
          premium: currentPremiumPrice
        },
        clientSubscriptions: {
          total: totalPlanChanges,
          standard: standardPlanChanges,
          premium: premiumPlanChanges,
          standardUpdated: planChangeUpdates.count,
          premiumUpdated: premiumPlanChangeUpdates.count
        },
        relaySubscriptions: {
          total: totalRelayPlanChanges,
          standard: standardRelayPlanChanges,
          premium: premiumRelayPlanChanges,
          standardUpdated: relayPlanChangeUpdates.count,
          premiumUpdated: premiumRelayPlanChangeUpdates.count
        }
      }
    });

  } catch (error) {
    console.error('Plan normalization failed:', error);
    return res.status(500).json({ 
      error: 'Plan normalization failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
