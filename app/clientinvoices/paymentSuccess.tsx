"use client"
import { useEffect, useState } from 'react'
import ZapAnimation from '../lightningsuccess/lightning'
import TextStringWaitingForPayment from '../components/textStringWaitingForPayment';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccess(props: React.PropsWithChildren<{
    signed_in: boolean;
    relay_id: string;
    payment_hash: string;
    payment_request: string;
    order_id: string;
}>) {
    const [status, setStatus] = useState(false);
    const searchParams = useSearchParams();
    const pubkey = searchParams ? searchParams.get('pubkey') || '' : '';

    const getInvoiceStatus = async () => {
        const result = await fetch(`/api/clientorders/${props.order_id}`)
        const j = await result.json()
        setStatus(j.clientOrder.paid)
    }

    useEffect(() => {
        const interval = setInterval(() => {
            getInvoiceStatus();
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Determine the redirect URL based on whether user is signed in and if pubkey is available
    const getRedirectUrl = () => {
        if (props.signed_in) {
            return `/clientinvoices`;
        } else if (pubkey) {
            // If not signed in but we have a pubkey, redirect to main page with pubkey
            return `/?pubkey=${pubkey}`;
        } else {
            return `/`;
        }
    };

    return (
        <>
            {status && <div className="success">
                <ZapAnimation redirect_to={getRedirectUrl()}></ZapAnimation>
            </div>}

            {!status && <div> 
                <TextStringWaitingForPayment />
            </div>}
        </>
    )
}
