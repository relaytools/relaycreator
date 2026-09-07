import { products } from "./content";

// JSON-LD for search engines: the organisation, the site, and the two installable apps.
export default function StructuredData() {
    const site = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "https://relay.tools").replace(/\/$/, "");
    const android = products.find((p) => p.id === "android");
    const newlay = products.find((p) => p.id === "newlay");

    const graph: Record<string, unknown>[] = [
        {
            "@type": "Organization",
            "@id": `${site}/#org`,
            name: "relay.tools",
            url: site,
            logo: `${site}/rtlogo2.png`,
            sameAs: ["https://github.com/relaytools", "https://code.relay.tools"],
        },
        {
            "@type": "WebSite",
            "@id": `${site}/#website`,
            url: site,
            name: "relay.tools",
            publisher: { "@id": `${site}/#org` },
        },
    ];

    if (android) {
        graph.push({
            "@type": "SoftwareApplication",
            name: android.name,
            description: android.tagline,
            applicationCategory: "SocialNetworkingApplication",
            operatingSystem: "Android",
            license: "https://opensource.org/licenses/MIT",
            downloadUrl: android.install?.zapstore,
            softwareHelp: android.code[0]?.href,
            author: { "@id": `${site}/#org` },
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        });
    }
    if (newlay) {
        graph.push({
            "@type": "SoftwareApplication",
            name: newlay.name,
            description: newlay.tagline,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Linux, Android",
            license: "https://opensource.org/licenses/MIT",
            softwareHelp: newlay.code[0]?.href,
            author: { "@id": `${site}/#org` },
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        });
    }

    const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
