import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSession"
import { getSession } from 'next-auth/react'

// used for bulk addition of pubkeys
export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank AllowList
    const session = await getSession({ req });

    const isMyRelay = await checkSessionForRelay(req, res)
    if (isMyRelay == null) {
        return
    }

    let allow_list = isMyRelay.allow_list

    if (req.method == "POST") {
        const { pubkeys, reason } = req.body;
        if (isMyRelay.allow_list == null) {
            const newa = await prisma.allowList.create({
                data: {
                    relayId: isMyRelay.id,
                }
            })
            allow_list = newa
        }

        if (allow_list == null) {
            res.status(500).json({ "error": "allow_list is null" })
            return
        }

        const curPubkeys = await prisma.listEntryPubkey.findMany({
            where: {
                AllowListId: allow_list.id
            }
        })

        // if list of pubkeys has reason = "list:<something>" then sync the list.
        // by deleting the pubkeys that are not in the list anymore
        if(reason.startsWith("list:")) {
            for(const pk of curPubkeys) {
                if(pk.reason == reason) {
                    await prisma.listEntryPubkey.delete({
                        where: {
                            id: pk.id
                        }
                    })
                }
            }
        }

        let newPubkeys = []
        for (const pk of pubkeys) {
            const newp = await prisma.listEntryPubkey.create({
                data: {
                    AllowListId: allow_list.id,
                    pubkey: pk,
                    reason: reason,
                }
            })
            newPubkeys.push(newp)
        }
        res.status(200).json({ "pubkeys": newPubkeys });
    // DELETE ALL
    } else if (req.method == "DELETE") {
        if (allow_list == null || allow_list.id == null) {
            res.status(500).json({ "error": "allow_list is null" })
            return
        }

        const listId = req.query.list_id;
        if (listId == null || listId != "all") {
            res.status(500).json({ "error": "no list_id == all" })
            return
        }

        await prisma.listEntryPubkey.deleteMany({
            where: {
                AllowListId: allow_list.id
            }
        })

        res.status(200).json({});
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }
}