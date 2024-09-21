import { nip19 } from "nostr-tools";

export const convertOrValidatePubkey = (pubkey: string): string | undefined => {
    const lower = pubkey.toLowerCase();
    if (/npub1[023456789acdefghjklmnpqrstuvwxyz]{6,}/.test(lower))
        return pubkey;
    try {
        const { data } = nip19.decode(lower);
        return typeof data === "string" ? data : undefined;
    } catch {
        return undefined;
    }
};
