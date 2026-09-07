// ---------------------------------------------------------------------------
// Landing page copy + links. Edit this file to change what the page says.
// Components under app/components/landing/ only render what is declared here.
// ---------------------------------------------------------------------------
import { migrationName, migrationUrl } from "../../../lib/migration";
import { supportUrl, supportEmail } from "../../../lib/support";

export type IconKey =
    | "rss" | "users" | "shield" | "zap" | "search" | "activity" | "database"
    | "refresh" | "smartphone" | "lock" | "image" | "book" | "message" | "globe"
    | "key" | "upload" | "cpu" | "layers" | "eyeoff" | "git" | "terminal"
    | "sliders" | "server" | "tor" | "bee" | "kotlin";

export type LinkIcon = "gitlab" | "github" | "docker" | "relay" | "external" | "download" | "tag";

export type Link = {
    label: string;
    href: string;
    icon?: LinkIcon;
    /** open in a new tab */
    external?: boolean;
};

export type Feature = { icon: IconKey; title: string; body: string };

/** Labels for the feeds "how it works" diagram */
export type FlowContent = {
    title: string;
    aria: string;
    sources: string;
    spider: string;
    filterLabel: string;
    relay: string;
    relayUrl: string;
    client: string;
};

/** Obtainium app config: https://wiki.obtainium.imranr.dev/deep_links/ */
export type ObtainiumApp = { id: string; url: string; name: string };

export type Product = {
    id: "feeds" | "android" | "newlay";
    eyebrow: string;
    /** render the eyebrow as a glass pill with a pulsing dot */
    pulse?: boolean;
    name: string;
    headline: string;
    tagline: string;
    /** one-liner shown instead of tagline on small screens */
    taglineShort: string;
    features: Feature[];
    /** primary buttons under the tagline */
    actions: Link[];
    /** "where the code lives" pills */
    code: Link[];
    /** small mono chips (e.g. supported NIPs) */
    chips?: string[];
    /** highlighted chips with an icon, shown before `chips` */
    badges?: { icon: IconKey; label: string }[];
    media: "flow" | "android" | "code";
    /** media === "flow" */
    flow?: FlowContent;
    /** media === "code" */
    codeLines?: { prefix: string; text: string; muted?: boolean }[];
    /** media === "code": platform tiles shown under the terminal (one with install: true gets the badges) */
    platforms?: { icon: IconKey; title: string; body: string; chips?: string[]; link?: Link; install?: boolean }[];
    /** install badges (android + phone relay) */
    install?: {
        zapstore?: string;
        obtainium?: ObtainiumApp;
    };
};

// --- Obtainium deep links ---------------------------------------------------
// Recommended badge form: goes through the Obtainium redirect page, which opens
// the app if installed and otherwise shows a "get Obtainium" prompt.
export function obtainiumLink(app: ObtainiumApp): string {
    const cfg = {
        id: app.id,
        url: app.url,
        author: "relay.tools",
        name: app.name,
        preferredApkIndex: 0,
        additionalSettings: "{}",
    };
    const deep = "obtainium://app/" + encodeURIComponent(JSON.stringify(cfg));
    return "https://apps.obtainium.imranr.dev/redirect?r=" + encodeURIComponent(deep);
}

// Simpler alternative (needs Obtainium installed; no fallback page):
export function obtainiumAddLink(app: ObtainiumApp): string {
    return "obtainium://add/" + app.url;
}

const feedsUrl = migrationUrl || "https://feeds.relay.tools";

// --- Hero -------------------------------------------------------------------
export const hero = {
    headline: "Relays,",
    headlineAccent: "your way.",
    subhead:
        "Your feed, your community, your relay — and the tools to run and browse them. Hosted relays paid in sats, a relay-first Android app, and an open-source relay engine that runs on a server or in your pocket.",
    /** shown instead of subhead on small screens */
    subheadShort: "Hosted relays, a relay-first Android app, and an open-source relay engine.",
    primary: { label: "Start your relay", href: feedsUrl } as Link,
    secondary: { label: "Get the Android app", href: "#android" } as Link,
    chips: [
        { label: "feeds", href: "#feeds", icon: "rss" as IconKey },
        { label: "Relay Tools for Android", href: "#android", icon: "smartphone" as IconKey },
        { label: "Newlay", href: "#newlay", icon: "server" as IconKey },
    ],
    /** small-screen only: install badges shown right under the hero buttons */
    mobileApp: {
        label: "Relay Tools for Android",
        zapstore: "https://zapstore.dev/apps/tools.relay.relaytools",
        obtainium: { id: "tools.relay.relaytools", url: "https://apks.relay.tools/RelayTools-android", name: "Relay Tools" } as ObtainiumApp,
    },
};

// --- Products ---------------------------------------------------------------
export const products: Product[] = [
    {
        id: "feeds",
        eyebrow: "Hosted relays · now open",
        pulse: true,
        name: "feeds",
        headline: "Your feed. Your community. Your relay.",
        tagline:
            "A personal relay that spiders every note from everyone you follow — or a community relay with groups, invites, moderation and media hosting. Yours either way. 14-day free trial, pay with lightning.",
        taglineShort: "Personal and community relays, paid in sats. 14-day free trial.",
        media: "flow",
        flow: {
            title: "How a personal feed works",
            aria: "Diagram: the relays of everyone you follow feed the feeds spider, which fills your relay, which your client reads.",
            sources: "everyone you follow",
            spider: "feeds spider",
            filterLabel: "web-of-trust filter",
            relay: "your relay",
            relayUrl: "wss://you.feeds.relay.tools",
            client: "your client",
        },
        features: [
            { icon: "rss", title: "Outbox spidering", body: "We crawl your follows' write relays so nothing they post slips past you — your client reads one relay." },
            { icon: "users", title: "Communities, too", body: "Open or invite-tree communities with NIP-29 groups, moderation tiers and Blossom media hosting." },
            { icon: "refresh", title: "Your notes, backed up", body: "Negentropy-syncs your entire authored history into a relay you control." },
            { icon: "zap", title: "Pay with lightning", body: "No email, no card, no account. Sign in with nostr, top up with sats." },
            { icon: "shield", title: "Web-of-trust filtering", body: "Spam scored against your social graph instead of a blocklist." },
            { icon: "tor", title: "Reachable over Tor", body: "The whole app and every relay can run as an onion service — no clearnet DNS required." },
        ],
        actions: [
            { label: "Start a free trial", href: feedsUrl },
            { label: `Visit ${migrationName}`, href: feedsUrl, icon: "external" },
        ],
        code: [],
    },
    {
        id: "android",
        eyebrow: "Android app",
        name: "Relay Tools",
        headline: "Browse, search and manage nostr relays.",
        tagline:
            "A relay-first nostr client for Android. Pick a relay and explore what lives on it, then manage it if you run it. Signed APKs, no app store account needed.",
        taglineShort: "A relay-first nostr client. Explore any relay, manage the ones you run.",
        media: "android",
        features: [
            { icon: "layers", title: "Browse any relay", body: "Notes, threads, topics, long-form articles, books and media streams — one relay at a time." },
            { icon: "search", title: "Find things fast", body: "Full-text search on NIP-50 relays, plus lookups by npub, note id, nevent or naddr." },
            { icon: "message", title: "Group chats", body: "NIP-29 groups with @-mentions, autocomplete and media." },
            { icon: "activity", title: "Relay health", body: "Uptime and latency from NIP-66 monitors before you connect." },
            { icon: "sliders", title: "Run your relay", body: "NIP-86 management: ban or allow pubkeys, moderate content, extended controls for relay.tools and newlay relays." },
            { icon: "key", title: "Sign with Amber", body: "NIP-55 signing, outbox delivery to your write relays, uploads to your Blossom servers." },
        ],
        actions: [],
        install: {
            zapstore: "https://zapstore.dev/apps/tools.relay.relaytools",
            obtainium: {
                id: "tools.relay.relaytools",
                url: "https://apks.relay.tools/RelayTools-android",
                name: "Relay Tools",
            },
        },
        code: [
            { label: "RelayTools-android", href: "https://code.relay.tools/opensauce/RelayTools-android", icon: "gitlab", external: true },
        ],
    },
    {
        id: "newlay",
        eyebrow: "Open-source relay",
        name: "Newlay",
        headline: "A high-speed, high-reliability nostr relay.",
        tagline:
            "Kotlin Multiplatform — the same engine on a Linux server or an Android phone — with Blossom media hosting and Buzz workspace support built in. One LMDB, one process, no Postgres, no Redis, no MinIO. MIT licensed.",
        taglineShort: "One engine for servers and phones. Blossom and Buzz built in. MIT licensed.",
        media: "code",
        codeLines: [
            { prefix: "$", text: "docker pull artifacts.relay.tools/opensauce/newlay:latest" },
            { prefix: "$", text: "docker run -p 7777:7777 artifacts.relay.tools/opensauce/newlay" },
            { prefix: ">", text: "listening on ws://0.0.0.0:7777", muted: true },
            { prefix: "#", text: "try the public relay: wss://newlay.relay.tools", muted: true },
        ],
        badges: [
            { icon: "kotlin", label: "Kotlin Multiplatform" },
            { icon: "bee", label: "Buzz compatible" },
        ],
        chips: [
            "NIP-01", "NIP-09", "NIP-11", "NIP-29", "NIP-40", "NIP-42", "NIP-43",
            "NIP-45", "NIP-50", "NIP-70", "NIP-77", "NIP-86", "Blossom",
        ],
        features: [
            { icon: "bee", title: "Buzz built in", body: "A drop-in relay for the Buzz workspace app: channels, DMs, media, git repos and workflows, all on one LMDB process." },
            { icon: "layers", title: "Server, desktop or phone", body: "One Kotlin Multiplatform engine: JVM on Linux servers and desktops, a native Android app for phone relays, and portable backup and restore between them." },
            { icon: "database", title: "One LMDB, one writer", body: "Events, indexes, search and metadata commit atomically per batch. No index catch-up state, ever." },
            { icon: "refresh", title: "Negentropy sync", body: "Bi-directional NIP-77 sync and an outbox spider that streams your follows from the right relays." },
            { icon: "shield", title: "GrapeRank web of trust", body: "Computed over LMDB, feeding ACL tiers and spam filtering." },
            { icon: "image", title: "Blossom built in", body: "BUD-01/02/04/06/12 media server in the same process as the relay." },
        ],
        actions: [
            { label: "Read the docs", href: "https://code.relay.tools/opensauce/newlay", icon: "gitlab", external: true },
        ],
        platforms: [
            {
                icon: "server",
                title: "Server & desktop",
                body: "Linux, JVM 21. Docker image, Helm chart, or a plain jar.",
                chips: ["Docker", "Helm", "JVM"],
                link: { label: "Releases", href: "https://code.relay.tools/opensauce/newlay/-/releases", icon: "tag", external: true },
            },
            {
                icon: "smartphone",
                title: "Android",
                body: "The same engine as a phone relay, with backup and restore.",
                install: true,
            },
        ],
        install: {
            zapstore: "https://zapstore.dev/apps/tools.relay.newlay.android",
            obtainium: {
                id: "tools.relay.newlay.android",
                url: "https://apks.relay.tools/Newlay",
                name: "Newlay",
            },
        },
        code: [
            { label: "newlay", href: "https://code.relay.tools/opensauce/newlay", icon: "gitlab", external: true },
            { label: "artifacts.relay.tools/opensauce/newlay", href: "https://code.relay.tools/opensauce/newlay/container_registry", icon: "docker", external: true },
        ],
    },
];

// --- Sign-in section (two customer bases) ----------------------------------
export const signInStrip = {
    heading: "Already a customer? Sign in",
    feeds: {
        title: `${migrationName} customers`,
        body: `Relays created on ${migrationName} are managed there: billing, spidering, groups and moderation.`,
        button: `Sign in to ${migrationName}`,
        href: feedsUrl,
    },
    legacy: {
        title: "Relays hosted here",
        body: "Relays created on relay.tools before feeds keep running as usual. Sign in with your nostr extension to manage, top up and renew.",
        button: "Sign in with nostr",
    },
};

// --- Footer -----------------------------------------------------------------
export const footer = {
    columns: [
        {
            title: "Products",
            links: [
                { label: migrationName, href: feedsUrl },
                { label: "Relay Tools for Android", href: "#android" },
                { label: "Newlay", href: "#newlay" },
                { label: "Relay directory", href: "/directory" },
            ] as Link[],
        },
        {
            title: "Code",
            links: [
                { label: "code.relay.tools", href: "https://code.relay.tools", external: true },
                { label: "github.com/relaytools", href: "https://github.com/relaytools", external: true },
                { label: "relaycreator (this site)", href: "https://github.com/relaytools/relaycreator", external: true },
            ] as Link[],
        },
        {
            title: "Help",
            links: [
                { label: supportEmail, href: supportUrl },
            ] as Link[],
        },
    ],
    note: "relay.tools · MIT licensed · Made with 🤙🏻 in the PNW",
};
