import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSession"

export default async function handle(req: any, res: any) {
    const isMyRelay = await checkSessionForRelay(req, res, true)
    if (isMyRelay == null) {
        return
    }

    if (req.method == "POST") {
        const { pubkey, reason } = req.body;
        if (isMyRelay.allow_list == null && pubkey == null && reason == null) {
            const newp = await prisma.allowList.create({
                data: {
                    relayId: isMyRelay.id,
                }
            })
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
                }
            })
            res.status(200).json(newp);
        } else {
            const newp = await prisma.listEntryPubkey.create({
                data: {
                    AllowListId: isMyRelay.allow_list.id,
                    pubkey: pubkey,
                    reason: reason,
                }
            })
            res.status(200).json(newp);
        }
    } else if (req.method == "PUT") {
        // update AllowList
    } else if (req.method == "DELETE") {
        // delete AllowList
        const listId = req.query.list_id;
        const pubkey = req.query.pubkey;
        if (listId == null && pubkey == null) {
            res.status(500).json({ "error": "no list_id or pubkey" })
            return
        }
        if(listId) {
            await prisma.listEntryPubkey.delete({
                where: {
                    id: listId,
                }
            })
        } else if(pubkey) {
            let pks = await prisma.listEntryPubkey.deleteMany({
                where: {
                    pubkey: pubkey,
                },
            })
        }

        res.status(200).json({});
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }

}