import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSession"
import { getSession } from 'next-auth/react'

export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank BlockList
    const session = await getSession({ req });

    const isMyRelay = await checkSessionForRelay(req, res, true)
    if (isMyRelay == null) {
        return
    }

    if (req.method == "POST") {
        const { pubkey, reason } = req.body;
        if (isMyRelay.block_list == null && pubkey == null && reason == null) {
            const newp = await prisma.blockList.create({
                data: {
                    relayId: isMyRelay.id,
                }
            })
            res.status(200).json(newp)
        } else if (isMyRelay.block_list == null) {
            const newp = await prisma.blockList.create({
                data: {
                    relayId: isMyRelay.id,
                    list_pubkeys: {
                        create: {
                            pubkey: pubkey,
                            reason: reason,
                        },
                    },
                }
            })
            res.status(200).json(newp)
        } else {
            const newp = await prisma.listEntryPubkey.create({
                data: {
                    BlockListId: isMyRelay.block_list.id,
                    pubkey: pubkey,
                    reason: reason,
                }
            })
            res.status(200).json(newp)
        }
    } else if (req.method == "PUT") {
        // update AllowList
    } else if (req.method == "DELETE") {
        // delete AllowList
        const listId = req.query.list_id;
        const pubkey = req.query.pubkey;
        const blockListId = isMyRelay.block_list?.id;
        if (blockListId == null) {
            res.status(404).json({ error: "list not found" });
            return;
        }

        if (listId) {
            const existingEntry = await prisma.listEntryPubkey.findFirst({
                where: {
                    BlockListId: blockListId,
                    id: listId
                }
            });

            if (!existingEntry) {
                res.status(404).json({ error: "entry not found" });
                return;
            }

            await prisma.listEntryPubkey.delete({
                where: {
                    BlockListId: blockListId,
                    id: listId,
                },
            });
        } else if (pubkey) {
            const existingEntries = await prisma.listEntryPubkey.findMany({
                where: {
                    BlockListId: blockListId,
                    pubkey: pubkey
                }
            });

            if (existingEntries.length === 0) {
                res.status(404).json({ error: "entries not found" });
                return;
            }

            let pks = await prisma.listEntryPubkey.deleteMany({
                where: {
                    BlockListId: blockListId,
                    pubkey: pubkey,
                },
            });
        }

        res.status(200).json({});
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }
}