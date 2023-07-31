"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ZapAnimation from '../lightningsuccess/lightning'

export default function PaymentSuccess(props: React.PropsWithChildren<{
    relay_id: string;
    payment_hash: string;
    payment_request: string;
}>) {

    const router = useRouter()

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
            {status && <div>success<ZapAnimation relay_id={props.relay_id}></ZapAnimation></div>}
            {!status && <div>waiting</div>}
        </>
    )
}