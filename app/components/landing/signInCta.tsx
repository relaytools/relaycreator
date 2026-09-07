"use client";
import { useSession } from "next-auth/react";
import useNip07Login from "../../../lib/useNip07Login";
import { signInStrip } from "./content";
import { ctaClass } from "./ctaButton";
import { FiArrowRight } from "react-icons/fi";

const extensions = [
    { label: "Nostore (iOS)", href: "https://apps.apple.com/us/app/nostore/id1666553677" },
    { label: "Kiwi Browser + nos2x (Android)", href: "https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&pli=1" },
    { label: "nos2x (desktop)", href: "https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" },
    { label: "Alby (desktop)", href: "https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe" },
];

export default function SignInCta() {
    const { data: session } = useSession();
    const { login, busy, needsExtension, dismiss } = useNip07Login("/#");

    if (session) return null;

    return (
        <section id="signin" className="scroll-mt-20 px-4 py-10 lg:py-16">
            <h2 className="text-center font-condensed font-bold text-2xl leading-tight">{signInStrip.heading}</h2>
            <div className="mx-auto mt-6 grid max-w-4xl gap-4 lg:grid-cols-2">
                <div className="landing-glass landing-card flex flex-col rounded-3xl p-6 lg:p-8">
                    <div className="font-mono text-[0.8125rem] uppercase tracking-[0.2em] text-(--brand)">New</div>
                    <h3 className="mt-2 font-condensed font-bold text-xl leading-tight">{signInStrip.feeds.title}</h3>
                    <p className="mt-2 opacity-80">{signInStrip.feeds.body}</p>
                    <div className="mt-auto pt-5">
                        <a href={signInStrip.feeds.href} className={ctaClass("primary", "md")}>
                            {signInStrip.feeds.button}
                            <FiArrowRight size={18} />
                        </a>
                    </div>
                </div>
                <div className="landing-glass landing-card flex flex-col rounded-3xl p-6 lg:p-8">
                    <div className="font-mono text-[0.8125rem] uppercase tracking-[0.2em] opacity-60">Legacy</div>
                    <h3 className="mt-2 font-condensed font-bold text-xl leading-tight">{signInStrip.legacy.title}</h3>
                    <p className="mt-2 opacity-80">{signInStrip.legacy.body}</p>
                    <div className="mt-auto pt-5">
                        <button onClick={login} disabled={busy} className={ctaClass("ghost", "md")}>
                            {busy ? <span className="loading loading-spinner" /> : signInStrip.legacy.button}
                        </button>
                    </div>
                </div>
            </div>

            {needsExtension && (
                <div className="landing-glass mx-auto mt-4 flex max-w-4xl flex-col items-start gap-3 rounded-2xl p-5">
                    <div className="font-bold">To sign in you need a NIP-07 extension</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {extensions.map((e) => (
                            <a key={e.href} href={e.href} className="link link-primary">
                                {e.label}
                            </a>
                        ))}
                    </div>
                    <button className={ctaClass("ghost", "sm")} onClick={dismiss}>
                        Close
                    </button>
                </div>
            )}
        </section>
    );
}
