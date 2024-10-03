import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSession"
import { getSession } from 'next-auth/react'

// used by deployment automation
export default async function handle(req: any, res: any) {

    const session = await getSession({ req });

    if (session) {
        // Signed in
        //console.log("Session", JSON.stringify(session, null, 2))
    } else {
        // Not Signed in
        res.status(404).json({ "error": "not signed in" })
        res.end()
        return
    }

    if (session == null || session.user?.name == null) {
        res.status(404).json({ "error": "not signed in" })
        res.end()
        return
    }

    const myUser = await prisma.user.findFirst({ where: { pubkey: session.user.name } })

    if (!myUser) {
        res.status(404).json({ "error": "user not found" })
        res.end()
        return
    }

    if (!process.env.DEPLOY_PUBKEY) {
        console.log("ERROR: no DEPLOY_PUBKEY environment, unauthorized")
        res.status(404).json({ "error": "unauthorized" })
        res.end()
        return
    } else {
        if (myUser.pubkey != process.env.DEPLOY_PUBKEY) {
            res.status(404).json({ "error": "unauthorized" })
            res.end()
            return
        }
    }

    if (!req.query.id) {
        res.status(500).json({ "error": "no relay id" })
    }

    if (!req.query.status || (req.query.status != "running" && req.query.status != "deleted")) {
        res.status(500).json({ "error": "no relay status, or invalid status (running or deleted)" })
    }

    if (req.method == "PUT") {
        // update relay status
        // running || deleted
        try {
            const updated = await prisma.relay.update({
                where: {
                    id: req.query.id,
                },
                data: {
                    status: req.query.status,
                }
            })
            return res.status(200).json(updated)
        } catch (e) {
            console.log("ERROR: relay update failed", e)
            return res.status(500).json({ "error": e })
        }
    } else {
        return res.status(500).json({ "error": "method not allowed" })
    }
}