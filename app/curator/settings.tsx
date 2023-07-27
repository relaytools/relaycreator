"use client"
import ListEntryKeywords from "./listEntryKeywords"
import ListEntryPubkeys from "./listEntryPubkeys"
import EnableAllowList from "./enableAllowList"
import EnableBlockList from "./enableBlockList"
import DefaultPolicy from "./defaultPolicy"
import Moderators from "./moderators"
import { nip19 } from "nostr-tools"
import { Prisma } from "@prisma/client"
import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"

const relayWithEverything = Prisma.validator<Prisma.RelayArgs>()({
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

type RelayWithEverything = Prisma.RelayGetPayload<typeof relayWithEverything>

export default function Settings(props: React.PropsWithChildren<{
    relay: RelayWithEverything;
}>) {

    const [deleteModal, setDeleteModal] = useState(false)
    const router = useRouter();

    const handleDeleteRelay = async (event: any) => {
        event.preventDefault();
        // call to API to delete keyword
        setDeleteModal(false)
        const response = await fetch(`/api/relay/${props.relay.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });
        router.push("/")
        //router.refresh()
    }

    return (
        <div>
            <div className="card card-side bg-base-100 shadow-xl">
                <figure><Image src="/green-check.png" alt="relay" width={100} height={100} />
                </figure>
                <div className="card-body">
                    <h2 className="card-title">{props.relay?.name}</h2>
                    <p>{"wss://" + props.relay.name + ".nostr1.com"}</p>
                    <p>status: {props.relay.status}</p>

                    <div className="card-actions justify-begin">
                        <a href={"https://relays.vercel.app/relay/" + nip19.nrelayEncode("wss://" + props.relay.name + ".nostr1.com")} className="btn btn-secondary">
                            open in relay explorer<span className="sr-only">, {props.relay.id}</span>
                        </a>
                    </div>
                    <div className="card-actions justify-end">
                        <button className="btn btn-primary">Edit</button>
                    </div>
                </div>
            </div>

            <div className="divider">General Settings</div>
            <DefaultPolicy relay_id={props.relay.id} allow={props.relay.default_message_policy}></DefaultPolicy>

            <div className="divider">Moderators</div>
            {props.relay != null && props.relay.moderators != null &&
                <Moderators moderators={props.relay.moderators} relay_id={props.relay.id}></Moderators>
            }

            <div className="divider">Lists</div>

            {props.relay != null && props.relay.allow_list == null &&
                <EnableAllowList relay={props.relay}></EnableAllowList>
            }

            {props.relay != null && props.relay.allow_list != null &&
                <ListEntryKeywords keywords={props.relay.allow_list.list_keywords} relay_id={props.relay.id} kind="Allowed Keywords ✅"></ListEntryKeywords>
            }

            {props.relay != null && props.relay.allow_list != null &&
                <ListEntryPubkeys pubkeys={props.relay.allow_list.list_pubkeys} relay_id={props.relay.id} kind="Allowed Pubkeys ✅"></ListEntryPubkeys>
            }

            {props.relay != null && props.relay.block_list == null &&
                <EnableBlockList relay={props.relay}></EnableBlockList>
            }

            {props.relay != null && props.relay.block_list != null &&
                <ListEntryKeywords keywords={props.relay.block_list.list_keywords} relay_id={props.relay.id} kind="Blocked Keywords 🔨"></ListEntryKeywords>
            }

            {props.relay != null && props.relay.block_list != null &&
                <ListEntryPubkeys pubkeys={props.relay.block_list.list_pubkeys} relay_id={props.relay.id} kind="Blocked Pubkeys 🔨"></ListEntryPubkeys>
            }

            <div className="divider">Advanced</div>

            <button className="btn btn-secondary" onClick={() => setDeleteModal(true)}>Delete relay</button>
            {deleteModal && <dialog id="delete_modal" className="modal modal-open">
                <form className="modal-box bg-gray-900">
                    <h3 className="text-base text-lg text-white">Delete Relay</h3>
                    <p className="text-base text-sm text-white">Are you SURE you want to delete this relay?</p>
                    <div className="modal-action flex justify-between">
                        <button className="btn" onClick={(e) => handleDeleteRelay(e)}>Yes</button>
                        <button className="btn" onClick={() => setDeleteModal(false)}>No</button>
                    </div>
                </form>
            </dialog>
            }

        </div>
    )

}