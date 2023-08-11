"use client"
import { useState } from "react";
import NDK from "@nostr-dev-kit/ndk";
import { NDKFilter, NDKEvent } from "@nostr-dev-kit/ndk"
import { useSession } from "next-auth/react";

type ListEntryPubkey = {
    pubkey: string;
    reason: string | null;
    id: string,
}

export default function ListEntryPubkeys(props: React.PropsWithChildren<{
    pubkeys: ListEntryPubkey[];
    kind: string;
    relay_id: string;
}>) {

    const { data: session, status } = useSession();

    // listr.lol only publishes to a specific set of relays right now
    const ndk = new NDK({ explicitRelayUrls: ["wss://nos.lol", "wss://relay.damus.io", "wss://relay.nostr.band", "wss://nostr21.com"] });

    const [pubkey, setPubkey] = useState("");
    const [reason, setReason] = useState("");
    const [newpubkey, setNewPubkey] = useState(false);
    const [pubkeys, setPubkeys] = useState(props.pubkeys)

    let ndkevents: Set<NDKEvent> = new Set();
    const blankevents: String[] = []

    const [events, setEvents] = useState(ndkevents)
    const [listr, setListr] = useState(blankevents)

    let idkind = ""
    if (props.kind == "Allowed Pubkeys ✅") {
        idkind = "allowlist"
    } else {
        idkind = "blocklist"
    }

    const handleDelete = async (event: any) => {
        event.preventDefault();
        const deleteThisId = event.currentTarget.id
        // call to API to delete keyword
        const response = await fetch(`/api/relay/${props.relay_id}/${idkind}pubkey?list_id=${event.currentTarget.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });
        // delete the entry from the props
        let newlist: ListEntryPubkey[] = []
        pubkeys.forEach((entry) => {
            if (entry.id != deleteThisId) {
                newlist.push(entry)
            }
        })
        setPubkeys(newlist)
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const id = event.currentTarget.id
        console.log(event.currentTarget.id)
        // call to API to add new keyword
        const response = await fetch(`/api/relay/${props.relay_id}/${idkind}pubkey`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "pubkey": pubkey, "reason": reason })
        });

        if (response.ok) {
            const j = await response.json()
            setNewPubkey(false)
            pubkeys.push({ "pubkey": pubkey, "reason": reason, "id": j.id })
            setPubkey("")
            setReason("")
        }
    }

    const setNewPubkeyHandler = async () => {
        setNewPubkey(true)
        if (session && session.user != null && session.user.name != null) {
            ndk.connect()
            const filter: NDKFilter = { kinds: [30000, 10000, 3], authors: [session.user.name] }
            // Will return all found events
            const events = await ndk.fetchEvents(filter);
            console.log(events)
            const listNames = getListNames(events)
            setListr(listNames)
            setEvents(events)
        }
    }

    function getListNames(list: Set<NDKEvent>) {
        let dtags: string[] = []
        list.forEach((l) => {
            if (l.kind == 10000) {
                dtags.push("mute")
            } else if (l.kind == 3) {
                dtags.push("follows")
            } else if (l.kind == 30000) {
                const names = l.getMatchingTags("d")
                dtags.push(names[0][1])
            }
        })
        return dtags
    }

    function getPubkeysFromList(listName: string) {
        let stringPubkeysFromList: string[] = []
        events.forEach((n) => {
            if (n.kind == 30000) {
                const name = n.getMatchingTags("d")
                if (name[0][1] == listName) {
                    const pubkeysFromList = n.getMatchingTags("p")
                    pubkeysFromList.forEach((pk) => {
                        stringPubkeysFromList.push(pk[1])
                    })
                }
            } else if (n.kind == 10000 && listName == "mute") {
                const pubkeysFromList = n.getMatchingTags("p")
                pubkeysFromList.forEach((pk) => {
                    stringPubkeysFromList.push(pk[1])
                })
            } else if (n.kind == 3 && listName == "follows") {
                const pubkeysFromList = n.getMatchingTags("p")
                pubkeysFromList.forEach((pk) => {
                    stringPubkeysFromList.push(pk[1])
                })
            }
        })
        console.log(stringPubkeysFromList)
        return stringPubkeysFromList
    }

    function getPubkeyCount(listName: string) {
        let count = 0
        events.forEach((n) => {
            if (n.kind == 30000) {
                const name = n.getMatchingTags("d")
                if (name[0][1] == listName) {
                    const pubkeysFromList = n.getMatchingTags("p")
                    count = pubkeysFromList.length
                }
            } else if (n.kind == 10000 && listName == "mute") {
                const pubkeysFromList = n.getMatchingTags("p")
                count = pubkeysFromList.length
            } else if (n.kind == 3 && listName == "follows") {
                const pubkeysFromList = n.getMatchingTags("p")
                count = pubkeysFromList.length
            }

        })
        return count
    }

    const handleAddList = async (e: any) => {
        e.preventDefault();
        const listName = e.currentTarget.id
        const postThese = getPubkeysFromList(listName)
        // de-dupe with current pubkeys
        let newPubkeys: string[] = []
        for (const pk of postThese) {
            let found = false
            for (const p of pubkeys) {
                if (p.pubkey == pk) {
                    found = true
                }
            }
            if (!found) {
                newPubkeys.push(pk)
            }
        }
        // post to API, pubkeys with reason set to listname
        const thisReason = "list:" + listName
        const response = await fetch(`/api/relay/${props.relay_id}/${idkind}pubkeys`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "pubkeys": newPubkeys, "reason": thisReason })
        });
        if (response.ok) {
            const j = await response.json()
            console.log(j)
            for (const pk of j.pubkeys) {
                pubkeys.push({ "pubkey": pk.pubkey, "reason": thisReason, "id": pk.id })
            }
        }

        setNewPubkey(false)
        setPubkey("")
        setReason("")
    }

    const handleCancel = async () => {
        setNewPubkey(false)
        setPubkey("")
        setReason("")
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-0">
                                        {props.kind}
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">
                                        Reason
                                    </th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                                        <span className="sr-only">Edit</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pubkeys.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                            {entry.pubkey}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{entry.reason}</td>
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
                                                    id={idkind + "newpubkey"}
                                                    className="input input-bordered input-primary w-full max-w-xs"
                                                    placeholder="add pubkey"
                                                    value={pubkey}
                                                    onChange={event => setPubkey(event.target.value)}
                                                />
                                                <input
                                                    type="text"
                                                    name="reason"
                                                    id={idkind + "newreason"}
                                                    className="input input-bordered input-primary w-full max-w-xs"
                                                    placeholder="add reason"
                                                    value={reason}
                                                    onChange={event => setReason(event.target.value)}
                                                />
                                                <button onClick={handleSubmit} className="btn btn-primary">Add</button>
                                                <button onClick={handleCancel} className="btn btn-primary">Cancel</button>
                                            </form>
                                        </td>
                                    </tr>
                                }
                                {newpubkey && listr.map((l, i) => (
                                    <tr key={"tr" + l + i}>
                                        <td>
                                            <button id={l.toString()} onClick={(e) => handleAddList(e)} className="btn btn-secondary">Add from list: {l} ({getPubkeyCount(l.toString())})</button>
                                        </td>
                                    </tr>
                                ))}

                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
            {!newpubkey &&
                <div className="">
                    <button
                        onClick={() => setNewPubkeyHandler()}
                        type="button"
                        className="btn btn-primary"
                    >
                        Add pubkey
                    </button>
                </div>
            }
        </div>
    )
}