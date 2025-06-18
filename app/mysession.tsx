"use client";
import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function ShowSession(
    props: React.PropsWithChildren<{
        theme: string;
    }>
) {
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
            // jun2025, trying the one key method again, the other signers with bugs are gone
            // this allows us to only ask for one permission from the signer extension
            //const thisPubkeyRes = await (window as any).nostr.getPublicKey();
            let signThis = {
                kind: 27235,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                //pubkey: thisPubkeyRes,
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
    const [curTheme, setCurTheme] = useState(props.theme);

    useEffect(() => {
        // Get the current theme from the data-theme attribute
        const savedTheme = document.documentElement.getAttribute("data-theme");
        if (savedTheme) {
            setCurTheme(savedTheme);
        }

        // Set up a MutationObserver to watch for changes to the data-theme attribute
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "data-theme"
                ) {
                    const newTheme =
                        document.documentElement.getAttribute("data-theme");
                    if (newTheme) {
                        setCurTheme(newTheme);
                    }
                }
            });
        });

        // Observe changes to the data-theme attribute on the <html> element
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        // Clean up the observer when the component unmounts
        return () => {
            observer.disconnect();
        };
    }, []);

    // using absolute urls so that we can serve subdomain landing pages
    const rootDomain =
        process.env.NEXT_PUBLIC_ROOT_DOMAIN || "http://localhost:3000";

    const supportURL = process.env.NEXT_PUBLIC_SUPPORT_URL || "#";

    return (
        <div className="navbar p-0 bg-base-100">
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
                                className="btn uppercase"
                                onClick={() => setShowLoginHelp(false)}
                            >
                                Close
                            </button>
                        </div>
                    </form>
                </dialog>
            )}
            {curTheme == "dark" && (
                <div className="flex-1">
                    <a
                        href={rootDomain + "/"}
                        className="lg:text-5xl font-extrabold text-2xl flex items-center justify-start max-h-40"
                    >
                        <Image
                            src="/17.svg"
                            alt="menu"
                            width={500}
                            height={30}
                            priority
                            style={{ width: '500px', height: 'auto', objectFit: 'cover' }}
                        />
                    </a>
                </div>
            )}
            {curTheme != "dark" && (
                <div className="flex-1">
                    <a
                        href={rootDomain + "/"}
                        className="lg:text-5xl font-extrabold text-2xl flex items-center justify-start max-h-40"
                    >
                        <Image
                            src="/19.svg"
                            alt="menu"
                            width={500}
                            height={30}
                            priority
                            style={{ width: '500px', height: 'auto', objectFit: 'cover' }}
                        />
                    </a>
                </div>
            )}

            <div className="flex-none items-center justify-center">
                {!session ? (
                    <div className="flex">
                        <a
                            href={rootDomain + "/"}
                            className="btn uppercase btn-ghost normal-case text-lg hidden lg:flex"
                        >
                            HOME
                        </a>
                        <a
                            href={
                                "https://github.com/relaytools/relaycreator/blob/f253d2aa81bf385816f750f730c687c96b61ce6e/design/UserStories.md"
                            }
                            className="btn uppercase btn-ghost normal-case text-lg hidden lg:flex"
                        >
                            FAQ
                        </a>
                        <a
                            href={supportURL}
                            className="btn uppercase btn-ghost normal-case text-lg hidden lg:flex"
                        >
                            SUPPORT
                        </a>

                        <span className="text-center items-center hidden lg:flex">
                            <button
                                onClick={doNip07Login}
                                className="btn uppercase btn-ghost normal-case text-lg hidden lg:flex ml-2"
                            >
                                SIGN-IN
                            </button>
                        </span>

                        <div className="dropdown dropdown-end lg:hidden">
                            <label
                                tabIndex={0}
                                className="btn uppercase cursor-pointer mask mask-squircle"
                            >
                                <div className="rounded-sm bg-white">
                                    <Image
                                        src="/settings2-svgrepo-com.svg"
                                        alt="menu"
                                        width={30}
                                        height={30}
                                    />
                                </div>
                            </label>
                            <ul
                                tabIndex={0}
                                className="menu menu-lg dropdown-content mt-3 p-2 shadow-sm bg-base-200 font-bold rounded-box w-52 z-1"
                            >
                                <li>
                                    <a href={rootDomain + "/"}>Faq</a>
                                </li>
                                <li>
                                    <a href={supportURL}>Support</a>
                                </li>
                                <li className="border-b border-neutral">
                                    <a href={rootDomain + "/signup"}>
                                        Create Relay
                                    </a>
                                </li>
                                <li>
                                    <span className="text-center items-center">
                                        <button
                                            onClick={doNip07Login}
                                            className="btn uppercase btn-ghost ml-2"
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
                            className="flex items-center justify-center mr-2"
                        >
                            {session?.user?.image && (
                                <div className="avatar">
                                    <div className="w-10 rounded-full">
                                        <img src={session?.user?.image} />
                                    </div>
                                </div>
                            )}
                            {!session?.user?.image && (
                                <div className="avatar placeholder">
                                    {curTheme == "dark" && (
                                        <div className="bg-primary text-white font-condensed rounded-full w-10">
                                            <span className="text-lg">
                                                {session.user?.name?.substring(
                                                    0,
                                                    4
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {curTheme != "dark" && (
                                        <div className="bg-base-200 text-black font-condensed rounded-full w-15">
                                            <span className="text-lg">
                                                {session.user?.name?.substring(
                                                    0,
                                                    4
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </label>
                        <ul
                            tabIndex={0}
                            className="menu menu-lg dropdown-content mt-3 p-2 shadow-lg bg-base-100 font-bold rounded-box w-52 z-50"
                        >
                            <li>
                                <a href={rootDomain + "/?myrelays=true"}>
                                    My Relays
                                </a>
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
