"use client";
import { useState } from "react";
import { nip19 } from "nostr-tools";

export type User = {
    pubkey: string;
};

export type Moderator = {
    user: User;
    id: string;
};

export default function Moderators(
    props: React.PropsWithChildren<{
        moderators: Moderator[];
        relay_id: string;
    }>
) {
    const [pubkey, setPubkey] = useState("");
    const [newpubkey, setNewPubkey] = useState(false);
    const [moderators, setModerators] = useState(props.moderators);
    const [pubkeyError, setPubkeyError] = useState("");
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("");
    const [help, setHelp] = useState(false);
    const [showActionsMod, setShowActionsMod] = useState("");

    function isValidForm() {
        console.log("calling isValid form" + pubkeyError);
        if (pubkeyError == "✅") {
            return true;
        } else {
            return false;
        }
    }

    function setAndValidatePubkey(pubkey: string) {
        setPubkey(pubkey);
        // use javascript regex to detect if length is 64 characters
        // check for hex chars
        const validHex = /^[0-9a-fA-F]{64}$/.test(pubkey);
        // check for npub
        const validNpub = /^npub1[0-9a-zA-Z]{58}$/.test(pubkey);

        if (validHex) {
            setPubkeyError("✅");
            setPubkeyErrorDescription("");
        } else if (validNpub) {
            setPubkeyError("✅");
            setPubkeyErrorDescription("");
        } else {
            setPubkeyError("❌");
            setPubkeyErrorDescription("key must be valid hex or npub");
        }
    }

    const handleDelete = async (event: any) => {
        event.preventDefault();
        console.log(event.currentTarget.id);
        const deleteThisId = event.currentTarget.id;
        // call to API to delete moderator
        const response = await fetch(
            `/api/relay/${props.relay_id}/moderator?moderator_id=${event.currentTarget.id}`,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            }
        );
        // delete the entry from the props
        let newlist: Moderator[] = [];
        moderators.forEach((entry) => {
            if (entry.id != deleteThisId) {
                newlist.push(entry);
            }
        });
        setModerators(newlist);
    };

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const validNpub = /^npub1[0-9a-zA-Z]{58}$/.test(pubkey);
        let submitHex: any;
        if (validNpub) {
            const decoded = nip19.decode(pubkey);
            submitHex = decoded.data;
        } else {
            submitHex = pubkey;
        }
        // call to API to add new keyword
        const response = await fetch(`/api/relay/${props.relay_id}/moderator`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pubkey: submitHex }),
        });

        if (response.ok) {
            const j = await response.json();
            setNewPubkey(false);
            const newMods = moderators;
            newMods.push({ id: j.id, user: { pubkey: submitHex } });
            setModerators(newMods);
            setPubkey("");
        }
    };

    const handleCancel = async () => {
        setNewPubkey(false);
        setPubkey("");
    };
    
    const actionsModToggle = (id: string) => {
        if (showActionsMod == id) {
            setShowActionsMod("");
        } else {
            setShowActionsMod(id);
        }
    }

    return (
        <div className="flex flex-wrap">
            <div className="mt-4 w-full font-mono">
                {moderators.map((entry) => (
                    <div
                        key={entry.id}
                        onClick={() => actionsModToggle(entry.id)}
                        className="flex flex-col w-full border-2 border-secondary mb-2 rounded-md max-w-sm overflow-auto lg:max-w-screen-2xl"
                    >
                        <div className="overflow-none mr-2">
                            {entry.user.pubkey}
                        </div>
                        {showActionsMod == entry.id && (
                            <div className="flex">
                                <button
                                    onClick={handleDelete}
                                    className="btn uppercase btn-secondary"
                                    id={entry.id}
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {newpubkey && (
                    <div className="flex flex-col border-2 border-secondary rounded-lg p-2 mt-2">
                        <form className="mt-4" action="#" method="POST">
                            <input
                                type="text"
                                name="pubkey"
                                id="newpubkey"
                                className="input input-bordered input-primary w-full"
                                placeholder="add pubkey"
                                autoComplete="off"
                                value={pubkey}
                                onChange={(event) =>
                                    setAndValidatePubkey(event.target.value)
                                }
                            />
                            <button
                                disabled={!isValidForm()}
                                onClick={handleSubmit}
                                className="btn uppercase btn-primary"
                            >
                                Add
                            </button>
                            <button
                                onClick={handleCancel}
                                className="btn uppercase btn-primary"
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
                        </form>

                        <span className="flex items-center font-condensed tracking-wide text-red-500 text-xs mt-1 ml-1">
                            {pubkeyErrorDescription}
                        </span>
                    </div>
                )}

                {!newpubkey && (
                    <div className="">
                        <button
                            onClick={() => setNewPubkey(true)}
                            type="button"
                            className="btn uppercase btn-primary"
                        >
                            Add pubkey
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
