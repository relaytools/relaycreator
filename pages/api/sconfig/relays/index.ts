import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import prisma from '../../../../lib/prisma'

// GET /api/sconfig/relays
// show all relays (as a flat list?)
export default async function handle(req: any, res: any) {

    // disable login for now (no sensitive info here anyway)
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

    const allRelays = await prisma.relay.findMany({
        where: {
            status: "provision",
        },
        select:
        {
            id: true,
            name: true,
            port: true,
            domain: true,
        }
    })
    res.status(200).json(allRelays)
}