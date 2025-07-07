"use client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Bolt11Invoice from "../components/invoice";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { nip19 } from "nostr-tools";

function copyToClipboard(e: any, bolt: string) {
    e.preventDefault();
    navigator.clipboard.writeText(bolt).then(() => {
        console.log("Copied to clipboard!");
    });
}

export async function alby(lnurl: string) {
    try {
        await (window as any).webln.enable();
        const result = await (window as any).webln.sendPayment(lnurl);
    } catch (error) {
        console.log("something went wrong with webln: " + error);
    }
}

export default function ClientBalances(
    props: React.PropsWithChildren<{
        RelayClientOrders: any;
        IsAdmin: boolean;
        rewrittenSubdomain?: string | null;
    }>
) {
    const router = useRouter();
    const [showOrders, setShowOrders] = useState("");
    const [clientAmount, setClientAmount] = useState("");
    const [showNip05, setShowNip05] = useState(false);
    const { data: session } = useSession();

    // Function to get user's most recent plan type for a relay
    function getUserMostRecentPlan(relay: any): string {
        if (!relay.orders || relay.orders.length === 0) {
            return 'standard'; // Default to standard if no orders
        }
        
        // Sort orders by paid_at date (most recent first)
        const sortedOrders = [...relay.orders].sort((a, b) => {
            if (!a.paid_at) return 1;
            if (!b.paid_at) return -1;
            return new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime();
        });
        
        return sortedOrders[0]?.order_type || 'standard';
    }

    async function renewSubscription(relay: any, overrideAmount?: string) {
        if (!session || !session.user?.name) {
            alert("Please login to renew your subscription");
            return;
        }

        let useAmount = overrideAmount || clientAmount;
        if (!useAmount || useAmount === "") {
            useAmount = relay.paymentAmount.toString();
        }

        const response = await fetch(
            `/api/clientorders?relayid=${relay.relayId}&pubkey=${session.user.name}&sats=${useAmount}`
        );
        const responseJson = await response.json();
        console.log(responseJson);

        if (response.ok) {
            router.push(
                `/clientinvoices?relayid=${relay.relayId}&order_id=${responseJson.clientOrder.id}&pubkey=${session.user.name}&sats=${useAmount}`
            );
        }
    }

    function showOrdersFor(relayId: string) {
        return showOrders === relayId;
    }
    
    function toggleShowOrders(relayId: string) {
        if (showOrders === relayId) {
            setShowOrders(""); // Hide if currently showing
        } else {
            setShowOrders(relayId); // Show if currently hidden
        }
    }

    function amountPrecision(amount: number) {
        return Math.round(amount);
    }
    
    function calculateOutstandingBalance(relay: any) {
        // If payment is not required, there's no outstanding balance
        if (!relay.paymentRequired) return 0;
        
        // Calculate how many subscription periods have passed
        const totalPaid = relay.totalClientPayments || 0;
        const subscriptionFee = relay.paymentAmount || 0;
        
        // If subscription fee is 0, there's no outstanding balance
        if (subscriptionFee === 0) return 0;
        
        // Calculate outstanding balance (negative means credit)
        const outstandingBalance = subscriptionFee - totalPaid;
        
        return outstandingBalance;
    }

    // Filter relays based on rewritten subdomain if present
    let filteredRelays = props.RelayClientOrders;
    let isFiltered = false;
    let subdomainName: string | null = null;
    
    if (props.rewrittenSubdomain) {
        // Extract subdomain from full hostname (e.g., "myrelay.relay.tools" -> "myrelay")
        subdomainName = props.rewrittenSubdomain.split('.')[0];
        
        console.log('Full rewritten hostname:', props.rewrittenSubdomain);
        console.log('Extracted subdomain:', subdomainName);
        console.log('Available relays:', props.RelayClientOrders.map((r: any) => r.relayName));
        
        const matchingRelays = props.RelayClientOrders.filter((relay: any) => 
            relay.relayName.toLowerCase() === subdomainName!.toLowerCase()
        );
        
        // Only filter if we found matching relays, otherwise show all
        if (matchingRelays.length > 0) {
            filteredRelays = matchingRelays;
            isFiltered = true;
            console.log('Found matching relays:', matchingRelays.length);
        } else {
            console.log('No matching relays found, showing all');
        }
    }

    const sortedRelays = filteredRelays.sort((a: any, b: any) => {
        return a.relayName.localeCompare(b.relayName);
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                {isFiltered ? `${subdomainName} Relay Subscription` : 'Relay Subscriptions'}
                            </h2>
                            {subdomainName && (
                                <p className="text-slate-600 dark:text-slate-400">
                                    {isFiltered 
                                        ? `Showing subscription details for ${subdomainName}`
                                        : `No subscription found for ${subdomainName}, showing all subscriptions`
                                    }
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {sortedRelays.map((relay: any) => {
                        // Check if banner_image exists and is not empty
                        const bannerImage = relay.banner_image && relay.banner_image.trim() !== '' ? 
                            relay.banner_image : null;
                        
                        // Use profile image if available, otherwise use banner image for the circular display
                        const profileImage = relay.profile_image && relay.profile_image.trim() !== '' ?
                            relay.profile_image : (bannerImage || '/green-check.png');

                        return (
                            <div
                                key={relay.relayId + "rowkey"}
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow duration-300"
                            >
                                {/* Banner Section */}
                                <div className="relative h-32 sm:h-40 overflow-hidden">
                                    {/* Banner image */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 dark:from-blue-600/30 dark:to-purple-700/30">
                                        {bannerImage && (
                                            <img 
                                                src={bannerImage} 
                                                alt={`${relay.relayName} banner`}
                                                className="w-full h-full object-cover opacity-60"
                                            />
                                        )}
                                    </div>
                                    
                                    {/* Overlay content */}
                                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-900/90 to-transparent">
                                        <div className="flex items-end gap-4">
                                            {/* Profile image */}
                                            <div className="w-16 h-16 border-4 border-white dark:border-slate-800 rounded-full overflow-hidden bg-white dark:bg-slate-800 flex-shrink-0">
                                                <img 
                                                    src={profileImage} 
                                                    alt={`${relay.relayName} profile`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            
                                            {/* Relay info */}
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-xl font-bold text-white truncate">{relay.relayName}</h2>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    <div className="mb-6">
                                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600 relative">
                                            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Outstanding Balance</div>
                                            <div className={`text-lg font-bold ${calculateOutstandingBalance(relay) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                {calculateOutstandingBalance(relay) > 0 ? 
                                                    `${calculateOutstandingBalance(relay)} sats due` : 
                                                    calculateOutstandingBalance(relay) < 0 ? 
                                                        `${Math.abs(calculateOutstandingBalance(relay))} sats credit` : 
                                                        'Paid in full'}
                                            </div>
                                            <button
                                                className="btn btn-primary btn-xs absolute top-2 right-2"
                                                onClick={() => toggleShowOrders(relay.relayId)}
                                            >
                                                {showOrdersFor(relay.relayId) ? "Hide" : "History"}
                                            </button>
                                        </div>
                                    </div>
                                    


                                    {showOrdersFor(relay.relayId) && relay.orders && relay.orders.length > 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600 mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Payment History</h3>
                                            <div className="overflow-x-auto">
                                                <table className="table-auto w-full">
                                                    <thead>
                                                        <tr>
                                                            <th className="px-4 py-2 text-left">Plan</th>
                                                            <th className="px-4 py-2 text-left">Amount</th>
                                                            <th className="px-4 py-2 text-left">Paid At</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {relay.orders.map((order: any) => {
                                                            const planType = order.order_type || 'standard';
                                                            const planDisplay = planType.charAt(0).toUpperCase() + planType.slice(1);
                                                            const planColor = planType === 'premium' ? 'text-purple-600 dark:text-purple-400' : 
                                                                            planType === 'custom' ? 'text-orange-600 dark:text-orange-400' : 
                                                                            'text-blue-600 dark:text-blue-400';
                                                            return (
                                                                <tr key={order.id + "paid"}>
                                                                    <td className="px-4 py-2 text-left">
                                                                        <span className={`font-medium ${planColor}`}>{planDisplay}</span>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-left">{amountPrecision(order.amount)} sats</td>
                                                                    <td className="px-4 py-2 text-left">
                                                                        {order.paid_at != null
                                                                            ? new Date(order.paid_at).toLocaleString()
                                                                            : ""}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {showOrdersFor(relay.relayId) && relay.unpaidOrders && relay.unpaidOrders.length > 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600 mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Pending Payments</h3>
                                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {relay.unpaidOrders.map((order: any) => (
                                                    <div key={order.id + "unpaid"} className="py-3">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <div className="font-medium">{order.amount} sats</div>
                                                                <div className="text-sm opacity-70">
                                                                    Expires: {order.expires_at
                                                                        ? new Date(order.expires_at).toLocaleString()
                                                                        : "Unknown"}
                                                                </div>
                                                            </div>
                                                            <a
                                                                className="btn btn-primary btn-sm"
                                                                href={`/clientinvoices?relayid=${relay.id}&pubkey=${order.pubkey}&order_id=${order.id}`}
                                                            >
                                                                Pay Now
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600 mb-6">
                                        <details className="group">
                                            <summary className="flex justify-between items-center cursor-pointer text-lg font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                                                Renew Subscription
                                                <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </summary>
                                            <div className="mt-4">
                                                <div className="mb-4">
                                                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                                                        Choose Your Plan
                                                    </label>
                                                    {(() => {
                                                        const currentPlan = getUserMostRecentPlan(relay);
                                                        return (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                                <button
                                                                    className={`btn flex-col h-auto py-4 relative ${
                                                                        currentPlan === 'standard' 
                                                                            ? 'btn-primary' 
                                                                            : 'btn-outline btn-primary'
                                                                    }`}
                                                                    onClick={() => {
                                                                        renewSubscription(relay, relay.paymentAmount.toString());
                                                                    }}
                                                                >
                                                                    {currentPlan === 'standard' && (
                                                                        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                                                            Current
                                                                        </div>
                                                                    )}
                                                                    <div className="font-bold">Standard Plan</div>
                                                                    <div className="text-sm opacity-70">Basic relay access</div>
                                                                    <div className="font-bold text-lg">{relay.paymentAmount} sats/month</div>
                                                                </button>
                                                                <button
                                                                    className={`btn flex-col h-auto py-4 relative ${
                                                                        currentPlan === 'premium' 
                                                                            ? 'btn-secondary' 
                                                                            : 'btn-outline btn-secondary'
                                                                    }`}
                                                                    onClick={() => {
                                                                        renewSubscription(relay, relay.paymentPremiumAmount.toString());
                                                                    }}
                                                                >
                                                                    {currentPlan === 'premium' && (
                                                                        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                                                            Current
                                                                        </div>
                                                                    )}
                                                                    <div className="font-bold">Premium Plan</div>
                                                                    <div className="text-sm opacity-70">Enhanced features & Benefits</div>
                                                                    <div className="font-bold text-lg">{relay.paymentPremiumAmount} sats/month</div>
                                                                </button>
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="text-center">
                                                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Or enter custom amount:</div>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                className="input input-bordered flex-1"
                                                                placeholder="Custom amount in sats"
                                                                onChange={(e) => setClientAmount(e.target.value)}
                                                            />
                                                            <button
                                                                className="btn btn-primary"
                                                                onClick={() => renewSubscription(relay)}
                                                            >
                                                                Renew
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center mr-4">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">NIP-05 Identities</h3>
                                    <p className="text-slate-600 dark:text-slate-400">Manage your Nostr identity verification</p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push('/nip05')}
                                className="btn btn-primary gap-2"
                            >
                                Manage NIP-05
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
