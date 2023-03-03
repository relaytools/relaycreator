import { getSession } from "next-auth/react";
import LNBits from 'lnbits'

export default async function handle(req: any, res: any) {
    // here is where we rely on prisma, 

    // we can check and store, the pubkey and the pending invoice payment_hash

    // if the user already has an invoice pending, wait till it expires? stuff like that


    // server side validation of relayname and pubkey
    // using nostr-tools even

    const { relayname, pubkey } = req.body;
    if (!process.env.LNBITS_ADMIN_KEY || !process.env.LNBITS_INVOICE_READ_KEY || !process.env.LNBITS_ENDPOINT) {
        console.log("ERROR: no LNBITS env vars")
        return
    }

    const { wallet } = LNBits({
        adminKey: process.env.LNBITS_ADMIN_KEY,
        invoiceReadKey: process.env.LNBITS_INVOICE_READ_KEY,
        endpoint: process.env.LNBITS_ENDPOINT,
    });

    const newInvoice = await wallet.createInvoice({
        amount: 10,
        memo: relayname + " " + pubkey,
        out: false,
    });
    console.log(newInvoice);

    res.status(200).json({ relayname, pubkey, newInvoice });
}