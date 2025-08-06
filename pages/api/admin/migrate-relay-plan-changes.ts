import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { migrateExistingRelayOrders } from '../../../lib/relayPlanChangeTracking';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Add basic authentication check (you might want to add proper admin auth)
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_MIGRATION_KEY) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    // Run the migration
    console.log('Starting relay plan change migration...');
    await migrateExistingRelayOrders();
    console.log('Relay plan change migration completed successfully');

    return res.status(200).json({ 
      success: true, 
      message: 'Relay plan change migration completed successfully' 
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
