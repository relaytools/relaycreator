import { getServerSession } from "next-auth/next"
import authOptions from "../../pages/api/auth/[...nextauth]"
import prisma from '../../lib/prisma'
import Wizard from "./wizard"
import { ToastContainer } from 'react-toastify'

type Params = Promise<{ relay_id: string }>

export default async function Curator({
    searchParams,
}: {
    searchParams: Params 
}) {
    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user.name) {
        return (
            <article className="prose">
                <h1>Your relay has been created.  Please Sign-in to manage your relay.</h1>
            </article>
        )
    }

    const me = await prisma.user.findFirst({
        where: { pubkey: (session as any).user.name },
    })

    // get the relay from the param
    const { relay_id } = await searchParams
    if (relay_id == null || me == null) {
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
            acl_sources: true,
        }
    })


    if (relay == null) {
        return (
            <>
                relay not found
            </>
        )
    }

    // check that user is owner or moderator of this relay
    if (me.admin) {
        // pass
    } else if (relay.owner.id != me.id && relay.moderators.filter((mod) => mod.user.pubkey == me.pubkey).length == 0) {
        return (
            <>
                relay not found
            </>
        )
    }

    return (
        <div>
            <ToastContainer/>
            <Wizard relay={relay} />
        </div>
    )
}