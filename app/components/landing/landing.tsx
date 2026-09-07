import Backdrop from "./backdrop";
import Hero from "./hero";
import ProductSection from "./productSection";
import SignInCta from "./signInCta";
import Footer from "./footer";
import { products } from "./content";
import StructuredData from "./structuredData";

export default function Landing() {
    return (
        <main className="relative">
            <StructuredData />
            <Backdrop />
            <Hero />
            <div className="divide-y divide-base-content/10">
                {products.map((p, i) => (
                    <ProductSection key={p.id} product={p} index={i} />
                ))}
            </div>
            <SignInCta />
            <Footer />
        </main>
    );
}
