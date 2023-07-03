import LNBits from 'lnbits'
import prisma from '../../../lib/prisma'

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

    const checkinvoice = await wallet.checkInvoice({
        payment_hash: invoiceId,
    });

    console.log(checkinvoice);
    // if invoice is paid, update prisma

    const findOrder = await prisma.order.findFirst({
        where: {
            payment_hash: invoiceId,
        },
        include: {
            relay: true,
        }
    })

    if (!findOrder) {
        res.status(404).json({ "error": "no order found" })
        return
    }

    /*
    if (false == true && findOrder.paid == false) {
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
        res.status(200).json({ checkinvoice });
    }
    */
    res.status(200).json({ checkinvoice });
}


// {"checkinvoice":{"paid":false,"preimage":"0000000000000000000000000000000000000000000000000000000000000000","details":{"checking_id":"df619b856f2cf623c1fce6176b8f448264cea1534474d0c88d292acbd9e8cd9b","pending":true,"amount":10000,"fee":0,"memo":"undefined undefined","time":1678904526,"bolt11":"lnbc100n1pjpyrxwpp5masehpt09nmz8s0uuctkhr6ysfjvag2ng36dpjyd9y4vhk0gekdsdqlw4hxgetxd9hx2epqw4hxgetxd9hx2eqcqzpgxqyz5vqsp53xcklxzmfmvg3zdlzer8ert80hxrzdq6pauqdvghu9uf7r48pcuq9qyyssql6fcmxwd0uhnhz3nswdp5t9rfm3kytw0nfkt0lnyqqetha86x7enmckuvqutae8fjd8dn63krls6e6uak2mq9dqquvrnr75anf5734sp2km74a","preimage":"0000000000000000000000000000000000000000000000000000000000000000","payment_hash":"df619b856f2cf623c1fce6176b8f448264cea1534474d0c88d292acbd9e8cd9b","expiry":1678990926,"extra":{},"wallet_id":"0f174e0309134189b7dcf8c7cb32abed","webhook":null,"webhook_status":null}}}


// {"checkinvoice":{"paid":true,"preimage":"0000000000000000000000000000000000000000000000000000000000000000","details":{"checking_id":"df619b856f2cf623c1fce6176b8f448264cea1534474d0c88d292acbd9e8cd9b","pending":false,"amount":10000,"fee":0,"memo":"undefined undefined","time":1678904526,"bolt11":"lnbc100n1pjpyrxwpp5masehpt09nmz8s0uuctkhr6ysfjvag2ng36dpjyd9y4vhk0gekdsdqlw4hxgetxd9hx2epqw4hxgetxd9hx2eqcqzpgxqyz5vqsp53xcklxzmfmvg3zdlzer8ert80hxrzdq6pauqdvghu9uf7r48pcuq9qyyssql6fcmxwd0uhnhz3nswdp5t9rfm3kytw0nfkt0lnyqqetha86x7enmckuvqutae8fjd8dn63krls6e6uak2mq9dqquvrnr75anf5734sp2km74a","preimage":"0000000000000000000000000000000000000000000000000000000000000000","payment_hash":"df619b856f2cf623c1fce6176b8f448264cea1534474d0c88d292acbd9e8cd9b","expiry":1678990926,"extra":{},"wallet_id":"0f174e0309134189b7dcf8c7cb32abed","webhook":null,"webhook_status":null}}}


