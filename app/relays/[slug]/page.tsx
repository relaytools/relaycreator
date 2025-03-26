import prisma from '../../../lib/prisma'
import Posts from '../../posts/page'
import { headers } from 'next/headers'

export default async function Relays({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params;

    /*
// this will be user fav relays eventually
    const publicRelays = await prisma.relay.findMany({
        where: {
            status: "running",
            listed_in_directory: true,
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
        }
    })

    const relay = await prisma.relay.findFirst({
        where: {
            OR: [
                {
                    status: "running",
                },
                {
                    status: "provision",
                },
            ],
            //listed_in_directory: true,
            name: slug,
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
        }
    })

    if (relay == null) {
        return (
            <div>relay not found</div>
        )
    }
        */
    return (
        <div className="flex flex-wrap">
            <div className="">
                <Posts relayName={slug} />
            </div>
        </div>
    )
}