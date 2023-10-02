import { getServerSession } from "next-auth/next"
import authOptions from "../../pages/api/auth/[...nextauth]"
import PaymentStatus from "./paymentStatus"
import PaymentSuccess from "./paymentSuccess"
import prisma from '../../lib/prisma'
import ZapAnimation from "../lightningsuccess/lightning"

export const dynamic = 'force-dynamic';

export default async function ServerStatus(searchParams: Record<string, string>) {

    const session = await getServerSession(authOptions)

    const { relayname, pubkey, order_id } = searchParams;

    if (!relayname || !pubkey || !order_id) {
        if (session && (session as any).user.name) {
            // list the invoices for the account
            const orders = await prisma.order.findMany({
                where: {
                    user: {
                        pubkey: (session as any).user.name
                    }
                },
                include: {
                    relay: true,
                }
            })
            return (
                <div>
                    <h1>Your Orders</h1>
                    <div className="mt-8 flow-root">
                        <div className="overflow-x-auto">
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Relay Name</th>
                                        <th>Payment Status</th>
                                        <th>Paid at</th>
                                        <th>Expires At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.id + "rowkey"}>
                                            <td>{order.id}</td>
                                            <td>{order.relay.name}</td>
                                            <td>{order.paid ? "paid" : "un-paid"}</td>
                                            <td>{order.paid_at ? new Date(order.paid_at).toLocaleString() : ""}</td>
                                            <td>{order.expires_at ? new Date(order.expires_at).toLocaleString() : ""}</td>
                                            <td>
                                                {order.expires_at && order.expires_at > new Date() &&
                                                    <a className="btn btn-secondary" href={`/invoices?relayname=${order.relay.name}&pubkey=${pubkey}&order_id=${order.id}`}>show</a>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )
        }
    }
    let useRelayName = "wtf-bro";
    if (relayname) {
        useRelayName = relayname
    }

    let usePubkey = "";
    if (pubkey) {
        usePubkey = pubkey
    }

    const o = await prisma.order.findFirst({
        where: { id: order_id },
        include: {
            relay: true,
        }
    })

    if (o == null) {
        console.log("order not found")
        return
    }

    const paymentsEnabled = (process.env.PAYMENTS_ENABLED == "true")

    if(paymentsEnabled) {
    return (
        <div>
            <PaymentStatus payment_hash={o.payment_hash} payment_request={o.lnurl} />
            <PaymentSuccess relay_id={o.relay.id} payment_hash={o.payment_hash} payment_request={o.lnurl} />
        </div>
    )
    } else {
        return (
            <div>
                <ZapAnimation redirect_to={`/curator?relay_id=${o.relayId}`}></ZapAnimation>
            </div>
        )
    }
}