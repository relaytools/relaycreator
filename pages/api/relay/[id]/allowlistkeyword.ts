import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSession"

export default async function handle(req: any, res: any) {

    // check owner and relay, to create blank list
    const isMyRelay = await checkSessionForRelay(req, res, true)
    if (isMyRelay == null) {
        return
    }



    if (req.method == "POST") {
        const { keyword, reason } = req.body;
        // create AllowList
        if (isMyRelay.allow_list == null && keyword == null && reason == null) {
            await prisma.allowList.create({
                data: {
                    relayId: isMyRelay.id,
                }
            })
            res.status(200).json({})
        } else if (isMyRelay.allow_list == null) {
            const newp = await prisma.allowList.create({
                data: {
                    relayId: isMyRelay.id,
                    list_keywords: {
                        create: {
                            keyword: keyword,
                            reason: reason,
                        }
                    }
                }
            })
            res.status(200).json(newp)
        } else {
            const newp = await prisma.listEntryKeyword.create({
                data: {
                    AllowListId: isMyRelay.allow_list.id,
                    keyword: keyword,
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
        await prisma.listEntryKeyword.delete({
            where: {
                id: listId,
            }
        })
        res.status(200).json({})
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }

}