import { getServerSession } from "next-auth/next"
import authOptions from "../../pages/api/auth/[...nextauth]"
import prisma from '../../lib/prisma'
import Settings from "./settings"

export default async function Curator({
    params,
    searchParams,
}: {
    params: { slug: string }
    searchParams: { [key: string]: string | undefined }
}) {
    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user.name) {
        return (
            <>
                <div></div>
            </>
        )
    }

    const me = await prisma.user.findFirst({
        where: { pubkey: (session as any).user.name },
    })

    // get the relay from the param
    const { relay_id } = searchParams
    if (relay_id == null) {
        return (
            <>
                relay not found
            </>
        )
    }

    const relay = await prisma.relay.findFirst({
        where: {
            id: relay_id,
        },
        include: {
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
    console.log(relay)

    if (relay == null) {
        return (
            <>
                relay not found
            </>
        )
    }

    return (
        <div>
            <Settings relay={relay} />
        </div>
    )
}