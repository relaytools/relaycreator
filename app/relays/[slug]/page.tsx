import prisma from '../../../lib/prisma'
import Relay from '../../components/relay'
import Terms from '../../components/terms'
import RelayDetail from '../../components/relayDetail'
import RelayPayment from './relayPayment'

export default async function Relays({
    params,
    searchParams
}: {
    params: { slug: string }
    searchParams: { [key: string]: string | undefined }
}) {
    const { slug } = params;
    const { successpayment } = searchParams;

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
                },
            },
            allow_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
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
        <div>
            <Relay key={"pub" + relay.id} relay={relay} showEdit={false} showSettings={false} showDetail={false} showCopy={true} showExplorer={true} />
            {successpayment && <div>you've paid for this relay! Welcome.</div>}
            {relay.payment_required && !successpayment && <RelayPayment relay={relay} />}
            <RelayDetail relay={relay} />
            <Terms />
        </div>

    )
}