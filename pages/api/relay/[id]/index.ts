import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSessionForRelay"
import { getSession } from 'next-auth/react'

export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank BlockList
    const session = await getSession({ req });

    const isMyRelay = await checkSessionForRelay(req, res)
    if (isMyRelay == null) {
        return
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