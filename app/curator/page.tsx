import { getServerSession } from "next-auth/next"
import authOptions from "../../pages/api/auth/[...nextauth]"
import prisma from '../../lib/prisma'
import ListEntryKeywords from "./listEntryKeywords"
import ListEntryPubkeys from "./listEntryPubkeys"

export default async function Curator(searchParams: Record<string, string>) {
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
    const { relay_id } = searchParams.searchParams
    console.log(searchParams)
    console.log(relay_id)

    const relay = await prisma.relay.findFirst({
        where: {
            id: relay_id,
        },
        include: {
            black_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
                },
            },
            white_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
                },
            },
        }
    })
    console.log(relay)

    return (
        <div>
            <h1>{relay?.name}</h1>
            <ListEntryKeywords keywords={relay?.white_list.list_keywords} kind="Whitelisted keywords"></ListEntryKeywords>
            <ListEntryKeywords keywords={relay?.black_list.list_keywords} kind="Blacklisted keywords"></ListEntryKeywords>
            <ListEntryPubkeys pubkeys={relay?.white_list.list_pubkeys} kind="Whitelisted pubkeys"></ListEntryPubkeys>
            <ListEntryPubkeys pubkeys={relay?.black_list.list_pubkeys} kind="Blacklisted pubkeys"></ListEntryPubkeys>

        </div>
    )
}