import prisma from "./prisma";
import LNBits from "lnbits";
import { calculateTimeBasedBalance, getUserPlanHistory } from './planChangeTracking';

export async function calculateBalance(relay: any) {
    const paymentAmount = Number(process.env.NEXT_PUBLIC_INVOICE_AMOUNT);
    const now = new Date();

    // Get all paid orders for relay hosting
    const paidOrders = relay.Order.filter((order: any) => order.paid === true);
    
    // Get all paid client orders for subscription revenue
    const paidClientOrders = relay.ClientOrder.filter((order: any) => order.paid === true);

    // Calculate total relay hosting payments
    const totalAmount = paidOrders.reduce((sum: number, order: any) => sum + order.amount, 0);

    // For client subscriptions, use the new time-based calculation system
    let clientBalanceTotal = 0;
    
    // Group client orders by pubkey to calculate individual balances
    const clientGroups = new Map<string, any[]>();
    for (const order of paidClientOrders) {
        if (!clientGroups.has(order.pubkey)) {
            clientGroups.set(order.pubkey, []);
        }
        clientGroups.get(order.pubkey)!.push(order);
    }
    
    // Calculate balance for each client using plan change tracking
    for (const [pubkey, orders] of clientGroups) {
        try {
            const clientBalance = await calculateTimeBasedBalance(relay.id, pubkey);
            clientBalanceTotal += clientBalance;
        } catch (error) {
            console.error(`Failed to calculate balance for client ${pubkey}:`, error);
            // Fallback to old calculation method
            const clientOrderAmount = orders.reduce((sum: number, order: any) => sum + order.amount, 0);
            const firstOrderDate = new Date(Math.min(...orders.map((order: any) => 
                order.paid_at ? new Date(order.paid_at).getTime() : now.getTime()
            )));
            const timeInDays = (now.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24);
            const costPerDay = paymentAmount / 30;
            clientBalanceTotal += clientOrderAmount - (timeInDays * costPerDay);
        }
    }

    // Calculate relay operational balance
    let relayBalance = totalAmount;
    if (paidOrders.length > 0) {
        const firstOrderDate = new Date(Math.min(...paidOrders.map((order: any) => 
            order.paid_at ? new Date(order.paid_at).getTime() : now.getTime()
        )));
        const timeInDays = (now.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24);
        const costPerDay = paymentAmount / 30;
        relayBalance = totalAmount - (timeInDays * costPerDay);
    }

    // Total balance = Relay operational balance + Client subscription balances
    return relayBalance + clientBalanceTotal;
}

export async function createOrGetDonationInvoice(relay: any) {
    if (
        process.env.LNBITS_ADMIN_KEY &&
        process.env.LNBITS_INVOICE_READ_KEY &&
        process.env.LNBITS_ENDPOINT
    ) {
        const { wallet } = LNBits({
            adminKey: process.env.LNBITS_ADMIN_KEY,
            invoiceReadKey: process.env.LNBITS_INVOICE_READ_KEY,
            endpoint: process.env.LNBITS_ENDPOINT,
        });

        // find the most recent open order for this relay
        var recentOrder = await prisma.order.findFirst({
            where: { relayId: relay.id, status: "pending" },
            orderBy: { expires_at: "desc" },
        });

        // update order info from lnbits
        if (recentOrder != null && recentOrder.expires_at != null && recentOrder.expires_at > new Date()) {

            var checkinvoice: any = null
            try {
            checkinvoice = await wallet.checkInvoice({
                payment_hash: recentOrder.payment_hash,
            });

            } catch (e) {
                console.log("ERROR CALLING LNBITS: " + e)
                return ""
            }

            if (recentOrder.paid != true)  {
                recentOrder = await prisma.order.update({
                    where: {
                        id: recentOrder.id,
                    },
                    data: {
                        expires_at: new Date(
                            checkinvoice.details.expiry * 1000
                        ),
                        paid: checkinvoice.paid,
                    },
                });
            }
        }

        var createNew = false;
        if (recentOrder == null) {
            console.log("recent order was null")
            createNew = true;
        } else if (
            recentOrder.expires_at != null &&
            recentOrder.expires_at < new Date()
        ) {
            console.log("recent order expired")
            console.log(recentOrder)
            createNew = true;
        } else if (recentOrder.paid == true) {
            console.log("recent order paid")
            createNew = true;
        }

        if (createNew) {
            // create a new order
            const newInvoice = await wallet.createInvoice({
                amount: relay.request_payment_amount,
                memo: relay.name + " donation",
                out: false,
            });

            const newOrder = await prisma.order.create({
                data: {
                    amount: relay.request_payment_amount,
                    relayId: relay.id,
                    userId: relay.ownerId,
                    paid: false,
                    payment_hash: newInvoice.payment_hash,
                    lnurl: newInvoice.payment_request,
                    expires_at: new Date(
                        new Date().getTime() + 3600 * 1000
                    ),
                    status: "pending",
                },
            });

            return newOrder.lnurl;
        } else if(recentOrder != null) {
            return recentOrder.lnurl;
        }
    }
    // something went wrong
    return "";
}