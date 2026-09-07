import Image from "next/image";
import { SiAndroid } from "react-icons/si";
import type { Product } from "./content";
import InstallBadges from "./installBadges";
import FeedsFlow from "./feedsFlow";
import { featureIcons } from "./icons";
import CtaButton from "./ctaButton";

function AndroidMock({ product }: { product: Product }) {
    return (
        <div className="landing-glass relative overflow-hidden rounded-3xl p-5 shadow-2xl lg:p-8">
            <SiAndroid
                aria-hidden
                className="pointer-events-none absolute -right-10 -bottom-10 text-(--brand-3) opacity-10"
                size={260}
            />
            <div className="relative flex items-center gap-5">
                <Image
                    src="/landing/rt-icon.png"
                    alt={`${product.name} app icon`}
                    width={280}
                    height={280}
                    className="size-20 rounded-2xl shadow-lg"
                />
                <div>
                    <div className="font-condensed font-bold text-2xl leading-none">{product.name}</div>
                    <div className="mt-2 font-mono text-[0.8125rem] opacity-70">
                        Android · MIT · signed APKs
                    </div>
                </div>
            </div>
            <p className="relative mt-4 hidden text-[0.95rem] leading-relaxed opacity-80 lg:mt-6 lg:block">
                Install from Zapstore, or add our repo to Obtainium and get every release the
                moment it ships.
            </p>
            <div className="relative mt-4 lg:mt-6">
                <InstallBadges
                    name={product.name}
                    zapstore={product.install?.zapstore}
                    obtainium={product.install?.obtainium}
                />
            </div>
        </div>
    );
}

function CodeMock({ product }: { product: Product }) {
    return (
        <div className="space-y-4">
            <div className="mockup-code landing-glass hidden shadow-2xl text-[0.9rem] lg:block">
                {product.codeLines?.map((l, i) => (
                    <pre key={i} data-prefix={l.prefix} className={l.muted ? "opacity-60" : ""}>
                        <code>{l.text}</code>
                    </pre>
                ))}
            </div>
            {(product.badges || product.chips) && (
                <div className="hidden flex-wrap gap-2 lg:flex">
                    {product.badges?.map((b) => {
                        const Icon = featureIcons[b.icon];
                        return (
                            <span key={b.label} className="badge badge-outline gap-1.5 font-mono text-[0.75rem]">
                                <Icon size={13} className={b.icon === "bee" ? "text-(--brand)" : ""} /> {b.label}
                            </span>
                        );
                    })}
                    {product.chips?.map((c) => (
                        <span key={c} className="badge badge-ghost font-mono text-[0.75rem]">
                            {c}
                        </span>
                    ))}
                </div>
            )}
            {product.platforms && (
                <div className="landing-glass rounded-3xl p-4 lg:p-5">
                    <div className="font-mono text-[0.8125rem] uppercase tracking-[0.2em] opacity-70">
                        One engine · every platform
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {product.platforms.map((pl) => {
                            const Icon = featureIcons[pl.icon];
                            return (
                                <div key={pl.title} className="landing-glass flex flex-col rounded-2xl p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="landing-tint flex size-9 shrink-0 items-center justify-center rounded-xl">
                                            <Icon size={18} />
                                        </div>
                                        <div className="font-condensed font-bold text-lg leading-tight">{pl.title}</div>
                                    </div>
                                    <p className="mt-2 text-[0.95rem] leading-relaxed opacity-75">{pl.body}</p>
                                    {pl.chips && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {pl.chips.map((c) => (
                                                <span key={c} className="badge badge-ghost badge-sm font-mono text-[0.75rem]">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-auto pt-4">
                                        {pl.link && <CtaButton link={pl.link} variant="ghost" size="sm" />}
                                        {pl.install && product.install && (
                                            <InstallBadges
                                                name={product.name}
                                                zapstore={product.install.zapstore}
                                                obtainium={product.install.obtainium}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProductMedia({ product }: { product: Product }) {
    switch (product.media) {
        case "flow":
            return product.flow ? <FeedsFlow flow={product.flow} /> : null;
        case "android":
            return <AndroidMock product={product} />;
        case "code":
            return <CodeMock product={product} />;
        default:
            return null;
    }
}
