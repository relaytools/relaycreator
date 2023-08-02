"use client"
import { useSession } from 'next-auth/react'
import { signIn, signOut } from "next-auth/react"
import Image from 'next/image';
import SwitchTheme from './components/SwitchTheme';
import { useState } from 'react';



export default function ShowSession() {
    const doNip07Login = async () => {
        // call to api to get a LoginToken

        const tokenResponse = await fetch(`/api/auth/logintoken`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        const tokenData = await tokenResponse.json()
        const token = tokenData.token

        let signThis = {
            kind: 27235,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: token,
        }

        try {
            let useMe = await (window as any).nostr.signEvent(signThis)
            signIn("credentials", {
                kind: useMe.kind,
                created_at: useMe.created_at,
                content: useMe.content,
                pubkey: useMe.pubkey,
                sig: useMe.sig,
                id: useMe.id,
                // callbackUrl: "/signup?relayname=" + name
            })
        } catch {
            console.log("error signing event")
            setShowLoginHelp(true)
        }
    }

    const { data: session, status } = useSession();
    const [showLoginHelp, setShowLoginHelp] = useState(false);

    return (
        <div className="font-jetbrains navbar bg-base-100 border-b border-base-200 pb-12">
            {showLoginHelp &&
                <dialog id="my_modal_5" className="modal modal-bottom modal-open sm:modal-middle">
                    <form method="dialog" className="modal-box">
                        <h3 className="font-bold text-lg">To sign-in you need a NIP-07 extension</h3>
                        <p className="py-4">for iOS: Nostore </p>
                        <a className="link link-primary" href="https://apps.apple.com/us/app/nostore/id1666553677">Nostore</a>
                        <p className="py-4">for Android: Kiwi Browser with nos2x</p>
                        <a className="link link-primary" href="https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&pli=1">Kiwi Browser</a>
                        <p className="py-4">for Desktop: Nos2x</p>
                        <a className="link link-primary" href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp">Nos2x</a>
                        <p className="py-4">for Desktop: GetAlby</p>
                        <a className="link link-primary" href="https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe">GetAlby</a>
                        <div className="modal-action">
                            {/* if there is a button in form, it will close the modal */}
                            <button className="btn" onClick={() => setShowLoginHelp(false)}>Close</button>
                        </div>
                    </form>
                </dialog>
            }
            <div className="flex-1">
                <a href="/" className="btn btn-ghost normal-case text-xl">relay creator</a>
            </div>

            <div className="flex-none">
                {!session ? (
                    <button
                        onClick={doNip07Login}
                        className="btn btn-ghost ml-2"
                    >
                        <span className="mr-2">nip-07</span>
                        <Image src="nostr_logo_prpl_wht_rnd.svg" alt="nip07" width={30} height={30} />
                        <span className="ml-2">Sign In</span>
                    </button>
                ) : (
                    <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn cursor-pointer mask mask-squircle">
                            <div className="w-10 rounded-full">
                                <Image src="nostr_logo_prpl_wht_rnd.svg" alt="nip07" width={100} height={100} />
                            </div>

                        </label>
                        <ul tabIndex={0} className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52 z-[1]">
                            <li className="border-b border-base-200"><SwitchTheme /></li>
                            <li><a href="/">Relays</a></li>
                            <li><a href="/invoices">Invoices</a></li>
                            <li className="border-b border-base-200"><a href="/signup">Create Relay</a></li>
                            <li>
                                <a onClick={() => signOut({ callbackUrl: "/" })} className="cursor-pointer">
                                    Sign Out
                                </a>
                            </li>

                        </ul>

                    </div>
                )}
            </div>
        </div>
    );
}
