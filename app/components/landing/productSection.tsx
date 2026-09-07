import type { Product } from "./content";
import CtaButton from "./ctaButton";
import FeatureGrid from "./featureGrid";
import CodeLinks from "./codeLinks";
import ProductMedia from "./productMedia";

export default function ProductSection({ product, index }: { product: Product; index: number }) {
    const flip = index % 2 === 1;
    return (
        <section id={product.id} className="scroll-mt-20 px-4 py-10 lg:py-24">
            <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-16">
                <div className={`lg:col-span-6 ${flip ? "lg:order-2" : ""}`}>
                    {product.pulse ? (
                        <div className="landing-glass inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 font-mono text-[0.8125rem] uppercase tracking-[0.2em]">
                            <span className="landing-dot size-2 rounded-full bg-(--brand)" />
                            {product.eyebrow}
                        </div>
                    ) : (
                        <div className="font-mono text-[0.8125rem] uppercase tracking-[0.2em] text-(--brand)">
                            {product.eyebrow}
                        </div>
                    )}
                    <h2 className="mt-3 font-condensed font-bold text-[clamp(2rem,4.5vw,3.25rem)] leading-tight tracking-tight">
                        {product.headline}
                    </h2>
                    <p className="mt-3 leading-relaxed opacity-80 lg:hidden">{product.taglineShort}</p>
                    <p className="mt-5 hidden text-lg leading-relaxed opacity-80 lg:block">{product.tagline}</p>

                    {product.actions.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-3 lg:mt-8">
                            {product.actions.map((a, i) => (
                                <CtaButton
                                    key={a.href + a.label}
                                    link={a}
                                    variant={i === 0 ? "primary" : "ghost"}
                                    size="md"
                                    arrow={i === 0}
                                    className="landing-btn-grow"
                                />
                            ))}
                        </div>
                    )}

                    <div className="hidden lg:block">
                        <CodeLinks links={product.code} />
                    </div>
                </div>
                <div className={`lg:col-span-6 ${flip ? "lg:order-1" : ""}`}>
                    <ProductMedia product={product} />
                </div>
            </div>

            <FeatureGrid id={product.id} features={product.features} />
        </section>
    );
}
