import prisma from "../../../lib/prisma";
import { checkSessionForSuperAdmin } from "../../../lib/checkSessionForSuperAdmin";

// API for scheduling sync jobs across relays
// POST - Schedule sync jobs (individual or bulk)
// GET - Get pending/running sync jobs
export default async function handle(req: any, res: any) {
    // Super admin authorization check
    const isSuperAdmin = await checkSessionForSuperAdmin(req, res);
    if (!isSuperAdmin) {
        return res.status(403).json({ error: "Unauthorized - super admin only" });
    }

    if (req.method === "GET") {
        // Get all sync jobs (recent ones)
        try {
            const jobs = await prisma.job.findMany({
                where: {
                    kind: "sync"
                },
                select: {
                    id: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    error_msg: true,
                    output: true,
                    syncHost: true,
                    syncDirection: true,
                    relay: {
                        select: {
                            id: true,
                            name: true,
                            port: true
                        }
                    }
                },
                orderBy: {
                    created_at: "desc"
                },
                take: 100
            });

            return res.status(200).json({
                success: true,
                jobs: jobs
            });
        } catch (error: any) {
            console.error("Error fetching sync jobs:", error);
            return res.status(500).json({ error: "Failed to fetch sync jobs" });
        }
    }

    if (req.method === "POST") {
        const { targetServer, direction = "down", protocol = "wss", relayIds } = req.body;

        if (!targetServer) {
            return res.status(400).json({ error: "Target server hostname is required" });
        }

        // Validate protocol
        const validProtocols = ["wss", "ws"];
        if (!validProtocols.includes(protocol.toLowerCase())) {
            return res.status(400).json({ error: "Protocol must be 'wss' or 'ws'" });
        }

        // Validate direction
        const validDirections = ["up", "down", "both"];
        if (!validDirections.includes(direction.toLowerCase())) {
            return res.status(400).json({ error: "Direction must be 'up', 'down', or 'both'" });
        }

        try {
            let relaysToSync;

            if (relayIds && Array.isArray(relayIds) && relayIds.length > 0) {
                // Schedule for specific relays
                relaysToSync = await prisma.relay.findMany({
                    where: {
                        id: {
                            in: relayIds
                        },
                        status: "running",
                        port: {
                            not: null
                        }
                    },
                    select: {
                        id: true,
                        name: true,
                        port: true
                    }
                });
            } else {
                // Schedule for all running relays
                relaysToSync = await prisma.relay.findMany({
                    where: {
                        status: "running",
                        port: {
                            not: null
                        }
                    },
                    select: {
                        id: true,
                        name: true,
                        port: true
                    }
                });
            }

            if (relaysToSync.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: "No running relays with ports found",
                    jobsCreated: 0,
                    relays: []
                });
            }

            // Create sync jobs for all selected relays
            const results: { relayName: string; syncHost: string; success: boolean; error?: string }[] = [];

            for (const relay of relaysToSync) {
                const syncHost = `${protocol.toLowerCase()}://${targetServer}:${relay.port}`;
                
                try {
                    await prisma.job.create({
                        data: {
                            relayId: relay.id,
                            kind: "sync",
                            status: "queue",
                            syncHost: syncHost,
                            syncDirection: direction.toLowerCase()
                        }
                    });

                    results.push({
                        relayName: relay.name,
                        syncHost: syncHost,
                        success: true
                    });
                } catch (error: any) {
                    results.push({
                        relayName: relay.name,
                        syncHost: syncHost,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`Created ${successCount} sync jobs to ${targetServer}`);

            return res.status(200).json({
                success: true,
                message: `Created ${successCount} sync jobs out of ${relaysToSync.length} relays`,
                jobsCreated: successCount,
                results: results
            });

        } catch (error: any) {
            console.error("Error creating sync jobs:", error);
            return res.status(500).json({ error: "Failed to create sync jobs" });
        }
    }

    if (req.method === "DELETE") {
        const { jobId, jobIds } = req.body;

        // Support both single job deletion and bulk deletion
        const idsToDelete = jobIds && Array.isArray(jobIds) ? jobIds : (jobId ? [jobId] : []);

        if (idsToDelete.length === 0) {
            return res.status(400).json({ error: "Job ID(s) required" });
        }

        try {
            const result = await prisma.job.deleteMany({
                where: {
                    id: {
                        in: idsToDelete
                    },
                    kind: "sync"
                }
            });

            console.log(`Deleted ${result.count} sync jobs`);

            return res.status(200).json({
                success: true,
                message: `Deleted ${result.count} sync job(s)`,
                deletedCount: result.count
            });
        } catch (error: any) {
            console.error("Error deleting sync jobs:", error);
            return res.status(500).json({ error: "Failed to delete sync jobs" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
