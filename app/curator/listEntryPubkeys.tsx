"use client";
import { useState } from "react";
import NDK from "@nostr-dev-kit/ndk";
import { NDKFilter, NDKEvent } from "@nostr-dev-kit/ndk";
import { useSession } from "next-auth/react";

type ListEntryPubkey = {
    pubkey: string;
    reason: string | null;
    id: string;
};

export default function ListEntryPubkeys(
    props: React.PropsWithChildren<{
        pubkeys: ListEntryPubkey[];
        kind: string;
        relay_id: string;
    }>
) {
    const { data: session, status } = useSession();

    // listr.lol only publishes to a specific set of relays right now
    const ndk = new NDK({
        explicitRelayUrls: [
            "wss://nos.lol",
            "wss://relay.damus.io",
            "wss://relay.nostr.band",
            "wss://nostr21.com",
        ],
    });

    const [pubkey, setPubkey] = useState("");
    const [reason, setReason] = useState("");
    const [newpubkey, setNewPubkey] = useState(false);
    const [pubkeys, setPubkeys] = useState(props.pubkeys);
    const [showHidePubkeys, setShowHidePubkeys] = useState(false);
    const [showActionsPubkey, setShowActionsPubkey] = useState("");

    let ndkevents: Set<NDKEvent> = new Set();
    const blankevents: String[] = [];

    const [events, setEvents] = useState(ndkevents);
    const [listr, setListr] = useState(blankevents);

    let idkind = "";
    if (props.kind == "Allowed Pubkeys ✅") {
        idkind = "allowlist";
    } else {
        idkind = "blocklist";
    }

    const handleDelete = async (event: any) => {
        event.preventDefault();
        const deleteThisId = event.currentTarget.id;
        // call to API to delete keyword
        const response = await fetch(
            `/api/relay/${props.relay_id}/${idkind}pubkey?list_id=${event.currentTarget.id}`,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            }
        );
        // delete the entry from the props
        let newlist: ListEntryPubkey[] = [];
        pubkeys.forEach((entry) => {
            if (entry.id != deleteThisId) {
                newlist.push(entry);
            }
        });
        setPubkeys(newlist);
    };

    const handleDeleteAll = async (event: any) => {
        event.preventDefault();
        const deleteThis = event.currentTarget.id;
        // call to API to delete keyword
        const response = await fetch(
            `/api/relay/${props.relay_id}/${idkind}pubkeys?list_id=all`,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            }
        );
        // delete the entry(s) from the props
        let newlist: ListEntryPubkey[] = [];
        setPubkeys(newlist);
    };

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const id = event.currentTarget.id;
        console.log(event.currentTarget.id);
        // call to API to add new keyword
        const response = await fetch(
            `/api/relay/${props.relay_id}/${idkind}pubkey`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pubkey: pubkey, reason: reason }),
            }
        );

        if (response.ok) {
            const j = await response.json();
            setNewPubkey(false);
            pubkeys.push({ pubkey: pubkey, reason: reason, id: j.id });
            setPubkey("");
            setReason("");
        }
    };

    const setNewPubkeyHandler = async () => {
        setNewPubkey(true);
        if (session && session.user != null && session.user.name != null) {
            ndk.connect();

            const filter: NDKFilter = {
                kinds: [30000, 10000, 3],
                authors: [session.user.name],
            };
            // Will return all found events
            const events = await ndk.fetchEvents(filter);
            console.log(events);
            const listNames = getListNames(events);
            setListr(listNames);
            setEvents(events);
        }
    };

    function getListNames(list: Set<NDKEvent>) {
        let dtags: string[] = [];
        list.forEach((l) => {
            if (l.kind == 10000) {
                dtags.push("mute");
            } else if (l.kind == 3) {
                dtags.push("follows");
            } else if (l.kind == 30000) {
                const names = l.getMatchingTags("d");
                dtags.push(names[0][1]);
            }
        });
        return dtags;
    }

    function getPubkeysFromList(listName: string) {
        let stringPubkeysFromList: string[] = [];
        events.forEach((n) => {
            if (n.kind == 30000) {
                const name = n.getMatchingTags("d");
                if (name[0][1] == listName) {
                    const pubkeysFromList = n.getMatchingTags("p");
                    pubkeysFromList.forEach((pk) => {
                        stringPubkeysFromList.push(pk[1]);
                    });
                }
            } else if (n.kind == 10000 && listName == "mute") {
                const pubkeysFromList = n.getMatchingTags("p");
                pubkeysFromList.forEach((pk) => {
                    stringPubkeysFromList.push(pk[1]);
                });
            } else if (n.kind == 3 && listName == "follows") {
                const pubkeysFromList = n.getMatchingTags("p");
                pubkeysFromList.forEach((pk) => {
                    stringPubkeysFromList.push(pk[1]);
                });
            }
        });
        console.log(stringPubkeysFromList);
        return stringPubkeysFromList;
    }

    function getPubkeyCount(listName: string) {
        let count = 0;
        events.forEach((n) => {
            if (n.kind == 30000) {
                const name = n.getMatchingTags("d");
                if (name[0][1] == listName) {
                    const pubkeysFromList = n.getMatchingTags("p");
                    count = pubkeysFromList.length;
                }
            } else if (n.kind == 10000 && listName == "mute") {
                const pubkeysFromList = n.getMatchingTags("p");
                count = pubkeysFromList.length;
            } else if (n.kind == 3 && listName == "follows") {
                const pubkeysFromList = n.getMatchingTags("p");
                count = pubkeysFromList.length;
            }
        });
        return count;
    }

    const handleAddList = async (e: any) => {
        e.preventDefault();
        const listName = e.currentTarget.id;
        const postThese = getPubkeysFromList(listName);

        // remove from UI, the current selected list: items
        let newlist: ListEntryPubkey[] = [];
        pubkeys.forEach((entry) => {
            if (
                entry.reason?.startsWith("list:") &&
                entry.reason?.split(":")[1] != listName
            ) {
                newlist.push(entry);
            } else if (!entry.reason?.startsWith("list:")) {
                newlist.push(entry);
            }
        });

        // post to API, pubkeys with reason set to listname
        const thisReason = "list:" + listName;
        const response = await fetch(
            `/api/relay/${props.relay_id}/${idkind}pubkeys`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pubkeys: postThese,
                    reason: thisReason,
                }),
            }
        );
        if (response.ok) {
            const j = await response.json();
            console.log(j);
            for (const pk of j.pubkeys) {
                newlist.push({
                    pubkey: pk.pubkey,
                    reason: thisReason,
                    id: pk.id,
                });
            }

            // update UI
            setPubkeys(newlist);
        }

        setNewPubkey(false);
        setPubkey("");
        setReason("");
    };

    const handleCancel = async () => {
        setNewPubkey(false);
        setPubkey("");
        setReason("");
    };

    const shortPubkey = (pubkey: string) => {
        return pubkey.slice(0, 10) + "..." + pubkey.slice(-4);
    };

    return (
        <div className="flex flex-wrap">
            <div className="">
                <div className="">
                    <div className="flex flex-wrap">
                        <div className="w-full">
                            {!newpubkey && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => setNewPubkeyHandler()}
                                        type="button"
                                        className="btn uppercase btn-primary mr-2 flex-grow w-full mt-4"
                                    >
                                        Add pubkey(s)
                                    </button>
                                    
                                </div>
                            )}
                        </div>
                        <div className="w-full flex-grow">
                            {!showHidePubkeys && (
                                <button
                                    className="btn btn-secondary uppercase flex-grow w-full mt-4"
                                    onClick={() => setShowHidePubkeys(true)}
                                >
                                    show {pubkeys.length.toString()}{" "}
                                    {props.kind}
                                </button>
                            )}
                            {showHidePubkeys && (
                                <div>
                                <button
                                    className="btn btn-secondary uppercase flex-grow w-full mt-4 mb-4"
                                    onClick={() => setShowHidePubkeys(false)}
                                >
                                    hide {pubkeys.length.toString()}{" "}
                                    {props.kind}
                                </button>
<button
                                        onClick={handleDeleteAll}
                                        className="btn uppercase btn-primary flex-grow w-full mt-4"
                                        id="all"
                                    >
                                        Delete All Pubkeys
                                    </button>
                                    </div>
                            )}
                        </div>
                        {newpubkey && (
                            <div className="flex flex-col border-2 border-secondary rounded-lg p-2 mt-2">
                                {newpubkey && (
                                    <form
                                        className="mt-4"
                                        action="#"
                                        method="POST"
                                    >
                                        <div className="font-condensed">
                                            Enter a pubkey and description or
                                            select a list
                                        </div>
                                        <input
                                            type="text"
                                            name="pubkey"
                                            id={idkind + "newpubkey"}
                                            className="input input-bordered input-primary w-full"
                                            placeholder="add pubkey"
                                            value={pubkey}
                                            onChange={(event) =>
                                                setPubkey(event.target.value)
                                            }
                                        />
                                        <input
                                            type="text"
                                            name="reason"
                                            id={idkind + "newreason"}
                                            className="input input-bordered input-primary w-full mt-2"
                                            placeholder="add reason / description"
                                            value={reason}
                                            onChange={(event) =>
                                                setReason(event.target.value)
                                            }
                                        />
                                        <button
                                            onClick={handleSubmit}
                                            className="btn uppercase btn-primary mt-2 mr-2"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="btn uppercase btn-primary mt-2"
                                        >
                                            Cancel
                                        </button>
                                    </form>
                                )}
                                {newpubkey &&
                                    listr.map((l, i) => (
                                        <button
                                            id={l.toString()}
                                            onClick={(e) => handleAddList(e)}
                                            className="btn uppercase btn-secondary mt-2"
                                        >
                                            Add from list: {l} (
                                            {getPubkeyCount(l.toString())})
                                        </button>
                                    ))}
                            </div>
                        )}
                        <div className="mt-4 w-full font-mono">
                            {showHidePubkeys &&
                                pubkeys.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex flex-col w-full border-2 border-secondary mb-2 rounded-md max-w-sm overflow-auto lg:max-w-screen-2xl"
                                        onClick={() =>
                                            setShowActionsPubkey(entry.id)
                                        }
                                    >
                                        <div className="overflow-none mr-2">
                                            {entry.pubkey}
                                        </div>
                                        <div className="border-t-2 border-dashed border-neutral overflow-auto">
                                            reason: {entry.reason}
                                        </div>
                                        {showActionsPubkey == entry.id && (
                                            <div className="flex">
                                                <div className="">
                                                    <button
                                                        onClick={handleDelete}
                                                        className="btn uppercase btn-secondary"
                                                        id={entry.id}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
