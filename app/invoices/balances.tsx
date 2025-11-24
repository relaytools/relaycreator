"use client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Bolt11Invoice from "../components/invoice";
import BatchedProfileDisplay from "../components/batchedProfileDisplay";
import { FaCopy, FaCheck } from "react-icons/fa";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { nip19 } from "nostr-tools";

// Format date consistently using UTC to avoid hydration errors
// This shows dates in UTC timezone for consistency between server and client
// If you need local timezone, format dates only on client side after hydration
function formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    // Use UTC methods to ensure server and client render the same output
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

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

export default function Balances(
    props: React.PropsWithChildren<{
        RelayBalances: any;
        IsAdmin: boolean;
        RelayPaymentAmount: {
            standard: number;
            premium: number;
        };
    }>
) {
    const router = useRouter();
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<{[key: string]: string}>({});
    const [selectedPlanByRelay, setSelectedPlanByRelay] = useState<{[key: string]: string}>({});
    const [expandedClients, setExpandedClients] = useState<{ [relayId: string]: Record<string, boolean> }>({});
    const [copiedClientKey, setCopiedClientKey] = useState<string>("");
    let useAmount = "";

    // Function to get current plan from relay data
    function getCurrentPlan(relay: any): string {
        if (relay.RelayPlanChange && relay.RelayPlanChange.length > 0) {
            // Find the current active plan (no ended_at date)
            const currentPlan = relay.RelayPlanChange.find((plan: any) => !plan.ended_at);
            if (currentPlan) {
                return currentPlan.plan_type;
            }
        }
        return "standard"; // Default fallback
    }

    // Set default plan selection based on current plan for each relay
    useEffect(() => {
        if (props.RelayBalances && props.RelayBalances.length > 0) {
            const firstRelay = props.RelayBalances[0];
            console.log('Debug - Full relay object:', firstRelay);
            console.log('Debug - RelayPlanChange data:', firstRelay.RelayPlanChange);
            
            if (firstRelay.RelayPlanChange && firstRelay.RelayPlanChange.length > 0) {
                console.log('Debug - Plan change entries:', firstRelay.RelayPlanChange.map((p: any) => ({
                    plan_type: p.plan_type,
                    ended_at: p.ended_at,
                    started_at: p.started_at
                })));
            } else {
                console.log('Debug - No RelayPlanChange data found');
            }
            
            const currentPlan = getCurrentPlan(firstRelay);
            console.log('Debug - Current plan detected:', currentPlan);
            setSelectedPlanByRelay(prev => ({ ...prev, [firstRelay.relayId]: currentPlan }));
        }
    }, [props.RelayBalances]);

    async function getTopUpInvoice(b: any, planType?: string) {
        const plan = planType || getSelectedPlan(b);
        let amount = useAmount;
        
        // If no custom amount specified, use plan defaults
        if (!amount || amount === "") {
            if (plan === "premium") {
                amount = props.RelayPaymentAmount.premium?.toString() || "2100";
            } else {
                amount = Math.abs(amountPrecision(b.balance)).toString();
            }
        }
        
        const response = await fetch(
            `/api/invoices?relayname=${b.relayName}&topup=true&sats=${amount}&plan=${plan}`
        );
        const responseJson = await response.json();
        console.log(responseJson);

        if (response.ok) {
            // Get the actual pubkey from session instead of hardcoding "unknown"
            const userPubkey = (session as any)?.user?.name || "unknown";
            
            router.push(
                `/invoices?relayname=${b.relayName}&order_id=${responseJson.order_id}&pubkey=${userPubkey}&sats=${amount}&plan=${plan}`
            );
        }
    }

    function setActiveTabFor(relayId: string, tab: string) {
        setActiveTab(prev => ({ ...prev, [relayId]: tab }));
    }

    function getActiveTab(relayId: string) {
        return activeTab[relayId] || 'overview';
    }

    function amountPrecision(amount: number) {
        return Math.round(amount);
    }

    function showBalance(balance: number) {
        return Math.round(balance);
    }

    function calculateOutstandingBalance(relay: any) {
        return relay.balance;
    }

    const sortedRelays = props.RelayBalances.sort((a: any, b: any) => {
        return a.relayName.localeCompare(b.relayName);
    });

    // Helper function to get selected plan for a relay
    const getSelectedPlan = (relay: any) => {
        if (selectedPlanByRelay[relay.relayId]) {
            return selectedPlanByRelay[relay.relayId];
        }
        // Default to current plan if available, otherwise "standard"
        const currentPlan = relay.RelayPlanChange?.find((pc: any) => !pc.ended_at);
        return currentPlan ? currentPlan.plan_type : "standard";
    };

    // Helper function to set selected plan for a relay
    const setSelectedPlan = (relayId: string, plan: string) => {
        setSelectedPlanByRelay(prev => ({
            ...prev,
            [relayId]: plan
        }));
    };

    // Toggle expanded state for a client's history within a relay
    const toggleClientExpanded = (relayId: string, clientPubkey: string) => {
        setExpandedClients(prev => {
            const relayMap = prev[relayId] || {};
            return {
                ...prev,
                [relayId]: {
                    ...relayMap,
                    [clientPubkey]: !relayMap[clientPubkey]
                }
            };
        });
    };

    // Helpers to normalize pubkeys that may already be npub-encoded
    const isNpub = (key: string) => typeof key === 'string' && key.startsWith('npub');
    const toHexPubkey = (key: string | null | undefined): string | null => {
        if (!key) return null;
        try {
            if (isNpub(key)) {
                const decoded = nip19.decode(key);
                if (decoded.type === 'npub' && typeof decoded.data === 'string') {
                    return decoded.data;
                }
                // If decode returns bytes-like, handle gracefully
                return typeof decoded.data === 'string' ? decoded.data : null;
            }
            // assume already hex
            return key;
        } catch {
            return null;
        }
    };
    const toNpubDisplay = (key: string | null | undefined): string => {
        if (!key) return 'Unknown';
        try {
            if (isNpub(key)) return key;
            return nip19.npubEncode(key);
        } catch {
            return 'Unknown';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                {props.IsAdmin ? 'Admin - All Relay Finances' : 'Billing and Invoices'}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Overview of relay payments, client subscriptions, and balances
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {sortedRelays.map((relay: any) => {
                        const activeTabForRelay = getActiveTab(relay.relayId);
                        
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
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-600/20 dark:from-green-600/30 dark:to-blue-700/30">
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
                                                <p className="text-slate-300 text-sm">Status: {relay.relayStatus || 'running'}</p>
                                                {props.IsAdmin && (
                                                    <p className="text-slate-400 text-xs mt-1">
                                                        Owner: {nip19.npubEncode(relay.owner).substring(0, 20)}...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    {/* Balance Overview */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                                            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Current Balance</div>
                                            <div className={`text-lg font-bold ${
                                                calculateOutstandingBalance(relay) > 0 ? 
                                                'text-green-600 dark:text-green-400' : 
                                                calculateOutstandingBalance(relay) < 0 ?
                                                'text-red-600 dark:text-red-400' :
                                                'text-slate-600 dark:text-slate-400'
                                            }`}>
                                                {showBalance(calculateOutstandingBalance(relay))} sats
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                                            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Member subscriptions</div>
                                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                {relay.clientOrderAmount} sats
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                                            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Current Plan</div>
                                            <div className="text-lg font-bold text-slate-600 dark:text-slate-400">
                                                {(() => {
                                                    // Get current plan from RelayPlanChange data
                                                    const currentPlan = relay.RelayPlanChange?.find((pc: any) => !pc.ended_at);
                                                    if (currentPlan) {
                                                        const planType = currentPlan.plan_type.charAt(0).toUpperCase() + currentPlan.plan_type.slice(1);
                                                        // Use current environment variable pricing instead of historical amount_paid
                                                        const currentAmount = currentPlan.plan_type === 'premium' 
                                                            ? props.RelayPaymentAmount.premium 
                                                            : props.RelayPaymentAmount.standard;
                                                        return `${planType} - ${currentAmount} sats/mo`;
                                                    }
                                                    // Fallback to standard plan with current pricing
                                                    return `Standard - ${props.RelayPaymentAmount.standard} sats/mo`;
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tab Navigation */}
                                    <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                                        <nav className="flex space-x-8">
                                            <button
                                                onClick={() => setActiveTabFor(relay.relayId, 'overview')}
                                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                                    activeTabForRelay === 'overview'
                                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                                }`}
                                            >
                                                Overview
                                            </button>
                                            <button
                                                onClick={() => setActiveTabFor(relay.relayId, 'relay-payments')}
                                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                                    activeTabForRelay === 'relay-payments'
                                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                                }`}
                                            >
                                                Relay Payments ({relay.orders?.length || 0})
                                            </button>
                                            <button
                                                onClick={() => setActiveTabFor(relay.relayId, 'client-orders')}
                                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                                    activeTabForRelay === 'client-orders'
                                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                                }`}
                                            >
                                                Member Subscriptions ({relay.clientOrderGroups?.length || 0})
                                            </button>
                                        </nav>
                                    </div>

                                    {/* Tab Content */}
                                    {activeTabForRelay === 'overview' && (
                                        <div className="space-y-6">
                                            {/* Top Up Section */}
                                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                                                    Add Funds
                                                </h3>
                                                <p className="text-slate-600 dark:text-slate-400 mb-4">
                                                    Create an invoice to add funds to your relay balance
                                                </p>
                                                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                                    <select
                                                        className="select select-primary w-full sm:w-auto"
                                                        value={getSelectedPlan(relay)}
                                                        onChange={event => setSelectedPlan(relay.relayId, event.target.value)}
                                                    >
                                                        <option value="standard">Standard</option>
                                                        <option value="premium">Premium</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        name="satsamount"
                                                        className="input input-primary w-full sm:flex-1"
                                                        placeholder={(() => {
                                                            // Get selected plan from dropdown (reactive to changes)
                                                            const selectedPlan = getSelectedPlan(relay);
                                                            
                                                            // Use current environment variable pricing, not historical amounts
                                                            const currentPlanCost = selectedPlan === "premium" 
                                                                ? props.RelayPaymentAmount.premium 
                                                                : props.RelayPaymentAmount.standard;
                                                            
                                                            const currentBalance = showBalance(calculateOutstandingBalance(relay));
                                                            
                                                            // If balance is negative (debt), suggest debt + monthly plan cost
                                                            if (currentBalance < 0) {
                                                                return (Math.abs(currentBalance) + currentPlanCost).toString();
                                                            }
                                                            // If balance is positive or zero, suggest monthly plan cost
                                                            else {
                                                                return currentPlanCost.toString();
                                                            }
                                                        })()}
                                                        onChange={event => {useAmount = event.target.value}}
                                                    />
                                                    <span className="hidden sm:flex items-center text-sm text-slate-600 dark:text-slate-400 px-2">sats</span>
                                                    <button
                                                        className="btn btn-primary w-full sm:w-auto"
                                                        onClick={() => getTopUpInvoice(relay, getSelectedPlan(relay))}
                                                    >
                                                        Create Invoice
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {activeTabForRelay === 'relay-payments' && (
                                        <div className="space-y-4">
                                            {relay.unpaidOrders && relay.unpaidOrders.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Pending Payments</h3>
                                                    <div className="space-y-2">
                                                        {relay.unpaidOrders.map((order: any) => (
                                                            <div key={order.id} className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <div className="font-medium text-yellow-800 dark:text-yellow-200">
                                                                            {order.amount} sats - Pending Payment
                                                                        </div>
                                                                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                                                            Expires: {order.expires_at ? formatDate(order.expires_at) : 'No expiration'}
                                                                        </div>
                                                                    </div>
                                                                    <a
                                                                        className="btn btn-sm btn-warning"
                                                                        href={`/invoices?relayname=${relay.relayName}&pubkey=${relay.owner}&order_id=${order.id}`}
                                                                    >
                                                                        Pay Now
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {relay.orders && relay.orders.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Payment History</h3>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                                            <thead className="bg-slate-50 dark:bg-slate-700">
                                                                <tr>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                                                {relay.orders.map((order: any) => (
                                                                    <tr key={order.id}>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                                                            {amountPrecision(order.amount)} sats
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                                            {order.paid_at ? formatDate(order.paid_at) : 'Not paid'}
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                                Paid
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {(!relay.orders || relay.orders.length === 0) && (!relay.unpaidOrders || relay.unpaidOrders.length === 0) && (
                                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                                    No relay payments found
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTabForRelay === 'client-orders' && (
                                        <div className="space-y-4">
                                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Member Subscriptions</h3>
                                                <p className="text-green-700 dark:text-green-300 text-sm">
                                                    Total revenue from client subscriptions: <strong>{relay.clientOrderAmount} sats</strong>
                                                </p>
                                                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                                                    {relay.clientOrderGroups?.length || 0} members. Click a member to view their paid order history.
                                                </p>
                                            </div>

                                            {relay.clientOrderGroups && relay.clientOrderGroups.length > 0 ? (
                                                <BatchedProfileDisplay
                                                    pubkeys={Array.from(new Set(
                                                        relay.clientOrderGroups
                                                            .map((g: any) => toHexPubkey(g.pubkey))
                                                            .filter((p: string | null) => !!p)
                                                    )) as string[]}
                                                >
                                                    {(profiles, loading) => (
                                                        <div className="space-y-3">
                                                            {relay.clientOrderGroups.map((group: any) => {
                                                                const originalKey = group.pubkey || 'unknown';
                                                                const hexKey = toHexPubkey(originalKey);
                                                                const prof = hexKey ? profiles.get(hexKey) : undefined;
                                                                const displayName = (prof?.content as any)?.display_name || prof?.content?.name;
                                                                const picture = prof?.content?.picture;
                                                                const npub = toNpubDisplay(hexKey || null);
                                                                const expansionKey = hexKey || originalKey; // fallback to original if decode failed
                                                                const isExpanded = !!(expandedClients[relay.relayId]?.[expansionKey]);
                                                                const balance = group.balance ?? 0;
                                                                return (
                                                                    <div key={`${relay.relayId}-${expansionKey}`} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                                        <button
                                                                            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                                                                            onClick={() => toggleClientExpanded(relay.relayId, expansionKey)}
                                                                        >
                                                                            <div className="flex items-center gap-3 text-left min-w-0">
                                                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                                                                                    {picture ? (
                                                                                        <img src={picture} alt="avatar" className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <div className="w-full h-full" />
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex flex-col min-w-0">
                                                                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                                                                        {displayName || (npub !== 'Unknown' ? `${npub.substring(0, 20)}...` : 'Unknown client')}
                                                                                    </div>
                                                                                    {npub !== 'Unknown' && (
                                                                                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                                                            <span className="truncate">{npub}</span>
                                                                                            <span
                                                                                                role="button"
                                                                                                tabIndex={0}
                                                                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded cursor-pointer"
                                                                                                title="Copy npub"
                                                                                                onClick={async (e) => {
                                                                                                    e.stopPropagation();
                                                                                                    try {
                                                                                                        await navigator.clipboard.writeText(npub);
                                                                                                        setCopiedClientKey(expansionKey);
                                                                                                        setTimeout(() => setCopiedClientKey(""), 2000);
                                                                                                    } catch (err) {
                                                                                                        console.error("Failed to copy npub:", err);
                                                                                                    }
                                                                                                }}
                                                                                                onKeyDown={async (e) => {
                                                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                                                        e.stopPropagation();
                                                                                                        try {
                                                                                                            await navigator.clipboard.writeText(npub);
                                                                                                            setCopiedClientKey(expansionKey);
                                                                                                            setTimeout(() => setCopiedClientKey(""), 2000);
                                                                                                        } catch (err) {
                                                                                                            console.error("Failed to copy npub:", err);
                                                                                                        }
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                {copiedClientKey === expansionKey ? (
                                                                                                    <FaCheck className="w-3 h-3 text-green-500" />
                                                                                                ) : (
                                                                                                    <FaCopy className="w-3 h-3" />
                                                                                                )}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <span className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                                    balance > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                                                    balance < 0 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                                                    'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'
                                                                                }`}>
                                                                                    Balance: {amountPrecision(balance)} sats
                                                                                </span>
                                                                            </div>
                                                                            <svg className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                                        </button>
                                                                        {isExpanded && (
                                                                            <div className="bg-slate-50 dark:bg-slate-800/60">
                                                                                <div className="overflow-x-auto">
                                                                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                                                                        <thead className="bg-slate-100 dark:bg-slate-700/60">
                                                                                            <tr>
                                                                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Plan</th>
                                                                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                                                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                                                                            {group.paidOrders.map((order: any) => (
                                                                                                <tr key={order.id}>
                                                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                                                            order.order_type === 'premium' ? 
                                                                                                            'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                                                                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                                                                        }`}>
                                                                                                            {order.order_type || 'Standard'}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                                                                                        {amountPrecision(order.amount)} sats
                                                                                                    </td>
                                                                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                                                                        {order.paid_at ? formatDate(order.paid_at) : ''}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </BatchedProfileDisplay>
                                            ) : (
                                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                                    <p>No client subscriptions found</p>
                                                    <p className="text-sm mt-2">When clients subscribe to your relay, they'll appear here grouped by pubkey</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
