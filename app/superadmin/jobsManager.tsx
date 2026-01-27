"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTrash, FaClock, FaServer, FaCheckCircle, FaSpinner, FaTimesCircle, FaChevronLeft, FaChevronRight, FaSync } from "react-icons/fa";

interface Job {
    id: string;
    kind: string;
    status: string;
    created_at: Date | string;
    updated_at: Date | string;
    error_msg: string | null;
    output: string | null;
    pubkey: string | null;
    eventId: string | null;
    syncHost: string | null;
    syncDirection: string | null;
    relay: {
        id: string;
        name: string;
        status: string | null;
        port: number | null;
    };
}

interface Props {
    initialJobs: Job[];
}

const ITEMS_PER_PAGE = 20;

export default function JobsManager({ initialJobs }: Props) {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>(initialJobs);
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get unique values for filters
    const jobTypes = [...new Set(jobs.map(j => j.kind))].sort();
    const jobStatuses = [...new Set(jobs.map(j => j.status))].sort();

    // Filter jobs
    const filteredJobs = jobs.filter(job => {
        if (typeFilter !== "all" && job.kind !== typeFilter) return false;
        if (statusFilter !== "all" && job.status !== statusFilter) return false;
        return true;
    });

    // Pagination
    const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Reset to page 1 when filters change
    const handleFilterChange = (setter: (v: string) => void, value: string) => {
        setter(value);
        setCurrentPage(1);
    };

    const refreshJobs = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch("/api/superadmin/jobs");
            if (res.ok) {
                const data = await res.json();
                setJobs(data.jobs);
                toast.success(`Loaded ${data.jobs.length} jobs`);
            }
        } catch (e) {
            toast.error("Failed to refresh");
        } finally {
            setIsRefreshing(false);
        }
    };

    const deleteJob = async (jobId: string) => {
        if (!confirm("Delete this job?")) return;
        setIsDeleting(jobId);
        try {
            const res = await fetch("/api/superadmin/jobs", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
            });
            if (res.ok) {
                setJobs(prev => prev.filter(j => j.id !== jobId));
                toast.success("Deleted");
            } else {
                toast.error("Failed to delete");
            }
        } catch (e) {
            toast.error("Error deleting job");
        } finally {
            setIsDeleting(null);
        }
    };

    const deleteFiltered = async () => {
        if (filteredJobs.length === 0) return;
        if (!confirm(`Delete ${filteredJobs.length} jobs?`)) return;
        
        setIsDeleting("bulk");
        try {
            const res = await fetch("/api/superadmin/jobs", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobIds: filteredJobs.map(j => j.id) }),
            });
            if (res.ok) {
                const data = await res.json();
                setJobs(prev => prev.filter(j => !filteredJobs.find(f => f.id === j.id)));
                toast.success(data.message);
                setCurrentPage(1);
            } else {
                toast.error("Failed to delete");
            }
        } catch (e) {
            toast.error("Error deleting jobs");
        } finally {
            setIsDeleting(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed": return <span className="badge badge-success badge-sm gap-1"><FaCheckCircle size={10}/> Done</span>;
            case "running": return <span className="badge badge-info badge-sm gap-1"><FaSpinner size={10} className="animate-spin"/> Running</span>;
            case "queue": return <span className="badge badge-warning badge-sm gap-1"><FaClock size={10}/> Queued</span>;
            case "failed": return <span className="badge badge-error badge-sm gap-1"><FaTimesCircle size={10}/> Failed</span>;
            default: return <span className="badge badge-ghost badge-sm">{status}</span>;
        }
    };

    const formatDate = (d: Date | string) => new Date(d).toLocaleString();

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <ToastContainer position="top-right" autoClose={2000} />
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <FaClock className="text-purple-500" size={20} />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Jobs</h2>
                    <span className="badge badge-primary">{filteredJobs.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select 
                        className="select select-bordered select-sm"
                        value={typeFilter}
                        onChange={e => handleFilterChange(setTypeFilter, e.target.value)}
                    >
                        <option value="all">All Types</option>
                        {jobTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select 
                        className="select select-bordered select-sm"
                        value={statusFilter}
                        onChange={e => handleFilterChange(setStatusFilter, e.target.value)}
                    >
                        <option value="all">All Status</option>
                        {jobStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={refreshJobs} disabled={isRefreshing}>
                        <FaSync className={isRefreshing ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button 
                        className="btn btn-error btn-sm" 
                        onClick={deleteFiltered}
                        disabled={isDeleting === "bulk" || filteredJobs.length === 0}
                    >
                        <FaTrash /> Delete {typeFilter !== "all" || statusFilter !== "all" ? "Filtered" : "All"}
                    </button>
                </div>
            </div>

            {/* Table */}
            {paginatedJobs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No jobs found</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-sm w-full">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Type</th>
                                <th>Relay</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedJobs.map(job => (
                                <tr key={job.id} className={expandedId === job.id ? "bg-base-200" : ""}>
                                    <td>{getStatusBadge(job.status)}</td>
                                    <td><code className="text-xs">{job.kind}</code></td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <FaServer size={10} className="text-slate-400"/>
                                            <span className="text-sm">{job.relay.name}</span>
                                        </div>
                                    </td>
                                    <td className="text-xs">{formatDate(job.created_at)}</td>
                                    <td>
                                        <div className="flex gap-1">
                                            <button 
                                                className="btn btn-ghost btn-xs"
                                                onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                                            >
                                                {expandedId === job.id ? "Hide" : "Details"}
                                            </button>
                                            <button 
                                                className="btn btn-ghost btn-xs text-error"
                                                onClick={() => deleteJob(job.id)}
                                                disabled={isDeleting === job.id}
                                            >
                                                {isDeleting === job.id ? <FaSpinner className="animate-spin" size={10}/> : <FaTrash size={10}/>}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Expanded Details */}
            {expandedId && (
                <div className="mt-4 p-4 bg-base-200 rounded-lg">
                    {(() => {
                        const job = jobs.find(j => j.id === expandedId);
                        if (!job) return null;
                        return (
                            <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><span className="font-semibold">ID:</span> <code className="text-xs">{job.id}</code></div>
                                    <div><span className="font-semibold">Updated:</span> {formatDate(job.updated_at)}</div>
                                    {job.pubkey && <div><span className="font-semibold">Pubkey:</span> <code className="text-xs truncate block max-w-[200px]">{job.pubkey}</code></div>}
                                    {job.syncHost && <div><span className="font-semibold">Sync Host:</span> <code className="text-xs">{job.syncHost}</code></div>}
                                    {job.syncDirection && <div><span className="font-semibold">Direction:</span> {job.syncDirection}</div>}
                                </div>
                                {job.error_msg && (
                                    <div>
                                        <span className="font-semibold text-error">Error:</span>
                                        <pre className="mt-1 p-2 bg-error/10 rounded text-xs whitespace-pre-wrap">{job.error_msg}</pre>
                                    </div>
                                )}
                                <div>
                                    <span className="font-semibold">Output:</span>
                                    {job.output ? (
                                        <pre className="mt-1 p-2 bg-base-300 rounded text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">{job.output}</pre>
                                    ) : (
                                        <span className="text-slate-400 ml-2">No output</span>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                    <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <FaChevronLeft />
                    </button>
                    <span className="text-sm">Page {currentPage} of {totalPages}</span>
                    <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}
        </div>
    );
}
