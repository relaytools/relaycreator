import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import authOptions from "../pages/api/auth/[...nextauth]";
import RelayDashboard from "./relays/relayDashboard";
import Landing from "./components/landing/landing";

function siteUrl(): URL {
    try {
        return new URL(process.env.NEXT_PUBLIC_ROOT_DOMAIN || "https://relay.tools");
    } catch {
        return new URL("https://relay.tools");
    }
}

const title = "relay.tools — Hosted nostr relays, Relay Tools for Android, and Newlay";
const description =
    "Hosted personal and community nostr relays paid in sats, a relay-first Android client, and Newlay: a high-speed open-source relay with Blossom support.";

export const metadata: Metadata = {
    metadataBase: siteUrl(),
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    keywords: ["nostr", "relay", "nostr relay hosting", "outbox relay", "NIP-29", "Blossom", "Android nostr client", "Newlay", "relay.tools"],
    openGraph: {
        title,
        description,
        url: "/",
        siteName: "relay.tools",
        type: "website",
        images: [{ url: "/landing/og.png", width: 1200, height: 630, alt: "relay.tools" }],
    },
    twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/landing/og.png"],
    },
};

export default async function Home() {
    const session = await getServerSession(authOptions);

    // Existing customers: same dashboard as before (identical to /relays logged-in branch).
    if (session && (session as any).user?.name) {
        return (
            <div>
                <RelayDashboard />
            </div>
        );
    }

    return <Landing />;
}
