import prisma from "../../../../lib/prisma";
import { checkSessionForSuperAdmin } from "../../../../lib/checkSessionForSuperAdmin";

// POST /api/superadmin/globalblock/delete-from-relays
// Queue delete jobs across all running relays for a specific pubkey
export default async function handle(req: any, res: any) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Super admin authorization check
    const isSuperAdmin = await checkSessionForSuperAdmin(req, res);
    if (!isSuperAdmin) {
        return res.status(403).json({ error: "Unauthorized - super admin only" });
    }

    const { pubkey } = req.body;

    if (!pubkey || typeof pubkey !== "string") {
        return res.status(400).json({ error: "Pubkey is required" });
    }

    try {
        // Find all running relays (status = "running")
        const runningRelays = await prisma.relay.findMany({
            where: {
                status: "running"
            },
            select: {
                id: true,
                name: true
            }
        });

        if (runningRelays.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: "No running relays found",
                jobsCreated: 0,
                relays: []
            });
        }

        // Create delete jobs for all running relays
        const jobPromises = runningRelays.map(relay => 
            prisma.job.create({
                data: {
                    relayId: relay.id,
                    kind: 'deletePubkey',
                    status: 'queue',
                    pubkey: pubkey
                }
            })
        );

        await Promise.all(jobPromises);

        console.log(`Created ${runningRelays.length} delete jobs for pubkey ${pubkey} across all running relays`);

        return res.status(200).json({
            success: true,
            message: `Queued delete jobs for ${runningRelays.length} running relays`,
            jobsCreated: runningRelays.length,
            relays: runningRelays.map(r => r.name)
        });

    } catch (error: any) {
        console.error("Error creating delete jobs:", error);
        return res.status(500).json({ error: "Failed to create delete jobs" });
    }
}
