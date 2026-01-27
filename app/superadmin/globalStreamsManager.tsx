"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaServer, FaPlus, FaTrash, FaSync, FaArrowUp, FaArrowDown, FaExchangeAlt, FaSpinner, FaCheckCircle, FaTimesCircle, FaPlay, FaInfoCircle } from "react-icons/fa";

interface Stream {
    id: string;
    url: string;
    direction: string;
    internal: boolean;
    sync: boolean;
    status: string;
}

interface RelayWithStreams {
    id: string;
    name: string;
    port: number | null;
    status: string | null;
    streams: Stream[];
}

interface Props {
    initialRelays: RelayWithStreams[];
}

export default function GlobalStreamsManager({ initialRelays }: Props) {
    const router = useRouter();
    const [relays, setRelays] = useState<RelayWithStreams[]>(initialRelays);
    const [targetServer, setTargetServer] = useState("");
    const [direction, setDirection] = useState("up");
    const [protocol, setProtocol] = useState("wss");
    const [isAdding, setIsAdding] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [removeTargetServer, setRemoveTargetServer] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showOnlyWithStreams, setShowOnlyWithStreams] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Sync job scheduling state
    const [syncTargetServer, setSyncTargetServer] = useState("");
    const [syncDirection, setSyncDirection] = useState("down");
    const [syncProtocol, setSyncProtocol] = useState("wss");
    const [isSchedulingSync, setIsSchedulingSync] = useState(false);
    const [selectedRelayIds, setSelectedRelayIds] = useState<string[]>([]);
    const [selectAllRelays, setSelectAllRelays] = useState(false);

    const refreshRelays = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch("/api/superadmin/streams");
            if (response.ok) {
                const data = await response.json();
                setRelays(data.relays);
                toast.success(`Refreshed ${data.totalRelays} relays`);
            } else {
                toast.error("Failed to refresh relays");
            }
        } catch (error) {
            toast.error("Error refreshing relays");
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAddMigrationStreams = async () => {
        if (!targetServer.trim()) {
            toast.error("Please enter a target server hostname");
            return;
        }

        const confirmMessage = 
            `⚠️ This will add migration streams to ALL running relays.\n\n` +
            `Target Server: ${targetServer}\n` +
            `Protocol: ${protocol}\n` +
            `Direction: ${direction}\n` +
            `Stream URL Pattern: ${protocol}://${targetServer}:<relay_port>\n\n` +
            `This will also set all affected relays to "provision" status.\n\n` +
            `Are you sure you want to proceed?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsAdding(true);
        try {
            const response = await fetch("/api/superadmin/streams", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    targetServer: targetServer.trim(),
                    direction: direction,
                    protocol: protocol,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to add migration streams");
            }

            toast.success(data.message);
            setTargetServer("");
            router.refresh();
            await refreshRelays();
        } catch (error: any) {
            toast.error(error.message || "Error adding migration streams");
            console.error("Error adding migration streams:", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveMigrationStreams = async () => {
        if (!removeTargetServer.trim()) {
            toast.error("Please enter the target server hostname to remove");
            return;
        }

        const confirmMessage = 
            `⚠️ This will REMOVE all migration streams matching:\n\n` +
            `Target Server: ${removeTargetServer}\n\n` +
            `Only internal/migration streams will be removed.\n` +
            `Affected relays will be set to "provision" status.\n\n` +
            `Are you sure you want to proceed?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsRemoving(true);
        try {
            const response = await fetch("/api/superadmin/streams", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    targetServer: removeTargetServer.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to remove migration streams");
            }

            toast.success(data.message);
            setRemoveTargetServer("");
            router.refresh();
            await refreshRelays();
        } catch (error: any) {
            toast.error(error.message || "Error removing migration streams");
            console.error("Error removing migration streams:", error);
        } finally {
            setIsRemoving(false);
        }
    };

    const getDirectionIcon = (dir: string) => {
        switch (dir.toLowerCase()) {
            case "up":
                return <FaArrowUp className="text-green-500" title="Upload" />;
            case "down":
                return <FaArrowDown className="text-blue-500" title="Download" />;
            case "both":
                return <FaExchangeAlt className="text-purple-500" title="Bidirectional" />;
            default:
                return null;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case "running":
                return <span className="badge badge-success badge-sm gap-1"><FaCheckCircle size={10} /> Running</span>;
            case "pending":
                return <span className="badge badge-warning badge-sm gap-1"><FaSpinner size={10} className="animate-spin" /> Pending</span>;
            case "error":
                return <span className="badge badge-error badge-sm gap-1"><FaTimesCircle size={10} /> Error</span>;
            default:
                return <span className="badge badge-ghost badge-sm">{status}</span>;
        }
    };

    const handleScheduleSyncJobs = async (bulk: boolean = true) => {
        if (!syncTargetServer.trim()) {
            toast.error("Please enter a target server hostname");
            return;
        }

        const relayCount = bulk ? relays.filter(r => r.port).length : selectedRelayIds.length;
        if (!bulk && relayCount === 0) {
            toast.error("Please select at least one relay");
            return;
        }

        const confirmMessage = bulk
            ? `⚠️ This will schedule sync jobs for ALL ${relayCount} running relays.\n\n` +
              `Target Server: ${syncTargetServer}\n` +
              `Protocol: ${syncProtocol}\n` +
              `Direction: ${syncDirection}\n` +
              `Sync URL Pattern: ${syncProtocol}://${syncTargetServer}:<relay_port>\n\n` +
              `Are you sure you want to proceed?`
            : `⚠️ This will schedule sync jobs for ${relayCount} selected relay(s).\n\n` +
              `Target Server: ${syncTargetServer}\n` +
              `Protocol: ${syncProtocol}\n` +
              `Direction: ${syncDirection}\n\n` +
              `Are you sure you want to proceed?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsSchedulingSync(true);
        try {
            const response = await fetch("/api/superadmin/syncjobs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    targetServer: syncTargetServer.trim(),
                    direction: syncDirection,
                    protocol: syncProtocol,
                    relayIds: bulk ? undefined : selectedRelayIds,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to schedule sync jobs");
            }

            toast.success(data.message);
            setSyncTargetServer("");
            setSelectedRelayIds([]);
            setSelectAllRelays(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Error scheduling sync jobs");
            console.error("Error scheduling sync jobs:", error);
        } finally {
            setIsSchedulingSync(false);
        }
    };

    const toggleRelaySelection = (relayId: string) => {
        setSelectedRelayIds(prev => 
            prev.includes(relayId) 
                ? prev.filter(id => id !== relayId)
                : [...prev, relayId]
        );
    };

    const handleSelectAllRelays = (checked: boolean) => {
        setSelectAllRelays(checked);
        if (checked) {
            setSelectedRelayIds(filteredRelays.filter(r => r.port).map(r => r.id));
        } else {
            setSelectedRelayIds([]);
        }
    };

    // Filter relays based on search and filter options
    const filteredRelays = relays.filter(relay => {
        const matchesSearch = relay.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            relay.streams.some(s => s.url.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = !showOnlyWithStreams || relay.streams.length > 0;
        return matchesSearch && matchesFilter;
    });

    // Get unique target servers from existing streams
    const existingTargetServers = [...new Set(
        relays.flatMap(r => r.streams)
            .filter(s => s.internal)
            .map(s => {
                try {
                    const url = new URL(s.url);
                    return url.hostname;
                } catch {
                    return null;
                }
            })
            .filter(Boolean)
    )];

    const relaysWithMigrationStreams = relays.filter(r => 
        r.streams.some(s => s.internal)
    ).length;

    const totalMigrationStreams = relays.reduce((acc, r) => 
        acc + r.streams.filter(s => s.internal).length, 0
    );

    return (
        <div className="space-y-8">
            <ToastContainer position="top-right" autoClose={3000} />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <FaServer className="text-blue-600 dark:text-blue-400" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Running Relays</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{relays.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                            <FaSync className="text-green-600 dark:text-green-400" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Migration Streams</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalMigrationStreams}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <FaCheckCircle className="text-purple-600 dark:text-purple-400" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Relays with Streams</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{relaysWithMigrationStreams}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                            <FaInfoCircle className="text-orange-600 dark:text-orange-400" size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Target Servers</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{existingTargetServers.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Migration Streams Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FaPlus className="text-green-500" />
                    Add Migration Streams
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Add a migration stream to all running relays. The stream URL will be constructed as 
                    <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded mx-1">[protocol]://[target-server]:[relay-port]</code>
                </p>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-32">
                        <label className="label">
                            <span className="label-text">Protocol</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={protocol}
                            onChange={(e) => setProtocol(e.target.value)}
                            disabled={isAdding}
                        >
                            <option value="wss">wss://</option>
                            <option value="ws">ws://</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="label">
                            <span className="label-text">Target Server Hostname</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., new-server.example.com"
                            className="input input-bordered w-full"
                            value={targetServer}
                            onChange={(e) => setTargetServer(e.target.value)}
                            disabled={isAdding}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="label">
                            <span className="label-text">Direction</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={direction}
                            onChange={(e) => setDirection(e.target.value)}
                            disabled={isAdding}
                        >
                            <option value="up">Up (Upload)</option>
                            <option value="down">Down (Download)</option>
                            <option value="both">Both</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            className="btn btn-primary gap-2"
                            onClick={handleAddMigrationStreams}
                            disabled={isAdding || !targetServer.trim()}
                        >
                            {isAdding ? (
                                <>
                                    <FaSpinner className="animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <FaPlus />
                                    Add to All Relays
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Remove Migration Streams Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FaTrash className="text-red-500" />
                    Remove Migration Streams
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Remove all migration streams matching a specific target server from all relays.
                    Only internal/migration streams will be removed.
                </p>
                
                {existingTargetServers.length > 0 && (
                    <div className="mb-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                            Existing target servers with migration streams:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {existingTargetServers.map((server, idx) => (
                                <button
                                    key={idx}
                                    className="badge badge-outline badge-lg cursor-pointer hover:badge-primary"
                                    onClick={() => setRemoveTargetServer(server as string)}
                                >
                                    {server}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="label">
                            <span className="label-text">Target Server to Remove</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., old-server.example.com"
                            className="input input-bordered w-full"
                            value={removeTargetServer}
                            onChange={(e) => setRemoveTargetServer(e.target.value)}
                            disabled={isRemoving}
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            className="btn btn-error gap-2"
                            onClick={handleRemoveMigrationStreams}
                            disabled={isRemoving || !removeTargetServer.trim()}
                        >
                            {isRemoving ? (
                                <>
                                    <FaSpinner className="animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                <>
                                    <FaTrash />
                                    Remove from All Relays
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Schedule Sync Jobs Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FaSync className="text-blue-500" />
                    Schedule Sync Jobs
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Schedule one-time sync jobs to synchronize data between relays. The sync URL will be constructed as 
                    <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded mx-1">[protocol]://[target-server]:[relay-port]</code>
                </p>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="w-full md:w-32">
                        <label className="label">
                            <span className="label-text">Protocol</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={syncProtocol}
                            onChange={(e) => setSyncProtocol(e.target.value)}
                            disabled={isSchedulingSync}
                        >
                            <option value="wss">wss://</option>
                            <option value="ws">ws://</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="label">
                            <span className="label-text">Target Server Hostname</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., source-server.example.com"
                            className="input input-bordered w-full"
                            value={syncTargetServer}
                            onChange={(e) => setSyncTargetServer(e.target.value)}
                            disabled={isSchedulingSync}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="label">
                            <span className="label-text">Direction</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={syncDirection}
                            onChange={(e) => setSyncDirection(e.target.value)}
                            disabled={isSchedulingSync}
                        >
                            <option value="down">Down (Pull from source)</option>
                            <option value="up">Up (Push to target)</option>
                            <option value="both">Both</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        className="btn btn-primary gap-2"
                        onClick={() => handleScheduleSyncJobs(true)}
                        disabled={isSchedulingSync || !syncTargetServer.trim()}
                    >
                        {isSchedulingSync ? (
                            <>
                                <FaSpinner className="animate-spin" />
                                Scheduling...
                            </>
                        ) : (
                            <>
                                <FaPlay />
                                Sync All Relays
                            </>
                        )}
                    </button>
                    <button
                        className="btn btn-secondary gap-2"
                        onClick={() => handleScheduleSyncJobs(false)}
                        disabled={isSchedulingSync || !syncTargetServer.trim() || selectedRelayIds.length === 0}
                    >
                        <FaPlay />
                        Sync Selected ({selectedRelayIds.length})
                    </button>
                </div>
            </div>

            {/* Relay List Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FaServer className="text-blue-500" />
                        Running Relays ({filteredRelays.length})
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Search relays or streams..."
                            className="input input-bordered input-sm w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <label className="label cursor-pointer gap-2">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={showOnlyWithStreams}
                                onChange={(e) => setShowOnlyWithStreams(e.target.checked)}
                            />
                            <span className="label-text whitespace-nowrap">With streams only</span>
                        </label>
                        <button
                            className="btn btn-ghost btn-sm gap-1"
                            onClick={refreshRelays}
                            disabled={isRefreshing}
                        >
                            <FaSync className={isRefreshing ? "animate-spin" : ""} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>
                                    <label className="cursor-pointer flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm"
                                            checked={selectAllRelays}
                                            onChange={(e) => handleSelectAllRelays(e.target.checked)}
                                        />
                                        <span className="text-xs">Select</span>
                                    </label>
                                </th>
                                <th>Relay Name</th>
                                <th>Port</th>
                                <th>Streams</th>
                                <th>Migration Streams</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRelays.map((relay) => {
                                const migrationStreams = relay.streams.filter(s => s.internal);
                                const regularStreams = relay.streams.filter(s => !s.internal);
                                
                                return (
                                    <tr key={relay.id} className={selectedRelayIds.includes(relay.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-sm"
                                                checked={selectedRelayIds.includes(relay.id)}
                                                onChange={() => toggleRelaySelection(relay.id)}
                                                disabled={!relay.port}
                                            />
                                        </td>
                                        <td>
                                            <div className="font-medium text-slate-900 dark:text-white">
                                                {relay.name}
                                            </div>
                                        </td>
                                        <td>
                                            {relay.port ? (
                                                <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                                    {relay.port}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">No port</span>
                                            )}
                                        </td>
                                        <td>
                                            {regularStreams.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {regularStreams.map((stream) => (
                                                        <div key={stream.id} className="flex items-center gap-2 text-sm">
                                                            {getDirectionIcon(stream.direction)}
                                                            <span className="font-mono text-xs truncate max-w-xs" title={stream.url}>
                                                                {stream.url}
                                                            </span>
                                                            {getStatusBadge(stream.status)}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">None</span>
                                            )}
                                        </td>
                                        <td>
                                            {migrationStreams.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {migrationStreams.map((stream) => (
                                                        <div key={stream.id} className="flex items-center gap-2 text-sm">
                                                            {getDirectionIcon(stream.direction)}
                                                            <span className="font-mono text-xs truncate max-w-xs bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded" title={stream.url}>
                                                                {stream.url}
                                                            </span>
                                                            {getStatusBadge(stream.status)}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">None</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredRelays.length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        {searchTerm || showOnlyWithStreams ? (
                            <p>No relays match your filters</p>
                        ) : (
                            <p>No running relays found</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
