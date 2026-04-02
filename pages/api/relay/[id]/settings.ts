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
        // Validate display_name
        if (req.body.display_name !== undefined && req.body.display_name !== null) {
            const dn = req.body.display_name;
            if (typeof dn !== "string") {
                res.status(400).json({ error: "display_name must be a string" });
                return;
            }
            if (dn.length > 255) {
                res.status(400).json({ error: "display_name must be 255 characters or less" });
                return;
            }
            if (/<[^>]*>/g.test(dn)) {
                res.status(400).json({ error: "display_name cannot contain HTML tags" });
                return;
            }
        }

        // Validate contact
        if (req.body.contact !== undefined && req.body.contact !== null) {
            const ct = req.body.contact;
            if (typeof ct !== "string") {
                res.status(400).json({ error: "contact must be a string" });
                return;
            }
            const isNpub = /^npub1[a-z0-9]{58}$/.test(ct);
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct);
            const isUrl = /^https?:\/\/.+/.test(ct);
            if (!isNpub && !isEmail && !isUrl) {
                res.status(400).json({ error: "contact must be an npub, email address, or website URL (http/https)" });
                return;
            }
        }

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