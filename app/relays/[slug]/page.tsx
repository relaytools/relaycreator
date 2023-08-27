import prisma from '../../../lib/prisma'
import Relay from '../../components/relay'
import Terms from '../../components/terms'
import RelayDetail from '../../components/relayDetail'

export default async function Relays({ params }: { params: { slug: string } }) {
    const { slug } = params;

    const relay = await prisma.relay.findFirst({
        where: {
            status: "running",
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
            <Relay key={"pub" + relay.id} relay={relay} showEdit={false} showSettings={false} />
            <RelayDetail relay={relay} />
            <Terms />
        </div>

    )
}