import { nip19 } from "nostr-tools";

export const convertOrValidatePubkey = (pubkey: string): string | undefined => {
 const lower = pubkey.toLowerCase();
 if (/^[0-9a-f]{64}$/.test(lower)) return pubkey;
 try {
  const { data } = nip19.decode(lower);
  return typeof data === 'string' ? data : undefined;
 } catch {
  return undefined;
 }
}