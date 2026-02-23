import prisma from '../../../../lib/prisma'
import { checkSessionForRelay } from "../../../../lib/checkSession"
import { checkSessionForSuperAdmin } from '../../../../lib/checkSessionForSuperAdmin'

async function isPremiumPlan(relayId: string): Promise<boolean> {
    const planChange = await prisma.relayPlanChange.findFirst({
        where: { relayId },
        orderBy: { started_at: 'desc' },
    });
    return planChange?.plan_type === 'premium';
}

export default async function handle(req: any, res: any) {
    // check owner and relay, to create blank BlockList
    const isMyRelay = await checkSessionForRelay(req, res)
    if (isMyRelay == null) {
        res.status(500).json({ "error": "unauthorized" })
        return
    }

    if (req.method == "POST") {
        const updateFields: { [key: string]: any } = {};
        for (let key in req.body) {
            if (req.body[key] !== undefined) {
                if(key == "payment_amount" || key == "payment_premium_amount" || key == "nip05_payment_amount") {
                    updateFields[key] = parseInt(req.body[key]);
                } else if(key == "status") {
                    // update status only if superadmin
                    if(await checkSessionForSuperAdmin(req, res)) {
                        updateFields[key] = req.body[key];
                    }
                } else if(key == "use_woa_for_tagged" && req.body[key] === true) {
                    // use_woa_for_tagged requires premium plan
                    if(await isPremiumPlan(isMyRelay.id)) {
                        updateFields[key] = req.body[key];
                    } else {
                        res.status(403).json({ "error": "Web of Access for tagged events requires a premium plan" })
                        return
                    }
                } else {
                    updateFields[key] = req.body[key];
                }
            }
        }

        const update = await prisma.relay.update({
            where: {
                id: isMyRelay.id,
            },
            data: updateFields,
        })
    } else {
        res.status(500).json({ "error": "method not allowed" })
        return
    }
    res.status(200).json({});
}