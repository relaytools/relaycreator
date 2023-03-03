"use client"
import { useEffect, useState } from 'react'

export default function PaymentSuccess(props: React.PropsWithChildren<{
    payment_hash: string;
    payment_request: string;
}>) {

    const [status, setStatus] = useState(false)

    const getInvoiceStatus = async (paymentHash: string) => {
        const result = await fetch(`http://localhost:3000/api/invoices/${paymentHash}`)
        const j = await result.json()
        setStatus(j.checkinvoice.paid)
    }

    console.log("HELLO")

    useEffect(() => {
        const interval = setInterval(() => {
            getInvoiceStatus(props.payment_hash);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {status && <div>success</div>}
            {!status && <div>waiting</div>}
        </>
    )
}