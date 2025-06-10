import { getServerSession } from "next-auth/next";
import authOptions from "../../pages/api/auth/[...nextauth]";
import PaymentStatus from "./paymentStatus";
import PaymentSuccess from "./paymentSuccess";
import prisma from "../../lib/prisma";
import ClientBalances from "./balances";

export const dynamic = "force-dynamic";

export default async function ServerStatus(props: {
    relayname: string|undefined,
    order_id: string|undefined,
    pubkey: string|undefined,
    relayid: string|undefined,
}) {

    const session = await getServerSession(authOptions);

    const relayname = props.relayname;
    const relayid = props.relayid;
    const pubkey = props.pubkey;
    const order_id = props.order_id;

    // display the client invoices
    if (!relayid || !pubkey || !order_id) {
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

            // Get unique relay IDs from the client orders
            const relayIds = [...new Set(clientOrders.map(order => order.relayId))];
            
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
                    paymentRequired: relay.payment_required || false
                };
            });

            return (
                <div>
                    <ClientBalances IsAdmin={false} RelayClientOrders={relayClientOrders} />
                </div>
            );
        }
    }

    // not logged in or no relayname/pubkey/order_id
    if (!order_id || !relayid) {
        return (
            <div className="flow-root">
                <h1>please login to view client invoices</h1>
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
                <PaymentStatus
                    amount={o.amount}
                    payment_hash={o.payment_hash}
                    payment_request={o.lnurl}
                />
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
