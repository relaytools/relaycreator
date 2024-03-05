"use client"
import ListEntryKeywords from "./listEntryKeywords"
import ListEntryPubkeys from "./listEntryPubkeys"
import EnableAllowList from "./enableAllowList"
import EnableBlockList from "./enableBlockList"
import DefaultPolicy from "./defaultPolicy"
import Moderators from "./moderators"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Relay from "../components/relay"
import { RelayWithEverything } from "../components/relayWithEverything"

export default function Settings(props: React.PropsWithChildren<{
    relay: RelayWithEverything;
}>) {

    const [deleteModal, setDeleteModal] = useState(false)
    const router = useRouter();

    const handleDeleteRelay = async (event: any) => {
        event.preventDefault();
        // call to API to delete relay
        setDeleteModal(false)
        const response = await fetch(`/api/relay/${props.relay.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });
        router.push("/")
    }

    return (
        <div className="">
            <Relay modActions={true} relay={props.relay} showEdit={true} showSettings={false} showDetail={true} showExplorer={true} showCopy={false} />

            <div className="badge badge-neutral mt-4">status: {props.relay.status}</div>
            <div className="divider mt-4">General Settings</div>
            <div className="mt-4">
                <DefaultPolicy relay_id={props.relay.id} pay={props.relay.payment_required} amount={props.relay.payment_amount.toString()} allow={props.relay.default_message_policy} listed={props.relay.listed_in_directory} allow_giftwrap={props.relay.allow_giftwrap} allow_tagged={props.relay.allow_tagged}></DefaultPolicy>
            </div>


            {
                props.relay != null && props.relay.moderators != null &&
                <Moderators moderators={props.relay.moderators} relay_id={props.relay.id}></Moderators>
            }

            <div className="divider">Lists</div>

            {
                props.relay != null && props.relay.allow_list == null && !props.relay.default_message_policy &&
                <EnableAllowList relay={props.relay}></EnableAllowList>
            }

            {
                props.relay != null && props.relay.allow_list != null && !props.relay.default_message_policy &&
                <ListEntryKeywords keywords={props.relay.allow_list.list_keywords} relay_id={props.relay.id} kind="Allowed Keywords ✅"></ListEntryKeywords>
            }

            {
                props.relay != null && props.relay.allow_list != null && !props.relay.default_message_policy &&
                <ListEntryPubkeys pubkeys={props.relay.allow_list.list_pubkeys} relay_id={props.relay.id} kind="Allowed Pubkeys ✅"></ListEntryPubkeys>
            }

            {
                props.relay != null && props.relay.block_list == null &&
                <EnableBlockList relay={props.relay}></EnableBlockList>
            }

            {
                props.relay != null && props.relay.block_list != null &&
                <ListEntryKeywords keywords={props.relay.block_list.list_keywords} relay_id={props.relay.id} kind="Blocked Keywords 🔨"></ListEntryKeywords>
            }

            {
                props.relay != null && props.relay.block_list != null &&
                <ListEntryPubkeys pubkeys={props.relay.block_list.list_pubkeys} relay_id={props.relay.id} kind="Blocked Pubkeys 🔨"></ListEntryPubkeys>
            }

            <div className="divider">Advanced</div>

            <button className="btn btn-secondary" onClick={() => setDeleteModal(true)}>Delete relay</button>
            {
                deleteModal && <dialog id="delete_modal" className="modal modal-open">
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

        </div >
    )

}