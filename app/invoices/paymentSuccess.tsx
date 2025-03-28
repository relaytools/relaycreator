"use client"
import { useEffect, useState } from 'react'
import ZapAnimation from '../lightningsuccess/lightning'
import TextStringWaitingForPayment from '../components/textStringWaitingForPayment';

export default function PaymentSuccess(props: React.PropsWithChildren<{
    signed_in: boolean;
    relay_name: string;
    relay_id: string;
    payment_hash: string;
    payment_request: string;
    order_id: string;
}>) {

    const [status, setStatus] = useState(false)

    const getInvoiceStatus = async () => {
        const result = await fetch(`/api/invoices/${props.order_id}`)
        const j = await result.json()
        setStatus(j.order.paid)
    }

    useEffect(() => {
        const interval = setInterval(() => {
            getInvoiceStatus();
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {status && props.signed_in && <div>success<ZapAnimation redirect_to={`/curator?relay_id=${props.relay_id}`}></ZapAnimation></div>}
            {status && !props.signed_in && <div>success<ZapAnimation redirect_to={`/curator?relay_id=${props.relay_id}`}></ZapAnimation></div>}

            {!status && <div> 
                <TextStringWaitingForPayment />
            </div>}
        </>
    )
}