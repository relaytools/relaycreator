import { getServerSession } from "next-auth/next";
import { authOptions } from "../../pages/api/auth/[...nextauth]";
import prisma from "../../lib/prisma";
import { redirect } from "next/navigation";
import GlobalBlockListManager from "./globalBlockListManager";
import GlobalStreamsManager from "./globalStreamsManager";
import JobsManager from "./jobsManager";

export default async function SuperAdminPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.name) {
        redirect("/");
    }

    const user = await prisma.user.findFirst({
        where: {
            pubkey: (session as any).user.name,
        },
        select: {
            admin: true,
            pubkey: true,
        },
    });

    if (!user || !user.admin) {
        redirect("/");
    }

    // Fetch global block list
    const globalBlockList = await prisma.globalBlockList.findFirst({
        select: {
            id: true,
            list_pubkeys: {
                select: {
                    id: true,
                    pubkey: true,
                    reason: true,
                    expires_at: true,
                },
                orderBy: {
                    pubkey: "asc",
                },
            },
        },
    });

    // Fetch all jobs (consolidated - all types)
    const jobs = await prisma.job.findMany({
        select: {
            id: true,
            kind: true,
            status: true,
            created_at: true,
            updated_at: true,
            error_msg: true,
            output: true,
            pubkey: true,
            eventId: true,
            syncHost: true,
            syncDirection: true,
            relay: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                    port: true,
                },
            },
        },
        orderBy: {
            created_at: "desc",
        },
        take: 500,
    });

    // Fetch all running relays with their streams for the streams manager
    const runningRelays = await prisma.relay.findMany({
        where: {
            status: "running"
        },
        select: {
            id: true,
            name: true,
            port: true,
            status: true,
            streams: {
                select: {
                    id: true,
                    url: true,
                    direction: true,
                    internal: true,
                    sync: true,
                    status: true
                }
            }
        },
        orderBy: {
            name: "asc"
        }
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                        🛡️ Super Admin Panel
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Manage global block list and monitor jobs across all relays
                    </p>
                </div>

                {/* Tabs for different admin sections */}
                <div className="tabs tabs-boxed mb-8 bg-white dark:bg-slate-800 p-2">
                    <input type="radio" name="admin_tabs" className="tab" aria-label="Block List & Jobs" defaultChecked />
                    <input type="radio" name="admin_tabs" className="tab" aria-label="Migration Streams" />
                </div>

                {/* Block List Manager Section */}
                <div className="mb-8">
                    <GlobalBlockListManager
                        globalBlockList={globalBlockList}
                        userPubkey={user.pubkey}
                    />
                </div>

                {/* Jobs Manager Section */}
                <div className="mb-8">
                    <JobsManager initialJobs={jobs} />
                </div>

                {/* Streams Manager Section */}
                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                    <div className="mb-6">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            🔄 Server Migration Streams
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            Manage migration streams across all running relays for server migrations
                        </p>
                    </div>
                    <GlobalStreamsManager initialRelays={runningRelays} />
                </div>
            </div>
        </div>
    );
}
