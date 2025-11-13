import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";
import { convertOrValidatePubkey } from "../../../lib/pubkeyValidation";

// POST /api/superadmin/globalblock - Add pubkey to global block list
export default async function handle(req: any, res: any) {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.name) {
        res.status(401).json({ error: "Not signed in" });
        return;
    }

    // Check if user is admin
    const user = await prisma.user.findFirst({
        where: {
            pubkey: (session as any).user.name,
        },
        select: {
            admin: true,
        },
    });

    if (!user || !user.admin) {
        res.status(403).json({ error: "Unauthorized - admin access required" });
        return;
    }

    if (req.method === "POST") {
        const { pubkey, reason } = req.body;

        if (!pubkey) {
            res.status(400).json({ error: "Pubkey is required" });
            return;
        }

        // Validate and convert pubkey (npub to hex if needed)
        const validatedPubkey = convertOrValidatePubkey(pubkey.trim());
        
        if (!validatedPubkey) {
            res.status(400).json({ error: "Invalid pubkey format. Must be a valid hex pubkey or npub." });
            return;
        }

        try {
            // Get or create global block list
            let globalBlockList = await prisma.globalBlockList.findFirst();
            
            if (!globalBlockList) {
                globalBlockList = await prisma.globalBlockList.create({
                    data: {},
                });
            }

            // Check if pubkey already exists
            const existingEntry = await prisma.listEntryPubkey.findFirst({
                where: {
                    GlobalBlockListId: globalBlockList.id,
                    pubkey: validatedPubkey,
                },
            });

            if (existingEntry) {
                res.status(400).json({ error: "Pubkey already in global block list" });
                return;
            }

            // Add pubkey to global block list (using validated hex pubkey)
            const entry = await prisma.listEntryPubkey.create({
                data: {
                    GlobalBlockListId: globalBlockList.id,
                    pubkey: validatedPubkey,
                    reason: reason || null,
                },
            });

            res.status(200).json(entry);
        } catch (error) {
            console.error("Error adding to global block list:", error);
            res.status(500).json({ error: "Failed to add pubkey to global block list" });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
