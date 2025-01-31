import prisma from "../../../../lib/prisma";
import { checkSessionForRelay } from "../../../../lib/checkSession";

// used for bulk addition of pubkeys
export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank AllowList
    const isMyRelay = await checkSessionForRelay(req, res, true);
    if (isMyRelay == null) {
        return;
    }

    let allow_list = isMyRelay.allow_list;

    if (req.method == "POST") {
        const { pubkeys, reason } = req.body;
        if (isMyRelay.allow_list == null) {
            const newa = await prisma.allowList.create({
                data: {
                    relayId: isMyRelay.id,
                },
            });
            allow_list = newa;
        }

        const allowId = allow_list!.id
        if (allowId == null || allowId == null) {
            res.status(500).json({ error: "allow_list is null" });
            return;
        }

        if (reason == null) {
            res.status(500).json({ error: "reason is null" });
            return;
        }

        // First fetch existing pubkeys for this list
        const existingPubkeys = await prisma.listEntryPubkey.findMany({
            where: {
                reason: reason,
                AllowListId: allowId,
            },
            select: {
                pubkey: true
            }
        });

        const existingSet = new Set(existingPubkeys.map(p => p.pubkey));
        const newSet = new Set(pubkeys);

        // Find pubkeys to delete (exist in DB but not in new list)
        const toDelete = [...existingSet].filter(x => !newSet.has(x));

        // Find pubkeys to add (exist in new list but not in DB) 
        const toAdd = [...newSet].filter((x): x is string => typeof x === 'string' && !existingSet.has(x));

        // Batch delete removed pubkeys
        if (toDelete.length > 0) {
            await prisma.listEntryPubkey.deleteMany({
                where: {
                    AllowListId: allowId,
                    reason: reason,
                    pubkey: { in: toDelete }
                }
            });
        }

        // Batch create new pubkeys
        if (toAdd.length > 0) {
            await prisma.listEntryPubkey.createMany({
                data: toAdd.map(pk => ({
                    AllowListId: allowId,
                    pubkey: pk,
                    reason: reason
                }))
            });
        }

        const updatedPubkeys = await prisma.listEntryPubkey.findMany({
            where: {
                AllowListId: allowId,
                reason: reason
            }
        });

        res.status(200).json({ pubkeys: updatedPubkeys });
        // DELETE ALL or LIST
    } else if (req.method == "DELETE") {
        if (allow_list == null || allow_list.id == null) {
            res.status(500).json({ error: "allow_list is null" });
            return;
        }

        const listId = req.query.list_id;
        if (listId == null) {
            res.status(500).json({ error: "no list_id" });
            return;
        }
        // delete all lists with this reason..
        if (listId != "") {
            await prisma.listEntryPubkey.deleteMany({
                where: {
                    AND: [{ AllowListId: allow_list.id }, { reason: { contains: listId }}],
                },
            });
            // delete all
        } else if (listId == "all") {
            await prisma.listEntryPubkey.deleteMany({
                where: {
                    AllowListId: allow_list.id,
                },
            });
        }

        res.status(200).json({});
    } else {
        res.status(500).json({ error: "method not allowed" });
    }
}
