"use client"
import { useSession } from 'next-auth/react'
import { signIn, signOut } from "next-auth/react"
import Image from 'next/image';

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
        // callbackUrl: "/signup?relayname=" + name
    })
}

export default function ShowSession() {
    const { data: session, status } = useSession();
    if (!session) {
        return (
            <>
                <div className="rounded bg-purple-600 text-xs text-white shadow-sm">
                    <div>
                        <button
                            onClick={doNip07Login}
                            className="inline-flex w-full justify-center rounded-md bg-purple-600 py-2 px-4 text-white shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                        >
                            <span className="sr-only">nip07</span>
                            <Image src="nostr_logo_prpl_wht_rnd.svg" alt="nip07" width={30} height={30} />
                            sign in

                        </button>
                    </div>
                </div>
            </>
        )
    } else if (session?.user) {
        return (
            <>
                <div className="rounded bg-purple-600 text-xs text-white shadow-sm">Welcome {session.user.name}
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        type="button"
                        className="float-right rounded bg-indigo-400 py-1 px-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        sign out
                    </button>
                </div>
            </>
        )
    } else {
        return (<> </>)
    }
}