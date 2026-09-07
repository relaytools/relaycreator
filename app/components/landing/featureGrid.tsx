import type { Feature } from "./content";
import { featureIcons } from "./icons";

const grid = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4";

function Card({ f }: { f: Feature }) {
    const Icon = featureIcons[f.icon];
    return (
        <div className="landing-glass landing-card rounded-2xl p-5 lg:p-6">
            <div className="flex items-center gap-3 lg:block">
                <div className="landing-tint flex size-9 shrink-0 items-center justify-center rounded-xl lg:size-10">
                    <Icon size={20} />
                </div>
                <h3 className="font-condensed font-bold text-lg leading-tight lg:mt-4">{f.title}</h3>
            </div>
            <p className="mt-2 text-[0.95rem] leading-relaxed opacity-75">{f.body}</p>
        </div>
    );
}

/**
 * Small screens show the first three features and a "show more" toggle
 * (pure CSS via a hidden checkbox); large screens always show everything.
 */
export default function FeatureGrid({ id, features }: { id: string; features: Feature[] }) {
    const first = features.slice(0, 3);
    const rest = features.slice(3);
    const toggleId = `${id}-more-features`;
    return (
        <div className="mt-8 lg:mt-12">
            <div className={grid}>
                {first.map((f) => <Card key={f.title} f={f} />)}
            </div>
            {rest.length > 0 && (
                <>
                    <input type="checkbox" id={toggleId} className="peer sr-only" />
                    <div className={`${grid} mt-3 hidden peer-checked:grid lg:mt-4 lg:grid`}>
                        {rest.map((f) => <Card key={f.title} f={f} />)}
                    </div>
                    <div className="mt-3 text-center peer-checked:hidden lg:hidden">
                        <label htmlFor={toggleId} className="landing-btn landing-btn-ghost landing-btn-sm cursor-pointer">
                            Show {rest.length} more
                        </label>
                    </div>
                </>
            )}
        </div>
    );
}
