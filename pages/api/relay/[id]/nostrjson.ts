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

    const nostrjson = {
        "description": relay.details,
        "name": relay.name + "." + relay.domain,
        "pubkey": relay.owner.pubkey,
        "software": "git+https://github.com/hoytech/strfry.git",
        "supported_nips": [1, 2, 4, 9, 11, 12, 16, 20, 22, 28, 33, 40],
        "version": "0.9.3",
        "posting_policy": "https://" + relay.name + "." + relay.domain + "#policy",
    }

    res.status(200).json(nostrjson)
}