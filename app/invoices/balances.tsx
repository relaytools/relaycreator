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
    // const lnurl = (provided by your application backend)
    try {
        await (window as any).webln.enable();
        const result = await (window as any).webln.sendPayment(lnurl); // promise resolves once the LNURL process is finished
    } catch (error) {
        console.log("something went wrong with webln: " + error);
    }
}

export default function Balances(
    props: React.PropsWithChildren<{
        RelayBalances: any;
        IsAdmin: boolean;
    }>
) {
    const router = useRouter();
    const [showOrders, setShowOrders] = useState("");

    async function getTopUpInvoice(b: any) {
        const response = await fetch(
            `/api/invoices?relayname=${b.relayName}&topup=true`
        );
        const responseJson = await response.json();
        console.log(responseJson);

        if (response.ok) {
            router.push(
                `/invoices?relayname=${b.relayName}&order_id=${responseJson.order_id}&pubkey=unknown`
            );
        }
    }

    function showOrdersFor(b: any) {
        if (showOrders === b) {
            return true;
        }
        return false;
    }

    //const sortedRelays = props.RelayBalances.sort((a: any, b: any) => a.owner.localeCompare(b.owner));
    const sortedRelays = props.RelayBalances.sort((a: any, b: any) => {
        const ownerComparison = a.owner.localeCompare(b.owner);
        return ownerComparison !== 0 ? ownerComparison : a.balance - b.balance;
    });

    function amountPrecision(amount: number) {
        return Math.round(amount);
    }

    return (
        <div>
            <h1>Balances</h1>
            <div className="mt-4 font-jetbrains">
                {sortedRelays.map((b: any) => (
                    <div
                        key={b.relayId + "rowkey"}
                        className="flex flex-col border mb-4 bg-gradient-to-r from-accent to-base-100 p-4 "
                    >
                        <div className="flex">
                            <div className="w-1/2 border-b">Relay Name</div>
                            <div className="w-1/2 border-b text-lg">{b.relayName}</div>
                        </div>
                        <div className="flex">
                            <div className="w-1/2">Relay Status</div>
                            <div className="w-1/2">{b.relayStatus}</div>
                        </div>
                        <div className="flex">
                            <div className="w-1/2">Paid Relay Bonus</div>
                            <div className="w-1/2">{b.clientPayments} sats</div>
                        </div>
                        <div className="flex">
                            <div className="w-1/2">Remaining Balance</div>
                            <div className="w-1/2">
                                {amountPrecision(b.balance)} sats
                            </div>
                        </div>
                        <div className="flex">
                            {props.IsAdmin && (
                                <div className="w-1/2">Owner (pubkey)</div>
                            )}
                            {props.IsAdmin && (
                                <div className="w-1/2">{nip19.npubEncode(b.owner)}</div>
                            )}
                        </div>
                        <div className="flex mt-4">
                            <button
                                className="mr-2 btn btn-secondary"
                                onClick={() => setShowOrders(b.relayId)}
                            >
                                show orders
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => getTopUpInvoice(b)}
                            >
                                top up
                            </button>
                        </div>

                        {showOrdersFor(b.relayId) &&
                            b.unpaidOrders.map((order: any) => (
                                <div key={order.id + "colkey"} className="flex-col border">
                                    <div className="flex">
                                    <div className="w-1/3 mr-2">
                                        Pending Order
                                    </div>
                                    <div className="w-1/3 mr-2">
                                        {order.amount} sats
                                    </div>
                                    <a
                                        className="btn btn-secondary"
                                        href={`/invoices?relayname=${b.relayName}&pubkey=${b.pubkey}&order_id=${order.id}`}
                                    >
                                        show
                                    </a>
                                    </div>
                                    <div className="flex">
                                        <div className="w-1/2 mr-2 text-lg">
                                            {b.relayName}
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="w-1/2">Expires At</div>
                                        <div className="w-1/2">
                                            {order.expires_at
                                                ? new Date(
                                                      order.expires_at
                                                  ).toLocaleString()
                                                : ""}
                                        </div>
                                    </div>
                                </div>
                            ))}

                        {showOrdersFor(b.relayId) &&
                            b.orders.map((order: any) => (
                                <div
                                    key={order.id + "colkey"}
                                    className="flex flex-col border"
                                >
                                    <div className="flex">
                                        <div className="w-1/2 mr-2">
                                            Paid Order
                                        </div>
                                        <div className="w-1/2 mr-2">
                                            {amountPrecision(order.amount)} sats
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="w-1/2 mr-2 text-lg">
                                            {b.relayName}
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="w-1/2">Paid At</div>
                                        <div className="w-1/2">
                                            {order.paid_at
                                                ? new Date(
                                                      order.paid_at
                                                  ).toLocaleString()
                                                : ""}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
