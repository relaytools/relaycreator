import { getServerSession } from "next-auth/next"
import Image from "next/image"
import authOptions from "../../pages/api/auth/[...nextauth]"
import prisma from '../../lib/prisma'
import ListEntryKeywords from "./listEntryKeywords"
import ListEntryPubkeys from "./listEntryPubkeys"
import EnableWhiteList from "./enableWhiteList"
import EnableBlackList from "./enableBlackList"
import DefaultPolicy from "./defaultPolicy"
import Moderators from "./moderators"

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
    console.log(searchParams)
    console.log(relay_id)
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
                include: { user: true }
            },
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

    if (relay == null) {
        return (
            <>
                relay not found
            </>
        )
    }

    return (
        <div>
            <div className="card card-side bg-base-100 shadow-xl">

                <figure><Image src="/green-check.png" alt="relay" width={100} height={100} /></figure>
                <div className="card-body">
                    <h2 className="card-title">{relay?.name}</h2>
                    <p>details</p>
                    <div className="card-actions justify-end">
                    </div>
                </div>
            </div>

            <div className="divider">General Settings</div>
            <DefaultPolicy relay_id={relay_id} allow={relay.default_message_policy}></DefaultPolicy>
            <div className="divider">Moderators</div>
            {relay != null && relay.moderators != null &&
                <Moderators moderators={relay.moderators} relay_id={relay_id}></Moderators>
            }

            <div className="divider">Lists</div>

            {relay != null && relay.white_list == null &&
                <EnableWhiteList relay={relay}></EnableWhiteList>
            }

            {relay != null && relay.black_list == null &&
                <EnableBlackList relay={relay}></EnableBlackList>
            }

            {relay != null && relay.white_list != null &&
                <ListEntryKeywords keywords={relay.white_list.list_keywords} relay_id={relay_id} kind="Whitelisted keywords ✅"></ListEntryKeywords>
            }

            {relay != null && relay.black_list != null &&
                <ListEntryKeywords keywords={relay.black_list.list_keywords} relay_id={relay_id} kind="Blacklisted keywords 🔨"></ListEntryKeywords>
            }

            {relay != null && relay.white_list != null &&
                <ListEntryPubkeys pubkeys={relay.white_list.list_pubkeys} relay_id={relay_id} kind="Whitelisted pubkeys ✅"></ListEntryPubkeys>
            }

            {relay != null && relay.black_list != null &&
                <ListEntryPubkeys pubkeys={relay.black_list.list_pubkeys} relay_id={relay_id} kind="Blacklisted pubkeys 🔨"></ListEntryPubkeys>
            }
        </div>
    )
}