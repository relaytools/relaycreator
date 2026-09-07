import Image from "next/image";
import { FiZap } from "react-icons/fi";
import { obtainiumLink, type ObtainiumApp } from "./content";

export function ObtainiumBadge({ app }: { app: ObtainiumApp }) {
    return (
        <a
            href={obtainiumLink(app)}
            className="landing-badge"
            title={`Install ${app.name} with Obtainium`}
        >
            <Image
                src="/landing/badge_obtainium.png"
                alt={`Install ${app.name} with Obtainium`}
                width={564}
                height={168}
                className="h-12 w-auto"
            />
        </a>
    );
}

export function ZapstoreBadge({ href, name }: { href: string; name: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-badge gap-3 border border-white/15 bg-[#0f0f14] px-4 text-white"
            title={`Get ${name} on Zapstore`}
        >
            <span className="flex size-7 items-center justify-center rounded-md bg-[#7c3aed] text-white">
                <FiZap size={16} />
            </span>
            <span className="flex flex-col leading-none">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] opacity-75">
                    Get it on
                </span>
                <span className="mt-1 font-condensed font-bold text-[1.15rem]">Zapstore</span>
            </span>
        </a>
    );
}

export default function InstallBadges({
    name,
    zapstore,
    obtainium,
}: {
    name: string;
    zapstore?: string;
    obtainium?: ObtainiumApp;
}) {
    if (!zapstore && !obtainium) return null;
    return (
        <div className="flex flex-wrap items-center gap-3">
            {zapstore && <ZapstoreBadge href={zapstore} name={name} />}
            {obtainium && <ObtainiumBadge app={obtainium} />}
        </div>
    );
}
