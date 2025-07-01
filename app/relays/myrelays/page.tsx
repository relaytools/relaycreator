import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const MyRelays = dynamic(() => import("../myRelays"), { ssr: false });

export default async function MyRelaysPage() {
    const session = await getServerSession(authOptions);
    
    if (!session) {
        redirect("/api/auth/signin");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
            <div className="w-full px-2 sm:px-4 py-8">
                <div className="flex items-center gap-4 mb-6 px-2">
                    <a 
                        href="/relays"
                        className="btn btn-ghost btn-sm"
                    >
                        ← Back to Dashboard
                    </a>
                    <h1 className="text-2xl sm:text-3xl font-bold">My Relays</h1>
                </div>
                <div className="w-full">
                    <MyRelays />
                </div>
            </div>
        </div>
    );
}
