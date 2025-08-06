import { migrateExistingSubscriptions } from '../../../lib/planChangeTracking';

export default async function handle(req: any, res: any) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // Add basic authentication check (you might want to add proper admin auth)
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_MIGRATION_KEY) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        console.log('Starting migration of existing subscriptions to plan change tracking...');
        
        await migrateExistingSubscriptions();
        
        console.log('Migration completed successfully');
        res.status(200).json({ 
            success: true, 
            message: 'Successfully migrated existing subscriptions to plan change tracking system' 
        });
    } catch (error) {
        console.error('Migration failed:', error);
        res.status(500).json({ 
            error: 'Migration failed', 
            details: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}
