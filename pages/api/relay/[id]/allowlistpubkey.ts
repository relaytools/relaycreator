import prisma from "../../../../lib/prisma";
import { checkSessionForRelay } from "../../../../lib/checkSession";

export default async function handle(req: any, res: any) {
    const isMyRelay = await checkSessionForRelay(req, res, true);
    if (isMyRelay == null) {
        return;
    }

    if (req.method == "POST") {
        const { pubkey, reason } = req.body;
        if (isMyRelay.allow_list == null && pubkey == null && reason == null) {
            const newp = await prisma.allowList.create({
                data: {
                    relayId: isMyRelay.id,
                },
            });
            res.status(200).json({});
        } else if (isMyRelay.allow_list == null) {
            const newp = await prisma.allowList.create({
                data: {
                    relayId: isMyRelay.id,
                    list_pubkeys: {
                        create: {
                            pubkey: pubkey,
                            reason: reason,
                        },
                    },
                },
            });
            res.status(200).json(newp);
        } else {
            const newp = await prisma.listEntryPubkey.create({
                data: {
                    AllowListId: isMyRelay.allow_list.id,
                    pubkey: pubkey,
                    reason: reason,
                },
            });
            res.status(200).json(newp);
        }
    } else if (req.method == "PUT") {
        // update AllowList
        const { reason } = req.body;
        const entryId = req.query.entry_id;
        if (entryId == null) {
            res.status(500).json({ error: "no entry_id specified" });
            return;
        }

        const allowListId = isMyRelay.allow_list?.id
        if(allowListId == null) {
            res.status(404).json({error: "list not found"})
        }

        const existingEntry = await prisma.listEntryPubkey.findFirst({
            where: {
                AllowListId: allowListId,
                id: entryId
            }
        });

        if (!existingEntry) {
            res.status(404).json({ error: "entry not found" });
            return;
        }

        const updatedEntry = await prisma.listEntryPubkey.update({
            where: {
                AllowListId: allowListId,
                id: entryId,
            },
            data: {
                reason: reason,
            },
        });
        res.status(200).json(updatedEntry);
        return;
    } else if (req.method == "DELETE") {
        // delete AllowList
        const listId = req.query.list_id;
        const pubkey = req.query.pubkey;
        if (listId == null && pubkey == null) {
            res.status(500).json({ error: "no list_id or pubkey" });
            return;
        }

        const allowListId = isMyRelay.allow_list?.id;
        if (allowListId == null) {
            res.status(404).json({ error: "list not found" });
            return;
        }

        if (listId) {
            const existingEntry = await prisma.listEntryPubkey.findFirst({
                where: {
                    AllowListId: allowListId,
                    id: listId
                }
            });

            if (!existingEntry) {
                res.status(404).json({ error: "entry not found" });
                return;
            }

            await prisma.listEntryPubkey.delete({
                where: {
                    AllowListId: allowListId,
                    id: listId,
                },
            });
        } else if (pubkey) {
            const existingEntries = await prisma.listEntryPubkey.findMany({
                where: {
                    AllowListId: allowListId,
                    pubkey: pubkey
                }
            });

            if (existingEntries.length === 0) {
                res.status(404).json({ error: "entries not found" });
                return;
            }

            let pks = await prisma.listEntryPubkey.deleteMany({
                where: {
                    AllowListId: allowListId,
                    pubkey: pubkey,
                },
            });
        }

        res.status(200).json({});
    } else {
        res.status(500).json({ error: "method not allowed" });
    }
}