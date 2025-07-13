"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { nip19 } from "nostr-tools";
import NDK, { NDKEvent, NDKNip07Signer, NDKPublishError, NDKRelay, NDKRelayAuthPolicies, NDKAuthPolicy, NDKRelaySet, NDKSubscription } from "@nostr-dev-kit/ndk";
import { getRelayListForUser, getRelayListForUsers } from "@nostr-dev-kit/ndk";

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

const ndk = new NDK({
 //   signer: nip07signer,
    autoConnectUserRelays: false,
    enableOutboxModel: false,
});

const ndkPool = ndk.pool;

export default function AdminInvoices(
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
    const [showOrders, setShowOrders] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [balanceDueFilter, setBalanceDueFilter] = useState("all");

    let useAmount = "";

    // Helper function to check if balance is in range
    const isBalanceInRange = (balance: number, range: string) => {
        const payment = props.RelayPaymentAmount.standard;
        switch(range) {
            case "good":
                return balance > payment * -1;
            case "30d overdue":
                return balance <= (payment * -2);
            case "60d+ overdue":
                return balance <= (payment * -3);
            default:
                return true;
        }
    }

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

    const handleUserNotification = async(relayBalance: any, notifyType: string) => {
        // handle user notification
        const nip07signer = new NDKNip07Signer();
        const activeUser = await nip07signer.blockUntilReady();
        ndk.signer = nip07signer;
        ndk.addExplicitRelay("wss://purplepag.es");
        ndk.addExplicitRelay("wss://nostr21.com");
        ndk.addExplicitRelay("wss://relay.damus.io");
        ndk.addExplicitRelay("wss://nos.lol");
        ndk.addExplicitRelay("wss://relay.nostr.band");
        const specialRelay = ndk.addExplicitRelay("wss://" + relayBalance.relayName + "." + relayBalance.relayDomain);
        const recipient = ndk.getUser({pubkey: relayBalance.owner});
        console.log("getting recipient profile")
        await recipient.fetchProfile();
        console.log("got recipient profile")
        console.log("getting relay list for recipient", recipient)
        let relayList = await getRelayListForUser(recipient.pubkey, ndk);
        const recipientProfile = recipient.profile;
        const newEvent = new NDKEvent(ndk);
        newEvent.kind = 4;
        let recipientName = "";
        if (recipientProfile && recipientProfile.name) {
            recipientName = recipientProfile.name;
        }

        if(notifyType == "pause") {
            newEvent.content = "Hello " + "nostr:" + nip19.npubEncode(relayBalance.owner) + " Your relay has been paused for non-payment.  Please visit https://relay.tools/invoices to top up your balance and resume service.  Your relay data is still available, but may be deleted if left paused for too long.  Contact me for more details.";
        } else if(notifyType == "notify" ) {
            newEvent.content = "Hello " + "nostr:" + nip19.npubEncode(relayBalance.owner) + " Please visit https://relay.tools/invoices to top up your balance.";
        }

        newEvent.tag(recipient, "mention");

        await newEvent.encrypt();

        ndk.on("event:publish-failed", (event: NDKEvent, error: NDKPublishError, relays: any) => {
            console.log("event publish failed", event, error);
            console.log("event publish failed to send to all relays:", relays);
        });

        //relayList.relaySet.addRelay(new NDKRelay("wss://" + relayBalance.relayName + "." + relayBalance.relayDomain));
        const newSet = relayList.relaySet;
        newSet.addRelay(specialRelay);
        const howMany = newSet.size;
        const publishedTo = await newEvent.publish(newSet, 10000, howMany);
        console.log("event was published to: ", publishedTo);
    }

    const handlePauseRelay = async(relayBalance: any) => {
        // pause relay call to api
        const response = await fetch(`/api/relay/${relayBalance.relayId}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "status": "paused" })
        })
        await handleUserNotification(relayBalance, "pause");
    }

    const handleNotifyUser = async(b: any) => {
        handleUserNotification(b, "notify");
    }

    // Update the sortedRelays definition
    const sortedRelays = props.RelayBalances
        .filter((relayBalance: any) => {
            // Status filter
            const statusMatch = statusFilter === "all" ? true : relayBalance.relayStatus === statusFilter;
            
            // Balance range filter
            const balanceMatch = balanceDueFilter === "all" ? true : isBalanceInRange(relayBalance.balance, balanceDueFilter);
            
            return statusMatch && balanceMatch;
        })
        .sort((a: any, b: any) => {
            const ownerComparison = a.owner.localeCompare(b.owner);
            return ownerComparison !== 0 ? ownerComparison : a.balance - b.balance;
        });

    function amountPrecision(amount: number) {
        let x = Math.round(amount)
        return x;
    }

    return (
        <div>
            <h1>SUPER ADMIN - Balances</h1>
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                    <select 
                        className="select select-bordered w-full max-w-xs"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="running">Running</option>
                        <option value="paused">Paused</option>
                    </select>
                    <select 
                        className="select select-bordered w-full max-w-xs"
                        value={balanceDueFilter}
                        onChange={(e) => setBalanceDueFilter(e.target.value)}
                    >
                        <option value="all">All Balances</option>
                        <option value="good">Balance is in good standing</option>
                        <option value="30d overdue">Balance 30d overdue</option>
                        <option value="60d overdue">Balance 60d overdue</option>
                    </select>
                </div>
            </div>
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
                            <div className="w-1/2"><a href={process.env.NEXT_PUBLIC_ROOT_DOMAIN + "/curator/?relay_id=" + b.relayId} className="link-primary link-hover">{b.relayId}</a></div>
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
                                <div className="w-1/2"><a href={"https://njump.me/" + nip19.npubEncode(b.owner)} className="link-secondary link-hover">{nip19.npubEncode(b.owner)}</a></div>
                            )}
                        </div>
                        <div className="flex">
                        <div className="mt-4">
                            <button
                                className="mr-2 btn btn-secondary"
                                onClick={() => setShowOrders(b.relayId)}
                            >
                                show orders
                            </button>
                        </div>
                        <div className="mt-4">
                            <button
                                className="mr-2 btn btn-secondary"
                                onClick={(e) => handleNotifyUser(b)}
                            >
                            Send Balance Notify
                            </button>
                        </div>
                        <div className="mt-4">
                            <button
                                className="mr-2 btn btn-secondary"
                                onClick={(e) => handlePauseRelay(b)}
                            >
                            Pause relay and send Notify
                            </button>
                        </div>
                        </div>
                        
                        <div className="flex mt-4">
                            <input
                                type="text"
                                name="satsamount"
                                className="input input-bordered input-primary w-full max-w-xs"
                                placeholder={Math.abs(amountPrecision(b.balance)).toString()}
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
