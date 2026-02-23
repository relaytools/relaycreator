import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSession"

async function isPremiumPlan(relayId: string): Promise<boolean> {
    const planChange = await prisma.relayPlanChange.findFirst({
        where: { relayId },
        orderBy: { started_at: 'desc' },
    });
    return planChange?.plan_type === 'premium';
}

function validateStreamUrl(url: string): boolean {
    // Must start with wss:// or ws://
    if (!url.match(/^wss?:\/\//)) {
        return false
    }

    try {
        const parsedUrl = new URL(url)
        // Check for valid hostname
        if (!parsedUrl.hostname) {
            return false
        }
        // Prevent localhost/internal IPs
        const hostname = parsedUrl.hostname.toLowerCase()
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.')) {
            return false
        }
        return true
    } catch {
        return false
    }
}

export default async function handle(req: any, res: any) {
    // check owner and relay
    const isMyRelay = await checkSessionForRelay(req, res, true)
    if (isMyRelay == null) {
        res.status(500).json({ "error": "unauthorized" })
        return
    }

    function validateDirection(direction: string): boolean {
        const validDirections = ['up', 'down', 'both'];
        return validDirections.includes(direction.toLowerCase());
    }

    if (req.method == "POST") {
        // Check premium plan
        if (!await isPremiumPlan(isMyRelay.id)) {
            res.status(403).json({ "error": "Streams require a premium plan" })
            return
        }

        const { url, direction } = req.body
        
        if (!validateDirection(direction)) {
            res.status(400).json({ "error": "direction must be 'up', 'down', or 'both'" })
            return
        }

        if (!validateStreamUrl(url)) {
            res.status(400).json({ "error": "invalid stream URL" })
            return
        }
        
        // Count existing streams
        const streamCount = await prisma.stream.count({
            where: {
                relayId: isMyRelay.id
            }
        })

        if (streamCount >= 5) {
            res.status(400).json({ "error": "maximum of 5 streams allowed" })
            return
        }

        // Add stream to relay
        const stream = await prisma.stream.create({
            data: {
                url: url,
                direction: direction,
                relayId: isMyRelay.id,
                status: "pending"
            }
        })

        // Update relay status to provision
        await prisma.relay.update({
            where: {
                id: isMyRelay.id
            },
            data: {
                status: "provision"
            }
        })

        res.status(200).json(stream)
        return
    } else if (req.method == "GET") {
        // Get all streams for this relay
        const streams = await prisma.stream.findMany({
            where: {
                relayId: isMyRelay.id,
            },
        });

        res.status(200).json(streams);
        return;
    } else if (req.method == "DELETE") {
        console.log(req.body)
        const { id, url } = req.body

        // Delete the stream
        const deletedStream = await prisma.stream.delete({
            where: {
                id: id,
                relayId: isMyRelay.id
            }
        })

        // Update relay status to provision
        await prisma.relay.update({
            where: {
                id: isMyRelay.id
            },
            data: {
                status: "provision"
            }
        })

        res.status(200).json(deletedStream)
        return
    } else {
        res.status(500).json({ error: "method not allowed" });
        return;
    }
}