import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import prisma from "../../../../lib/prisma";

// GET /api/sconfig/relays/:id
// spamblaster queries this for the relay settings
export default async function handle(req: any, res: any) {
    const relay = await prisma.relay.findFirst({
        where: { id: req.query.id },
        select: {
            id: true,
            name: true,
            status: true,
            default_message_policy: true,
            allow_giftwrap: true,
            allow_tagged: true,
            allow_list: {
                select: {
                    list_keywords: true,
                    list_pubkeys: true,
                },
            },
            block_list: {
                select: {
                    list_keywords: true,
                    list_pubkeys: true,
                },
            },
            owner: true,
            moderators: {
                select: {
                    user: { select: { pubkey: true } },
                },
            },
        },
    });

    res.status(200).json(relay);
}
