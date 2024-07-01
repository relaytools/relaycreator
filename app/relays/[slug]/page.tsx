import prisma from '../../../lib/prisma'
import Relay from '../../components/relay'
import Terms from '../../components/terms'
import RelayDetail from '../../components/relayDetail'
import RelayPayment from './relayPayment'
import Posts from '../../posts/page'
import { headers } from 'next/headers'

export default async function Relays({
    params,
    searchParams
}: {
    params: { slug: string }
    searchParams: { [key: string]: string | undefined }
}) {
    const { slug } = params;
    const { successpayment } = searchParams;

    const headersList = headers()
    const rewritten = headersList.get('middleware-rewritten')

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

    return (
        <div className="flex flex-wrap">

                        <div className="">
                <Posts relay={relay} publicRelays={publicRelays}/>
            </div>

            <div className="hidden">
                {successpayment && <div>you've paid for this relay! Welcome.</div>}
                {relay.payment_required && !successpayment && <RelayPayment relay={relay} />}
                <RelayDetail relay={relay} />
                <Terms />
            </div>
        </div>

    )
}