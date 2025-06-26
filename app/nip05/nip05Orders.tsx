"use client";
import React, { useEffect, useState } from "react";
import { UserWithNip05s } from "../components/userWithNip05s";
import { useSession } from "next-auth/react";
import ShowNip05Order from "../components/showNip05Order";
import { convertOrValidatePubkey } from "../../lib/pubkeyValidation";
import {
    Label,
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
} from "@headlessui/react";
import { useRouter } from "next/navigation";

export default function Nip05Orders(
    props: React.PropsWithChildren<{
        user: UserWithNip05s;
        myNip05: any[];
        otherNip05: any[];
        domains: string[];
        autoSelectedDomain?: string | null;
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
    const [nip05Domain, setNip05Domain] = useState(props.autoSelectedDomain || "");
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [editingRelayUrls, setEditingRelayUrls] = useState<string[]>([]);
    const [newRelayUrl, setNewRelayUrl] = useState("");
    const [editingPubkey, setEditingPubkey] = useState("");
    const [pubkeyValidationError, setPubkeyValidationError] = useState("");

    const { data: session, status } = useSession();
    const router = useRouter();

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

    // Initialize domain selection when domains are available
    useEffect(() => {
        if (props.autoSelectedDomain) {
            // Use the auto-selected domain from middleware rewrite
            setNip05Domain(props.autoSelectedDomain);
        } else if (props.domains && props.domains.length > 0 && !nip05Domain) {
            // Fallback to first domain if no auto-selection
            setNip05Domain(props.domains[0]);
        }
    }, [props.domains, props.autoSelectedDomain, nip05Domain]);

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

    const handleEdit = (
        orderId: string,
        relayUrls: string[],
        pubkey: string
    ) => {
        setEditingOrderId(orderId);
        setEditingRelayUrls(relayUrls);
        setEditingPubkey(pubkey);
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

    const validatePubkey = (pubkey: string): string | undefined => {
        // Clear any previous validation errors
        setPubkeyValidationError("");
        
        // Check if it's empty
        if (!pubkey.trim()) {
            return "";
        }
        
        // Use the existing validation function
        const validatedPubkey = convertOrValidatePubkey(pubkey);
        
        if (!validatedPubkey) {
            setPubkeyValidationError("Invalid pubkey format. Must be npub or 64-character hex.");
        }
        
        return validatedPubkey;
    };

    const handleSaveEdit = async () => {
        if (!editingOrderId) return;

        // Validate pubkey before saving
        const validatedPubkey = validatePubkey(editingPubkey);
        if (pubkeyValidationError || !validatedPubkey) {
            return;
        }

        try {
            const response = await fetch(
                `${rootDomain}/api/nip05/${editingOrderId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        relayUrls: editingRelayUrls,
                        pubkey: validatedPubkey,
                    }),
                }
            );

            if (response.ok) {
                setEditingOrderId(null);
                setEditingPubkey("");
                
                // Refresh the data without a full page navigation
                router.refresh();
            } else {
                console.error("Failed to update NIP-05");
            }
        } catch (error) {
            console.error("Error updating NIP-05:", error);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Create New NIP05 Section */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">New NIP-05</h2>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    NIP-05 Name
                                </label>
                                <input
                                    type="text"
                                    value={nip05Name}
                                    onChange={(e) => setNip05Name(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    placeholder="Enter your desired name"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Listbox value={nip05Domain} onChange={(e) => setNip05Domain(e)}>
                                    <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        NIP-05 Domain
                                    </Label>
                                    <div className="relative mt-1">
                                        <ListboxButton className="relative w-full cursor-pointer rounded-lg bg-white dark:bg-slate-700 py-3 pl-4 pr-10 text-left border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                                            <span className="block truncate">
                                                {nip05Domain || "Select a domain"}
                                            </span>
                                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                                </svg>
                                            </span>
                                        </ListboxButton>

                                        <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-slate-200 dark:border-slate-600">
                                            {props.domains.map((domain, index) => (
                                                <ListboxOption
                                                    key={domain + index}
                                                    value={domain}
                                                    className="relative cursor-pointer select-none py-3 pl-4 pr-9 text-slate-900 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-600 data-focus:bg-blue-100 dark:data-focus:bg-slate-600"
                                                >
                                                    <span className="block truncate font-normal data-selected:font-semibold">
                                                        {domain}
                                                    </span>
                                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 dark:text-blue-400 [.group:not([data-selected])_&]:hidden">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </span>
                                                </ListboxOption>
                                            ))}
                                        </ListboxOptions>
                                    </div>
                                </Listbox>
                            </div>
                        </div>

                        {(pubkeyError || pubkeyErrorDescription) && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <div className="flex">
                                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <div className="text-sm text-red-700 dark:text-red-400">
                                        <span className="font-semibold">{pubkeyError}</span>
                                        {pubkeyErrorDescription}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <button 
                                type="submit" 
                                disabled={showSpinner}
                                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {showSpinner ? "Creating..." : "Create NIP-05"}
                            </button>
                            {showSpinner && (
                                <div className="flex items-center text-blue-600 dark:text-blue-400">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {showInvoice && (
                    <div className="mb-8">
                        <ShowNip05Order nip05Order={nip05Order} />
                    </div>
                )}

                {/* Your NIP05s Section */}
                <div className="mb-8">
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Your NIP-05s</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {props.myNip05.map((nip05: any, index: number) => (
                            <div
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow duration-300"
                                key={index + "-nip05orders123"}
                            >
                                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 border-b border-slate-200 dark:border-slate-700">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 break-all">
                                        {nip05.name}@{nip05.domain}
                                    </h3>
                                </div>
                                
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Public Key
                                        </label>
                                        {editingOrderId === nip05.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editingPubkey}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setEditingPubkey(value);
                                                        validatePubkey(value);
                                                    }}
                                                    placeholder="Pubkey hex or npub"
                                                    className={`w-full px-4 py-3 rounded-lg border ${
                                                        pubkeyValidationError 
                                                            ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                                    } text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                                                />
                                                {pubkeyValidationError && (
                                                    <p className="text-sm text-red-600 dark:text-red-400">
                                                        {pubkeyValidationError}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-700 p-3 rounded-lg break-all">
                                                {nip05.pubkey}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Relay URLs
                                        </label>
                                        {editingOrderId === nip05.id ? (
                                            <div className="space-y-3">
                                                {editingRelayUrls.map((url, idx) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <span className="flex-1 text-sm text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-700 p-2 rounded break-all">
                                                            {url}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemoveRelayUrl(url)}
                                                            className="px-3 py-2 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors duration-200"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        value={newRelayUrl}
                                                        onChange={(e) => setNewRelayUrl(e.target.value)}
                                                        placeholder="wss://relay.example.com"
                                                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                    <button
                                                        onClick={handleAddRelayUrl}
                                                        className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors duration-200"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {nip05.relayUrls.map((o: any) => (
                                                    <div key={o.url} className="text-sm text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-700 p-2 rounded break-all">
                                                        {o.url}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 border-t border-slate-200 dark:border-slate-600">
                                    {editingOrderId === nip05.id ? (
                                        <div className="flex flex-col sm:flex-row gap-3 justify-end">
                                            <button
                                                onClick={() => setEditingOrderId(null)}
                                                className="px-4 py-2 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={!!pubkeyValidationError}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row gap-3 justify-between">
                                            <button
                                                onClick={() => handleEdit(nip05.id, nip05.relayUrls.map((o: any) => o.url), nip05.pubkey)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(nip05.id)}
                                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Admin/Mod NIP05s Section */}
                {props.otherNip05 && props.otherNip05.length > 0 && (
                <div>
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Admin/Mod NIP-05s</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {props.otherNip05.map((nip05: any, index: number) => (
                            <div
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow duration-300"
                                key={index + "-admin-nip05orders"}
                            >
                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 border-b border-slate-200 dark:border-slate-700">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 break-all">
                                        {nip05.name}@{nip05.domain}
                                    </h3>
                                </div>
                                
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Public Key
                                        </label>
                                        {editingOrderId === nip05.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editingPubkey}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setEditingPubkey(value);
                                                        validatePubkey(value);
                                                    }}
                                                    placeholder="Pubkey hex or npub"
                                                    className={`w-full px-4 py-3 rounded-lg border ${
                                                        pubkeyValidationError 
                                                            ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                                    } text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                                                />
                                                {pubkeyValidationError && (
                                                    <p className="text-sm text-red-600 dark:text-red-400">
                                                        {pubkeyValidationError}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-700 p-3 rounded-lg break-all">
                                                {nip05.pubkey}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Relay URLs
                                        </label>
                                        {editingOrderId === nip05.id ? (
                                            <div className="space-y-3">
                                                {editingRelayUrls.map((url, idx) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <span className="flex-1 text-sm text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-700 p-2 rounded break-all">
                                                            {url}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemoveRelayUrl(url)}
                                                            className="px-3 py-2 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors duration-200"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        value={newRelayUrl}
                                                        onChange={(e) => setNewRelayUrl(e.target.value)}
                                                        placeholder="wss://relay.example.com"
                                                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                    <button
                                                        onClick={handleAddRelayUrl}
                                                        className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors duration-200"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {nip05.relayUrls.map((o: any) => (
                                                    <div key={o.url} className="text-sm text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-700 p-2 rounded break-all">
                                                        {o.url}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 border-t border-slate-200 dark:border-slate-600">
                                    {editingOrderId === nip05.id ? (
                                        <div className="flex flex-col sm:flex-row gap-3 justify-end">
                                            <button
                                                onClick={() => setEditingOrderId(null)}
                                                className="px-4 py-2 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={!!pubkeyValidationError}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row gap-3 justify-between">
                                            <button
                                                onClick={() => handleEdit(nip05.id, nip05.relayUrls.map((o: any) => o.url), nip05.pubkey)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(nip05.id)}
                                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}
