import prisma from "../../../lib/prisma";
import { checkSessionForSuperAdmin } from "../../../lib/checkSessionForSuperAdmin";

// API for managing migration streams across all running relays
// POST - Add migration stream to all running relays
// DELETE - Remove migration streams from all relays
// GET - Get all relays with their migration streams
export default async function handle(req: any, res: any) {
    // Super admin authorization check
    const isSuperAdmin = await checkSessionForSuperAdmin(req, res);
    if (!isSuperAdmin) {
        return res.status(403).json({ error: "Unauthorized - super admin only" });
    }

    if (req.method === "GET") {
        // Get all running relays with their streams and port info
        try {
            const relays = await prisma.relay.findMany({
                where: {
                    status: "running"
                },
                select: {
                    id: true,
                    name: true,
                    port: true,
                    status: true,
                    streams: {
                        select: {
                            id: true,
                            url: true,
                            direction: true,
                            internal: true,
                            sync: true,
                            status: true
                        }
                    }
                },
                orderBy: {
                    name: "asc"
                }
            });

            return res.status(200).json({
                success: true,
                relays: relays,
                totalRelays: relays.length
            });
        } catch (error: any) {
            console.error("Error fetching relays:", error);
            return res.status(500).json({ error: "Failed to fetch relays" });
        }
    }

    if (req.method === "POST") {
        // Add migration stream to all running relays
        const { targetServer, direction = "up", protocol = "wss" } = req.body;

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
            // Find all running relays with their port numbers
            const runningRelays = await prisma.relay.findMany({
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

            if (runningRelays.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: "No running relays with ports found",
                    streamsCreated: 0,
                    relays: []
                });
            }

            // Create migration streams for all running relays
            const results: { relayName: string; streamUrl: string; success: boolean; error?: string }[] = [];

            for (const relay of runningRelays) {
                const streamUrl = `${protocol.toLowerCase()}://${targetServer}:${relay.port}`;
                
                try {
                    // Check if this exact stream already exists
                    const existingStream = await prisma.stream.findFirst({
                        where: {
                            relayId: relay.id,
                            url: streamUrl
                        }
                    });

                    if (existingStream) {
                        results.push({
                            relayName: relay.name,
                            streamUrl: streamUrl,
                            success: false,
                            error: "Stream already exists"
                        });
                        continue;
                    }

                    // Create the migration stream
                    await prisma.stream.create({
                        data: {
                            relayId: relay.id,
                            url: streamUrl,
                            direction: direction.toLowerCase(),
                            internal: true, // Mark as internal migration stream
                            sync: false,
                            status: "pending"
                        }
                    });

                    // Update relay status to provision so it picks up the new stream
                    await prisma.relay.update({
                        where: { id: relay.id },
                        data: { status: "provision" }
                    });

                    results.push({
                        relayName: relay.name,
                        streamUrl: streamUrl,
                        success: true
                    });
                } catch (error: any) {
                    results.push({
                        relayName: relay.name,
                        streamUrl: streamUrl,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`Created ${successCount} migration streams to ${targetServer}`);

            return res.status(200).json({
                success: true,
                message: `Created ${successCount} migration streams out of ${runningRelays.length} relays`,
                streamsCreated: successCount,
                results: results
            });

        } catch (error: any) {
            console.error("Error creating migration streams:", error);
            return res.status(500).json({ error: "Failed to create migration streams" });
        }
    }

    if (req.method === "DELETE") {
        // Remove migration streams matching a specific target server
        const { targetServer } = req.body;

        if (!targetServer) {
            return res.status(400).json({ error: "Target server hostname is required" });
        }

        try {
            // Find all streams that match the target server pattern
            const streamsToDelete = await prisma.stream.findMany({
                where: {
                    url: {
                        contains: targetServer
                    },
                    internal: true // Only delete internal/migration streams
                },
                include: {
                    relay: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (streamsToDelete.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: "No matching migration streams found",
                    streamsDeleted: 0,
                    relays: []
                });
            }

            // Get unique relay IDs to update their status
            const relayIds = [...new Set(streamsToDelete.map(s => s.relay.id))];

            // Delete all matching streams
            await prisma.stream.deleteMany({
                where: {
                    id: {
                        in: streamsToDelete.map(s => s.id)
                    }
                }
            });

            // Update relay statuses to provision
            await prisma.relay.updateMany({
                where: {
                    id: {
                        in: relayIds
                    }
                },
                data: {
                    status: "provision"
                }
            });

            console.log(`Deleted ${streamsToDelete.length} migration streams for ${targetServer}`);

            return res.status(200).json({
                success: true,
                message: `Deleted ${streamsToDelete.length} migration streams from ${relayIds.length} relays`,
                streamsDeleted: streamsToDelete.length,
                relays: streamsToDelete.map(s => ({
                    relayName: s.relay.name,
                    streamUrl: s.url
                }))
            });

        } catch (error: any) {
            console.error("Error deleting migration streams:", error);
            return res.status(500).json({ error: "Failed to delete migration streams" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
