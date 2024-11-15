"use client"
import { useEffect, useState } from 'react'
import ZapAnimation from '../lightningsuccess/lightning'

export default function PaymentSuccess(props: React.PropsWithChildren<{
    signed_in: boolean;
    relay_name: string;
    relay_id: string;
    payment_hash: string;
    payment_request: string;
}>) {

    const [status, setStatus] = useState(false)

    const getInvoiceStatus = async (paymentHash: string) => {
        const result = await fetch(`/api/invoices/${paymentHash}`)
        const j = await result.json()
        setStatus(j.checkinvoice.paid)
    }

    useEffect(() => {
        const interval = setInterval(() => {
            getInvoiceStatus(props.payment_hash);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {status && props.signed_in && <div>success<ZapAnimation redirect_to={`/curator?relay_id=${props.relay_id}`}></ZapAnimation></div>}
            {status && !props.signed_in && <div>success<ZapAnimation redirect_to={`/curator?relay_id=${props.relay_id}`}></ZapAnimation></div>}
            {!status && <div>waiting</div>}
        </>
    )
}