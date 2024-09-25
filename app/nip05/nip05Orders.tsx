"use client";
import React, { useEffect, useState } from "react";
import { UserWithNip05s } from "../components/userWithNip05s";
import { useRouter } from "next/navigation";
import ShowClientOrder from "../components/showClientOrder";
import { useSession } from "next-auth/react";
import { nip19 } from "nostr-tools";
import ShowNip05Order from "../components/showNip05Order";

export default function Nip05Orders(
    props: React.PropsWithChildren<{
        user: UserWithNip05s;
        domains: string[];
    }>
) {
    const [pubkey, setPubkey] = useState("");
    const [pubkeyError, setPubkeyError] = useState("");
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("");
    const [showPubkeyInput, setShowPubkeyInput] = useState(true);
    const [showInvoice, setShowInvoice] = useState(false);
    const [nip05Order, setNip05Order] = useState({} as any);
    const [showSpinner, setShowSpinner] = useState(false);
    const [nip05Name, setNip05Name] = useState("");
    const [nip05Domain, setNip05Domain] = useState("");
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [editingRelayUrls, setEditingRelayUrls] = useState<string[]>([]);
    const [newRelayUrl, setNewRelayUrl] = useState("");

    const { data: session, status } = useSession();

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setShowSpinner(true);
        const response = await fetch(
            `${rootDomain}/api/nip05orders?name=${nip05Name}&domain=${nip05Domain}&pubkey=${props.user.pubkey}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const nip05OrderResponse = await response.json();
        if (response.ok) {
            setNip05Order(nip05OrderResponse.nip05Order);
            setShowPubkeyInput(false);
            setShowSpinner(false);
            setShowInvoice(true);
        } else {
            if (nip05OrderResponse["error"]) setPubkeyError("error: ");
            setPubkeyErrorDescription(nip05OrderResponse.error);
            setShowSpinner(false);
        }
    };

    const handleEdit = (orderId: string, relayUrls: string[]) => {
        setEditingOrderId(orderId);
        setEditingRelayUrls(relayUrls);
    };

    const handleAddRelayUrl = () => {
        if (newRelayUrl && !editingRelayUrls.includes(newRelayUrl)) {
            setEditingRelayUrls([...editingRelayUrls, newRelayUrl]);
            setNewRelayUrl("");
        }
    };

    const handleRemoveRelayUrl = (urlToRemove: string) => {
        setEditingRelayUrls(editingRelayUrls.filter(url => url !== urlToRemove));
    };

    const handleSaveEdit = async () => {
        if (!editingOrderId) return;

        try {
            const response = await fetch(`${rootDomain}/api/nip05/${editingOrderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ relayUrls: editingRelayUrls }),
            });

            if (response.ok) {
                // Update the local state to reflect the changes
                const updatedOrders = props.user.nip05Orders.map(order => 
                    order.id === editingOrderId 
                        ? { ...order, nip05: { ...order.nip05, relayUrls: editingRelayUrls.map(url => ({ url })) } }
                        : order
                );
                // Note: You might need to implement a way to update the user prop here
                // This depends on how you're managing state in your Next.js app
                setEditingOrderId(null);
            } else {
                console.error("Failed to update relay URLs");
            }
        } catch (error) {
            console.error("Error updating relay URLs:", error);
        }
    };

    return (
        <div className="p-4">
            <div className="mt-4">
                <h2 className="text-lg font-bold">Create New Nip05</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Nip05 Name</span>
                        </label>
                        <input
                            type="text"
                            value={nip05Name}
                            onChange={(e) => setNip05Name(e.target.value)}
                            className="input input-bordered w-full"
                            placeholder="Enter Nip05 name"
                            required
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Nip05 Domain</span>
                        </label>
                        <select
                            value={nip05Domain}
                            onChange={(e) => setNip05Domain(e.target.value)}
                            className="dropdown menu"
                            required
                        >
                            <option value="" disabled>
                                Select Nip05 domain
                            </option>
                            {props.domains.map((domain, index) => (
                                <option key={index} value={domain}>
                                    {domain}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="text-bold text-sm text-error">
                        {pubkeyError}
                        {pubkeyErrorDescription}
                    </div>
                    <div className="form-control mt-4">
                        <button type="submit" className="btn btn-primary">
                            Create Nip05
                        </button>
                    </div>
                </form>
                {showSpinner && (
                    <span className="loading loading-spinner text-primary" />
                )}
                {showInvoice && (
                    <ShowNip05Order nip05Order={nip05Order} />
                )}
                <h2 className="text-lg font-bold mt-8">Your Nip05s</h2>
                <div className="flex flex-col mb-4 bg-gradient-to-r from-accent to-base-100 p-4">
                    {props.user.nip05Orders.map((nip05Order: any, index: number) => (
                        <div className="flex flex-col border mb-4" key={index + "-nip05orders123"}>
                            <div className="w-1/2 text-lg font-condensed">
                                {nip05Order.nip05.name}@{nip05Order.nip05.domain}
                            </div>
                            <div className="flex">
                                {nip05Order.paid && (
                                    <div className="w-1/2">Active Since</div>
                                )}
                                {!nip05Order.paid && (
                                    <div className="w-1/2">Waiting Activation</div>
                                )}
                                <div className="w-1/2">
                                    {nip05Order.paid && nip05Order.paid_at
                                        ? new Date(nip05Order.paid_at).toLocaleString()
                                        : ""}
                                </div>
                            </div>
                            {!nip05Order.paid && (
                                <div>
                                    <div className="w-1/2">Expires At</div>
                                    <div className="w-1/2">
                                        {nip05Order.expires_at
                                            ? new Date(nip05Order.expires_at).toLocaleString()
                                            : ""}
                                    </div>
                                </div>
                            )}
                            <div className="flex border-t">
                                <div className="w-1/2">Relay Urls</div>
                                <div className="w-full">
                                    {editingOrderId === nip05Order.nip05.id ? (
                                        <div>
                                            {editingRelayUrls.map((url, idx) => (
                                                <div key={idx} className="flex items-center mb-2">
                                                    <span className="flex-grow">{url}</span>
                                                    <button
                                                        onClick={() => handleRemoveRelayUrl(url)}
                                                        className="btn btn-xs btn-error ml-2"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex items-center mt-2">
                                                <input
                                                    type="text"
                                                    value={newRelayUrl}
                                                    onChange={(e) => setNewRelayUrl(e.target.value)}
                                                    placeholder="New relay URL"
                                                    className="input input-bordered flex-grow"
                                                />
                                                <button
                                                    onClick={handleAddRelayUrl}
                                                    className="btn btn-xs btn-success ml-2"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            <div className="mt-4">
                                                <button onClick={handleSaveEdit} className="btn btn-primary mr-2">
                                                    Save
                                                </button>
                                                <button onClick={() => setEditingOrderId(null)} className="btn">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        nip05Order.nip05.relayUrls.map((o: any) => (
                                            <div key={o.url} className="flex-grow overflow-hidden">
                                                {o.url}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            {nip05Order.paid && editingOrderId !== nip05Order.id && (
                                <button
                                    className="btn btn-secondary mt-2"
                                    onClick={() => handleEdit(nip05Order.nip05.id, nip05Order.nip05.relayUrls.map((o: any) => o.url))}
                                >
                                    Edit
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
