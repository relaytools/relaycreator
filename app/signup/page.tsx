"use client"
import ShowSession from '../mysession';
import { signIn } from 'next-auth/react'
import Image from 'next/image';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

// two flows here:
// 1. user is not logged in, so we just need their nostr pubkey (by paste or by extension)
//    - display a form to paste their pubkey + invoice
//    - we assume they already submitted the name they wanted and it's available and reserved

// 2. user IS logged in, so we use their pubkey from the session
//    - display an invoice
//    - they did not submit a name to use..

export default function SignupPage() {
    const { data: session, status } = useSession();
    const p = useSearchParams();
    const relayname = p.get('relayname');
    let useName = ""
    if (relayname) {
        useName = relayname
    }

    const [name, setName] = useState(useName)
    const [nameError, setNameError] = useState("")
    const [pubkeyError, setPubkeyError] = useState("")
    const [nameErrorDescription, setNameErrorDescription] = useState("")

    const [pubkey, setPubkey] = useState("")

    const router = useRouter()

    function setRelayName(name: string) {
        setName(name);
        if (validateRelayName(name)) {
            setNameError("✅");
        } else {
            setNameError("❌")
        }
    }

    if (session && session.user?.name) {
        if (pubkey != session.user.name) {
            setPubkey(session.user.name)
        }
    }

    function setAndValidatePubkey(pubkey: string) {
        setPubkey(pubkey)
        // use javascript regex to detect if length is 64 characters

        // check for hex chars
        const validHex = /^[0-9a-fA-F]{64}$/.test(pubkey)
        //console.log(pubkey.length)
        //const isLong = pubkey.length == 64

        // use javascript regex to detect if pubkey starts with npub
        //const validNpub = /^npub[0-9a-zA-z]{64}$/.test(pubkey)

        if (validHex) {
            setPubkeyError("✅")
        } else {
            setPubkeyError("❌")
        }
    }


    function validateRelayName(name: string) {
        // use javascript regex to detect hostname from name
        const valid = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}$/.test(name);
        return valid;
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        // let's see here,

        // call to the api to get the invoice, and get back the payment_hash

        // /api/invoices (new invoice)
        // newInvoice/payment_hash


        // /api/invoices/payment_hash_id
        // checkinvoice/paid=true
        // checkinvoice/details/payment_hash
        // checkinvoice/details/bolt11

        router.push(`/invoices?relayname=${name}&pubkey=${pubkey}`);
    }

    /*
    const doNip07Pubkey = async (event: any) => {
        event.preventDefault();
        const pubKey = await (window as any).nostr.getPublicKey();
        setAndValidatePubkey(pubKey)
    }
    */

    return (

        <div>
            <div>
            </div>

            <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
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
                                                    placeholder={name}
                                                    value={name}
                                                    onChange={event => setRelayName(event.target.value)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                                .nostr1.com
                                            </button>
                                            <button
                                                type="button"
                                                disabled
                                                className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900">
                                                {nameError}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        </div>
                                        {session && session.user?.name &&
                                            <input
                                                type="text"
                                                name="pubkey"
                                                id="pubkey"
                                                className="block w-full rounded-none rounded-l-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                                placeholder="enter pubkey or use sign-in"
                                                value={session.user.name}
                                                onChange={event => setAndValidatePubkey(event.target.value)}
                                            />

                                        }
                                        {!session &&
                                            <input
                                                type="text"
                                                name="pubkey"
                                                id="pubkey"
                                                className="block w-full rounded-none rounded-l-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                                placeholder="enter pubkey or sign-in"
                                                value={pubkey}
                                                onChange={event => setAndValidatePubkey(event.target.value)}
                                            />
                                        }

                                        <div>
                                            <button
                                                type="button"
                                                disabled
                                                className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900">
                                                {pubkeyError}
                                            </button>
                                        </div>
                                    </div>

                                </div>


                            </div>

                            <div>
                                <button
                                    onClick={handleSubmit}
                                    type="submit"
                                    className="flex w-full justify-center rounded-md bg-purple-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-50 hover:text-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ring-1 ring-gray-300"
                                >
                                    Pay with ⚡
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div >
        </div >

    )
}