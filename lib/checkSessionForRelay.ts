import prisma from './prisma'
import { getSession } from 'next-auth/react'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../pages/api/auth/[...nextauth]"

export async function checkSessionForRelay(req: any, res: any) {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.name) {
        res.status(403).json({ "error": "not authenticated" })
        return null
    }

    if (!req.query.id) {
        res.status(500).json({ "error": "no relay id" })
    }

    const isMyRelay = await prisma.relay.findFirst({
        where: {
            id: req.query.id,
        },
        include: {
            moderators: true,
            block_list: true,
            allow_list: true,
        }
    })

    if (!isMyRelay) {
        res.status(404).json({ "error": "relay not found" })
        return null
    }

    const relayOwner = await prisma.user.findFirst({
        where: {
            pubkey: session.user.name,
        }
    })

    if (!relayOwner) {
        res.status(404).json({ "error": "relay not found" })
        return null
    }

    if (isMyRelay.ownerId != relayOwner.id) {
        res.status(403).json({ "error": "not your relay" })
        return null
    } else {
        // continue
    }
    return isMyRelay
}