"use client";
import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";

export default function ShowSession() {
    const doNip07Login = async () => {
        // call to api to get a LoginToken

        const tokenResponse = await fetch(`/api/auth/logintoken`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        const tokenData = await tokenResponse.json();
        const token = tokenData.token;

        // we could support keys.band by requesting the pubkey,
        // for now we will wait and see if upstream accepts the pull request to not require this:
        // https://github.com/toastr-space/keys-band/pull/13
        // now tracking issue in Spring as well.
        // adding additional call to support new signing clients -- until we can get bugs fixed upstream
        // oct-20 update, attempting to re-enable one event sign-in
        try {
            const thisPubkeyRes = await (window as any).nostr.getPublicKey();
            let signThis = {
                kind: 27235,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                pubkey: thisPubkeyRes,
                content: token,
            };
            let useMe = await (window as any).nostr.signEvent(signThis);
            signIn("credentials", {
                kind: useMe.kind,
                created_at: useMe.created_at,
                content: useMe.content,
                pubkey: useMe.pubkey,
                sig: useMe.sig,
                id: useMe.id,
                callbackUrl: "/#",
                // callbackUrl: "/signup?relayname=" + name
            });
        } catch {
            console.log("error signing event");
            setShowLoginHelp(true);
        }
    };

    const { data: session, status } = useSession();
    const [showLoginHelp, setShowLoginHelp] = useState(false);

    // using absolute urls so that we can serve subdomain landing pages
    const rootDomain =
        process.env.NEXT_PUBLIC_ROOT_DOMAIN || "http://localhost:3000";

    const supportURL = process.env.NEXT_PUBLIC_SUPPORT_URL || "#";

    return (
        <div className="font-jetbrains navbar bg-base-100 flex">
            {showLoginHelp && (
                <dialog
                    id="my_modal_5"
                    className="modal modal-bottom modal-open sm:modal-middle"
                >
                    <form method="dialog" className="modal-box">
                        <h3 className="font-bold text-lg">
                            To sign-in you need a NIP-07 extension
                        </h3>
                        <p className="py-4">for iOS: Nostore </p>
                        <a
                            className="link link-primary"
                            href="https://apps.apple.com/us/app/nostore/id1666553677"
                        >
                            Nostore
                        </a>
                        <p className="py-4">
                            for Android: Kiwi Browser with nos2x
                        </p>
                        <a
                            className="link link-primary"
                            href="https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&pli=1"
                        >
                            Kiwi Browser
                        </a>
                        <p className="py-4">for Desktop: Nos2x</p>
                        <a
                            className="link link-primary"
                            href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp"
                        >
                            Nos2x
                        </a>
                        <p className="py-4">for Desktop: GetAlby</p>
                        <a
                            className="link link-primary"
                            href="https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe"
                        >
                            GetAlby
                        </a>
                        <div className="modal-action">
                            {/* if there is a button in form, it will close the modal */}
                            <button
                                className="btn"
                                onClick={() => setShowLoginHelp(false)}
                            >
                                Close
                            </button>
                        </div>
                    </form>
                </dialog>
            )}
            <div className="flex-1">
                <a
                    href={rootDomain + "/"}
                    className="btn btn-ghost normal-case text-xl"
                >
                    relay.tools
                </a>
            </div>

            <div className="flex-none">
                {!session ? (
                    <div className="flex">
                        <a
                            href={rootDomain + "/"}
                            className="btn btn-ghost normal-case text-lg hidden lg:flex"
                        >
                            home
                        </a>
                        <a
                            href={
                                "https://github.com/relaytools/relaycreator/blob/f253d2aa81bf385816f750f730c687c96b61ce6e/design/UserStories.md"
                            }
                            className="btn btn-ghost normal-case text-lg hidden lg:flex"
                        >
                            faq
                        </a>
                        <a
                            href={supportURL}
                            className="btn btn-ghost normal-case text-lg hidden lg:flex"
                        >
                            support
                        </a>

                        <span className="text-center items-center hidden lg:flex">
                            <button
                                onClick={doNip07Login}
                                className="btn btn-ghost ml-2"
                            >
                                sign-in
                                <Image
                                    alt="nostr"
                                    src="/nostr_logo_prpl_wht_rnd.svg"
                                    width={38}
                                    height={38}
                                ></Image>
                            </button>
                        </span>

                        <div className="dropdown dropdown-end lg:hidden">
                            <label
                                tabIndex={0}
                                className="btn cursor-pointer mask mask-squircle"
                            >
                                <div className="w-10 rounded-full">
                                    <Image
                                        src="/menu-icon-priority.png"
                                        alt="menu"
                                        width={100}
                                        height={100}
                                    />
                                </div>
                            </label>
                            <ul
                                tabIndex={0}
                                className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52 z-[1]"
                            >
                                <li>
                                    <a href={rootDomain + "/"}>Faq</a>
                                </li>
                                <li>
                                    <a href={supportURL}>Support</a>
                                </li>
                                <li className="border-b border-base-200">
                                    <a href={rootDomain + "/signup"}>
                                        Create Relay
                                    </a>
                                </li>
                                <li>
                                    <span className="text-center items-center">
                                        <button
                                            onClick={doNip07Login}
                                            className="btn btn-ghost ml-2"
                                        >
                                            sign-in
                                            <Image
                                                alt="nostr"
                                                src="/nostr_logo_prpl_wht_rnd.svg"
                                                width={38}
                                                height={38}
                                            ></Image>
                                        </button>
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="dropdown dropdown-end">
                        <label
                            tabIndex={0}
                            className="btn cursor-pointer mask mask-squircle"
                        >
                            <div className="w-10 rounded-full">
                                <Image
                                    src="/menu-icon.svg"
                                    alt="logged in"
                                    width={100}
                                    height={100}
                                />
                            </div>
                        </label>
                        <ul
                            tabIndex={0}
                            className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52 z-[1]"
                        >
                            <li>
                                <a href={rootDomain + "/"}>Relays</a>
                            </li>
                            <li>
                                <a href={rootDomain + "/invoices"}>Invoices</a>
                            </li>
                            <li>
                                <a href={supportURL}>Support</a>
                            </li>
                            <li className="border-b border-base-200">
                                <a href={rootDomain + "/signup"}>
                                    Create Relay
                                </a>
                            </li>
                            <li>
                                <a
                                    onClick={() =>
                                        signOut({ callbackUrl: "/" })
                                    }
                                    className="cursor-pointer"
                                >
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
