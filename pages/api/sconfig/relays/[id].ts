import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import prisma from '../../../../lib/prisma'

// GET /api/sconfig/haproxy/:id
// Download config file for haproxy for this server 
export default async function handle(req: any, res: any) {

    /*
    const session = await getServerSession(req, res, authOptions)
    if (session) {
        // Signed in
        console.log("Session", JSON.stringify(session, null, 2))
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
        res.status(404).json({ "error": "server not found" })
        res.end()
        return
    }
    */

    /*
    if (myUser.role != "machine") {
        res.status(404).json({ "error": "no privileges" })
        res.end()
        return
    }
    */

    // load the following from prisma:
    // the hostnames that haproxy serves on this machine
    // the backends with port# for strfry backends
    // the certificates locations

    const relay = await prisma.relay.findFirst({
        where: { id: req.query.id },
        include: {
            allow_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
                }
            },
            block_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
                }
            },
            owner: true,
            moderators: true,
        }
    })

    res.status(200).json(relay)
}