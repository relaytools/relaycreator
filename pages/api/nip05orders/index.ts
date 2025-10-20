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

    // Parse domain to extract subdomain and base domain
    const domainParts = domain.split('.');
    let relayName = '';
    let baseDomain = '';
    
    if (domainParts.length >= 2) {
        relayName = domainParts[0]; // subdomain (relay name)
        baseDomain = domainParts.slice(1).join('.'); // base domain
    } else {
        console.log("Invalid domain format");
        res.status(400).json({ "error": "Invalid domain format" });
        return;
    }

    // Find the specific relay that matches the subdomain and domain
    const targetRelay = await prisma.relay.findFirst({
        where: {
            AND: [
                { name: relayName },
                { domain: baseDomain },
                {
                    OR: [
                        { status: "running" },
                        { status: "provision" },
                    ]
                }
            ]
        },
    });

    if (!targetRelay) {
        console.log("Relay not found for domain:", domain);
        res.status(404).json({ "error": "Relay not found for this domain" });
        return;
    }

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
        if(domain.toLowerCase() == d.toLowerCase()) {
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

    // Check if user has premium subscription to this relay
    const userClientOrders = await prisma.clientOrder.findMany({
        where: {
            pubkey: pubkey,
            relayId: targetRelay.id,
            paid: true,
        },
        orderBy: {
            paid_at: 'desc'
        },
        take: 1
    });

    // Determine if user has premium plan (free NIP-05) or needs to pay
    // If nip05_payment_amount is 0 or null, bypass payments entirely
    let nip05Amount = targetRelay.nip05_payment_amount ?? 0;
    const hasPremiumPlan = userClientOrders.length > 0 && userClientOrders[0].order_type === 'premium';
    
    if (hasPremiumPlan) {
        nip05Amount = 0; // Free for premium subscribers
    }
    
    let newInvoice = null;
    if (nip05Amount > 0) {
        // Initialize LNBits only when payment is required
        if (!process.env.LNBITS_ADMIN_KEY || !process.env.LNBITS_INVOICE_READ_KEY || !process.env.LNBITS_ENDPOINT) {
            console.log("ERROR: no LNBITS env vars but payment is required")
            res.status(500).json({ "error": "Payment system not configured" })
            return
        }

        const { wallet } = LNBits({
            adminKey: process.env.LNBITS_ADMIN_KEY,
            invoiceReadKey: process.env.LNBITS_INVOICE_READ_KEY,
            endpoint: process.env.LNBITS_ENDPOINT,
        });

        // Create invoice only if payment is required
        newInvoice = await wallet.createInvoice({
            amount: nip05Amount,
            memo: "nip05" + " " + name + " " + domain + " " + pubkey,
            out: false,
        });
    }

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
            amount: nip05Amount,
            paid: nip05Amount === 0, // Mark as paid if free (premium user)
            payment_hash: newInvoice?.payment_hash || "free-premium-nip05",
            lnurl: newInvoice?.payment_request || "free-premium-nip05",
            status: nip05Amount === 0 ? "completed" : "pending",
        }
    })

    console.log("API CALL /nip05orders -> order created:")
    res.status(200).json({ nip05Order: newNip05Order });
}