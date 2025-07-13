import LNBits from 'lnbits'
import prisma from '../../../lib/prisma'
import { recordRelayPlanChange } from '../../../lib/relayPlanChangeTracking'

export default async function handle(req: any, res: any) {

    if (!process.env.LNBITS_ADMIN_KEY || !process.env.LNBITS_INVOICE_READ_KEY || !process.env.LNBITS_ENDPOINT) {
        console.log("ERROR: no LNBITS env vars")
        return
    }

    const { wallet } = LNBits({
        adminKey: process.env.LNBITS_ADMIN_KEY,
        invoiceReadKey: process.env.LNBITS_INVOICE_READ_KEY,
        endpoint: process.env.LNBITS_ENDPOINT,
    });

    const invoiceId = req.query.id;
    if (invoiceId == null) {
        res.status(404).json({ "error": "no invoice id" })
        return
    }

    const findOrder = await prisma.order.findFirst({
        where: {
            id: invoiceId,
        },
        select: {
            id: true,
            paid: true,
            lnurl: true,
            payment_hash: true,
            expires_at: true,
            order_type: true,
            amount: true,

            relay: {
                select: {
                    id: true,
                    status: true,
                    name: true,
                    domain: true,
                    created_at: true,
                    owner: {
                        select: {
                            pubkey: true,
                        }
                    }
                },
            }
        }
    })

    if (!findOrder) {
        res.status(404).json({ "error": "no order found" })
        return
    }

    const checkinvoice = await wallet.checkInvoice({
        payment_hash: findOrder.payment_hash,
    });

    // if invoice is paid, update prisma
    // update the expire date for this order 
    if (findOrder.paid != true && findOrder.expires_at == null) {
        await prisma.order.update({
            where: {
                id: findOrder.id,
            },
            data: {
                expires_at: new Date(checkinvoice.details.expiry * 1000),
            }
        })
    }

    if (checkinvoice.paid == true) {
        await prisma.order.update({
            where: {
                id: findOrder.id,
            },
            data: {
                paid: true,
                status: "paid",
                paid_at: new Date(),
            }
        })
        // check relay, if new relay, set to waiting for provision
        if (findOrder.relay.status == null) {
            // new relay
            const updateRelayStatus = await prisma.relay.update({
                where: {
                    id: findOrder.relay.id,
                },
                data: {
                    status: "provision",
                }
            })
        }
        // if relay is paused, set to running
        if (findOrder.relay.status == "paused") {
            const updateRelayStatus = await prisma.relay.update({
                where: {
                    id: findOrder.relay.id,
                },
                data: {
                    status: "running",
                }
            })
        }
        await recordRelayPlanChange(findOrder.relay.id, findOrder.order_type, findOrder.amount);
        res.status(200).json({ order: findOrder });
    } else {
        res.status(200).json({ order: findOrder });
    }
}