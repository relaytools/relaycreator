import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSessionForRelay"
import { getSession } from 'next-auth/react'

// used for bulk addition of pubkeys
export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank AllowList
    const session = await getSession({ req });

    const isMyRelay = await checkSessionForRelay(req, res)
    if (isMyRelay == null) {
        return
    }

    let block_list = isMyRelay.block_list

    if (req.method == "POST") {
        const { pubkeys, reason } = req.body;
        if (isMyRelay.block_list == null) {
            const newa = await prisma.blockList.create({
                data: {
                    relayId: isMyRelay.id,
                }
            })
            block_list = newa
        }

        if (block_list == null) {
            res.status(500).json({ "error": "block_list is null" })
            return
        }

        let newPubkeys = []
        for (const pk of pubkeys) {
            const newp = await prisma.listEntryPubkey.create({
                data: {
                    AllowListId: block_list.id,
                    pubkey: pk,
                    reason: reason,
                }
            })
            newPubkeys.push(newp)
        }
        res.status(200).json({ "pubkeys": newPubkeys });
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }
}