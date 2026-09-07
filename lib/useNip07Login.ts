"use client";
import { useCallback, useState } from "react";
import { signIn } from "next-auth/react";

/**
 * NIP-07 sign-in flow shared by the landing page.
 * Mirrors doNip07Login() in app/mysession.tsx:
 *   GET /api/auth/logintoken -> window.nostr.signEvent(kind 27235) -> next-auth credentials signIn
 */
export default function useNip07Login(callbackUrl: string = "/#") {
    const [needsExtension, setNeedsExtension] = useState(false);
    const [busy, setBusy] = useState(false);

    const login = useCallback(async () => {
        setBusy(true);
        try {
            const tokenResponse = await fetch(`/api/auth/logintoken`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const tokenData = await tokenResponse.json();
            const token = tokenData.token;

            const signThis = {
                kind: 27235,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: token,
            };
            const useMe = await (window as any).nostr.signEvent(signThis);
            await signIn("credentials", {
                kind: useMe.kind,
                created_at: useMe.created_at,
                content: useMe.content,
                pubkey: useMe.pubkey,
                sig: useMe.sig,
                id: useMe.id,
                callbackUrl,
            });
        } catch {
            console.log("error signing event");
            setNeedsExtension(true);
        } finally {
            setBusy(false);
        }
    }, [callbackUrl]);

    return {
        login,
        busy,
        needsExtension,
        dismiss: () => setNeedsExtension(false),
    };
}
