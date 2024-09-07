import { nip19 } from "nostr-tools";

export const validatePubkey = (pubkey: string): string | undefined => {
 const validNpub = /^npub1[0-9a-zA-Z]{58}$/.test(pubkey);
 const validHex = /^[0-9a-fA-F]{64}$/.test(pubkey);
 if (validNpub) {
  const decoded = nip19.decode(pubkey);
  if (typeof decoded.data === 'string') return decoded.data;
 } else if (validHex) return pubkey;
}