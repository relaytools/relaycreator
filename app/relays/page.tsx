import { getServerSession } from "next-auth/next";
import authOptions from "../../pages/api/auth/[...nextauth]";
import prisma from "../../lib/prisma";
import PublicRelays from "./publicRelays";
import MyRelays from "./myRelays";
import CreateRelay from "./createRelay";
import HelpfulInfo from "./helpfulInfo";

export default async function Relays() {
    const session = await getServerSession(authOptions);

    const publicRelays = await prisma.relay.findMany({
        where: {
            status: "running",
            listed_in_directory: true,
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

    let showSignup = false;

    if (!session || !(session as any).user.name) {
        return (
            <div>
                {showSignup && <CreateRelay />}
                {!showSignup && <HelpfulInfo />}

                <PublicRelays relays={publicRelays} />
            </div>
        );
    }

    const me = await prisma.user.findFirst({
        where: {
            pubkey: (session as any).user.name,
        },
    });

    // not likely, since we're logged in
    if (me == null) {
        return <div>user not found?</div>;
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

    if (myRelays.length == 0 && moderatedRelays.length == 0) {
        showSignup = false;
    }

    return (
        <div className="">
            {showSignup && <CreateRelay />}
            {!showSignup && <HelpfulInfo />}
            <MyRelays
                myRelays={myRelays}
                moderatedRelays={moderatedRelays}
                publicRelays={publicRelays}
            />
        </div>
    );
}
