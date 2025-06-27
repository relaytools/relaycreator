import { getServerSession } from "next-auth/next";
import { headers } from "next/headers";
import authOptions from "../../pages/api/auth/[...nextauth]";
import PaymentStatus from "./paymentStatus";
import PaymentSuccess from "./paymentSuccess";
import prisma from "../../lib/prisma";
import ClientBalances from "./balances";
import RelayPayment from "../components/relayPayment";

export const dynamic = "force-dynamic";

export default async function ServerStatus(props: {
    relayname: string|undefined,
    order_id: string|undefined,
    pubkey: string|undefined,
    relayid: string|undefined,
}) {

    const session = await getServerSession(authOptions);
    const headersList = await headers();
    const rewritten = headersList.get('middleware-rewritten');

    const relayname = props.relayname;
    const relayid = props.relayid;
    const pubkey = props.pubkey;
    const order_id = props.order_id;

    // Case 1: User is logged in but no specific order is being viewed
    if (!relayid || !pubkey || !order_id) {
        // Case 1a: User is logged in with a session
        if (session && (session as any).user.name) {
            const userPubkey = (session as any).user.name;
            
            // Find all client orders for the current user (as a client)
            let clientOrders = await prisma.clientOrder.findMany({
                where: {
                    pubkey: userPubkey, // Only include orders where the client is the current user
                },
                include: {
                    relay: {
                        include: {
                            owner: true
                        }
                    },
                },
            });

            // Find relays where the user's pubkey exists in AllowList
            const allowListRelays = await prisma.relay.findMany({
                where: {
                    allow_list: {
                        list_pubkeys: {
                            some: {
                                pubkey: userPubkey
                            }
                        }
                    },
                    OR: [{ status: "running" }, { status: "paused" }, { status: null}],
                },
                include: {
                    owner: true,
                    allow_list: {
                        include: {
                            list_pubkeys: true
                        }
                    }
                }
            });

            // Get unique relay IDs from both client orders and allow list entries
            const clientOrderRelayIds = clientOrders.map(order => order.relayId);
            const allowListRelayIds = allowListRelays.map(relay => relay.id);
            const relayIds = [...new Set([...clientOrderRelayIds, ...allowListRelayIds])];
            
            // Fetch those relays
            let relays = await prisma.relay.findMany({
                where: {
                    id: {
                        in: relayIds
                    },
                    OR: [{ status: "running" }, { status: "paused" }, { status: null}],
                },
                include: {
                    ClientOrder: {
                        where: {
                            pubkey: userPubkey // Only include orders for the current user
                        }
                    },
                    owner: true,
                    allow_list: {
                        include: {
                            list_pubkeys: true
                        }
                    }
                },
            });

            // Group client orders by relay
            const relayClientOrders = relays.map((relay) => {
                const paidOrders = relay.ClientOrder.filter(
                    (order) => order.paid !== false
                );

                const unpaidOrders = relay.ClientOrder.filter(
                    (order) => order.expires_at &&
                    order.expires_at > new Date() &&
                    !order.paid
                );

                const totalAmount = paidOrders.reduce((sum, order) => {
                    return sum + order.amount;
                }, 0);

                // Check if user is in allow list
                const isInAllowList = relay.allow_list?.list_pubkeys?.some(
                    (entry) => entry.pubkey === userPubkey
                ) || false;

                return {
                    owner: relay.owner.pubkey,
                    relayName: relay.name,
                    relayStatus: relay.status,
                    relayId: relay.id,
                    relayDomain: relay.domain,
                    totalClientPayments: totalAmount,
                    orders: paidOrders,
                    unpaidOrders: unpaidOrders,
                    paymentAmount: relay.payment_amount || 21,
                    paymentRequired: relay.payment_required || false,
                    isInAllowList: isInAllowList,
                    banner_image: relay.banner_image,
                    profile_image: relay.profile_image
                };
            });

            return (
                <div>
                    <ClientBalances 
                        IsAdmin={false} 
                        RelayClientOrders={relayClientOrders}
                        rewrittenSubdomain={rewritten}
                    />
                </div>
            );
        } 
        // Case 1b: Has pubkey only - show payment options for all relays with previous orders
        else if(pubkey) {
            // show option to pay with lightning, the payment amount
            // do not show balances, only payment options.
            
            // Find all client orders for this pubkey
            const clientOrders = await prisma.clientOrder.findMany({
                where: {
                    pubkey: pubkey
                },
                include: {
                    relay: {
                        include: {
                            owner: true,
                            allow_list: {
                                include: {
                                    list_pubkeys: true
                                }
                            }
                        }
                    }
                }
            });
            
            // Get unique relays from the orders
            const uniqueRelays = Array.from(
                new Map(clientOrders.map(order => [order.relayId, order.relay])).values()
            );
            
            if (uniqueRelays.length === 0) {
                return (
                    <div className="flow-root">
                        <h1>No relays found for this pubkey</h1>
                    </div>
                );
            }
            
            return (
                <div className="flow-root">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl lg:text-center">
                            <h2 className="text-base font-semibold leading-7 text-indigo-600">
                                Client Subscription Payment Options
                            </h2>
                            <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                                Pay for client access to relays
                            </p>
                            <p className="mt-6 text-lg leading-8">
                                Choose a relay below to pay with Lightning
                            </p>
                        </div>
                        <div className="mt-10 space-y-8">
                            {uniqueRelays.map((relay) => (
                                <div key={relay.id} className="card bg-base-200 p-6 rounded-lg shadow">
                                    <h3 className="text-xl font-bold mb-2">{relay.name}</h3>
                                    <p className="mb-4">Payment amount: <span className="font-semibold text-primary">{relay.payment_amount || 21} sats/month</span></p>
                                    <RelayPayment relay={relay as any} pubkey={pubkey} />
                                </div>
                            ))}
                        </div>
                        <p className="mt-6 text-lg leading-8">
                            Hint: you can pay here without logging in.  If you do login, you will see additional information about your memberships.
                        </p>
                    </div>
                </div>
            );
        }
        
        // Case 1c: Not logged in and missing required parameters
        return (
            <div className="flow-root">
                <h1>Please login to view client invoices</h1>
            </div>
        );
    }

    let usePubkey = "";
    if (pubkey) {
        usePubkey = pubkey;
    }

    const o = await prisma.clientOrder.findFirst({
        where: { id: order_id },
        include: {
            relay: true,
        },
    });

    if (o == null) {
        console.log("client order not found");
        return;
    }

    const paymentsEnabled = process.env.PAYMENTS_ENABLED == "true";

    if (!paymentsEnabled) {
        return (
            <div className="flow-root">
                <h1>payments are disabled</h1>
            </div>
        );
    }

    // if the order is paid, show the success page
    if (o.paid) {
        return (
            <div className="flow-root">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:text-center">
                        <h2 className="text-base font-semibold leading-7 text-indigo-600">
                            Client Payment Complete
                        </h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                            Thanks for your payment!
                        </p>
                        <p className="mt-6 text-lg leading-8">
                            Your payment has been received and your client access to the relay is confirmed.
                        </p>
                    </div>
                    <PaymentSuccess
                        signed_in={session ? true : false}
                        relay_id={o.relayId}
                        payment_hash={o.payment_hash}
                        payment_request={o.lnurl}
                        order_id={o.id}
                    />
                </div>
            </div>
        );
    }

    // if the order is not paid, show the invoice
    return (
        <div className="flow-root">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-base font-semibold leading-7 text-indigo-600">
                        Client Subscription Payment
                    </h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                        Pay for client access to {o.relay.name}
                    </p>
                    <p className="mt-6 text-lg leading-8">
                        Scan the QR code below or click the button to pay with your Lightning wallet.
                    </p>
                </div>
                <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <PaymentStatus
                            amount={o.amount}
                            payment_hash={o.payment_hash}
                            payment_request={o.lnurl}
                        />
                    </div>
                </div>
                <PaymentSuccess
                        signed_in={session ? true : false}
                        relay_id={o.relayId}
                        payment_hash={o.payment_hash}
                        payment_request={o.lnurl}
                        order_id={o.id}
                    />
            </div>
        </div>
    );
}
