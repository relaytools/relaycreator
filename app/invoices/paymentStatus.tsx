"use client"
import Image from 'next/image';
import React from 'react'
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Bolt11Invoice from './invoice'

// two flows here:
// 1. user is not logged in, so we just need their nostr pubkey (by paste or by extension)
//    - display a form to paste their pubkey + invoice
//    - we assume they already submitted the name they wanted and it's available and reserved

// 2. user IS logged in, so we use their pubkey from the session
//    - display an invoice
//    - they did not submit a name to use..

// once the invoice is created
// we wait till we see it completed to finalize the 'login' if they're not logged in, 
// ie, in the database the user id, but still should exist so we can associate the payment_hash
// user should not be 'verified' until payment is received.

/*
export interface ChildProps {
    children: React.ReactNode;
}
*/



export default function PaymentStatus(
    props: React.PropsWithChildren<{
        payment_hash: string;
        payment_request: string;
    }>) {

    const { data: session, status } = useSession();

    const p = useSearchParams();
    let pubkey = p.get('pubkey');
    let relayname = p.get('relayname');

    if (session && session.user?.name) {
        pubkey = session.user.name
    }

    return (
        <>
            <p>{props.payment_hash}</p>
            <p>{props.payment_request}</p>
            <Bolt11Invoice payment_request={props.payment_request} />
            ima client
        </>
    )

}