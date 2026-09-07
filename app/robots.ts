import type { MetadataRoute } from "next";

function site(): string {
    return (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "https://relay.tools").replace(/\/$/, "");
}

// Served at /robots.txt. Middleware skips paths with a file extension, so
// this is reachable on the root domain and on relay subdomains alike.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/api/",
                    "/superadmin",
                    "/invoices",
                    "/clientinvoices",
                    "/nip05",
                    "/relays/myrelays",
                    "/curator",
                    "/signup",
                    "/lightningsuccess",
                ],
            },
        ],
        sitemap: `${site()}/sitemap.xml`,
    };
}
