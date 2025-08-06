import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_MIGRATION_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Starting plan data cleanup...');

    // Step 1: Check current state
    const beforeCleanup = await prisma.$queryRaw`
      SELECT plan_type, amount_paid, COUNT(*) as count
      FROM RelayPlanChange 
      GROUP BY plan_type, amount_paid
      ORDER BY plan_type, amount_paid
    `;

    // Step 2: Delete custom plan changes (bug artifacts)
    const deletedCustom = await prisma.$executeRaw`
      DELETE FROM RelayPlanChange 
      WHERE plan_type = 'custom'
    `;

    // Step 3: Fix standard amounts
    const fixedStandard = await prisma.$executeRaw`
      UPDATE RelayPlanChange 
      SET amount_paid = 7000 
      WHERE plan_type = 'standard' AND amount_paid != 7000
    `;

    // Step 4: Fix premium amounts  
    const fixedPremium = await prisma.$executeRaw`
      UPDATE RelayPlanChange 
      SET amount_paid = 15000 
      WHERE plan_type = 'premium' AND amount_paid != 15000
    `;

    // Step 5: Check final state
    const afterCleanup = await prisma.$queryRaw`
      SELECT plan_type, amount_paid, COUNT(*) as count
      FROM RelayPlanChange 
      GROUP BY plan_type, amount_paid
      ORDER BY plan_type, amount_paid
    `;

    console.log('Plan data cleanup completed');

    return res.status(200).json({
      success: true,
      results: {
        beforeCleanup,
        deletedCustom,
        fixedStandard,
        fixedPremium,
        afterCleanup
      },
      message: 'Plan data cleaned successfully - balances should now be accurate'
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
