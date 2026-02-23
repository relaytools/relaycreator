import LNBits from 'lnbits'
import prisma from '../../../lib/prisma'
import { recordRelayPlanChange } from '../../../lib/relayPlanChangeTracking'

export default async function handle(req: any, res: any) {

    if (!process.env.LNBITS_ADMIN_KEY || !process.env.LNBITS_INVOICE_READ_KEY || !process.env.LNBITS_ENDPOINT) {
        console.log("ERROR: no LNBITS env vars")
        return
    }

    const { wallet } = LNBits({
        adminKey: process.env.LNBITS_ADMIN_KEY,
        invoiceReadKey: process.env.LNBITS_INVOICE_READ_KEY,
        endpoint: process.env.LNBITS_ENDPOINT,
    });

    const invoiceId = req.query.id;
    if (invoiceId == null) {
        res.status(404).json({ "error": "no invoice id" })
        return
    }

    const findOrder = await prisma.order.findFirst({
        where: {
            id: invoiceId,
        },
        select: {
            id: true,
            paid: true,
            lnurl: true,
            payment_hash: true,
            expires_at: true,
            order_type: true,
            amount: true,
            paid_at: true,

            relay: {
                select: {
                    id: true,
                    status: true,
                    name: true,
                    domain: true,
                    created_at: true,
                    owner: {
                        select: {
                            pubkey: true,
                        }
                    }
                },
            }
        }
    })

    if (!findOrder) {
        res.status(404).json({ "error": "no order found" })
        return
    }

    const checkinvoice = await wallet.checkInvoice({
        payment_hash: findOrder.payment_hash,
    });

    console.log(checkinvoice)

    // if invoice is paid, update prisma
    // update the expire date for this order 
    if (findOrder.paid != true && findOrder.expires_at == null) {
        await prisma.order.update({
            where: {
                id: findOrder.id,
            },
            data: {
                expires_at: new Date(checkinvoice.details.expiry),
            }
        })
    }

    if (checkinvoice.paid == true) {
        await prisma.order.update({
            where: {
                id: findOrder.id,
            },
            data: {
                paid: true,
                status: "paid",
                paid_at: new Date(),
            }
        })
        // check relay, if new relay, set to waiting for provision
        if (findOrder.relay.status == null) {
            // new relay
            const updateRelayStatus = await prisma.relay.update({
                where: {
                    id: findOrder.relay.id,
                },
                data: {
                    status: "provision",
                }
            })
        }
        // if relay is paused, set to running
        if (findOrder.relay.status == "paused") {
            const updateRelayStatus = await prisma.relay.update({
                where: {
                    id: findOrder.relay.id,
                },
                data: {
                    status: "running",
                }
            })
        }
        // Only record plan changes for standard and premium plans, not custom payments
        if (findOrder.order_type === 'standard' || findOrder.order_type === 'premium') {
            // Check if this is a downgrade from premium to standard
            const currentPlan = await prisma.relayPlanChange.findFirst({
                where: {
                    relayId: findOrder.relay.id,
                    ended_at: null
                },
                select: { plan_type: true }
            });
            
            const isDowngrade = currentPlan?.plan_type === 'premium' && findOrder.order_type === 'standard';
            
            // Record the plan change
            await recordRelayPlanChange(findOrder.relay.id, findOrder.order_type, findOrder.amount, findOrder.id, findOrder.paid_at || undefined);
            
            // If downgrading from premium to standard, remove premium-only features
            if (isDowngrade) {
                console.log(`Downgrading relay ${findOrder.relay.id} from premium to standard - removing WOA sources and streams`);
                
                // Remove WOA sources
                await prisma.aclSource.deleteMany({
                    where: { relayId: findOrder.relay.id }
                });
                
                // Remove streams
                await prisma.stream.deleteMany({
                    where: { relayId: findOrder.relay.id }
                });
                
                // Reset use_woa_for_tagged setting
                await prisma.relay.update({
                    where: { id: findOrder.relay.id },
                    data: { use_woa_for_tagged: false }
                });
            }
        }
        res.status(200).json({ order: findOrder });
    } else {
        res.status(200).json({ order: findOrder });
    }
}