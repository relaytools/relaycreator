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

    const { pubkey } = req.body;

    if (req.method == "POST") {
        // find all moderators for this relay
        const thisUser = await prisma.user.findFirst({
            where: {
                pubkey: pubkey,
            }
        })
        if (thisUser == null) {
            // user doesn't exist yet, create them
            const newUser = await prisma.user.create({
                data: {
                    pubkey: pubkey,
                }
            })
            await prisma.moderator.create({
                data: {
                    relayId: isMyRelay.id,
                    userId: newUser.id,
                }
            })
        } else {
            // user exists already, check and add as mod
            const isExisting = await prisma.moderator.findFirst({
                where: {
                    relayId: isMyRelay.id,
                    userId: thisUser.id,
                },
            })
            if (!isExisting) {
                await prisma.moderator.create({
                    data: {
                        relayId: isMyRelay.id,
                        userId: thisUser.id,
                    }
                })
            }
        }
    } else if (req.method == "DELETE") {
        // delete moderator
        const thisUser = await prisma.user.findFirst({
            where: {
                pubkey: pubkey,
            }
        })
        if (thisUser == null) {
            res.status(500).json({ "error": "user not found" })
            return
        }
        const deleteMe = await prisma.moderator.findFirst({
            where: {
                relayId: { equals: isMyRelay.id },
                userId: { equals: thisUser.id },
            },
        })
        if (deleteMe == null) {
            res.status(500).json({ "error": "moderator not found" })
            return
        }
        await prisma.moderator.delete({
            where: {
                id: deleteMe.id,
            }
        })
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }

    res.status(200).json({});
}