import { getServerSession } from "next-auth/next";
import authOptions from "../../pages/api/auth/[...nextauth]";
import PaymentStatus from "./paymentStatus";
import PaymentSuccess from "./paymentSuccess";
import prisma from "../../lib/prisma";
import ZapAnimation from "../lightningsuccess/lightning";
import Balances from "./balances";
import AdminInvoices from "./adminInvoices";
import { calculateTimeBasedBalance } from "../../lib/planChangeTracking";

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
                    RelayPlanChange: true,
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
                        RelayPlanChange: true,
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

            const paymentAmount = Number(process.env.NEXT_PUBLIC_INVOICE_AMOUNT);
            const paymentPremiumAmount = Number(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT);

            const relayBalances = relays.map((relay) => {
                // Filter paid and unpaid relay orders
                const paidOrders = relay.Order.filter(
                    (order) => order.paid === true
                );

                const unpaidOrders = relay.Order.filter(
                    (order) => order.expires_at &&
                    order.expires_at > new Date() &&
                    order.paid === false
                );

                // Calculate total amount from paid relay orders
                const totalAmount = paidOrders.reduce((sum, order) => {
                    return sum + order.amount;
                }, 0);

                // Filter paid and unpaid client orders
                const paidClientOrders = relay.ClientOrder.filter(
                    (order) => order.paid === true
                );

                const unpaidClientOrders = relay.ClientOrder.filter(
                    (order) => order.expires_at &&
                    order.expires_at > new Date() &&
                    order.paid === false
                );

                // Calculate total amount from paid client orders
                const clientOrderAmount = paidClientOrders.reduce(
                    (sum, order) => {
                        return sum + order.amount;
                    },
                    0
                );

                let balance = totalAmount + clientOrderAmount;
                
                // Check if relay has plan change tracking data
                const relayPlanChanges = relay.RelayPlanChange || [];
                
                if (relayPlanChanges.length > 0) {
                    // Use plan change tracking for accurate billing
                    const now = new Date();
                    let totalCostAccrued = 0;
                    
                    // Get current pricing from environment variables
                    const currentStandardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '21');
                    const currentPremiumPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');
                    
                    for (const planPeriod of relayPlanChanges) {
                        const periodStart = new Date(planPeriod.started_at);
                        const periodEnd = planPeriod.ended_at ? new Date(planPeriod.ended_at) : now;
                        
                        // Calculate days in this plan period
                        const daysInPeriod = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
                        
                        // Each payment covers exactly 30 days at the rate paid
                        const paidCoverageDays = 30;
                        const dailyCostForPaidPeriod = planPeriod.amount_paid / 30;
                        
                        if (daysInPeriod <= paidCoverageDays) {
                            // Still within paid coverage period - use historical rate
                            const costForPeriod = daysInPeriod * dailyCostForPaidPeriod;
                            totalCostAccrued += costForPeriod;
                        } else {
                            // Beyond paid coverage - use historical rate for paid period, current rate for excess
                            const paidPeriodCost = paidCoverageDays * dailyCostForPaidPeriod;
                            const excessDays = daysInPeriod - paidCoverageDays;
                            
                            // Use current pricing for excess days
                            const currentDailyRate = planPeriod.plan_type === 'premium' 
                                ? currentPremiumPrice / 30 
                                : currentStandardPrice / 30;
                            const excessCost = excessDays * currentDailyRate;
                            
                            totalCostAccrued += paidPeriodCost + excessCost;
                        }
                    }
                    
                    balance = totalAmount + clientOrderAmount - totalCostAccrued;
                } else if (paidOrders.length > 0) {
                    // Fallback to old method if no plan change tracking
                    const now = new Date();
                    const nowTime = now.getTime();
                    
                    // Get current pricing from environment variables
                    const currentStandardPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || '21');
                    const currentPremiumPrice = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || '2100');
                    
                    // Calculate cost based on actual payments made
                    let totalCostAccrued = 0;
                    
                    for (const order of paidOrders) {
                        if (order.paid && order.paid_at) {
                            const orderDate = new Date(order.paid_at);
                            const daysSincePayment = (nowTime - orderDate.getTime()) / 1000 / 60 / 60 / 24;
                            
                            // Each payment covers exactly 30 days at the rate paid
                            const paidCoverageDays = 30;
                            const dailyCostForPaidPeriod = order.amount / 30;
                            
                            if (daysSincePayment <= paidCoverageDays) {
                                // Still within paid coverage period - use historical rate
                                const costAccruedForThisPayment = daysSincePayment * dailyCostForPaidPeriod;
                                totalCostAccrued += costAccruedForThisPayment;
                            } else {
                                // Beyond paid coverage - use historical rate for paid period, current rate for excess
                                const paidPeriodCost = paidCoverageDays * dailyCostForPaidPeriod;
                                const excessDays = daysSincePayment - paidCoverageDays;
                                
                                // Use current pricing for excess days (assume standard if not specified)
                                const currentDailyRate = order.order_type === 'premium' 
                                    ? currentPremiumPrice / 30 
                                    : currentStandardPrice / 30;
                                const excessCost = excessDays * currentDailyRate;
                                
                                totalCostAccrued += paidPeriodCost + excessCost;
                            }
                        }
                    }

                    // Balance = Total paid + client revenue - accrued costs
                    balance = totalAmount + clientOrderAmount - totalCostAccrued;
                }

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
                    clientOrders: paidClientOrders,
                    unpaidClientOrders: unpaidClientOrders,
                    banner_image: relay.banner_image,
                    profile_image: relay.profile_image,
                    RelayPlanChange: relay.RelayPlanChange,
                };
            });

            return (
                <div>
                    { isAdmin && <AdminInvoices RelayPaymentAmount={{standard: paymentAmount, premium: paymentPremiumAmount}} IsAdmin={isAdmin} RelayBalances={relayBalances} /> }
                    { !isAdmin && <Balances RelayPaymentAmount={{standard: paymentAmount, premium: paymentPremiumAmount}} IsAdmin={isAdmin} RelayBalances={relayBalances} /> }
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
                    plan_type={o.order_type || "standard"}
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
