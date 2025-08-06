import prisma from "../../../../lib/prisma";
import { checkSessionForRelay } from "../../../../lib/checkSession";
import { getSession } from "next-auth/react";

// used for bulk addition of pubkeys
export default async function handle(req: any, res: any) {
    const isMyRelay = await checkSessionForRelay(req, res, true);
    if (isMyRelay == null) {
        return;
    }

    let block_list = isMyRelay.block_list;

    if (req.method == "POST") {
        const { pubkeys, reason } = req.body;
        if (isMyRelay.block_list == null) {
            const newa = await prisma.blockList.create({
                data: {
                    relayId: isMyRelay.id,
                },
            });
            block_list = newa;
        }

        if (block_list == null) {
            res.status(500).json({ error: "block_list is null" });
            return;
        }

        const curPubkeys = await prisma.listEntryPubkey.findMany({
            where: {
                BlockListId: block_list.id,
            },
        });

        // if list of pubkeys has reason = "list:<something>" then sync the list.
        // by deleting the pubkeys that are not in the list anymore
        if (reason.startsWith("list:")) {
            for (const pk of curPubkeys) {
                if (pk.reason == reason) {
                    await prisma.listEntryPubkey.delete({
                        where: {
                            id: pk.id,
                        },
                    });
                }
            }
        }

        let newPubkeys = [];
        for (const pk of pubkeys) {
            const newp = await prisma.listEntryPubkey.create({
                data: {
                    BlockListId: block_list.id,
                    pubkey: pk,
                    reason: reason,
                },
            });
            newPubkeys.push(newp);
        }
        res.status(200).json({ pubkeys: newPubkeys });

        // DELETE ALL
    } else if (req.method == "DELETE") {
        if (block_list == null || block_list.id == null) {
            res.status(500).json({ error: "block_list is null" });
            return;
        }

        const listId = req.query.list_id;
        if (listId == null) {
            res.status(500).json({ error: "no list_id" });
            return;
        }
        // delete all lists with this reason..
        if (listId != "" && listId != "all") {
            await prisma.listEntryPubkey.deleteMany({
                where: {
                    AND: [
                        { BlockListId: block_list.id },
                        { reason: { contains: listId } },
                    ],
                },
            });
            // delete all
        } else if (listId == "all") {
            await prisma.listEntryPubkey.deleteMany({
                where: {
                    BlockListId: block_list.id,
                },
            });
        }

        res.status(200).json({});
    } else {
        res.status(500).json({ error: "method not allowed" });
    }
}
