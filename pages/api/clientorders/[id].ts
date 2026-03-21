import LNBits from 'lnbits'
import prisma from '../../../lib/prisma'
import { recordPlanChange } from '../../../lib/planChangeTracking'

export default async function handle(req: any, res: any) {
    const clientOrderId = req.query.id;
    if (clientOrderId == null) {
        res.status(404).json({ "error": "no id" })
        return
    }

    const clientOrder = await prisma.clientOrder.findFirst({
        where: { id: clientOrderId },
        include: {
            relay: {
                include: {
                    allow_list: true,
                }
            }
        }
    })

    if (clientOrder == null) {
        res.status(404).json({ "error": "clientOrder not found" })
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

    const checkinvoice = await wallet.checkInvoice({
        payment_hash: clientOrder.payment_hash,
    });

    // update the expires date
    if (clientOrder.paid != true && clientOrder.expires_at == null) {
        await prisma.clientOrder.update({
            where: {
                id: clientOrder.id,
            },
            data: {
                expires_at: new Date(checkinvoice.details.expiry),
            }
        })
    }

    // if freshly paid, update paid and date
    // also, add the users pubkey to the allowList
    if (checkinvoice.paid == true && clientOrder.paid != true) {
        await prisma.clientOrder.update({
            where: {
                id: clientOrder.id,
            },
            data: {
                paid: true,
                paid_at: new Date(),
            }
        })

        // Record plan change for accurate billing calculations
        try {
            await recordPlanChange(
                clientOrder.relayId,
                clientOrder.pubkey,
                clientOrder.order_type,
                clientOrder.amount,
                clientOrder.id
            );
        } catch (error) {
            console.error('Failed to record plan change:', error);
            // Don't fail the payment processing if plan tracking fails
        }

        if (clientOrder.relay.allow_list == null) {
            res.status(500).json({ "error": "no allow list" })
            return
        }

        // Check if pubkey is already in the allow list (returning subscriber)
        const existingEntry = await prisma.listEntryPubkey.findFirst({
            where: {
                AllowListId: clientOrder.relay.allow_list.id,
                pubkey: clientOrder.pubkey
            }
        });

        const isPremium = clientOrder.order_type === 'premium';
        const reason = isPremium ? "paid premium" : "paid";

        if (!existingEntry) {
            // First-time subscriber: only grant access if total paid >= standard plan price
            const totalPaidResult = await prisma.clientOrder.aggregate({
                where: {
                    relayId: clientOrder.relayId,
                    pubkey: clientOrder.pubkey,
                    paid: true
                },
                _sum: { amount: true }
            });

            const totalPaid = totalPaidResult._sum.amount || 0;
            const minimumAmount = clientOrder.relay.payment_amount || 0;

            if (totalPaid >= minimumAmount) {
                await prisma.listEntryPubkey.create({
                    data: {
                        AllowListId: clientOrder.relay.allow_list.id,
                        pubkey: clientOrder.pubkey,
                        reason: reason
                    }
                });
            }
            // If totalPaid < minimumAmount, access is not granted yet — they can pay more to reach the threshold
        } else if (isPremium && existingEntry.reason !== "paid premium") {
            // Returning subscriber upgrading to premium — update the reason to reflect premium status
            await prisma.listEntryPubkey.update({
                where: { id: existingEntry.id },
                data: { reason: "paid premium" }
            });
        }
    }

    res.status(200).json({ clientOrder: clientOrder })
}