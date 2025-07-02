"use client";
import { useState } from "react";
import { nip19 } from "nostr-tools";
import { convertOrValidatePubkey } from "../../lib/pubkeyValidation";
import ProfileWrapper from "../components/profileWrapper";
import { FaPlus, FaTrash, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";

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
        const validPubkey = convertOrValidatePubkey(pubkey);
        if (validPubkey) {
            setPubkeyError("✅");
            setPubkeyErrorDescription("");
        } else {
            setPubkeyError("❌");
            setPubkeyErrorDescription("key must be valid hex or npub");
        }
    }

    const handleDelete = async (event: any) => {
        event.preventDefault();
        const deleteThisId = event.currentTarget.id;
        
        try {
            // call to API to delete moderator
            const response = await fetch(
                `/api/relay/${props.relay_id}/moderator?moderator_id=${deleteThisId}`,
                {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                }
            );
            
            if (response.ok) {
                // delete the entry from the state
                const newlist = moderators.filter(entry => entry.id !== deleteThisId);
                setModerators(newlist);
                toast.success("Moderator removed successfully!");
            } else {
                const errorData = await response.json();
                toast.error(`Failed to remove moderator: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error removing moderator:", error);
            toast.error("Error removing moderator");
        }
    };

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const validPubkey = convertOrValidatePubkey(pubkey);
        if (!validPubkey) {
            setPubkeyError("❌");
            setPubkeyErrorDescription("key must be valid hex or npub");
            return;
        }
        
        try {
            // call to API to add new moderator
            const response = await fetch(`/api/relay/${props.relay_id}/moderator`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pubkey: validPubkey }),
            });

            if (response.ok) {
                const responseData = await response.json();
                setNewPubkey(false);
                const newMods = [...moderators, { id: responseData.id, user: { pubkey: validPubkey } }];
                setModerators(newMods);
                setPubkey("");
                setPubkeyError("");
                setPubkeyErrorDescription("");
                toast.success("Moderator added successfully!");
            } else {
                const errorData = await response.json();
                setPubkeyError("❌");
                setPubkeyErrorDescription(errorData.error || "Failed to add moderator");
                toast.error(`Failed to add moderator: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error adding moderator:", error);
            setPubkeyError("❌");
            setPubkeyErrorDescription("Network error occurred");
            toast.error("Error adding moderator");
        }
    };

    const handleCancel = async () => {
        setNewPubkey(false);
        setPubkey("");
        setPubkeyError("");
        setPubkeyErrorDescription("");
    };
    
    const actionsModToggle = (id: string) => {
        if (showActionsMod == id) {
            setShowActionsMod("");
        } else {
            setShowActionsMod(id);
        }
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Relay Moderators ({moderators.length})
                </h3>
                {!newpubkey && (
                    <button
                        onClick={() => setNewPubkey(true)}
                        className="btn btn-primary btn-sm gap-2"
                    >
                        <FaPlus className="w-3 h-3" />
                        Add Moderator
                    </button>
                )}
            </div>

            {/* Add New Moderator Form */}
            {newpubkey && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                            Add New Moderator
                        </h4>
                        <button
                            onClick={handleCancel}
                            className="btn btn-ghost btn-sm btn-circle"
                        >
                            <FaTimes className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div>
                            <input
                                type="text"
                                name="pubkey"
                                id="newpubkey"
                                className={`input input-bordered w-full ${
                                    pubkeyError === "❌" ? "input-error" : 
                                    pubkeyError === "✅" ? "input-success" : ""
                                }`}
                                placeholder="Enter pubkey (hex or npub format)"
                                autoComplete="off"
                                value={pubkey}
                                onChange={(event) =>
                                    setAndValidatePubkey(event.target.value)
                                }
                            />
                            {pubkeyErrorDescription && (
                                <p className="text-error text-sm mt-1">
                                    {pubkeyErrorDescription}
                                </p>
                            )}
                        </div>
                        
                        <div className="flex gap-2">
                            <button
                                disabled={!isValidForm()}
                                onClick={handleSubmit}
                                className="btn btn-primary"
                            >
                                Add Moderator
                            </button>
                            <button
                                onClick={handleCancel}
                                className="btn btn-ghost"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Moderators List */}
            <div className="space-y-3">
                {moderators.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p>No moderators added yet.</p>
                        <p className="text-sm">Add moderators to help manage your relay.</p>
                    </div>
                ) : (
                    moderators.map((entry) => (
                        <div
                            key={entry.id}
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <ProfileWrapper 
                                        pubkey={entry.user.pubkey} 
                                        size="medium" 
                                        showName={true}
                                        showCopy={true}
                                        showPubkey={false}
                                    />
                                </div>
                                
                                <button
                                    onClick={handleDelete}
                                    className="btn btn-error btn-sm gap-2"
                                    id={entry.id}
                                    title="Remove moderator"
                                >
                                    <FaTrash className="w-3 h-3" />
                                    Remove
                                </button>
                            </div>
                            
                            {/* Show pubkey in small text for reference */}
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                                {entry.user.pubkey}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
