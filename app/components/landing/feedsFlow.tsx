import { FiRss, FiServer, FiSmartphone, FiShield } from "react-icons/fi";
import type { FlowContent } from "./content";

/**
 * "How it works" diagram for feeds: follows' relays -> spider -> your relay -> your client.
 * Inline SVG, colours from the landing CSS variables, dots animated with SMIL
 * (hidden under prefers-reduced-motion via .landing-flow-dot).
 */
export default function FeedsFlow({ flow }: { flow: FlowContent }) {
    const sourceYs = [64, 150, 236];
    const spider = { x: 262, y: 150, r: 30 };
    const src = { x: 80, r: 22 };
    const relay = { x: 378, y: 122, w: 112, h: 56 };
    const client = { x: 378, y: 252, w: 112, h: 56 };
    const relayCx = relay.x + relay.w / 2;
    const relayCy = relay.y + relay.h / 2;

    const sourcePaths = sourceYs.map((y) => `M ${src.x + src.r + 2} ${y} C 170 ${y}, 190 ${spider.y}, ${spider.x - spider.r - 2} ${spider.y}`);
    const spiderToRelay = `M ${spider.x + spider.r + 2} ${spider.y} L ${relay.x - 2} ${relayCy}`;
    const relayToClient = `M ${relayCx} ${relay.y + relay.h + 2} L ${relayCx} ${client.y - 2}`;

    const label = "font-mono text-[10px] uppercase tracking-[0.08em]";

    return (
        <div className="landing-glass rounded-3xl p-4 lg:p-6">
            <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[0.8125rem] uppercase tracking-[0.2em] opacity-70">{flow.title}</div>
                <span className="badge badge-ghost gap-1 font-mono text-[0.7rem]">
                    <FiShield size={11} /> {flow.filterLabel}
                </span>
            </div>

            <svg viewBox="0 0 520 330" className="mt-3 w-full" role="img" aria-label={flow.aria}>
                <defs>
                    <linearGradient id="flow-line" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0" stopColor="var(--brand)" />
                        <stop offset="1" stopColor="var(--brand-2)" />
                    </linearGradient>
                </defs>

                {/* paths */}
                {[...sourcePaths, spiderToRelay, relayToClient].map((d, i) => (
                    <path key={i} d={d} fill="none" stroke="url(#flow-line)" strokeWidth="1.5" strokeOpacity="0.45" strokeDasharray="4 5" />
                ))}

                {/* animated dots */}
                {sourcePaths.map((d, i) => (
                    <circle key={`s${i}`} r="4" fill="var(--brand)" className="landing-flow-dot">
                        <animateMotion dur="3.2s" begin={`${i * 0.9}s`} repeatCount="indefinite" path={d} />
                    </circle>
                ))}
                <circle r="4" fill="var(--brand-2)" className="landing-flow-dot">
                    <animateMotion dur="1.6s" begin="0.4s" repeatCount="indefinite" path={spiderToRelay} />
                </circle>
                <circle r="4" fill="var(--brand-3)" className="landing-flow-dot">
                    <animateMotion dur="1.8s" begin="1s" repeatCount="indefinite" path={relayToClient} />
                </circle>

                {/* sources: everyone you follow */}
                {sourceYs.map((y, i) => (
                    <g key={y}>
                        <circle cx={src.x} cy={y} r={src.r} fill="var(--glass-bg)" stroke="var(--glass-border)" />
                        <FiServer x={src.x - 10} y={y - 10} size={20} className="opacity-70" />
                        {i === sourceYs.length - 1 && (
                            <text x={src.x} y={y + src.r + 18} textAnchor="middle" fill="currentColor" className={`${label} opacity-70`}>
                                {flow.sources}
                            </text>
                        )}
                    </g>
                ))}

                {/* spider */}
                <circle cx={spider.x} cy={spider.y} r={spider.r} fill="var(--glass-bg)" stroke="var(--brand)" strokeWidth="1.5" />
                <FiRss x={spider.x - 12} y={spider.y - 12} size={24} className="text-(--brand)" />
                <text x={spider.x} y={spider.y + spider.r + 18} textAnchor="middle" fill="currentColor" className={`${label} opacity-70`}>
                    {flow.spider}
                </text>

                {/* your relay */}
                <rect x={relay.x} y={relay.y} width={relay.w} height={relay.h} rx="14" fill="var(--glass-bg)" stroke="var(--brand-2)" strokeWidth="1.5" />
                <FiServer x={relayCx - 10} y={relay.y + 10} size={20} className="text-(--brand-2)" />
                <text x={relayCx} y={relay.y + 46} textAnchor="middle" fill="currentColor" className={label}>
                    {flow.relay}
                </text>

                {/* your client */}
                <rect x={client.x} y={client.y} width={client.w} height={client.h} rx="14" fill="var(--glass-bg)" stroke="var(--glass-border)" />
                <FiSmartphone x={relayCx - 10} y={client.y + 10} size={20} className="opacity-70" />
                <text x={relayCx} y={client.y + 46} textAnchor="middle" fill="currentColor" className={label}>
                    {flow.client}
                </text>
            </svg>

            <div className="mt-2 text-center font-mono text-[0.75rem] opacity-60">{flow.relayUrl}</div>
        </div>
    );
}
