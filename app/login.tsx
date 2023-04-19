"use client"
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react'
import Image from 'next/image';
import { useState } from 'react';

export default function Login() {
    const router = useRouter();
    const [name, setName] = useState("hometown-relay")
    const [nameError, setNameError] = useState("✅")
    const [nameErrorDescription, setNameErrorDescription] = useState("")

    function setRelayName(name: string) {
        setName(name);
        if (validateRelayName(name)) {
            setNameError("✅");
        } else {
            setNameError("❌")
        }
    }

    function validateRelayName(name: string) {
        // use javascript regex to detect hostname from name
        const valid = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}$/.test(name);
        return valid;
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        router.push(`/signup?relayname=${name}`);
    }

    const doNip07Login = async () => {
        //const pubKey = await (window as any).nostr.getPublicKey();
        let signThis = {
            kind: 20069,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: 'login to nostr21.com',
        }

        let useMe = await (window as any).nostr.signEvent(signThis)
        console.log(useMe)

        signIn("credentials", {
            kind: useMe.kind,
            created_at: useMe.created_at,
            content: useMe.content,
            pubkey: useMe.pubkey,
            sig: useMe.sig,
            id: useMe.id,
            callbackUrl: "/signup?relayname=" + name
        })
    }

    return (
        <>
            <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8 bg-base-100">

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

                    <div className="py-8 px-4 shadow sm:rounded-lg sm:px-10">
                        <div className="mt-6 grid grid-cols-3 gap-3">
                            <div className="col-span-3 flex justify-center">
                                <Image src="nostr_logo_prpl_wht_rnd.svg" alt="nip07" width={100} height={100} />
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <div>
                                    <label htmlFor="relayname" className="block text-sm font-medium leading-6">
                                    </label>
                                    <div className="mt-2 flex rounded-md shadow-sm">
                                        <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            </div>
                                            <input
                                                type="text"
                                                name="relayname"
                                                id="relayname"
                                                className="block w-full rounded-none rounded-l-md border-0 py-1.5 pl-10 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                                placeholder="hometown-relay"
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
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    className="flex w-full justify-center rounded-md bg-purple-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-50 hover:text-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ring-1 ring-gray-300"
                                >
                                    Create my relay
                                </button>
                            </div>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 text-gray-500">Or sign-in with Nostr extension</span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-3 gap-3">
                                <div>
                                    <button
                                        onClick={doNip07Login}
                                        className="inline-flex w-full justify-center rounded-md bg-purple-600 py-2 px-4 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                                    >
                                        <span className="sr-only">nip07</span>
                                        <Image src="nostr_logo_prpl_wht_rnd.svg" alt="nip07" width={30} height={30} />

                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
