import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSessionForRelay"
import { getSession } from 'next-auth/react'

export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank AllowList
    const session = await getSession({ req });

    const isMyRelay = await checkSessionForRelay(req, res)
    if (isMyRelay == null) {
        return
    }

    if (req.method == "POST") {
        const { pubkey, reason } = req.body;
        if (isMyRelay.allow_list == null && pubkey == null && reason == null) {
            await prisma.allowList.create({
                data: {
                    relayId: isMyRelay.id,
                }
            })
        } else if (isMyRelay.allow_list == null) {
            await prisma.allowList.create({
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
        } else {
            await prisma.listEntryPubkey.create({
                data: {
                    AllowListId: isMyRelay.allow_list.id,
                    pubkey: pubkey,
                    reason: reason,
                }
            })
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
        await prisma.listEntryPubkey.delete({
            where: {
                id: listId,
            }
        })
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }

    res.status(200).json({});
}