"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Client-side wrapper for NIP-05 functionality
export default function Nip05Wrapper() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading time for better UX
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
                <p className="text-lg opacity-70 mb-6">
                    Please sign in to manage your NIP-05 identity.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-base-100 rounded-lg p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4">NIP-05 Identity Verification</h2>
                <p className="text-lg opacity-70 mb-6">
                    Manage your Nostr identity verification and domain associations.
                </p>
                
                <div className="alert alert-info">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>This section is being updated to work with the new dashboard. Full functionality will be restored shortly.</span>
                </div>

                <div className="mt-6">
                    <div className="stats shadow w-full">
                        <div className="stat">
                            <div className="stat-figure text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div className="stat-title">Verified Identities</div>
                            <div className="stat-value text-primary">0</div>
                            <div className="stat-desc">No verified identities</div>
                        </div>
                        
                        <div className="stat">
                            <div className="stat-figure text-secondary">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                </svg>
                            </div>
                            <div className="stat-title">Domain Status</div>
                            <div className="stat-value text-secondary">Inactive</div>
                            <div className="stat-desc">No active domains</div>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">What is NIP-05?</h3>
                    <div className="prose max-w-none">
                        <p className="opacity-80">
                            NIP-05 is a verification method for Nostr identities that allows you to associate your public key 
                            with a human-readable identifier like "username@domain.com". This makes it easier for others to 
                            find and verify your identity on the Nostr network.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
