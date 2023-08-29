import LNBits from 'lnbits'
import prisma from '../../../lib/prisma'

export default async function handle(req: any, res: any) {

    const { relayid, pubkey } = req.query as { relayid: string, pubkey: string };

    if (relayid == null || pubkey == "") {
        console.log("WHOOPS")
        res.status(404).json({ "error": "relayid and pubkey required" })
        return
    }

    const relay = await prisma.relay.findFirst({ where: { id: relayid } })

    if (relay == null) {
        console.log("WHOOPS2")
        res.status(404).json({ "error": "relay not found" })
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

    const newInvoice = await wallet.createInvoice({
        amount: relay.payment_amount,
        memo: relay.name + " " + pubkey,
        out: false,
    });

    const newClientOrder = await prisma.clientOrder.create({
        data: {
            relayId: relayid,
            pubkey: pubkey,
            paid: false,
            payment_hash: newInvoice.payment_hash,
            lnurl: newInvoice.payment_request,
        }
    })

    console.log("API CALL /clientorders -> order created:")
    res.status(200).json({ clientOrder: newClientOrder });
}