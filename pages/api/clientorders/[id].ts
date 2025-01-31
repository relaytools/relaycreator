import LNBits from 'lnbits'
import prisma from '../../../lib/prisma'

export default async function handle(req: any, res: any) {
    const clientOrderId = req.query.id;
    if (clientOrderId == null) {
        res.status(404).json({ "error": "no id" })
        return
    }

    const clientOrder = await prisma.clientOrder.findFirst({
        where: { id: clientOrderId },
        include: {
            relay: {
                include: {
                    allow_list: true,
                }
            }
        }
    })

    if (clientOrder == null) {
        res.status(404).json({ "error": "clientOrder not found" })
        return
    }

    if (!process.env.LNBITS_ADMIN_KEY || !process.env.LNBITS_INVOICE_READ_KEY || !process.env.LNBITS_ENDPOINT) {
        console.log("ERROR: no LNBITS env vars")
        res.status(500).json({ "error": "no LNBITS env vars" })
        return
    }

    const { wallet } = LNBits({
        adminKey: process.env.LNBITS_ADMIN_KEY,
        invoiceReadKey: process.env.LNBITS_INVOICE_READ_KEY,
        endpoint: process.env.LNBITS_ENDPOINT,
    });

    const checkinvoice = await wallet.checkInvoice({
        payment_hash: clientOrder.payment_hash,
    });

    // update the expires date
    if (clientOrder.paid != true && clientOrder.expires_at == null) {
        await prisma.clientOrder.update({
            where: {
                id: clientOrder.id,
            },
            data: {
                expires_at: new Date(checkinvoice.details.expiry * 1000),
            }
        })
    }

    // if freshly paid, update paid and date
    // also, add the users pubkey to the allowList
    if (checkinvoice.paid == true && clientOrder.paid != true) {
        await prisma.clientOrder.update({
            where: {
                id: clientOrder.id,
            },
            data: {
                paid: true,
                paid_at: new Date(),
            }
        })

        if (clientOrder.relay.allow_list == null) {
            res.status(500).json({ "error": "no allow list" })
            return
        }

        await prisma.listEntryPubkey.create({
            data: {
                AllowListId: clientOrder.relay.allow_list.id,
                pubkey: clientOrder.pubkey,
                reason: "paid"
            }
        })
    }

    res.status(200).json({ clientOrder: clientOrder })
}