import { getServerSession } from "next-auth/next";
import { authOptions } from "../../pages/api/auth/[...nextauth]";
import prisma from "../../lib/prisma";
import { redirect } from "next/navigation";
import GlobalBlockListManager from "./globalBlockListManager";

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                        🛡️ Super Admin Panel
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Manage global block list that applies to all relays
                    </p>
                </div>

                <GlobalBlockListManager
                    globalBlockList={globalBlockList}
                    userPubkey={user.pubkey}
                />
            </div>
        </div>
    );
}
