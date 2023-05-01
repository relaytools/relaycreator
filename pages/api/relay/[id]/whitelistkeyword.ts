import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSessionForRelay"

export default async function handle(req: any, res: any) {

    // check owner and relay, to create blank list
    const isMyRelay = await checkSessionForRelay(req, res)
    if (isMyRelay == null) {
        return
    }

    if (req.method == "POST") {
        const { keyword, reason } = req.body;
        // create whitelist
        if (isMyRelay.white_list == null && keyword == null && reason == null) {
            await prisma.whiteList.create({
                data: {
                    relayId: isMyRelay.id,
                }
            })
        } else if (isMyRelay.white_list == null) {
            await prisma.whiteList.create({
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
        } else {
            await prisma.listEntryKeyword.create({
                data: {
                    whiteListId: isMyRelay.white_list.id,
                    keyword: keyword,
                    reason: reason,
                }
            })
        }
    } else if (req.method == "PUT") {
        // update whitelist
    } else if (req.method == "DELETE") {
        // delete whitelist
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
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }

    res.status(200).json({});
}