"use client"
import Image from 'next/image';
import React from 'react'
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Bolt11Invoice from '../components/invoice'
import LogoComponent from '../components/logoComponent';
import TextStringWaitingForPayment from '../components/textStringWaitingForPayment';
import { IoLogoGithub } from 'react-icons/io5';
import NoSSRWrapper from '../components/noSSRWrapper'

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

function copyToClipboard(e: any, bolt: string) {
    e.preventDefault()
    navigator.clipboard.writeText(bolt).then(() => {
        console.log('Copied to clipboard!');
    });
}

export async function alby(lnurl: string) {
    // const lnurl = (provided by your application backend)
    try {
        await (window as any).webln.enable();
        const result = await (window as any).webln.sendPayment(lnurl); // promise resolves once the LNURL process is finished 
    } catch (error) {
        console.log("something went wrong with webln: " + error)
    }
}

export default function PaymentStatus(
    props: React.PropsWithChildren<{
        amount: number,
        payment_hash: string;
        payment_request: string;
    }>) {

    const { data: session, status } = useSession();

    const p = useSearchParams();
    if (p == null) {
        return (
            <>
                no p
            </>
        )
    }
    let pubkey = p.get('pubkey');

    let relayname = p.get('relayname');
    if (!relayname) {
        relayname = ""
    }

    let useAmount = props.amount

    let newAmount = p.get('sats')
    if(newAmount) {
        useAmount = parseInt(newAmount)
    }

    if (session && session.user?.name) {
        pubkey = session.user.name
    }

    alby(props.payment_request)

    const useDomain = process.env.NEXT_PUBLIC_CREATOR_DOMAIN || "nostr1.com"

    return (

        <div className="min-h-screen">
            <div className="">
                <div className="flex items-center justify-center h-screen">
                    <div className=" ">
                        <div className="relative pb-10">
                            <div className="flex justify-center items-center text-center">
                                <div className="text-2xl text-left">Invoice</div>
                                <div className="w-100">
                                    <NoSSRWrapper>
                                        <LogoComponent />
                                    </NoSSRWrapper>
                                </div>
                                <div className="text-2xl text-right">{useAmount} sats</div>
                            </div>
                        </div>
                        <div className="text-2xl text-center mb-2">for relay</div>
                        <div className="text-2xl text-center border rounded-r-md rounded-l-md border-gray-300 px-3 pt-5 pb-5">{relayname}.{useDomain}</div>
                        <div className="col-span-3 flex justify-center mb-4 mt-4">
                            <Bolt11Invoice payment_request={props.payment_request} />
                        </div>
                        <div>
                            <button
                                onClick={(e) => copyToClipboard(e, props.payment_request)}
                                type="submit"
                                className="flex w-full justify-center rounded-md btn-primary btn mb-4"
                            >
                                Copy ⚡ invoice to clipboard
                            </button>
                        </div>
                        <TextStringWaitingForPayment />
                        <div>
                            <div>relay.tools 2025 &middot; Made with 🤙🏻 in the PNW &middot; <span className="fl pl-1"><a href="https://github.com/relaytools"><IoLogoGithub /></a></span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    )

}
