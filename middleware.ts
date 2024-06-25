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

    let skipThis = "nostr1.com"
    if( process.env.NEXT_PUBLIC_CREATOR_DOMAIN ) {
        skipThis = process.env.NEXT_PUBLIC_CREATOR_DOMAIN
    }
    
    // Skip root domains and local IPs
    if (host == "relay.tools" || host == skipThis || host?.includes("10.0") || host?.includes("192.168") || host?.includes("127.0")) return

    const subdomain = getValidSubdomain(host);
    if (subdomain) {
        // Subdomain available, rewriting
        console.log(`>>> Rewriting: ${url.pathname} to /relays/${subdomain}/${url.pathname}`);
        url.pathname = `/relays/${subdomain}/${url.pathname}`;
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('middleware-rewritten', host || "true")

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    return NextResponse.rewrite(url, response);
}