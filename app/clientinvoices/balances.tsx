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

    function amountPrecision(amount: number) {
        return Math.round(amount);
    }

    const sortedRelays = props.RelayClientOrders.sort((a: any, b: any) => {
        return a.relayName.localeCompare(b.relayName);
    });

    return (
        <div>
            <article className="prose">
                <h4>My Relay Subscriptions</h4>
                <p>Here you can view and manage your subscriptions to Nostr relays.</p>
                <p>You can see all your paid and pending relay subscriptions.</p>
            </article>
            <h1 className="text-lg mt-2">My Relay Subscriptions</h1>
            <div className="mt-4">
                {sortedRelays.map((relay: any) => (
                    <div
                        key={relay.relayId + "rowkey"}
                        className="text-white flex flex-col border mb-4 bg-linear-to-r from-primary to-neutral p-4"
                    >
                        <div className="flex">
                            <div className="w-1/2 border-b">Relay Name</div>
                            <div className="w-1/2 border-b text-lg text-amber-200">{relay.relayName}</div>
                        </div>
                        <div className="flex text-white">
                            <div className="w-1/2">Relay Status</div>
                            <div className="w-1/2">{relay.relayStatus}</div>
                        </div>
                        <div className="flex">
                            <div className="w-1/2">Payment Required</div>
                            <div className="w-1/2">{relay.paymentRequired ? "Yes" : "No"}</div>
                        </div>
                        <div className="flex">
                            <div className="w-1/2">Subscription Amount</div>
                            <div className="w-1/2">{relay.paymentAmount} sats</div>
                        </div>
                        <div className="flex">
                            <div className="w-1/2">Total Paid</div>
                            <div className="w-1/2">{relay.totalClientPayments} sats</div>
                        </div>
                        <div className="flex mt-4">
                            <button
                                className="mr-2 btn btn-secondary"
                                onClick={() => setShowOrders(relay.relayId)}
                            >
                                show payment history
                            </button>
                        </div>

                        <div className="mt-4 border p-4">
                            <h3 className="text-lg mb-2">Renew Subscription</h3>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center">
                                    <label className="w-1/3">Amount (sats):</label>
                                    <input
                                        type="text"
                                        className="input input-bordered input-primary w-1/3"
                                        placeholder={relay.paymentAmount.toString()}
                                        onChange={(e) => setClientAmount(e.target.value)}
                                    />
                                </div>
                                <button
                                    className="btn uppercase btn-secondary mt-2"
                                    onClick={() => renewSubscription(relay)}
                                >
                                    Renew Subscription
                                </button>
                            </div>
                        </div>

                        {showOrdersFor(relay.relayId) && relay.unpaidOrders && relay.unpaidOrders.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-lg mb-2">Pending Payments</h3>
                                {relay.unpaidOrders.map((order: any) => (
                                    <div key={order.id + "unpaid"} className="flex-col border p-2 mb-2">
                                        <div className="flex">
                                            <div className="w-1/3 mr-2">
                                                Amount
                                            </div>
                                            <div className="w-1/3 mr-2">
                                                {order.amount} sats
                                            </div>
                                            <a
                                                className="btn btn-xs btn-secondary"
                                                href={`/clientinvoices?relayid=${relay.id}&pubkey=${order.pubkey}&order_id=${order.id}`}
                                            >
                                                pay now
                                            </a>
                                        </div>
                                        <div className="flex">
                                            <div className="w-1/3">Expires At</div>
                                            <div className="w-2/3">
                                                {order.expires_at
                                                    ? new Date(order.expires_at).toLocaleString()
                                                    : ""}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showOrdersFor(relay.relayId) && relay.orders && relay.orders.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-lg mb-2">Payment History</h3>
                                {relay.orders.map((order: any) => (
                                    <div
                                        key={order.id + "paid"}
                                        className="flex flex-col border p-2 mb-2"
                                    >
                                        <div className="flex">
                                            <div className="w-1/3 mr-2">
                                                Amount
                                            </div>
                                            <div className="w-2/3 mr-2">
                                                {amountPrecision(order.amount)} sats
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="w-1/3">Paid At</div>
                                            {order.paid_at != null && (
                                                <div className="w-2/3">
                                                    {new Date(order.paid_at).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
