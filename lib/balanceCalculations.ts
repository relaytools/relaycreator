import prisma from "./prisma";
import LNBits from "lnbits";

export async function calculateBalance(relay: any) {
    const orders = await prisma.order.findMany({
        where: { relayId: relay.id },
    });

    const clientOrders = await prisma.clientOrder.findMany({
        where: { relayId: relay.id },
    });

    // calculate relay's outstanding balance
    const paymentAmount = Number(process.env.INVOICE_AMOUNT);

    const totalAmount = orders.reduce((sum, order) => {
        if (order.paid) {
            return sum + order.amount;
        } else {
            return sum + 0;
        }
    }, 0);

    const clientOrderAmount = clientOrders.reduce((sum, clientOrder) => {
        if (clientOrder.paid) {
            return sum + clientOrder.amount;
        } else {
            return sum + 0;
        }
    }, 0);

    const paidOrders = orders.filter((order) => order.paid_at !== null);

    const now: any = new Date().getTime();

    const firstOrderDate: any = new Date(
        Math.min(
            ...paidOrders.map((order) =>
                order.paid && order.paid_at
                    ? new Date(order.paid_at).getTime()
                    : now.getTime()
            )
        )
    );

    const timeInDays: any = (now - firstOrderDate) / 1000 / 60 / 60 / 24;

    // cost per day, paymentAmount / 30
    const costPerDay = paymentAmount / 30;

    // Divide the total amount by the amount of time to get the balance
    const balance = totalAmount + clientOrderAmount - timeInDays * costPerDay;
    return balance;
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