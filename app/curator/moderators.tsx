"use client"
import { useState } from "react";
import { nip19 } from "nostr-tools";

export type User = {
    pubkey: string;
}

export type Moderator = {
    user: User;
    id: string;
}

export default function Moderators(props: React.PropsWithChildren<{
    moderators: Moderator[];
    relay_id: string;
}>) {

    const [pubkey, setPubkey] = useState("");
    const [newpubkey, setNewPubkey] = useState(false);
    const [moderators, setModerators] = useState(props.moderators)
    const [pubkeyError, setPubkeyError] = useState("")
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("")
    const [help, setHelp] = useState(false)

    function isValidForm() {
        console.log("calling isValid form" + pubkeyError)
        if (pubkeyError == "✅") {
            return true
        } else {
            return false
        }
    }

    function setAndValidatePubkey(pubkey: string) {
        setPubkey(pubkey)
        // use javascript regex to detect if length is 64 characters
        // check for hex chars
        const validHex = /^[0-9a-fA-F]{64}$/.test(pubkey)
        // check for npub
        const validNpub = /^npub1[0-9a-zA-Z]{58}$/.test(pubkey)

        if (validHex) {
            setPubkeyError("✅")
            setPubkeyErrorDescription("")
        } else if (validNpub) {
            setPubkeyError("✅")
            setPubkeyErrorDescription("")
        } else {
            setPubkeyError("❌")
            setPubkeyErrorDescription("key must be valid hex or npub")
        }
    }

    const handleDelete = async (event: any) => {
        event.preventDefault();
        console.log(event.currentTarget.id)
        const deleteThisId = event.currentTarget.id
        // call to API to delete moderator
        const response = await fetch(`/api/relay/${props.relay_id}/moderator?moderator_id=${event.currentTarget.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });
        // delete the entry from the props
        let newlist: Moderator[] = []
        moderators.forEach((entry) => {
            if (entry.id != deleteThisId) {
                newlist.push(entry)
            }
        })
        setModerators(newlist)
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const validNpub = /^npub1[0-9a-zA-Z]{58}$/.test(pubkey)
        let submitHex: any
        if (validNpub) {
            const decoded = nip19.decode(pubkey)
            submitHex = decoded.data
        } else {
            submitHex = pubkey
        }
        // call to API to add new keyword
        const response = await fetch(`/api/relay/${props.relay_id}/moderator`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "pubkey": submitHex })
        });

        if (response.ok) {
            const j = await response.json()
            setNewPubkey(false)
            const newMods = moderators
            newMods.push({ "id": j.id, "user": { "pubkey": submitHex } })
            setModerators(newMods)
            setPubkey("")
        }
    }

    const toggleHelp = async () => {
        if (help) {
            setHelp(false)
        } else {
            setHelp(true)
        }
    }

    const handleCancel = async () => {
        setNewPubkey(false)
        setPubkey("")
    }

    return (
        <div>
            <div className="divider">Moderators <div className="tooltip tooltip-primary" data-tip="more info">
                <img onClick={toggleHelp} src="icons8-tooltip-64.png"></img>
            </div>
            </div>
            {help && <div>
                <p className="text-lg font-medium">Moderator capabilities:</p>
                <ul>
                    <li><p>Delete events from the relay by sending a report event (kind 1984).</p></li>
                    <li><p>Login and view relay settings.</p></li>
                </ul>
            </div>}
            <div className="px-4 sm:px-6 lg:px-8">

                <div className="mt-8 flow-root">
                    <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                            <table className="table table-md">
                                <thead>
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-0">
                                            Mods
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {moderators.map((entry) => (
                                        <tr key={entry.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                                {entry.user.pubkey}
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right">

                                                <button onClick={handleDelete} className="btn btn-secondary" id={entry.id}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}

                                    {newpubkey &&
                                        <tr>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                                <form className="space-y-6" action="#" method="POST">
                                                    <input
                                                        type="text"
                                                        name="pubkey"
                                                        id="newpubkey"
                                                        className="input input-bordered input-primary w-full max-w-xs"
                                                        placeholder="add pubkey"
                                                        autoComplete="off"
                                                        value={pubkey}
                                                        onChange={event => setAndValidatePubkey(event.target.value)}
                                                    />
                                                    <button disabled={!isValidForm()} onClick={handleSubmit} className="btn btn-primary">Add</button>
                                                    <button onClick={handleCancel} className="btn btn-primary">Cancel</button>
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold ">
                                                        {pubkeyError}
                                                    </button>
                                                </form>

                                                <span className="flex items-center font-medium tracking-wide text-red-500 text-xs mt-1 ml-1">
                                                    {pubkeyErrorDescription}
                                                </span>
                                            </td>

                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
                {!newpubkey &&
                    <div className="">
                        <button
                            onClick={() => setNewPubkey(true)}
                            type="button"
                            className="btn btn-primary"
                        >
                            Add pubkey
                        </button>
                    </div>
                }
            </div>
        </div>
    )
}