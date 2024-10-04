"use client";
import React, { useEffect, useState } from "react";
import { UserWithNip05s } from "../components/userWithNip05s";
import { useRouter } from "next/navigation";
import ShowClientOrder from "../components/showClientOrder";
import { useSession } from "next-auth/react";
import { nip19 } from "nostr-tools";
import ShowNip05Order from "../components/showNip05Order";
import {
    Label,
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
} from "@headlessui/react";

import { Prisma } from "@prisma/client";

export default function Nip05Orders(
    props: React.PropsWithChildren<{
        user: UserWithNip05s;
        myNip05: any[];
        otherNip05: any[];
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
        setEditingRelayUrls(
            editingRelayUrls.filter((url) => url !== urlToRemove)
        );
    };

    const handleSaveEdit = async () => {
        if (!editingOrderId) return;

        try {
            const response = await fetch(
                `${rootDomain}/api/nip05/${editingOrderId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ relayUrls: editingRelayUrls }),
                }
            );

            if (response.ok) {
                // Update the local state to reflect the changes
                // Note: You might need to implement a way to update the user prop here
                // This depends on how you're managing state in your Next.js app
                // TODO

                setEditingOrderId(null);
            } else {
                console.error("Failed to update relay URLs");
            }
        } catch (error) {
            console.error("Error updating relay URLs:", error);
        }
    };

    const handleDelete = async (id: string) => {
        const response = await fetch(`${rootDomain}/api/nip05/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        });
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
                            className="input input-primary input-bordered w-full"
                            placeholder="Enter Nip05 name"
                            required
                        />
                    </div>

                    <Listbox
                        value={nip05Domain}
                        onChange={(e) => setNip05Domain(e)}
                    >
                        <Label className="label-text leading-6">
                            Nip05 Domain
                        </Label>
                        <div className="relative mt-2">
                            <ListboxButton className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
                                <span className="block truncate">
                                    {nip05Domain || "Select a Nip05 Domain"}
                                </span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"></span>
                            </ListboxButton>

                            <ListboxOptions
                                transition
                                className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in sm:text-sm"
                            >
                                {props.domains.map((domain, index) => (
                                    <ListboxOption
                                        key={domain + index}
                                        value={domain}
                                        className="group relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 data-[focus]:bg-indigo-600 data-[focus]:text-white"
                                    >
                                        <span className="block truncate font-normal group-data-[selected]:font-semibold">
                                            {domain}
                                        </span>

                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600 group-data-[focus]:text-white [.group:not([data-selected])_&]:hidden"></span>
                                    </ListboxOption>
                                ))}
                            </ListboxOptions>
                        </div>
                    </Listbox>

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
                {showInvoice && <ShowNip05Order nip05Order={nip05Order} />}
                <h2 className="text-lg font-bold mt-8">Your Nip05s</h2>
                <div className="flex flex-col mb-4  p-4">
                    {props.myNip05.map((nip05: any, index: number) => (
                        <div
                            className="flex flex-col bg-gradient-to-r from-accent to-base-100 border rounded-lg round mb-4"
                            key={index + "-nip05orders123"}
                        >
                            <div className="w-1/2 text-lg font-condensed">
                                {nip05.name}@{nip05.domain}
                            </div>
                            <div className="flex border-t">
                                <div className="w-1/2">Relay Urls</div>
                                <div className="w-full">
                                    {editingOrderId === nip05.id ? (
                                        <div>
                                            {editingRelayUrls.map(
                                                (url, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center mb-2"
                                                    >
                                                        <span className="flex-grow">
                                                            {url}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                handleRemoveRelayUrl(
                                                                    url
                                                                )
                                                            }
                                                            className="btn btn-xs btn-error ml-2"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                            <div className="flex items-center mt-2">
                                                <input
                                                    type="text"
                                                    value={newRelayUrl}
                                                    onChange={(e) =>
                                                        setNewRelayUrl(
                                                            e.target.value
                                                        )
                                                    }
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
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="btn btn-primary mr-2"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setEditingOrderId(null)
                                                    }
                                                    className="btn"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        nip05.relayUrls.map((o: any) => (
                                            <div
                                                key={o.url}
                                                className="flex-grow overflow-hidden"
                                            >
                                                {o.url}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="flex">
                                {true && editingOrderId !== nip05.id && (
                                    <button
                                        className="btn btn-secondary mt-2 w-24 flex-grow"
                                        onClick={() =>
                                            handleEdit(
                                                nip05.id,
                                                nip05.relayUrls.map(
                                                    (o: any) => o.url
                                                )
                                            )
                                        }
                                    >
                                        Edit
                                    </button>
                                )}
                                <div className="flex justify-end w-full">
                                    <button
                                        className="btn btn-primary mt-2 max-w-24"
                                        onClick={() => handleDelete(nip05.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <h2 className="text-lg font-bold mt-8">Admin/Mod Nip05s</h2>
                <div className="flex flex-col mb-4  p-4">
                    {props.otherNip05.map((nip05: any, index: number) => (
                        <div
                            className="flex flex-col bg-gradient-to-r from-accent to-base-100 border rounded-lg round mb-4"
                            key={index + "-nip05orders123"}
                        >
                            <div className="w-1/2 text-lg font-condensed">
                                {nip05.name}@{nip05.domain}
                            </div>
                            <div className="w-1/2 text-sm">{nip05.pubkey}</div>
                            <div className="flex border-t">
                                <div className="w-1/2">Relay Urls</div>
                                <div className="w-full">
                                    {editingOrderId === nip05.id ? (
                                        <div>
                                            {editingRelayUrls.map(
                                                (url, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center mb-2"
                                                    >
                                                        <span className="flex-grow">
                                                            {url}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                handleRemoveRelayUrl(
                                                                    url
                                                                )
                                                            }
                                                            className="btn btn-xs btn-error ml-2"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                            <div className="flex items-center mt-2">
                                                <input
                                                    type="text"
                                                    value={newRelayUrl}
                                                    onChange={(e) =>
                                                        setNewRelayUrl(
                                                            e.target.value
                                                        )
                                                    }
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
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="btn btn-primary mr-2"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setEditingOrderId(null)
                                                    }
                                                    className="btn"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        nip05.relayUrls.map((o: any) => (
                                            <div
                                                key={o.url}
                                                className="flex-grow overflow-hidden"
                                            >
                                                {o.url}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="flex">
                                {true && editingOrderId !== nip05.id && (
                                    <button
                                        className="btn btn-secondary mt-2 w-24"
                                        onClick={() =>
                                            handleEdit(
                                                nip05.id,
                                                nip05.relayUrls.map(
                                                    (o: any) => o.url
                                                )
                                            )
                                        }
                                    >
                                        Edit
                                    </button>
                                )}
                                <div className="flex justify-end w-full">
                                    <button
                                        className="btn btn-primary mt-2 max-w-24"
                                        onClick={() => handleDelete(nip05.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
