import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSession"
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
            const newp = await prisma.moderator.create({
                data: {
                    relayId: isMyRelay.id,
                    userId: newUser.id,
                }
            })
            res.status(200).json(newp)
        } else {
            // check if moderator record exists already
            const isExisting = await prisma.moderator.findFirst({
                where: {
                    relayId: isMyRelay.id,
                    userId: thisUser.id,
                },
            })
            if (!isExisting) {
                const newp = await prisma.moderator.create({
                    data: {
                        relayId: isMyRelay.id,
                        userId: thisUser.id,
                    }
                })
                res.status(200).json(newp)
            } else {
                res.status(500).json({ "error": "moderator already exists" })
            }
        }
    } else if (req.method == "DELETE") {
        // delete moderator
        const thisId = req.query.moderator_id;
        const deleteMe = await prisma.moderator.findFirst({
            where: {
                relayId: { equals: isMyRelay.id },
                id: { equals: thisId },
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
        res.status(200).json({});
    } else {
        res.status(500).json({ "error": "method not allowed" })
    }

}