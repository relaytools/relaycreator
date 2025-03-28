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
        RelayPaymentAmount: any;
    }>
) {
    const router = useRouter();
    const [showOrders, setShowOrders] = useState("");

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
        let x = Math.round(amount)
        return x;
    }

    function showBalance(balance: any) {
        let useBalance = 0
        if(balance < 0) {
            useBalance = Math.abs(amountPrecision(balance))
        } else {
            useBalance = 0
        }
        return useBalance.toString()
    }

    return (
        <div>
            <article className="prose">
                <h4>Welcome to the billing system!</h4>
                <p>If a balance is due, it will show as a negative balance.  It is appreciated that you keep your balance above zero.</p>
                <p>If there is a failure to pay the balance after 30 days, the relay will be paused temporarily and you can unpause by topping up.</p>
                <p>The balances are calculated hourly, based on a 30 day averge.</p>
            </article>
            <h1 className="text-lg mt-2">Balances</h1>
            <div className="mt-4">
                {sortedRelays.map((b: any) => (
                    <div
                        key={b.relayId + "rowkey"}
                        className="flex flex-col border mb-4 bg-linear-to-r from-accent to-base-100 p-4 "
                    >
                        <div className="flex">
                            <div className="w-1/2 border-b">Relay Name</div>
                            <div className="w-1/2 border-b text-lg">{b.relayName}</div>
                        </div>
                        {props.IsAdmin && 
                        <div className="flex">
                            <div className="w-1/2">Relay ID</div>
                            <div className="w-1/2">{b.relayId}</div>
                        </div>
                        }
                        <div className="flex">
                            <div className="w-1/2">Relay Status</div>
                            <div className="w-1/2">{b.relayStatus}</div>
                        </div>
                        <div className="flex">
                            <div className="w-1/2">Paid Relay Bonus</div>
                            <div className="w-1/2">{b.clientPayments} sats</div>
                        </div>
                        <div className="flex">
                            {b.balance < 0 &&
                                <div className="w-1/2">Balance<br></br><div className="text-warning">please top up</div></div>
                            }

                            {b.balance > 0 &&
                                <div className="w-1/2">Remaining Balance</div>
                            }
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
                        </div>
                        <div className="text-sm text-info mt-2">You can create an invoice for any amount</div>
                        <div className="text-sm text-info mt-2">Current price: {props.RelayPaymentAmount} sats/mo</div>
                        <div className="flex mt-2">
                            <input
                                type="text"
                                name="satsamount"
                                className="input input-bordered input-primary w-full max-w-xs"
                                placeholder={showBalance(b.balance)}
                                onChange={event => {useAmount = event.target.value}}
                            />
                            <label className="label">sats</label>
                            <button
                                className="btn uppercase btn-secondary"
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
                                        className="btn uppercase btn-secondary"
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
                                        {order.paid_at != null && (
                                            <div className="w-1/2">
                                                {new Date(
                                                    order.paid_at
                                                ).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
