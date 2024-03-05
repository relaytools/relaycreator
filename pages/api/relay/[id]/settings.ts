import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSessionForRelay"

export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank BlockList
    const isMyRelay = await checkSessionForRelay(req, res)
    if (isMyRelay == null) {
        res.status(500).json({ "error": "unauthorized" })
        return
    }

    if (req.method == "POST") {
        const update = await prisma.relay.update({
            where: {
                id: isMyRelay.id,
            },
            data: {
                default_message_policy: req.body.default_message_policy,
                listed_in_directory: req.body.listed_in_directory,
                details: req.body.details,
                banner_image: req.body.banner_image,
                payment_required: req.body.payment_required,
                allow_giftwrap: req.body.allow_giftwrap,
                allow_tagged: req.body.allow_tagged,
                payment_amount: parseInt(req.body.payment_amount),
            }
        })
    } else {
        res.status(500).json({ "error": "method not allowed" })
        return
    }
    res.status(200).json({});
}