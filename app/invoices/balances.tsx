"use client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Bolt11Invoice from "../components/invoice";
import { use, useState } from "react";
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

export default function Balances(
    props: React.PropsWithChildren<{
        RelayBalances: any;
        IsAdmin: boolean;
        RelayPaymentAmount: any;
    }>
) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<{[key: string]: string}>({});

    let useAmount = "";

    async function getTopUpInvoice(b: any) {
        if(useAmount == "") {
          useAmount = Math.abs(amountPrecision(b.balance)).toString()
        }
        const response = await fetch(
            `/api/invoices?relayname=${b.relayName}&topup=true&sats=${useAmount}`
        );
        const responseJson = await response.json();
        console.log(responseJson);

        if (response.ok) {
            router.push(
                `/invoices?relayname=${b.relayName}&order_id=${responseJson.order_id}&pubkey=unknown&sats=${useAmount}`
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
                                            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Client Revenue</div>
                                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                {relay.clientOrderAmount} sats
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                                            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Monthly Cost</div>
                                            <div className="text-lg font-bold text-slate-600 dark:text-slate-400">
                                                {props.RelayPaymentAmount} sats/mo
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
                                                Client Subscriptions
                                            </button>
                                        </nav>
                                    </div>

                                    {/* Tab Content */}
                                    {activeTabForRelay === 'overview' && (
                                        <div className="space-y-4">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Top Up Relay Balance</h3>
                                                <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                                                    Create an invoice to add funds to your relay balance
                                                </p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        name="satsamount"
                                                        className="input input-bordered input-primary flex-1 max-w-xs"
                                                        placeholder={Math.abs(showBalance(relay.balance)).toString()}
                                                        onChange={event => {useAmount = event.target.value}}
                                                    />
                                                    <span className="flex items-center text-sm text-slate-600 dark:text-slate-400 px-2">sats</span>
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => getTopUpInvoice(relay)}
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
                                                                            Expires: {order.expires_at ? new Date(order.expires_at).toLocaleString() : 'No expiration'}
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
                                                                            {order.paid_at ? new Date(order.paid_at).toLocaleString() : 'Not paid'}
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
                                                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Client Revenue Summary</h3>
                                                <p className="text-green-700 dark:text-green-300 text-sm">
                                                    Total revenue from client subscriptions: <strong>{relay.clientOrderAmount} sats</strong>
                                                </p>
                                            </div>
                                            
                                            {relay.unpaidClientOrders && relay.unpaidClientOrders.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Pending Client Payments</h3>
                                                    <div className="space-y-2">
                                                        {relay.unpaidClientOrders.map((order: any) => (
                                                            <div key={order.id} className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <div className="font-medium text-yellow-800 dark:text-yellow-200">
                                                                            {order.amount} sats - {order.order_type || 'Standard'} Plan
                                                                        </div>
                                                                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                                                            Client: {order.user?.pubkey ? nip19.npubEncode(order.user.pubkey).substring(0, 20) + '...' : 'Unknown'}
                                                                        </div>
                                                                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                                                            Expires: {order.expires_at ? new Date(order.expires_at).toLocaleString() : 'No expiration'}
                                                                        </div>
                                                                    </div>
                                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                                        Pending
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {relay.clientOrders && relay.clientOrders.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Client Subscription History</h3>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                                            <thead className="bg-slate-50 dark:bg-slate-700">
                                                                <tr>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Plan</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                                                {relay.clientOrders.map((order: any) => (
                                                                    <tr key={order.id}>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                                                            {order.user?.pubkey ? nip19.npubEncode(order.user.pubkey).substring(0, 20) + '...' : 'Unknown'}
                                                                        </td>
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
                                                                            {order.paid_at ? new Date(order.paid_at).toLocaleString() : 'Not paid'}
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
                                            
                                            {(!relay.clientOrders || relay.clientOrders.length === 0) && (!relay.unpaidClientOrders || relay.unpaidClientOrders.length === 0) && (
                                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                                    <p>No client subscriptions found</p>
                                                    <p className="text-sm mt-2">When clients subscribe to your relay, their payment history will appear here</p>
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
