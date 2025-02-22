import prisma from "../../../../lib/prisma";
import LNBits from "lnbits";
import {
    calculateBalance,
    createOrGetDonationInvoice,
} from "../../../../lib/balanceCalculations";

// GET /api/sconfig/relays/authrequired?host=testrelay.example.com -> returns IP:PORT of internal endpoint for the relay
export default async function handle(req: any, res: any) {
    const host = req.query.host;

    if (!host) {
        res.status(400).json({ error: "missing host" });
        res.end();
        return;
    }

    const parts = host.split(".");

    const subdomain = parts[0];

    if (!subdomain || !parts) {
        res.status(400).json({ error: "missing or malformed host" });
        res.end();
        return;
    }

    const relay = await prisma.relay.findFirst({
        where: { name: subdomain },
        select: {
            id: true,
            name: true,
            domain: true,
            ip: true,
            port: true,
            auth_required: true,
            payment_required: true,
            payment_amount: true,
            ownerId: true,
            request_payment: true,
            request_payment_amount: true,
        },
    });

    if (relay == null) {
        res.status(404).json({ error: "relay not found" });
        res.end();
        return;
    }

    var mode = "";
    var invoice = "";
    if (relay.auth_required) {
        mode = "authrequired";
    } else {
        // for non-auth relays, we do all the balance checks here
        if (relay.request_payment) {
            const balance = await calculateBalance(relay);
            console.log("BALANCE CHECK:" + balance);
            if (balance < 0) {
                mode = "authnone:requestpayment";
                invoice = await createOrGetDonationInvoice(relay);
            } else {
                mode = "authnone";
            }
        } else {
            mode = "authnone"
        }
    }

    res.status(200).json({
        ip: relay.ip,
        port: relay.port,
        domain: relay.domain,
        name: relay.name,
        mode: mode,
        invoice: invoice,
    });
}
