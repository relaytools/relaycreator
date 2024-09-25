import LNBits from 'lnbits'
import prisma from '../../../lib/prisma'

export default async function handle(req: any, res: any) {
    const nip05OrderId = req.query.id;
    if (nip05OrderId == null) {
        res.status(404).json({ "error": "no id" })
        return
    }

    const nip05Order = await prisma.nip05Order.findFirst({
        where: { id: nip05OrderId },
        include: {
            nip05: true,
        },
    })

    if (nip05Order == null) {
        res.status(404).json({ "error": "nip05Order not found" })
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
        payment_hash: nip05Order.payment_hash,
    });

    // update the expires date
    if (nip05Order.paid != true && nip05Order.expires_at == null) {
        await prisma.nip05Order.update({
            where: {
                id: nip05Order.id,
            },
            data: {
                expires_at: new Date(checkinvoice.details.expiry * 1000),
            }
        })
    }

    // if freshly paid, update paid and date
    // also, add the users pubkey to the allowList
    if (checkinvoice.paid == true && nip05Order.paid != true) {
        await prisma.nip05Order.update({
            where: {
                id: nip05Order.id,
            },
            data: {
                paid: true,
                status: "active",
                paid_at: new Date(),
            }
        })

    }

    res.status(200).json({ nip05Order: nip05Order })
}