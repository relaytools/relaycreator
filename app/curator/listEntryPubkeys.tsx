"use client";
import { useState } from "react";
import NDK from "@nostr-dev-kit/ndk";
import { NDKFilter, NDKEvent } from "@nostr-dev-kit/ndk";
import { useSession } from "next-auth/react";
import { convertOrValidatePubkey } from "../../lib/pubkeyValidation";
import { ToastContainer, toast } from "react-toastify";
import BatchedProfileList from "../components/batchedProfileList";

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
        relay_url: string;
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
            props.relay_url,
        ],
    });

    const [pubkey, setPubkey] = useState("");
    const [reason, setReason] = useState("");
    const [newpubkey, setNewPubkey] = useState(false);
    const [pubkeys, setPubkeys] = useState(props.pubkeys);
    const [filter, setFilter] = useState("");
    const [showHidePubkeys, setShowHidePubkeys] = useState(false);
    const [showActionsPubkey, setShowActionsPubkey] = useState("");
    const [pubkeyError, setPubkeyError] = useState("");
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("");
    const [isLoadingLists, setIsLoadingLists] = useState(false);

    const toastOptions = {
        autoClose: 5000,
        closeOnClick: true,
    };

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

    const handleFilterByList = async (event: any) => {
        event.preventDefault();
        const filterThis = event.currentTarget.id;
        setFilter(filterThis);
    };

    const handleDelete = async (event: any) => {
        //event.preventDefault();
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

        if (response.ok) {
            let newlist: ListEntryPubkey[] = [];
            pubkeys.forEach((entry) => {
                if (entry.id != deleteThisId) {
                    newlist.push(entry);
                }
            });
            setPubkeys(newlist);
            toast.success("Deleted", toastOptions);
        } else {
            toast.error("Delete Failed", toastOptions);
        }
    };

    const filteredPubkeys = () => {
        // Group by timestamp
        if (filter == "") {
            return pubkeys;
        }
        const pubkeysFiltered = pubkeys.reduce((acc: any, pubkey: any) => {
            if (pubkey?.reason != null && pubkey.reason.includes(filter)) {
                acc.push(pubkey);
            }
            return acc;
        }, []);
        return pubkeysFiltered;
    };

    const listsFromPubkeys = () => {
        const uniqueLists = new Set(
            pubkeys
                .filter((pubkey) => pubkey?.reason?.startsWith("list:"))
                .map((pubkey) => pubkey.reason)
        );
        return Array.from(uniqueLists);
    };

    // return the set of unmatched by listsFromPubkeys
    const getUnmatchedPubkeys = () => {
        return pubkeys.filter(
            (pubkey) => !pubkey?.reason || !pubkey.reason.startsWith("list:")
        );
    };

    const handleDeleteAll = async (event: any) => {
        event.preventDefault();
        const deleteThis = event.currentTarget.id;
        // call to API to delete keyword
        let allOrFilter = filter;
        if (filter == "") {
            allOrFilter = "all";
        }
        const response = await fetch(
            `/api/relay/${props.relay_id}/${idkind}pubkeys?list_id=${allOrFilter}`,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            }
        );
        // delete the entry(s) from the props
        if (response.ok) {
            let newlist: ListEntryPubkey[] = [];
            pubkeys.forEach((entry) => {
                if (!entry.reason?.includes(filter)) {
                    newlist.push(entry);
                }
            });
            setPubkeys(newlist);
            setFilter("");
            toast.success("Deleted", toastOptions);
        } else {
            toast.error("Delete Failed", toastOptions);
        }
    };

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const id = event.currentTarget.id;
        console.log(event.currentTarget.id);
        // call to API to add new keyword
        const validPubkey = convertOrValidatePubkey(pubkey);
        if (validPubkey) {
            const response = await fetch(
                `/api/relay/${props.relay_id}/${idkind}pubkey`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pubkey: validPubkey,
                        reason: reason,
                    }),
                }
            );

            if (response.ok) {
                const j = await response.json();
                setNewPubkey(false);
                pubkeys.push({ pubkey: validPubkey, reason: reason, id: j.id });
                setPubkey("");
                setReason("");
                toast.success("Added", toastOptions);
            } else {
                toast.error("Add Pubkey Failed", toastOptions);
            }
        } else {
            setPubkeyError("❌");
            setPubkeyErrorDescription("invalid pubkey");
        }
    };

    const setNewPubkeyHandler = async () => {
        setNewPubkey(true);
        if (session && session.user != null && session.user.name != null) {
            setIsLoadingLists(true);
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
            setIsLoadingLists(false);
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
                console.log(names[0][1], l.id)
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
                        const validKey = convertOrValidatePubkey(pk[1]);
                        if (validKey != null) {
                            stringPubkeysFromList.push(validKey);
                        }
                    });
                }
            } else if (n.kind == 10000 && listName == "mute") {
                const pubkeysFromList = n.getMatchingTags("p");
                pubkeysFromList.forEach((pk) => {
                    const validKey = convertOrValidatePubkey(pk[1]);
                    if (validKey != null) {
                        stringPubkeysFromList.push(validKey);
                    }
                });
            } else if (n.kind == 3 && listName == "follows") {
                const pubkeysFromList = n.getMatchingTags("p");
                pubkeysFromList.forEach((pk) => {
                    const validKey = convertOrValidatePubkey(pk[1]);
                    if (validKey != null) {
                        stringPubkeysFromList.push(validKey);
                    }
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

        let simplePub = "";
        if (session && session.user?.name) {
            simplePub =
                session.user.name.slice(0, 4) +
                "." +
                session.user.name.slice(-4);
        }

        // remove from UI, the current selected list: items
        let newlist: ListEntryPubkey[] = [];
        pubkeys.forEach((entry) => {
            if (
                !(
                    entry.reason?.startsWith("list:") &&
                    entry.reason?.split(":")[1] == simplePub + listName
                )
            ) {
                newlist.push(entry);
            }
        });

        // post to API, pubkeys with reason set to listname
        const thisReason = "list:" + simplePub + listName;
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
            setFilter(thisReason);
            toast.success("List Added", toastOptions);
        } else {
            toast.error("Failed to Add List", toastOptions);
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

    // Add new state for editing
    const [editingReason, setEditingReason] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // Add handleEdit function
    const handleEdit = async (entry: ListEntryPubkey) => {
        if (isEditing) {
            // Save the edited reason
            const response = await fetch(
                `/api/relay/${props.relay_id}/${idkind}pubkey?entry_id=${entry.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        reason: editingReason,
                    }),
                }
            );

            if (response.ok) {
                // Update local state
                const updatedPubkeys = pubkeys.map((pk) =>
                    pk.id === entry.id ? { ...pk, reason: editingReason } : pk
                );
                setPubkeys(updatedPubkeys);
                setIsEditing(false);
                toast.success("Reason updated", toastOptions);
            } else {
                toast.error("Failed to update reason", toastOptions);
            }
        } else {
            // Enter edit mode
            setEditingReason(entry.reason || "");
            setIsEditing(true);
        }
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
                                        className="btn uppercase btn-primary mr-2 grow w-full mt-4"
                                    >
                                        Add pubkey(s)
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="w-full grow">
                            {!showHidePubkeys && !newpubkey && (
                                <button
                                    className="btn btn-secondary uppercase grow w-full mt-4"
                                    onClick={() => setShowHidePubkeys(true)}
                                >
                                    show {pubkeys.length.toString()}{" "}
                                    {props.kind}
                                </button>
                            )}
                            {showHidePubkeys && !newpubkey && (
                                <div className="mt-4">
                                    <input
                                        type="text"
                                        placeholder="search/filter by reason"
                                        value={filter}
                                        onChange={(e) =>
                                            setFilter(e.target.value)
                                        }
                                        className="input input-primary input-bordered"
                                    ></input>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setFilter("")}
                                    >
                                        clear
                                    </button>
                                    <div className="font-condensed">
                                        These are the included nostr lists:
                                    </div>
                                    <div className="font-condensed">
                                        Click to filter:
                                    </div>
                                    <div className="grow">
                                        {listsFromPubkeys().map(
                                            (entry: any) => (
                                                <button
                                                    className="btn btn-primary mr-4 mt-2"
                                                    key={entry + "listnames1"}
                                                    onClick={() =>
                                                        setFilter(entry)
                                                    }
                                                >
                                                    {entry}
                                                </button>
                                            )
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-secondary uppercase grow w-full mt-4 mb-4"
                                        onClick={() =>
                                            setShowHidePubkeys(false)
                                        }
                                    >
                                        hide
                                        {filter == "" &&
                                            " " +
                                                pubkeys.length.toString() +
                                                " "}
                                        {filter != "" &&
                                            " " +
                                                filteredPubkeys().length.toString() +
                                                " of (" +
                                                pubkeys.length.toString() +
                                                ") "}
                                        {props.kind}
                                    </button>
                                    <button
                                        onClick={handleDeleteAll}
                                        className="btn uppercase btn-warning grow w-full mt-4"
                                        id="all"
                                    >
                                        Delete
                                        {filter == "" &&
                                            " " +
                                                pubkeys.length.toString() +
                                                " "}
                                        {filter != "" &&
                                            " " +
                                                filteredPubkeys().length.toString() +
                                                " of (" +
                                                pubkeys.length.toString() +
                                                ") "}
                                        Pubkeys
                                    </button>
                                </div>
                            )}
                        </div>
                        {newpubkey && (
                            <div className="flex flex-col border-2 border-secondary rounded-lg p-2 mt-2">
                                <form className="mt-4" action="#" method="POST">
                                    <div className="font-condensed">
                                        Enter a pubkey and description
                                    </div>
                                    <input
                                        type="text"
                                        name="pubkey"
                                        key={idkind + "newpubkey"}
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
                                        key={idkind + "newreason"}
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
                                    <button
                                        type="button"
                                        disabled
                                        className="button btn-primary"
                                    >
                                        {pubkeyError}
                                    </button>
                                    <span className="flex items-center font-condensed tracking-wide text-red-500 text-xs mt-1 ml-1">
                                        {pubkeyErrorDescription}
                                    </span>
                                </form>
                                <div className="font-condensed">
                                    -OR- select a list to add 
                                </div>
                                {listr.length == 0 &&
                                <span className="loading loading-spinner loading-md">Lists are loading</span>}
                                {listr.map((l, i) => (
                                    <button
                                        key={l.toString() + i}
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
                        <div className="mt-4 w-full">
                            {showHidePubkeys && (
                                <BatchedProfileList
                                    entries={filteredPubkeys()}
                                    onEdit={(entry, newReason) => {
                                        handleEdit({ ...entry, reason: newReason });
                                    }}
                                    onDelete={(entryId) => {
                                        const event = { currentTarget: { id: entryId } };
                                        handleDelete(event);
                                    }}
                                    isEditing={isEditing}
                                    editingEntryId={showActionsPubkey}
                                    editingReason={editingReason}
                                    onStartEdit={(entryId, currentReason) => {
                                        setShowActionsPubkey(entryId);
                                        setEditingReason(currentReason);
                                        setIsEditing(true);
                                    }}
                                    onCancelEdit={() => setIsEditing(false)}
                                    onReasonChange={setEditingReason}
                                    itemsPerPage={9}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
