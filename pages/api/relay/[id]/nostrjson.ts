import prisma from '../../../../lib/prisma'

export default async function handle(req: any, res: any) {
    const relay = await prisma.relay.findFirst({
        where: {
            id: req.query.id,
        },
        include: {
            owner: true,
        }
    })

    if (relay == null) {
        res.status(404).json({ "error": "relay not found" })
        return
    }

    let useUrl = relay.name + "." + relay.domain
    if(relay.is_external) {
        useUrl = relay.domain || ""
    }

    let nostrjson: any = {
        "description": relay.details || "",
        "name": useUrl,
        "pubkey": relay.owner.pubkey,
        "software": "git+https://github.com/hoytech/strfry.git",
        "supported_nips": [1, 2, 4, 9, 11, 12, 16, 20, 22, 28, 33, 40, 17, 86, 77],
        "version": "strfry v315-3cff8c9",
        "posting_policy": "https://" + useUrl + "#policy",
    }

    if (relay.payment_required == true) {
        nostrjson["limitation"] = { "payment_required": true }
        nostrjson["payments_url"] = "https://" + useUrl 
        nostrjson["fees"] = {
            "admission": [{ "amount": relay.payment_amount * 1000, "unit": "msats" }],
        }
    } else {
        nostrjson["limitation"] = { "payment_required": false }
    }

    nostrjson["limitation"]["max_message_length"] = 262200
    nostrjson["limitation"]["max_subscriptions"] = 80
    nostrjson["limitation"]["max_filters"] = 1000 // works now!
    nostrjson["limitation"]["max_limit"] = 10000
    //nostrjson["limitation"]["max_subid_length"] = unknown
    nostrjson["limitation"]["max_event_tags"] = 10000
    nostrjson["limitation"]["max_content_length"] = 262140
    nostrjson["limitation"]["min_pow_difficulty"] = 0
    nostrjson["limitation"]["auth_required"] = relay.auth_required

    // NIP42 auth
    if(relay.auth_required) {
        nostrjson["supported_nips"].push(42)
    }

    // nip11 pull-req pending for created_at limits
    // https://github.com/nostr-protocol/nips/pull/756
    nostrjson["limitation"]["created_at_lower_limit"] = 94608000
    nostrjson["limitation"]["created_at_upper_limit"] = 900

    if(relay.banner_image) {
        nostrjson["icon"] = relay.banner_image
    }

    res.status(200).json(nostrjson)
}