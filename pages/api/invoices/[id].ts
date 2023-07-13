import LNBits from 'lnbits'
import prisma from '../../../lib/prisma'

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

    const checkinvoice = await wallet.checkInvoice({
        payment_hash: invoiceId,
    });

    console.log(checkinvoice);
    // if invoice is paid, update prisma

    const findOrder = await prisma.order.findFirst({
        where: {
            payment_hash: invoiceId,
        },
        include: {
            relay: true,
        }
    })

    if (!findOrder) {
        res.status(404).json({ "error": "no order found" })
        return
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
        res.status(200).json({ checkinvoice });
    } else {
        res.status(200).json({ checkinvoice });
    }
}