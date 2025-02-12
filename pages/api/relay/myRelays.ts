import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handle(req: any, res: any) {

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.name) {
        res.status(403).json({ error: "not authenticated" });
        return;
    }

    const me = await prisma.user.findFirst({
        where: {
            pubkey: (session as any).user.name,
        },
    });

    // not likely, since we're logged in
    if (me == null) {
        res.status(403).json({ error: "user not found" });
        return;
    }

    let myRelays = await prisma.relay.findMany({
        where: {
            ownerId: me.id,
            OR: [{ status: "running" }, { status: "provision" }],
        },
        include: {
            owner: true,
            streams: {
                select: {
                    id: true,
                    url: true,
                    direction: true,
                    internal: true,
                    sync: true,
                    status: true,
                },
            },
            moderators: {
                include: { user: true },
            },
            block_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
                    list_kinds: true,
                },
            },
            allow_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
                    list_kinds: true,
                },
            },
        },
    });

    if (me.admin) {
        myRelays = await prisma.relay.findMany({
            where: {
                OR: [{ status: "running" }, { status: "provision" }],
            },
            include: {
                owner: true,
                streams: {
                    select: {
                        id: true,
                        url: true,
                        direction: true,
                        internal: true,
                        sync: true,
                        status: true,
                    },
                },
                moderators: {
                    include: { user: true },
                },
                block_list: {
                    include: {
                        list_keywords: true,
                        list_pubkeys: true,
                        list_kinds: true,
                    },
                },
                allow_list: {
                    include: {
                        list_keywords: true,
                        list_pubkeys: true,
                        list_kinds: true,
                    },
                },
            },
        });
    }

    const moderatedRelays = await prisma.moderator.findMany({
        where: {
            userId: me.id,
        },
        include: {
            relay: {
                include: {
                    owner: true,
                    streams: {
                        select: {
                            id: true,
                            url: true,
                            direction: true,
                            internal: true,
                            sync: true,
                            status: true,
                        },
                    },
                    moderators: {
                        include: { user: true },
                    },
                    block_list: {
                        include: {
                            list_keywords: true,
                            list_pubkeys: true,
                            list_kinds: true,
                        },
                    },
                    allow_list: {
                        include: {
                            list_keywords: true,
                            list_pubkeys: true,
                            list_kinds: true,
                        },
                    },
                },
            },
        },
    });

    if (req.method == "GET") {
        res.status(200).json({ myRelays, moderatedRelays });
    }
}


