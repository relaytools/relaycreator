import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSessionForRelay"

export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank BlockList

    const isMyRelay = await checkSessionForRelay(req, res)
    if (isMyRelay == null) {
        return res.status(401).json({ "error": "not authorized" })
    }

    if (req.method == "DELETE") {
        // delete relay
        await prisma.relay.update({
            where: {
                id: isMyRelay.id,
            },
            data: {
                status: "deleting"
            }
        })
        return res.status(200).json({})
    }
    return res.status(500).json({ "error": "method not allowed" })
}