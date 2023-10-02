// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const getValidSubdomain = (host?: string | null) => {
    let subdomain: string | null = null;
    if (!host && typeof window !== 'undefined') {
        // On client side, get the host from window
        host = window.location.host;
    }
    if (host && host.includes('.')) {
        const candidate = host.split('.')[0];
        if (candidate && !candidate.includes('localhost')) {
            // Valid candidate
            subdomain = candidate;
        }
    }
    return subdomain;
};

// RegExp for public files
const PUBLIC_FILE = /\.(.*)$/; // Files

export async function middleware(req: NextRequest) {
    // Clone the URL
    const url = req.nextUrl.clone();

    // Skip public files
    if (PUBLIC_FILE.test(url.pathname) || url.pathname.includes('_next') || url.pathname.includes('/api/')) return;

    const host = req.headers.get('host');

    // Skip root domains
    if (host == "relay.tools" || host == "nostr1.com" || host?.includes("192.168")) return;

    const subdomain = getValidSubdomain(host);
    if (subdomain) {
        // Subdomain available, rewriting
        console.log(`>>> Rewriting: ${url.pathname} to /${subdomain}${url.pathname}`);
        url.pathname = `/relays/${subdomain}/${url.pathname}`;
    }

    return NextResponse.rewrite(url);
}