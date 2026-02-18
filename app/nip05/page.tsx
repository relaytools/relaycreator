import { getServerSession } from "next-auth/next";
import { headers } from "next/headers";
import prisma from "../../lib/prisma";
import Nip05Orders from "./nip05Orders";
import authOptions from "../../pages/api/auth/[...nextauth]";
import { UserWithNip05s } from "../components/userWithNip05s";

export default async function Nip05Page() {
    const session = await getServerSession(authOptions);
    const headersList = await headers();
    const rewritten = headersList.get('middleware-rewritten');

    if (!session) {
        return <div>login required</div>;
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

    if (user == null) {
        return <div>user not found</div>;
    }

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

    // find all available domains that the user

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

    // Create an array of strings combining the domain and name of the relay
    let relayDomainNames = combinedRelays.map(
        (relay) => `${relay.name}.${relay.domain}`
    );

    // Add root domains for superadmin only
    if (user.admin) {
        const creatorDomain = process.env.NEXT_PUBLIC_CREATOR_DOMAIN || "nostr1.com";
        const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "https://relay.tools").replace(/^https?:\/\//, '');
        // Add root domains at the beginning of the list
        relayDomainNames = [creatorDomain, rootDomain, ...relayDomainNames];
    }

    const otherNip05 = await prisma.nip05.findMany({
        where: {
            domain: {
                in: relayDomainNames,
            },
        },
        include: {
            relayUrls: true,
            nip05Orders: true,
        },
    });

    // is a member of
    let userRelays = [];
    if (user.admin) {
        relays.forEach((r) => {
            relayDomainNames.push(r.name + "." + r.domain);
        });
    } else {
        relays.forEach((r) => {
            if (r.allow_list != null) {
                let found = false;
                r.allow_list.list_pubkeys.forEach((p) => {
                    //todo bech32 matches
                    if (p.pubkey == user.pubkey) {
                        found = true;
                    }
                });
                if (found) {
                    relayDomainNames.push(r.name + "." + r.domain);
                }
            }
        });
    }

    const myNip05 = await prisma.nip05.findMany({
        where: {
            pubkey: user.pubkey, 
        },
        include: {
            relayUrls: true,
        },
    });

    
    // Filter out user's own NIP-05s AND root domain NIP-05s from other users (root domain NIP-05s are private)
    const creatorDomainLower = (process.env.NEXT_PUBLIC_CREATOR_DOMAIN || "nostr1.com").toLowerCase();
    const rootDomainLower = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "https://relay.tools").replace(/^https?:\/\//, '').toLowerCase();
    
    const filteredOther = otherNip05.filter(n => {
        // Exclude user's own NIP-05s
        if (n.pubkey === user.pubkey) return false;
        // Exclude root domain NIP-05s from other users (they're private)
        const domainLower = n.domain.toLowerCase();
        if (domainLower === creatorDomainLower || domainLower === rootDomainLower) return false;
        return true;
    });

    relayDomainNames = Array.from(new Set(relayDomainNames));

    // Determine auto-selected domain from middleware rewrite
    let autoSelectedDomain = null;
    if (rewritten) {
        // The rewritten header contains the subdomain that was rewritten
        autoSelectedDomain = rewritten;
    }

    return (
        <Nip05Orders
            user={user}
            myNip05={myNip05}
            otherNip05={filteredOther}
            domains={relayDomainNames}
            autoSelectedDomain={autoSelectedDomain}
        ></Nip05Orders>
    );
}
