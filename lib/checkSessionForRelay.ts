import prisma from './prisma'
import { getSession } from 'next-auth/react'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../pages/api/auth/[...nextauth]"

export async function checkSessionForRelay(req: any, res: any, modAllow: boolean = false) {
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
        res.status(404).json({ "error": "relay owner not found" })
        return null
    }

    // if not the owner, check if moderator
    if (isMyRelay.ownerId != relayOwner.id) {
        if(modAllow) {
            const umod = await prisma.user.findFirst({
                where: {
                    pubkey: session.user.name,
                }
            })
            // user for moderator not found
            if(umod == null) {
                res.status(404).json({ "error": "moderator user not found" })
                return null
            } else {
                const relayMod = await prisma.moderator.findFirst({
                    where: {
                        relayId: req.query.id,
                        userId: umod.id,
                    }
                })
                // user found but is not a moderator on this relay
                if(relayMod == null) {
                    res.status(404).json({ "error": "not your relay" })
                    return null
                }
            }
        // only checks for owner failed
        } else {
            res.status(404).json({ "error": "not your relay" })
            return null
        }
    }

    return isMyRelay
}