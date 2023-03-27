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
        payment_hash: string;
        payment_request: string;
    }>) {

    const { data: session, status } = useSession();
    console.log(session)



    const p = useSearchParams();
    let pubkey = p.get('pubkey');

    let relayname = p.get('relayname');
    if (!relayname) {
        relayname = ""
    }

    if (session && session.user?.name) {
        pubkey = session.user.name
    }

    alby(props.payment_request)

    return (

        <div>
            <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

                    <div className="py-8 px-4 shadow sm:rounded-lg sm:px-10">
                        <div className="mt-6 grid grid-cols-3 gap-3">
                            <div className="col-span-3 flex justify-center">
                                <Image src="nostr_logo_prpl_wht_rnd.svg" alt="nip07" width={100} height={100} />
                            </div>
                        </div>
                        <form className="space-y-6" action="#" method="POST">
                            <div className="mt-2 flex rounded-md shadow-sm">


                                <div>
                                    <label htmlFor="pubkey" className="block text-sm font-medium leading-6 text-gray-900">
                                    </label>
                                    <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                        <label htmlFor="relayname" className="block text-sm font-medium leading-6 text-gray-900">
                                        </label>
                                        <div className="mt-2 flex rounded-md shadow-sm">
                                            <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                </div>
                                                <input
                                                    type="text"
                                                    name="relayname"
                                                    id="relayname"
                                                    className="block w-full rounded-none rounded-l-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-900 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                                    readOnly={true}
                                                    value={relayname}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                                .nostr1.com
                                            </button>
                                        </div>
                                    </div>

                                </div>


                            </div>

                            <div className="col-span-3 flex justify-center">
                                <Bolt11Invoice payment_request={props.payment_request} />
                            </div>
                            <div>
                                <button
                                    onClick={(e) => copyToClipboard(e, props.payment_request)}
                                    type="submit"
                                    className="flex w-full justify-center rounded-md bg-purple-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-50 hover:text-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ring-1 ring-gray-300"
                                >
                                    Copy ⚡ invoice to clipboard
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div >
        </div >

    )

}
