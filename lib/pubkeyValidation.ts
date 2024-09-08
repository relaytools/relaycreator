import { nip19 } from "nostr-tools";

export const convertOrValidatePubkey = (pubkey: string): string | undefined => {
 if (/^npub1[0-9a-zA-Z]{58}$/.test(pubkey)) {
  try {
   const { data } = nip19.decode(pubkey);
   return typeof data === 'string' ? data : undefined;
  } catch {
   return undefined;
  }
 }
 if (/^[0-9a-fA-F]{64}$/.test(pubkey)) return pubkey;
 return undefined;
}