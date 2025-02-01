import prisma from "./prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";

export async function checkSessionForNip05(
    req: any,
    res: any,
    modAllow: boolean = false
) {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.name) {
        res.status(403).json({ error: "not authenticated" });
        return null;
    }

    const user = await prisma.user.findFirst({
        where: {
            pubkey: (session as any).user.name,
        },
        include: {
            nip05Orders: {
                include: {
                    nip05: {
                        include: {
                            relayUrls: true,
                        },
                    },
                },
            },
        },
    });

    const nip05Id = req.query.id;
    if (nip05Id == null) {
        res.status(404).json({ "error": "no id" })
        return
    }

    const nip05 = await prisma.nip05.findFirst({
        where: {
            id: nip05Id,
        },
        include: {
            relayUrls: true
        }
    });

    if (user == null || nip05 == null) {
        res.status(402).json({ error: "user not found" });
        return null;
    }

    // Relay admins and mods :
    if (user.pubkey == nip05.pubkey) {
        // authorized
        return nip05;
    } else if (user.admin) {
        return nip05;
    } else {
        const relays = await prisma.relay.findMany({
            where: {
                OR: [{ status: "running" }, { status: "provision" }],
            },
            include: {
                owner: true,
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

        // Find relays where the user is a moderator
        // is a moderator of
        const userModeratedRelays = relays.filter((relay) =>
            relay.moderators.some((moderator) => moderator.user.id === user.id)
        );
        // is an owner of
        const userOwnedRelays = relays.filter(
            (relay) => relay.owner.id === user.id
        );

        const combinedRelays = [...userOwnedRelays, ...userModeratedRelays];

        // Check if nip05 domain matches any of the user's moderated relays
        for (const r of combinedRelays) {
            if (nip05.domain === `${r.name}.${r.domain}`) {
                return nip05;
            }
        }

        res.status(402).json({ error: "user not found" });
        return null;
    }
}

export async function checkSessionForRelay(
    req: any,
    res: any,
    modAllow: boolean = false
) {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.name) {
        res.status(403).json({ error: "not authenticated" });
        return null;
    }

    if (!req.query.id) {
        res.status(500).json({ error: "no relay id" });
    }

    const isMyRelay = await prisma.relay.findFirst({
        where: {
            id: req.query.id,
        },
        include: {
            moderators: true,
            block_list: true,
            allow_list: true,
        },
    });

    if (!isMyRelay) {
        res.status(404).json({ error: "relay not found" });
        return null;
    }

    const relayOwner = await prisma.user.findFirst({
        where: {
            pubkey: session.user.name,
        },
    });

    const superAdmins = await prisma.user.findMany({
        where: {
            pubkey: session.user.name,
            admin: true,
        },
    });

    if (superAdmins.length > 0) {
        for (let i = 0; i < superAdmins.length; i++) {
            if (superAdmins[i].pubkey == session.user.name) {
                console.log("ALLOWING FOR SUPERADMIN");
                return isMyRelay;
            }
        }
    }

    if (!relayOwner) {
        res.status(404).json({ error: "relay owner not found" });
        return null;
    }

    // if not the owner, check if moderator
    if (isMyRelay.ownerId != relayOwner.id) {
        if (modAllow) {
            const umod = await prisma.user.findFirst({
                where: {
                    pubkey: session.user.name,
                },
            });
            // user for moderator not found
            if (umod == null) {
                res.status(404).json({ error: "moderator user not found" });
                return null;
            } else {
                const relayMod = await prisma.moderator.findFirst({
                    where: {
                        relayId: req.query.id,
                        userId: umod.id,
                    },
                });
                // user found but is not a moderator on this relay
                if (relayMod == null) {
                    res.status(404).json({ error: "not your relay" });
                    return null;
                }
            }
            // only checks for owner failed
        } else {
            res.status(404).json({ error: "not your relay" });
            return null;
        }
    }

    return isMyRelay;
}
