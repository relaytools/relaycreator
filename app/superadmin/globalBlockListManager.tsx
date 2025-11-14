"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTrash, FaPlus, FaShieldAlt, FaCopy, FaBan, FaClock, FaServer, FaCheckCircle, FaSpinner, FaExclamationTriangle, FaTimesCircle, FaInfoCircle } from "react-icons/fa";
import { nip19 } from "nostr-tools";

interface ListEntryPubkey {
    id: string;
    pubkey: string;
    reason: string | null;
    expires_at: Date | null;
}

interface GlobalBlockList {
    id: string;
    list_pubkeys: ListEntryPubkey[];
}

interface Job {
    id: string;
    kind: string;
    status: string;
    created_at: Date;
    updated_at: Date;
    error_msg: string | null;
    output: string | null;
    pubkey: string | null;
    eventId: string | null;
    relay: {
        id: string;
        name: string;
        status: string | null;
    };
}

interface Props {
    globalBlockList: GlobalBlockList | null;
    userPubkey: string;
    jobs: Job[];
}

export default function GlobalBlockListManager({ globalBlockList, userPubkey, jobs }: Props) {
    const router = useRouter();
    const [newPubkey, setNewPubkey] = useState("");
    const [newReason, setNewReason] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedJobOutput, setSelectedJobOutput] = useState<string | null>(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    const copyJobOutput = (output: string) => {
        navigator.clipboard.writeText(output);
        toast.success("Output copied to clipboard");
    };

    const handleAddPubkey = async () => {
        if (!newPubkey.trim()) {
            toast.error("Please enter a pubkey");
            return;
        }

        setIsAdding(true);
        try {
            const response = await fetch("/api/superadmin/globalblock", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    pubkey: newPubkey.trim(),
                    reason: newReason.trim() || null,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to add pubkey");
            }

            toast.success("Pubkey added to global block list");
            setNewPubkey("");
            setNewReason("");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Error adding pubkey");
            console.error("Error adding pubkey:", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeletePubkey = async (entryId: string) => {
        if (!confirm("Are you sure you want to remove this pubkey from the global block list?")) {
            return;
        }

        try {
            const response = await fetch(`/api/superadmin/globalblock/${entryId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to delete pubkey");
            }

            toast.success("Pubkey removed from global block list");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Error deleting pubkey");
            console.error("Error deleting pubkey:", error);
        }
    };

    const handleDeleteFromAllRelays = async (pubkey: string) => {
        const confirmMessage = 
            "⚠️ WARNING: This will queue delete jobs across ALL running relays for this pubkey.\n\n" +
            "This action will:\n" +
            "• Create delete jobs for all running relays\n" +
            "• Remove this pubkey's events from all relay databases\n" +
            "• Cannot be undone\n\n" +
            "Are you absolutely sure you want to proceed?";

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await fetch("/api/superadmin/globalblock/delete-from-relays", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ pubkey }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to queue delete jobs");
            }

            const result = await response.json();
            toast.success(
                `✅ ${result.message}\nRelays: ${result.relays.join(", ")}`,
                { autoClose: 5000 }
            );
        } catch (error: any) {
            toast.error(error.message || "Error queuing delete jobs");
            console.error("Error queuing delete jobs:", error);
        }
    };

    const filteredPubkeys = globalBlockList?.list_pubkeys.filter((entry) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase().trim();
        
        // Check if search term matches reason
        if (entry.reason?.toLowerCase().includes(search)) {
            return true;
        }
        
        // Check if search term matches hex pubkey
        if (entry.pubkey.toLowerCase().includes(search)) {
            return true;
        }
        
        // If search term looks like npub, convert it to hex and compare
        if (search.startsWith("npub1")) {
            try {
                const { data } = nip19.decode(search);
                const hexFromNpub = typeof data === "string" ? data : undefined;
                if (hexFromNpub && entry.pubkey.toLowerCase() === hexFromNpub.toLowerCase()) {
                    return true;
                }
            } catch {
                // Invalid npub, ignore conversion
            }
        }
        
        return false;
    }) || [];

    return (
        <>
            <ToastContainer position="bottom-right" autoClose={3000} theme="auto" />
            
            <div className="space-y-6">
                {/* Add New Pubkey Card */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FaPlus className="text-blue-500" />
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Add to Global Block List
                        </h2>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Pubkey (hex or npub)
                            </label>
                            <input
                                type="text"
                                value={newPubkey}
                                onChange={(e) => setNewPubkey(e.target.value)}
                                placeholder="Enter hex pubkey or npub1... to block globally"
                                className="input input-bordered w-full"
                                disabled={isAdding}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Accepts both hex format (64 characters) and npub format (npub1...)
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Reason (optional)
                            </label>
                            <input
                                type="text"
                                value={newReason}
                                onChange={(e) => setNewReason(e.target.value)}
                                placeholder="Reason for blocking..."
                                className="input input-bordered w-full"
                                disabled={isAdding}
                            />
                        </div>
                        
                        <button
                            onClick={handleAddPubkey}
                            disabled={isAdding || !newPubkey.trim()}
                            className="btn btn-primary w-full sm:w-auto"
                        >
                            {isAdding ? "Adding..." : "Add to Global Block List"}
                        </button>
                    </div>
                </div>

                {/* Search and List Card */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FaShieldAlt className="text-red-500" />
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Global Block List
                            </h2>
                        </div>
                        <span className="badge badge-lg badge-error">
                            {filteredPubkeys.length} blocked
                        </span>
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by pubkey (hex or npub), or reason..."
                            className="input input-bordered w-full"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Search accepts hex pubkeys, npub format, or reason text
                        </p>
                    </div>

                    {filteredPubkeys.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            {searchTerm ? "No matching entries found" : "No pubkeys in global block list"}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredPubkeys.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <code className="text-sm bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded font-mono break-all">
                                                    {entry.pubkey}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(entry.pubkey)}
                                                    className="btn btn-ghost btn-xs"
                                                    title="Copy pubkey"
                                                >
                                                    <FaCopy />
                                                </button>
                                            </div>
                                            {entry.reason && (
                                                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                                    <span className="font-medium">Reason:</span> {entry.reason}
                                                </div>
                                            )}
                                            {entry.expires_at && (
                                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                                                    Expires: {new Date(entry.expires_at).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handleDeleteFromAllRelays(entry.pubkey)}
                                                className="btn btn-warning btn-sm"
                                                title="Queue delete jobs across all running relays"
                                            >
                                                <FaBan /> Delete from All Relays
                                            </button>
                                            <button
                                                onClick={() => handleDeletePubkey(entry.id)}
                                                className="btn btn-error btn-sm"
                                                title="Remove from global block list"
                                            >
                                                <FaTrash /> Remove from List
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        ℹ️ About Global Block List
                    </h3>
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                        <p>
                            Pubkeys added to the global block list will be automatically blocked on <strong>all relays</strong> in the system.
                            This is useful for blocking known spam accounts or malicious actors across the entire platform.
                        </p>
                        <p className="font-medium">
                            <strong>Delete from All Relays:</strong> Use this button to queue delete jobs that will remove all events 
                            from this pubkey across all running relays. This is a destructive action that cannot be undone.
                        </p>
                    </div>
                </div>

                {/* Jobs Monitor */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FaClock className="text-purple-500" />
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Recent Jobs
                            </h2>
                        </div>
                        <span className="badge badge-lg badge-primary">
                            {jobs.length} jobs
                        </span>
                    </div>

                    {jobs.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            No jobs found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Kind</th>
                                        <th>Relay</th>
                                        <th>Pubkey</th>
                                        <th>Created</th>
                                        <th>Updated</th>
                                        <th>Output</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.map((job) => {
                                        const getStatusBadge = (status: string) => {
                                            switch (status) {
                                                case 'completed':
                                                    return <span className="badge badge-success gap-1"><FaCheckCircle /> Completed</span>;
                                                case 'running':
                                                    return <span className="badge badge-info gap-1"><FaSpinner className="animate-spin" /> Running</span>;
                                                case 'queue':
                                                    return <span className="badge badge-warning gap-1"><FaClock /> Queued</span>;
                                                case 'failed':
                                                    return <span className="badge badge-error gap-1"><FaTimesCircle /> Failed</span>;
                                                default:
                                                    return <span className="badge badge-ghost">{status}</span>;
                                            }
                                        };

                                        return (
                                            <tr key={job.id}>
                                                <td>{getStatusBadge(job.status)}</td>
                                                <td>
                                                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                                        {job.kind}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-1">
                                                        <FaServer className="text-slate-400" size={12} />
                                                        <span className="text-sm">{job.relay.name}</span>
                                                        {job.relay.status === 'running' && (
                                                            <span className="badge badge-xs badge-success">running</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    {job.pubkey ? (
                                                        <div className="flex items-center gap-1">
                                                            <code className="text-xs truncate max-w-[150px]">
                                                                {job.pubkey}
                                                            </code>
                                                            <button
                                                                onClick={() => copyToClipboard(job.pubkey!)}
                                                                className="btn btn-ghost btn-xs"
                                                                title="Copy pubkey"
                                                            >
                                                                <FaCopy size={10} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="text-xs text-slate-600 dark:text-slate-400">
                                                    {new Date(job.created_at).toLocaleString()}
                                                </td>
                                                <td className="text-xs text-slate-600 dark:text-slate-400">
                                                    {new Date(job.updated_at).toLocaleString()}
                                                </td>
                                                <td>
                                                    {job.output ? (
                                                        <button
                                                            onClick={() => setSelectedJobOutput(job.output)}
                                                            className="btn btn-ghost btn-xs"
                                                            title="View output"
                                                        >
                                                            <FaInfoCircle className="text-info" /> View
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Job Output Modal */}
                {selectedJobOutput && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-4xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">Job Output</h3>
                                <button
                                    onClick={() => setSelectedJobOutput(null)}
                                    className="btn btn-sm btn-circle btn-ghost"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
                                <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                                    {selectedJobOutput}
                                </pre>
                            </div>

                            <div className="modal-action">
                                <button
                                    onClick={() => copyJobOutput(selectedJobOutput)}
                                    className="btn btn-primary"
                                >
                                    <FaCopy /> Copy to Clipboard
                                </button>
                                <button
                                    onClick={() => setSelectedJobOutput(null)}
                                    className="btn"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
