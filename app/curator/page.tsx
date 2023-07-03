import { getServerSession } from "next-auth/next"
import Image from "next/image"
import authOptions from "../../pages/api/auth/[...nextauth]"
import prisma from '../../lib/prisma'
import ListEntryKeywords from "./listEntryKeywords"
import ListEntryPubkeys from "./listEntryPubkeys"
import EnableAllowList from "./enableAllowList"
import EnableBlockList from "./enableBlockList"
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
            <div className="card card-side bg-base-100 shadow-xl">

                <figure><Image src="/green-check.png" alt="relay" width={100} height={100} /></figure>
                <div className="card-body">
                    <h2 className="card-title">{relay?.name}</h2>
                    <p>details:</p>
                    <p>{relay.name}</p>
                    <p>{"wss://" + relay.name + ".nostr1.com"}</p>
                    <div className="card-actions justify-end">

                        <button className="btn btn-primary">Edit</button>
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

            {relay != null && relay.allow_list == null &&
                <EnableAllowList relay={relay}></EnableAllowList>
            }

            {relay != null && relay.allow_list != null &&
                <ListEntryKeywords keywords={relay.allow_list.list_keywords} relay_id={relay_id} kind="Allowed Keywords ✅"></ListEntryKeywords>
            }

            {relay != null && relay.allow_list != null &&
                <ListEntryPubkeys pubkeys={relay.allow_list.list_pubkeys} relay_id={relay_id} kind="Allowed Pubkeys ✅"></ListEntryPubkeys>
            }

            {relay != null && relay.block_list == null &&
                <EnableBlockList relay={relay}></EnableBlockList>
            }

            {relay != null && relay.block_list != null &&
                <ListEntryKeywords keywords={relay.block_list.list_keywords} relay_id={relay_id} kind="Blocked Keywords 🔨"></ListEntryKeywords>
            }

            {relay != null && relay.block_list != null &&
                <ListEntryPubkeys pubkeys={relay.block_list.list_pubkeys} relay_id={relay_id} kind="Blocked Pubkeys 🔨"></ListEntryPubkeys>
            }
        </div>
    )
}