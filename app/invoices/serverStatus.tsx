import { getServerSession } from "next-auth/next"
import authOptions from "../../pages/api/auth/[...nextauth]"
import LNBits from 'lnbits'
import PaymentStatus from "./paymentStatus"
import PaymentSuccess from "./paymentSuccess"

export const dynamic = 'force-dynamic';

export default async function ServerStatus(searchParams: Record<string, string>) {

    const session = await getServerSession(authOptions)

    console.log(searchParams)

    console.log(session)

    const { relayname, pubkey } = searchParams;

    let useRelayName = "wtf-bro";
    if (relayname) {
        useRelayName = relayname
    }

    let usePubkey = "";
    if (pubkey) {
        usePubkey = pubkey
    }

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
    //console.log(newInvoice);

    // inside here we will:

    // validate the pubkey we have, is ok
    // validate the name is a hostname

    // if the user has a session:
    // write their user to the prisma db
    // create invoice and add all the payment stuff to the db

    // if the user doesn't have a session:
    // write their user to the db, but mark it as un-verified
    // create invoice and all the payment stuff to the db

    // what do we return here?  maybe we poll the api.. hmm!

    return (
        <div>
            <PaymentStatus payment_hash={newInvoice.payment_hash} payment_request={newInvoice.payment_request} />
            <PaymentSuccess payment_hash={newInvoice.payment_hash} payment_request={newInvoice.payment_request} />
        </div>
    )
}