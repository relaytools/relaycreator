import { getServerSession } from "next-auth/next";
import prisma from "../../lib/prisma";
import Nip05Orders from "./nip05Orders";
import authOptions from "../../pages/api/auth/[...nextauth]";
import { UserWithNip05s } from "../components/userWithNip05s";

export default async function Nip05Page(searchParams: Record<string, string>) {

    const session = await getServerSession(authOptions);

    if(!session) {
        return(
            <div>login required</div>
        )
    }

    const user = await prisma.user.findFirst({
        where: {
            pubkey: (session as any).user.name,
        },
        include: {
            nip05Orders: {
                include: {
                    nip05: true,
                },
            },
        },
    });

    if(user == null) {
        return(
            <div>user not found</div>
        )
    }

    const relays = await prisma.relay.findMany({
        where: {
            OR: [
                {status: "running"},
                {status: "provision"},
            ]
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
    const relayDomainNames = combinedRelays.map(
        (relay) => `${relay.name}.${relay.domain}`
    );

    // is a member of
    let userRelays = [];
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
                relayDomainNames.push(r.name + " " + r.domain);
            }
        }
    });

    console.log(relayDomainNames);

    return <Nip05Orders user={user} domains={relayDomainNames}></Nip05Orders>;
}
