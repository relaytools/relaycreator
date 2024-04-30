import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import prisma from "../../../../lib/prisma";
import { nip19 } from "nostr-tools";

// This API call is used by interceptor to determine NIP-42 AUTH status
// GET /api/sconfig/relays/authorized?pubkey=1234&host=testrelay.example.com
// pubkey MUST be hex format
export default async function handle(req: any, res: any) {

    const host = req.query.host;
    const pubkey = req.query.pubkey;

    if(!host || !pubkey) {
        res.status(400).json({ error: "missing host or pubkey" });
        res.end();
        return;
    }

    // first check for external domains
    const external = await prisma.relay.findFirst({
        where: { is_external: true, domain: host},
        select: {
            id: true,
            name: true,
            status: true,
            default_message_policy: true,
            allow_giftwrap: true,
            allow_tagged: true,
            allow_list: {
                select: {
                    list_keywords: true,
                    list_pubkeys: true,
                    list_kinds: true,
                },
            },
        }
    });

    let npubEncoded = "";
    try {
        npubEncoded = nip19.npubEncode(pubkey);
        if(npubEncoded == null) {
            res.status(400).json({ error: "invalid pubkey" });
            res.end();
            return;
        }
    } catch(e) {
        res.status(400).json({ error: "invalid pubkey" });
        res.end();
        return;
    }
    if(npubEncoded == "") {
        res.status(400).json({ error: "invalid pubkey" });
        res.end();
        return;
    }

    if(external != null && external.allow_list != null) {
        // check if the pubkey is in the list of authorized pubkeys
        const authorized = external.allow_list.list_pubkeys.find((p: any) => p.pubkey == pubkey);
        const authorizedNpub = external.allow_list.list_pubkeys.find((p: any) => p.pubkey == npubEncoded);
        if (authorized == null && authorizedNpub == null) {
            res.status(401).json({ error: "unauthorized" });
            res.end();
            return;
        } else {
            res.status(200).json({ authorized: true});
            res.end();
            return;
        }
    }

    // if not external, check for internal domains
    const parts = host.split('.');

    const subdomain = parts[0];
    const domain = parts.slice(1).join('.');

    if(!subdomain || !parts) {
        res.status(400).json({ error: "missing host or pubkey" });
        res.end();
        return;
    }

    const relay = await prisma.relay.findFirst({
        where: { name: subdomain, domain: domain},
        select: {
            id: true,
            name: true,
            status: true,
            default_message_policy: true,
            allow_giftwrap: true,
            allow_tagged: true,
            allow_list: {
                select: {
                    list_keywords: true,
                    list_pubkeys: true,
                    list_kinds: true,
                },
            },
        }
    });

    if(relay == null) {
        res.status(404).json({ error: "not found" });
        res.end();
        return;
    }

    if(relay.allow_list != null) {
        // since we allow both hex and npub in this list, we should check both encodings
        const authorized = relay.allow_list.list_pubkeys.find((p: any) => p.pubkey == pubkey);
        const authorizedNpub = relay.allow_list.list_pubkeys.find((p: any) => p.pubkey == npubEncoded);
        if (authorized == null && authorizedNpub == null) {
            res.status(401).json({ error: "unauthorized" });
            res.end();
            return;
        } else {
            res.status(200).json({ authorized: true});
            res.end();
            return;
        }
    } else {
        res.status(401).json({ error: "unauthorized" });
        res.end();
        return;
    }
}
