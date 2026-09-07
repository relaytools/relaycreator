import type { MetadataRoute } from "next";

function site(): string {
    return (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "https://relay.tools").replace(/\/$/, "");
}

// Served at /sitemap.xml. Only public marketing/browse pages are listed.
export default function sitemap(): MetadataRoute.Sitemap {
    const base = site();
    const now = new Date();
    return [
        { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
        { url: `${base}/directory`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
        { url: `${base}/relays`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    ];
}
