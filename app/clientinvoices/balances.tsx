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
    }>
) {
    const router = useRouter();
    const [showOrders, setShowOrders] = useState("");
    const [clientAmount, setClientAmount] = useState("");
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
        <div className="container mx-auto px-4 py-6">
            <div className="card bg-base-100 shadow-xl mb-8">
                <div className="card-body">
                    <h2 className="card-title text-2xl">Relay Subscriptions</h2>
                    <p>Here you can view and manage your subscriptions to Nostr relays.</p>
                    <p>You can see all your paid and pending relay subscriptions.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {sortedRelays.map((relay: any) => (
                    <div
                        key={relay.relayId + "rowkey"}
                        className="card bg-base-200 shadow-xl overflow-visible"
                    >
                        <div className="card-body">
                            <h2 className="card-title text-xl text-primary">{relay.relayName}</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div className="stats bg-base-300 shadow">
                                    <div className="stat">
                                        <div className="stat-title">Subscription Amount</div>
                                        <div className="stat-value text-lg">{relay.paymentAmount} sats</div>
                                    </div>
                                </div>
                                
                                <div className="stats bg-base-300 shadow">
                                    <div className="stat">
                                        <div className="stat-title">Outstanding Balance</div>
                                        <div className={`stat-value text-lg ${calculateOutstandingBalance(relay) > 0 ? 'text-error' : 'text-success'}`}>
                                            {calculateOutstandingBalance(relay) > 0 ? 
                                                `${calculateOutstandingBalance(relay)} sats due` : 
                                                calculateOutstandingBalance(relay) < 0 ? 
                                                    `${Math.abs(calculateOutstandingBalance(relay))} sats credit` : 
                                                    'Paid in full'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="card-actions justify-end mt-4">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => toggleShowOrders(relay.relayId)}
                                >
                                    {showOrdersFor(relay.relayId) ? "Hide Payment History" : "Show Payment History"}
                                </button>
                            </div>

                            {showOrdersFor(relay.relayId) && relay.orders && relay.orders.length > 0 && (
                                <div className="card bg-base-300 mt-4">
                                    <div className="card-body">
                                        <h3 className="card-title text-lg">Payment History</h3>
                                        <div className="overflow-x-auto">
                                            <table className="table table-zebra w-full">
                                                <thead>
                                                    <tr>
                                                        <th>Amount</th>
                                                        <th>Paid At</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {relay.orders.map((order: any) => (
                                                        <tr key={order.id + "paid"}>
                                                            <td>{amountPrecision(order.amount)} sats</td>
                                                            <td>
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
                                </div>
                            )}

                            {showOrdersFor(relay.relayId) && relay.unpaidOrders && relay.unpaidOrders.length > 0 && (
                                <div className="card bg-base-300 mt-4">
                                    <div className="card-body">
                                        <h3 className="card-title text-lg">Pending Payments</h3>
                                        <div className="divide-y divide-base-content/20">
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
                                                            className="btn btn-sm btn-secondary"
                                                            href={`/clientinvoices?relayid=${relay.id}&pubkey=${order.pubkey}&order_id=${order.id}`}
                                                        >
                                                            Pay Now
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="collapse collapse-arrow bg-base-300 mt-4">
                                <input type="checkbox" /> 
                                <div className="collapse-title text-lg font-medium">
                                    Renew Subscription
                                </div>
                                <div className="collapse-content"> 
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text">Amount (sats)</span>
                                        </label>
                                        <div className="join">
                                            <input
                                                type="text"
                                                className="input input-bordered input-primary join-item w-full"
                                                placeholder={relay.paymentAmount.toString()}
                                                onChange={(e) => setClientAmount(e.target.value)}
                                            />
                                            <button
                                                className="btn btn-secondary join-item"
                                                onClick={() => renewSubscription(relay)}
                                            >
                                                Renew Subscription
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
