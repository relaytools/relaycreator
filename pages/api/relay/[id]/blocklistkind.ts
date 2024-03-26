import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSessionForRelay"

export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank BlockList
    const isMyRelay = await checkSessionForRelay(req, res, true)
    if (isMyRelay == null) {
        return
    }

    if (req.method == "POST") {
        const { kind, reason } = req.body;
        if (isMyRelay.block_list == null && kind == null && reason == null) {
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
                    list_kinds: {
                        create: {
                            kind: kind,
                            reason: reason,
                        },
                    },
                }
            })
            res.status(200).json(newp)
        } else {
            const newp = await prisma.listEntryKind.create({
                data: {
                    BlockListId: isMyRelay.block_list.id,
                    kind: kind,
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
        if (listId == null) {
            res.status(500).json({ "error": "no list_id" })
            return
        }
        await prisma.listEntryKind.delete({
            where: {
                id: listId,
            }
        })
        res.status(200).json({});
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }

}