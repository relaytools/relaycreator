import type { Link } from "./content";
import { linkIcons } from "./icons";

export default function CodeLinks({ links, label = "Code" }: { links: Link[]; label?: string }) {
    if (!links.length) return null;
    return (
        <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[0.8125rem] uppercase tracking-[0.2em] opacity-60">
                {label}
            </span>
            {links.map((l) => {
                const Icon = l.icon ? linkIcons[l.icon] : null;
                return (
                    <a
                        key={l.href}
                        href={l.href}
                        target={l.external ? "_blank" : undefined}
                        rel={l.external ? "noopener noreferrer" : undefined}
                        className="landing-glass landing-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[0.9rem]"
                    >
                        {Icon && <Icon size={16} className="opacity-80" />}
                        {l.label}
                    </a>
                );
            })}
        </div>
    );
}
