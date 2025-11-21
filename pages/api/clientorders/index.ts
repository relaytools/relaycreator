import LNBits from 'lnbits'
import prisma from '../../../lib/prisma'

export default async function handle(req: any, res: any) {

    const { relayid, pubkey, sats } = req.query as { relayid: string, pubkey: string, sats: string };

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

    let useamount = relay.payment_amount
    if(sats != null) {
        useamount = parseInt(sats)
    }

    // Determine order type based on amount
    let orderType = "standard";
    if (useamount >= relay.payment_premium_amount) {
        orderType = "premium";
    } else if (useamount === relay.payment_amount) {
        orderType = "standard";
    } else {
        // Custom amount less than premium price defaults to standard
        orderType = "standard";
    }

    const newInvoice = await wallet.createInvoice({
        amount: useamount,
        memo: relay.name + " " + pubkey,
        out: false,
    });

    let usePaymentRequest = newInvoice.payment_request
    if(usePaymentRequest == null) {
        usePaymentRequest = newInvoice.bolt11
    }

    const newClientOrder = await prisma.clientOrder.create({
        data: {
            amount: useamount,
            relayId: relayid,
            pubkey: pubkey,
            paid: false,
            payment_hash: newInvoice.payment_hash,
            lnurl: usePaymentRequest,
            order_type: orderType,
        }
    })

    console.log("API CALL /clientorders -> order created:")
    res.status(200).json({ clientOrder: newClientOrder });
}