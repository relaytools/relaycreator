import { getServerSession } from "next-auth/next";
import authOptions from "../../pages/api/auth/[...nextauth]";
import PublicRelays from "./publicRelays";
import CreateRelay from "./createRelay";
import HelpfulInfo from "./helpfulInfo";
import RelayDashboard from "./relayDashboard";
import Link from "next/link";

export default async function Relays() {

    const session = await getServerSession(authOptions);

    let showSignup = false;

    if (!session || !(session as any).user.name) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
                <div className="container mx-auto px-4 py-8">
                    {showSignup && (
                        <div className="card bg-base-200 mb-8">
                            <div className="card-body">
                                <CreateRelay />
                            </div>
                        </div>
                    )}
                    
                    {!showSignup && (
                        <div className="card bg-base-200 mb-8">
                            <div className="card-body">
                                <HelpfulInfo />
                            </div>
                        </div>
                    )}
                    
                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <h2 className="card-title text-2xl mb-4">🌐 Public Relays</h2>
                            <PublicRelays />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Pass session data to client component - let it handle component rendering
    return (
        <RelayDashboard 
            session={session}
        />
    );
}
