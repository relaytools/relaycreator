import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSession"

function validateAclSourceUrl(url: string): boolean {
    // Must start with https://
    if (!url.match(/^https:\/\//)) {
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

    function validateAclType(type: string): boolean {
        const validTypes = ['grapevine', 'nip05'];
        return validTypes.includes(type.toLowerCase());
    }

    if (req.method == "POST") {
        const { url, type } = req.body
        
        if (!validateAclType(type)) {
            res.status(400).json({ "error": "type must be 'grapevine' or 'nip05'" })
            return
        }

        if (!validateAclSourceUrl(url)) {
            res.status(400).json({ "error": "invalid ACL source URL - must start with https://" })
            return
        }
        
        // Count existing ACL sources
        const aclSourceCount = await prisma.aclSource.count({
            where: {
                relayId: isMyRelay.id
            }
        })

        if (aclSourceCount >= 10) {
            res.status(400).json({ "error": "maximum of 10 ACL sources allowed" })
            return
        }

        // Add ACL source to relay
        const aclSource = await prisma.aclSource.create({
            data: {
                url: url,
                aclType: type,
                relayId: isMyRelay.id
            }
        })

        res.status(200).json(aclSource)
        return
    } else if (req.method == "GET") {
        // Get all ACL sources for this relay
        const aclSources = await prisma.aclSource.findMany({
            where: {
                relayId: isMyRelay.id,
            },
        });

        res.status(200).json(aclSources);
        return;
    } else if (req.method == "DELETE") {
        const { id } = req.body

        if (!id) {
            res.status(400).json({ "error": "missing id" })
            return
        }

        // Check if ACL source exists and belongs to this relay
        const aclSource = await prisma.aclSource.findFirst({
            where: {
                id: id,
                relayId: isMyRelay.id
            }
        })

        if (!aclSource) {
            res.status(404).json({ "error": "ACL source not found" })
            return
        }

        // Delete ACL source
        await prisma.aclSource.delete({
            where: {
                id: id
            }
        })

        res.status(200).json({ "success": true })
        return
    }

    res.status(405).json({ "error": "Method not allowed" })
}
