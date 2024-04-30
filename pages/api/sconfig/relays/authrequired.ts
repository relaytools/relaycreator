import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import prisma from '../../../../lib/prisma'

// GET /api/sconfig/relays/authrequired?host=testrelay.example.com -> returns IP:PORT of internal endpoint for the relay
export default async function handle(req: any, res: any) {

    const host = req.query.host;

    if(!host) {
        res.status(400).json({ error: "missing host" });
        res.end();
        return;
    }

    const parts = host.split('.');

    const subdomain = parts[0];
    const domain = parts.slice(1).join('.');

    if(!subdomain || !parts) {
        res.status(400).json({ error: "missing or malformed host" });
        res.end();
        return;
    }

    const relay = await prisma.relay.findFirst({
        where: { name: subdomain },
        select: {
            name: true,
            domain: true,
            ip: true,
            port: true,
        }
    })

    if(relay == null) {
        res.status(404).json({ error: "relay not found" });
        res.end();
        return;
    }

    res.status(200).json(relay);
}