import LNBits from 'lnbits'
import prisma from '../../../lib/prisma'

export default async function handle(req: any, res: any) {

    const { name, domain, pubkey } = req.query as { name: string, domain: string, pubkey: string };

    if (name == "" || pubkey == "" || domain == "") {
        console.log("WHOOPS")
        res.status(404).json({ "error": "name pubkey or domain missing" })
        return
    }

    const nip05 = await prisma.nip05.findFirst( { 
        where: { 
            AND: [
                { name: name }, 
                { domain: domain },
            ],
        },
    })

    const relays = await prisma.relay.findMany({
        where: {
            OR: [
                {status: "running"},
                {status: "provision"},
            ]
        },
        include: {
            owner: true,
            moderators: {
                include: { user: true },
            },
            block_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
                    list_kinds: true,
                },
            },
            allow_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
                    list_kinds: true,
                },
            },
        },
    });

    // find all available domains that the user

    // Find relays where the user is a moderator
    // is a moderator of
    const userModeratedRelays = relays.filter((relay) =>
        relay.moderators.some((moderator) => moderator.user.pubkey === pubkey)
    );

    // is an owner of
    const userOwnedRelays = relays.filter(
        (relay) => relay.owner.pubkey === pubkey 
    );

    const combinedRelays = [...userOwnedRelays, ...userModeratedRelays];

    // Create an array of strings combining the domain and name of the relay
    const relayDomainNames = combinedRelays.map(
        (relay) => `${relay.name}.${relay.domain}`
    );

    // is a member of
    let userRelays = [];
    relays.forEach((r) => {
        if (r.allow_list != null) {
            let found = false;
            r.allow_list.list_pubkeys.forEach((p) => {
                //todo bech32 matches
                if (p.pubkey == pubkey) {
                    found = true;
                }
            });
            if (found) {
                relayDomainNames.push(r.name + "." + r.domain);
            }
        }
    });

    let authorized = false
    relayDomainNames.forEach(d => {
        if(domain == d) {
            authorized = true
        }
    })

    if(!authorized) {
        console.log("unauthorized user for domain")
        res.status(500).json({"error": "unauthorized user for domain"})
        return
    }

    if(nip05 != null) {
        console.log("nip05 already exists")
        res.status(500).json({ "error": "name already exists" })
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
        amount: 21,
        memo: "nip05" + " " + name + " " + domain + " " + pubkey,
        out: false,
    });

    const newNip05 = await prisma.nip05.create({
        data: {
            name: name,
            domain: domain,
            pubkey: pubkey,
        },
    })

    const user = await prisma.user.findUnique({
        where: {
            pubkey: pubkey,
        }
    })

    if(user == null || newNip05 == null) {
        console.log("error, user not found or nip05 creation failed")
        res.status(500).json({ "error": "user not found or nip05 creation failed"})
        return
    }

    const newNip05Order = await prisma.nip05Order.create({
        data: {
            userId: user.id,
            nip05Id: newNip05.id,
            amount: 21,
            paid: false,
            payment_hash: newInvoice.payment_hash,
            lnurl: newInvoice.payment_request,
            status: "pending",
        }
    })

    console.log("API CALL /nip05orders -> order created:")
    res.status(200).json({ nip05Order: newNip05Order });
}