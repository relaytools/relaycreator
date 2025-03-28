import { getServerSession } from "next-auth/next";
import authOptions from "../../pages/api/auth/[...nextauth]";
import PaymentStatus from "./paymentStatus";
import PaymentSuccess from "./paymentSuccess";
import prisma from "../../lib/prisma";
import ZapAnimation from "../lightningsuccess/lightning";
import Balances from "./balances";
import AdminInvoices from "./adminInvoices";

export const dynamic = "force-dynamic";

export default async function ServerStatus(props: {
    relayname: string|undefined,
    order_id: string|undefined,
    pubkey: string|undefined,
}) {

    const session = await getServerSession(authOptions);

    const relayname = props.relayname;
    const pubkey = props.pubkey;
    const order_id = props.order_id;

    // display the user invoices
    if (!relayname || !pubkey || !order_id) {
        if (session && (session as any).user.name) {
            // list the relays for the account
            let relays = await prisma.relay.findMany({
                where: {
                    OR: [{ status: "running" }, { status: "paused" }, { status: null}],
                    owner: {
                        pubkey: (session as any).user.name,
                    },
                },
                include: {
                    Order: true,
                    ClientOrder: true,
                    owner: true,
                },
            });

            // list the invoices for the account
            let orders = await prisma.order.findMany({
                where: {
                    user: {
                        pubkey: (session as any).user.name,
                    },
                },
                include: {
                    relay: true,
                },
            });

            // superadmin
            // find the superadmins,
            // compare them to the logged in user
            // if superadmin, then show ALL relay's balances and orders in a superadminy screen
            const admins = await prisma.user.findMany({
                where: { admin: true },
            });
            let isAdmin = false;
            for (let i = 0; i < admins.length; i++) {
                if (admins[i].pubkey == (session as any).user.name) {
                    isAdmin = true;
                }
            }

            if (isAdmin) {
                relays = await prisma.relay.findMany({
                    where: {
                        OR: [{ status: "running" }, { status: "paused" }],
                    },
                    include: {
                        Order: true,
                        ClientOrder: true,
                        owner: true,
                    },
                });

                orders = await prisma.order.findMany({
                    include: {
                        relay: true,
                    },
                });
            }

            // for each relay
            // add up all order amounts, and divide by amount of time to show remaining balance

            const paymentAmount = Number(process.env.INVOICE_AMOUNT);

            const relayBalances = relays.map((relay) => {
                const totalAmount = relay.Order.reduce((sum, order) => {
                    if (order.paid) {
                        return sum + order.amount;
                    } else {
                        return sum + 0;
                    }
                }, 0);

                const clientOrderAmount = relay.ClientOrder.reduce(
                    (sum, order) => {
                        if (order.paid) {
                            return sum + order.amount;
                        } else {
                            return sum + 0;
                        }
                    },
                    0
                );

                const paidOrders = relay.Order.filter(
                    (order) => order.paid !== false
                );

                const unpaidOrders = relay.Order.filter(
                    (order) => order.expires_at &&
                    order.expires_at >
                        new Date() &&
                    !order.paid
                )

                const now = new Date();
                const nowTime = now.getTime();

                const firstOrderDate = new Date(
                    Math.min(
                        ...paidOrders.map((order) =>
                            order.paid && order.paid_at
                                ? new Date(order.paid_at).getTime()
                                : nowTime
                        )
                    )
                );

                const timeInDays =
                    (nowTime - firstOrderDate.getTime()) / 1000 / 60 / 60 / 24;

                // cost per day, paymentAmount / 30
                const costPerDay = paymentAmount / 30;

                // Divide the total amount by the amount of time to get the balance
                const balance =
                    totalAmount + clientOrderAmount - timeInDays * costPerDay;

                return {
                    owner: relay.owner.pubkey,
                    clientPayments: clientOrderAmount,
                    relayName: relay.name,
                    relayStatus: relay.status,
                    relayId: relay.id,
                    relayDomain: relay.domain,
                    balance: balance,
                    orders: paidOrders,
                    unpaidOrders: unpaidOrders,
                    clientOrderAmount: clientOrderAmount,
                };
            });

            return (
                <div>
                    { isAdmin && <AdminInvoices RelayPaymentAmount={paymentAmount} IsAdmin={isAdmin} RelayBalances={relayBalances} /> }
                    { !isAdmin && <Balances RelayPaymentAmount={paymentAmount} IsAdmin={isAdmin} RelayBalances={relayBalances} /> }
                </div>
            );
        }
    }

    // not logged in or no relayname/pubkey/order_id
    if (!order_id || !relayname) {
        return (
            <div className="flow-root">
                <h1>please login to view your invoices</h1>
            </div>
        );
    }

    let useRelayName = "wtf-bro";
    if (relayname) {
        useRelayName = relayname;
    }

    let usePubkey = "";
    if (pubkey) {
        usePubkey = pubkey;
    }

    const o = await prisma.order.findFirst({
        where: { id: order_id },
        include: {
            relay: true,
        },
    });

    if (o == null) {
        console.log("order not found");
        return;
    }

    const paymentsEnabled = process.env.PAYMENTS_ENABLED == "true";

    if (paymentsEnabled) {
        return (
            <div className="flex items-center justify-center flex-col">
                <PaymentStatus
                    amount={o.amount}
                    payment_hash={o.payment_hash}
                    payment_request={o.lnurl}
                />
                <PaymentSuccess
                    signed_in={session && (session as any).user.name}
                    relay_name={o.relay.name}
                    relay_id={o.relay.id}
                    payment_hash={o.payment_hash}
                    payment_request={o.lnurl}
                    order_id={o.id}
                />
            </div>
        );
    } else {
        return (
            <div>
                <ZapAnimation
                    redirect_to={`/curator?relay_id=${o.relayId}`}
                ></ZapAnimation>
            </div>
        );
    }
}
