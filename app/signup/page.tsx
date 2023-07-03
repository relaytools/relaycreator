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
    if (p == null) {
        return (
            <>
                no p
            </>
        )
    }
    const relayname = p.get('relayname');
    let useName = ""
    if (relayname) {
        useName = relayname
    }

    const [name, setName] = useState(useName)
    const [nameError, setNameError] = useState("")
    const [pubkeyError, setPubkeyError] = useState("")
    const [nameErrorDescription, setNameErrorDescription] = useState("")
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("")

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
            setPubkeyErrorDescription("")
        } else {
            setPubkeyError("❌")
            setPubkeyErrorDescription("key must be valid hex")
        }
    }


    function validateRelayName(name: string) {
        // use javascript regex to detect hostname from name
        const valid = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}$/.test(name);

        if (valid) {
            setNameErrorDescription("")
        } else {
            setNameErrorDescription("name must be valid hostname")
        }
        return valid;
    }

    function isValidForm() {
        if (pubkeyError == "✅" && nameError == "✅") {
            return true
        } else {
            return false
        }
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        // here double check name isn't taken via the api, if it's taken, the api will return error.  if it's available the api will
        // 'reserve it' to this user pubkey.. and return the order_id here. the next page, will lookup the order id and populate with invoice.
        const response = await fetch(`/api/invoices?relayname=${name}&pubkey=${pubkey}`)
        const data = await response.json()

        if (response.ok) {
            router.push(`/invoices?relayname=${name}&pubkey=${pubkey}&order_id=${data.order_id}`);
        } else {
            setNameError("❌")
            setNameErrorDescription(data.error)
        }
    }

    return (

        <div>
            <div>
            </div>

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
                                    <label htmlFor="pubkey" className="block text-sm font-medium leading-6">
                                    </label>
                                    <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                        <label htmlFor="relayname" className="block text-sm font-medium leading-6 ">
                                        </label>
                                        <div className="mt-2 flex rounded-md shadow-sm">
                                            <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                </div>
                                                <input
                                                    type="text"
                                                    name="relayname"
                                                    id="relayname"
                                                    className="input input-bordered input-primary w-full max-w-xs"
                                                    placeholder={name}
                                                    value={name}
                                                    onChange={event => setRelayName(event.target.value)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-primary">
                                                .nostr1.com
                                            </button>
                                            <button
                                                type="button"
                                                disabled
                                                className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold ">
                                                {nameError}
                                            </button>
                                        </div>

                                    </div>

                                    <span className="flex items-center font-medium tracking-wide text-red-500 text-xs mt-1 ml-1">
                                        {nameErrorDescription}
                                    </span>

                                    <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        </div>
                                        {session && session.user?.name &&
                                            <input
                                                type="text"
                                                name="pubkey"
                                                id="pubkey"
                                                className="input w-full max-w-xs"
                                                placeholder="enter pubkey or use sign-in"
                                                hidden={true}
                                                value={session.user.name}
                                                onChange={event => setAndValidatePubkey(event.target.value)}
                                            />

                                        }
                                        {!session &&
                                            <input
                                                type="text"
                                                name="pubkey"
                                                id="pubkey"
                                                className="input w-full max-w-xs"
                                                placeholder="enter pubkey or sign-in"
                                                hidden={true}
                                                value={pubkey}
                                                onChange={event => setAndValidatePubkey(event.target.value)}
                                            />
                                        }



                                        <div>
                                            <button
                                                type="button"
                                                disabled
                                                className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold ">
                                                {pubkeyError}
                                            </button>
                                        </div>
                                    </div>
                                    <span className="flex items-center font-medium tracking-wide text-red-500 text-xs mt-1 ml-1">
                                        {pubkeyErrorDescription}
                                    </span>

                                </div>


                            </div>

                            <div>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!isValidForm}
                                    type="submit"
                                    className="btn btn-primary w-full"
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
