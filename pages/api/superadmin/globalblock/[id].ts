import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import prisma from "../../../../lib/prisma";

// DELETE /api/superadmin/globalblock/:id - Remove pubkey from global block list
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

    if (req.method === "DELETE") {
        const { id } = req.query;

        if (!id) {
            res.status(400).json({ error: "Entry ID is required" });
            return;
        }

        try {
            // Verify the entry exists and belongs to global block list
            const entry = await prisma.listEntryPubkey.findFirst({
                where: {
                    id: id as string,
                    GlobalBlockListId: { not: null },
                },
            });

            if (!entry) {
                res.status(404).json({ error: "Entry not found in global block list" });
                return;
            }

            // Delete the entry
            await prisma.listEntryPubkey.delete({
                where: {
                    id: id as string,
                },
            });

            res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error removing from global block list:", error);
            res.status(500).json({ error: "Failed to remove pubkey from global block list" });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
