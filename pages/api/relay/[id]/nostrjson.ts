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

    let nostrjson: any = {
        "description": relay.details,
        "name": relay.name + "." + relay.domain,
        "pubkey": relay.owner.pubkey,
        "software": "git+https://github.com/hoytech/strfry.git",
        "supported_nips": [1, 2, 4, 9, 11, 12, 16, 20, 22, 28, 33, 40],
        "version": "0.9.3",
        "posting_policy": "https://" + relay.name + "." + relay.domain + "#policy",
    }

    if (relay.payment_required == true) {
        nostrjson["limitation"] = { "payment_required": true }
        nostrjson["payments_url"] = "https://" + relay.name + "." + relay.domain
        nostrjson["fees"] = {
            "admission": [{ "amount": relay.payment_amount, "unit": "sats" }],
        }
    }

    nostrjson["limitation"]["max_message_length"] = 262200
    nostrjson["limitation"]["max_subscriptions"] = 80
    nostrjson["limitation"]["max_filters"] = 256 // unsure
    nostrjson["limitation"]["max_limit"] = 10000
    //nostrjson["limitation"]["max_subid_length"] = unknown
    nostrjson["limitation"]["max_event_tags"] = 2000
    nostrjson["limitation"]["max_content_length"] = 262140
    nostrjson["limitation"]["min_pow_difficulty"] = 0
    nostrjson["limitation"]["auth_required"] = false

    // nip11 pull-req pending for created_at limits
    // https://github.com/nostr-protocol/nips/pull/756
    nostrjson["limitation"]["created_at_lower_limit"] = 94608000
    nostrjson["limitation"]["created_at_upper_limit"] = 900

    res.status(200).json(nostrjson)
}