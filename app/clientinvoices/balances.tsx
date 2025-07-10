"use client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

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

// Define a type for relay client orders
interface RelayClientOrder {
    owner: string;
    relayName: string;
    relayStatus: string | null;
    relayId: string;
    relayDomain: string | null;
    totalClientPayments: number;
    orders: Array<{
        id: string;
        relayId: string;
        pubkey: string;
        amount: number;
        paid: boolean;
        paid_at: string | null;
        payment_hash: string;
        lnurl: string;
        expires_at: string | null;
        order_type: string;
    }>;
    unpaidOrders: Array<any>;
    paymentAmount: number;
    paymentPremiumAmount: number;
    paymentRequired: boolean;
    isInAllowList: boolean;
    banner_image: string | null;
    profile_image: string | null;
    needsInitialSubscription?: boolean; // Optional flag for relays that need initial subscription
}

export default function ClientBalances(
    props: React.PropsWithChildren<{
        RelayClientOrders: RelayClientOrder[];
        IsAdmin: boolean;
        rewrittenSubdomain?: string | null;
    }>
) {
    const router = useRouter();
    const [showOrders, setShowOrders] = useState<Record<string, boolean>>({});
    const [showNewOrder, setShowNewOrder] = useState<boolean>(false);
    const [newOrderRelay, setNewOrderRelay] = useState<any>(null);
    const [clientAmount, setClientAmount] = useState("");
    const [showNip05, setShowNip05] = useState(false);
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    
    // Get pubkey from URL parameters if available
    const urlPubkey = searchParams?.get('pubkey') || null;

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

    // Function to handle new subscription
    async function createNewSubscription(relay: any, planType: 'standard' | 'premium' | 'custom', amount?: string) {
        // Get amount based on plan type
        let useAmount = amount;
        if (!useAmount || useAmount === "") {
            useAmount = planType === 'premium' ? relay.paymentPremiumAmount.toString() : relay.paymentAmount.toString();
        }
        
        // Get the pubkey from URL parameters first, then session, then relay owner as fallback
        let userPubkey = urlPubkey || session?.user?.name || relay.owner;
        
        if (!userPubkey) {
            alert("Error: Missing pubkey for subscription");
            return;
        }
        
        try {
            const response = await fetch(
                `/api/clientorders?relayid=${relay.relayId}&pubkey=${userPubkey}&sats=${useAmount}`
            );
            const responseJson = await response.json();
            console.log(responseJson);
            
            if (response.ok) {
                router.push(
                    `/clientinvoices?relayid=${relay.relayId}&order_id=${responseJson.clientOrder.id}&pubkey=${userPubkey}&sats=${useAmount}`
                );
            } else {
                alert("Error creating subscription: " + (responseJson.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Error creating subscription:", error);
            alert("Error creating subscription. Please try again.");
        }
    }

    function showOrdersFor(relayId: string) {
        return showOrders[relayId] === true;
    }
    
    function toggleShowOrders(relayId: string) {
        if (showOrdersFor(relayId)) {
            setShowOrders((prevShowOrders) => ({ ...prevShowOrders, [relayId]: false }));
        } else {
            setShowOrders((prevShowOrders) => ({ ...prevShowOrders, [relayId]: true }));
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

    // Check if user has premium subscriptions and no NIP-05s
    function checkPremiumBenefitEligibility() {
        if (!session?.user?.name) return { hasPremium: false, hasNoNip05: false, premiumDomains: [] };
        
        const premiumRelays = props.RelayClientOrders.filter((relay: any) => {
            const mostRecentPlan = getUserMostRecentPlan(relay);
            return mostRecentPlan === 'premium';
        });
        
        const premiumDomains = premiumRelays.map((relay: any) => `${relay.relayName}.${relay.relayDomain}`);
        
        // For now, we'll assume user has no NIP-05 if they're seeing this notification
        // In a real implementation, you'd check the user's NIP-05 status from the database
        const hasNoNip05 = true; // This would be determined by checking user's NIP-05 records
        
        return {
            hasPremium: premiumRelays.length > 0,
            hasNoNip05: hasNoNip05,
            premiumDomains: premiumDomains
        };
    }
    
    const premiumBenefitStatus = checkPremiumBenefitEligibility();

    // Function to render the first-time subscription form
    const renderFirstTimeSubscription = (relay: any) => {
        return (
            <div key="firsttimeSub" className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden mt-6">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
                        Subscribe to {relay.relayName}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                        Get started with your subscription to {relay.relayName}. Choose your plan below.
                    </p>
                    
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6 border border-slate-200 dark:border-slate-600 mb-6">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                            Select Your Plan
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="border rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all">
                                <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Standard Plan</h4>
                                <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">Basic relay access with standard features</p>
                                <div className="text-2xl font-bold text-primary mb-4">{relay.paymentAmount} sats/month</div>
                                <button
                                    className="btn btn-primary w-full"
                                    onClick={() => createNewSubscription(relay, 'standard')}
                                >
                                    Select Standard
                                </button>
                            </div>
                            
                            <div className="border rounded-lg p-6 hover:border-secondary hover:shadow-lg transition-all">
                                <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Premium Plan</h4>
                                <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">Enhanced features and priority access</p>
                                <div className="text-2xl font-bold text-secondary mb-4">{relay.paymentPremiumAmount} sats/month</div>
                                <button
                                    className="btn btn-secondary w-full"
                                    onClick={() => createNewSubscription(relay, 'premium')}
                                >
                                    Select Premium
                                </button>
                            </div>
                        </div>
                        
                        <div className="mt-6">
                            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                Or enter a custom amount:
                            </h4>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="number"
                                    className="input input-bordered flex-1"
                                    placeholder="Amount in sats"
                                    value={clientAmount}
                                    onChange={(e) => setClientAmount(e.target.value)}
                                />
                                <button 
                                    className="btn btn-primary whitespace-nowrap"
                                    onClick={() => createNewSubscription(relay, 'custom', clientAmount)}
                                >
                                    Pay Custom Amount
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Filter relays based on rewritten subdomain if present
    let filteredRelays = props.RelayClientOrders;
    let isFiltered = false;
    let subdomainName: string | null = null;
    let matchingRelays: any[] = [];
    
    if (props.rewrittenSubdomain) {
        // Extract subdomain from full hostname (e.g., "myrelay.relay.tools" -> "myrelay")
        subdomainName = props.rewrittenSubdomain.split('.')[0];
        
        console.log('Full rewritten hostname:', props.rewrittenSubdomain);
        console.log('Extracted subdomain:', subdomainName);
        console.log('Available relays:', props.RelayClientOrders.map((r: any) => r.relayName));
        
        matchingRelays = props.RelayClientOrders.filter((relay: any) => 
            relay.relayName.toLowerCase() === subdomainName!.toLowerCase()
        );
        
        // Set isFiltered based on whether we're filtering by subdomain
        isFiltered = true;
        
        // Only filter if we found matching relays, otherwise show all (but keep isFiltered = true)
        if (matchingRelays.length > 0) {
            filteredRelays = matchingRelays;
        } else {
            console.log('No matching relays found for subdomain:', subdomainName);
        }
    }

    const sortedRelays = filteredRelays.sort((a: any, b: any) => {
        return a.relayName.localeCompare(b.relayName);
    });
     console.log(props.RelayClientOrders)

    return (
        <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-center gap-4 mb-6 px-2">
                    <a 
                        href="/#"
                        className="btn btn-ghost btn-sm"
                    >
                        ← Back to {subdomainName || "/"}
                    </a>
                    <h1 className="text-2xl sm:text-3xl font-bold"></h1>
                </div>
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

                {showNewOrder && newOrderRelay && renderFirstTimeSubscription(newOrderRelay)}

                <div className="grid grid-cols-1 gap-6">
                    {sortedRelays.map((relay: any) => {
                        // Check if banner_image exists and is not empty
                        const bannerImage = relay.banner_image && relay.banner_image.trim() !== '' ? 
                            relay.banner_image : null;
                        
                        // Use profile image if available, otherwise use banner image for the circular display
                        const profileImage = relay.profile_image && relay.profile_image.trim() !== '' ?
                            relay.profile_image : (bannerImage || '/green-check.png');
                            
                        // If this is a relay that needs initial subscription, render the first-time subscription form
                        if (relay.needsInitialSubscription) {
                            return renderFirstTimeSubscription(relay);
                        }

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


                {/* Premium Benefit Notification */}
                {premiumBenefitStatus.hasPremium && premiumBenefitStatus.hasNoNip05 && (
                    <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl shadow-lg p-6 mb-6 text-white">
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-2">🎉 Premium Benefit Available!</h3>
                                <p className="text-white/90 mb-3">
                                    You have premium subscriptions and can create <strong>free NIP-05 identities</strong> on these relays:
                                </p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {premiumBenefitStatus.premiumDomains.map((domain: string, index: number) => (
                                        <span key={index} className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                                            {domain}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-white/80 text-sm">
                                    💡 <strong>Tip:</strong> Click "Manage NIP-05" below to set up your free identity!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

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
