"use client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Bolt11Invoice from "../components/invoice";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { nip19 } from "nostr-tools";
import Nip05Orders from "../nip05/nip05Orders";

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
        nip05Orders?: any[];
        otherNip05Orders?: any[];
        domains?: string[];
    }>
) {
    const router = useRouter();
    const [showOrders, setShowOrders] = useState("");
    const [clientAmount, setClientAmount] = useState("");
    const [showNip05, setShowNip05] = useState(false);
    const { data: session } = useSession();

    async function renewSubscription(relay: any) {
        if (!session || !session.user?.name) {
            alert("Please login to renew your subscription");
            return;
        }

        let useAmount = clientAmount;
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

    const sortedRelays = props.RelayClientOrders.sort((a: any, b: any) => {
        return a.relayName.localeCompare(b.relayName);
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Relay Subscriptions</h2>
                            <p className="text-slate-600 dark:text-slate-400">View and manage your subscriptions to Nostr relays.</p>
                            <p className="text-slate-600 dark:text-slate-400">You can see all your paid and pending relay subscriptions here.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {sortedRelays.map((relay: any) => (
                        <div
                            key={relay.relayId + "rowkey"}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow duration-300"
                        >
                            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-6 border-b border-slate-200 dark:border-slate-600">
                                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">{relay.relayName}</h2>
                            </div>
                            
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Subscription Amount</div>
                                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{relay.paymentAmount} sats/month</div>
                                    </div>
                                    
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Outstanding Balance</div>
                                        <div className={`text-lg font-bold ${calculateOutstandingBalance(relay) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            {calculateOutstandingBalance(relay) > 0 ? 
                                                `${calculateOutstandingBalance(relay)} sats due` : 
                                                calculateOutstandingBalance(relay) < 0 ? 
                                                    `${Math.abs(calculateOutstandingBalance(relay))} sats credit` : 
                                                    'Paid in full'}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end mb-4">
                                    <button
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                                        onClick={() => toggleShowOrders(relay.relayId)}
                                    >
                                        {showOrdersFor(relay.relayId) ? "Hide Payment History" : "Show Payment History"}
                                    </button>
                                </div>

                                {showOrdersFor(relay.relayId) && relay.orders && relay.orders.length > 0 && (
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600 mb-6">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Payment History</h3>
                                        <div className="overflow-x-auto">
                                            <table className="table-auto w-full">
                                                <thead>
                                                    <tr>
                                                        <th className="px-4 py-2">Amount</th>
                                                        <th className="px-4 py-2">Paid At</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {relay.orders.map((order: any) => (
                                                        <tr key={order.id + "paid"}>
                                                            <td className="px-4 py-2">{amountPrecision(order.amount)} sats</td>
                                                            <td className="px-4 py-2">
                                                                {order.paid_at != null
                                                                    ? new Date(order.paid_at).toLocaleString()
                                                                    : ""}
                                                            </td>
                                                        </tr>
                                                    ))}
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
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
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
                                                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                                    Amount (sats)
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder={relay.paymentAmount.toString()}
                                                        onChange={(e) => setClientAmount(e.target.value)}
                                                    />
                                                    <button
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                                                        onClick={() => renewSubscription(relay)}
                                                    >
                                                        Renew Subscription
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <details className="group">
                        <summary className="flex justify-between items-center cursor-pointer p-6 text-lg font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                </div>
                                NIP-05 Orders
                            </div>
                            <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <div className="p-6">
                            {props.nip05Orders && props.domains && (
                                <Nip05Orders 
                                    user={{} as any}
                                    myNip05={props.nip05Orders || []} 
                                    otherNip05={props.otherNip05Orders || []} 
                                    domains={props.domains || []} 
                                />
                            )}
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
}
