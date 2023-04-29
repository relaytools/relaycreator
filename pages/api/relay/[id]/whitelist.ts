import prisma from '../../../../lib/prisma'
import { getSession } from 'next-auth/react'

export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank whitelist
    const session = await getSession({ req });
    if (!session || !session.user?.name) {
        res.status(403).json({ "error": "not authenticated" })
        return
    }

    if (!req.query.id) {
        res.status(500).json({ "error": "no relay id" })
    }

    const isMyRelay = await prisma.relay.findFirst({
        where: {
            id: req.query.id,
        },
        include: {
            white_list: true,
        }
    })

    if (!isMyRelay) {
        res.status(404).json({ "error": "relay not found" })
        return
    }

    const relayOwner = await prisma.user.findFirst({
        where: {
            pubkey: session.user.name,
        }
    })

    if (!relayOwner) {
        res.status(404).json({ "error": "relay not found" })
        return
    }

    if (isMyRelay.ownerId != relayOwner.id) {
        res.status(403).json({ "error": "not your relay" })
        return
    } else {
        // continue
    }

    if (req.method == "POST") {
        // relay's id
        const relay = req.Slug;
        console.log("relay id was: " + req.query.id)
        if (isMyRelay.white_list == null) {
            await prisma.whiteList.create({
                data: {
                    relayId: isMyRelay.id
                }
            })
        }
        // create whitelist
    } else if (req.method == "PUT") {
        // update whitelist
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }

    res.status(200).json({});
}