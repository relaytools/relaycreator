import { footer } from "./content";

export default function Footer() {
    return (
        <footer className="px-4 pt-4 pb-10 lg:pt-8 lg:pb-12">
            <div className="landing-glass rounded-3xl p-6 lg:p-8">
                <div className="grid gap-5 sm:grid-cols-3 sm:gap-8">
                    {footer.columns.map((col) => (
                        <div key={col.title}>
                            <div className="font-mono text-[0.8125rem] uppercase tracking-[0.2em] opacity-60">
                                {col.title}
                            </div>
                            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 sm:mt-3 sm:block sm:space-y-2">
                                {col.links.map((l) => (
                                    <li key={l.href + l.label}>
                                        <a
                                            href={l.href}
                                            target={l.external ? "_blank" : undefined}
                                            rel={l.external ? "noopener noreferrer" : undefined}
                                            className="link link-hover text-[0.95rem] sm:text-base"
                                        >
                                            {l.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="mt-6 border-t border-base-content/10 pt-5 text-center font-mono text-[0.8125rem] opacity-60 lg:mt-8 lg:pt-6">
                    {footer.note}
                </div>
            </div>
        </footer>
    );
}
