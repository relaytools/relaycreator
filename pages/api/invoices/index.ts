import LNBits from 'lnbits'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

export default async function handle(req: any, res: any) {
    // here is where we rely on prisma, 

    // we can check and store, the pubkey and the pending invoice payment_hash

    // if the user already has an invoice pending, wait till it expires? stuff like that


    // server side validation of relayname and pubkey
    // using nostr-tools even

    //TODO: require sign-in or not?

    const session = await getServerSession(req, res, authOptions)
    if (session) {
        // Signed in
        console.log("Session", JSON.stringify(session, null, 2))
    } else {
        // Not Signed in
        res.status(404).json({ "error": "not signed in" })
        res.end()
        return
    }

    if (session == null || session.user?.name == null) {
        res.status(404).json({ "error": "not signed in" })
        res.end()
        return
    }

    const myUser = await prisma.user.findFirst({ where: { pubkey: session.user.name } })

    var useUser

    if (!myUser) {
        useUser = await prisma.user.create({
            data: {
                pubkey: session.user.name,
            },
        })
    } else {
        useUser = myUser
    }

    const { relayname, pubkey } = req.query as { relayname: string, pubkey: string };
    if (relayname == null) {
        res.status(404).json({ "error": "no relayname" })
        return
    }

    // check if relay already exists, or can be reserved
    const r = await prisma.relay.findFirst({ where: { name: relayname } })

    if (r != null) {
        res.status(404).json({ "error": "relay name already exists" })
        return
    }

    if (!process.env.LNBITS_ADMIN_KEY || !process.env.LNBITS_INVOICE_READ_KEY || !process.env.LNBITS_ENDPOINT) {
        console.log("ERROR: no LNBITS env vars")
        return
    }

    // create relay with user association
    const relayResult = await prisma.relay.create({
        data: {
            name: relayname,
            ownerId: useUser.id,
        }
    })

    if (!relayResult) {
        res.status(404).json({ "error": "relay creation failed" })
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

    const orderCreated = await prisma.order.create({
        data: {
            relayId: relayResult.id,
            userId: useUser.id,
            status: "pending",
            paid: false,
            payment_hash: newInvoice.payment_hash,
            lnurl: newInvoice.payment_request,

        }
    })
    console.log("API CALL /invoices -> order created:")
    console.log(orderCreated);

    const order_id = orderCreated.id

    res.status(200).json({ order_id: order_id });
}