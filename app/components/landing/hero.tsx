import { hero } from "./content";
import { featureIcons } from "./icons";
import CtaButton from "./ctaButton";
import InstallBadges from "./installBadges";
import { FiChevronRight } from "react-icons/fi";

export default function Hero() {
    return (
        <section className="relative px-4 pt-10 pb-8 text-center lg:pt-28 lg:pb-20">
            <h1 className="mx-auto max-w-5xl font-condensed font-bold text-[clamp(2.75rem,7vw,5.75rem)] leading-[1.02] tracking-tight">
                {hero.headline}{" "}
                <span className="landing-gradient-text">{hero.headlineAccent}</span>
            </h1>

            <p className="mx-auto mt-4 max-w-3xl leading-relaxed opacity-80 lg:hidden">
                {hero.subheadShort}
            </p>
            <p className="mx-auto mt-6 hidden max-w-3xl text-lg leading-relaxed opacity-80 lg:block lg:text-xl">
                {hero.subhead}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:mt-10 lg:gap-4">
                <CtaButton link={hero.primary} size="lg" arrow />
                <CtaButton link={hero.secondary} variant="ghost" size="lg" className="hidden lg:inline-flex" />
            </div>

            {/* Small screens: get the app straight away */}
            <div className="mx-auto mt-6 max-w-sm lg:hidden">
                <div className="mb-3 font-mono text-[0.8125rem] uppercase tracking-[0.2em] opacity-70">
                    {hero.mobileApp.label}
                </div>
                <div className="flex justify-center">
                    <InstallBadges
                        name={hero.mobileApp.obtainium.name}
                        zapstore={hero.mobileApp.zapstore}
                        obtainium={hero.mobileApp.obtainium}
                    />
                </div>
            </div>

            {/* Product jump links: stacked cards on small screens, chips on large */}
            <div className="mx-auto mt-8 grid max-w-sm gap-2 lg:mt-14 lg:flex lg:max-w-none lg:flex-wrap lg:justify-center lg:gap-3">
                {hero.chips.map((c) => {
                    const Icon = featureIcons[c.icon];
                    return (
                        <a
                            key={c.href}
                            href={c.href}
                            className="landing-glass landing-card flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-condensed text-lg lg:inline-flex lg:rounded-full lg:px-5 lg:py-2"
                        >
                            <Icon size={18} className="shrink-0 text-(--brand)" />
                            <span className="flex-1">{c.label}</span>
                            <FiChevronRight size={18} className="opacity-50 lg:hidden" />
                        </a>
                    );
                })}
            </div>
        </section>
    );
}
