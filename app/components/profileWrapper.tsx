"use client";

import NostrProfile from './nostrProfile';

interface ProfileWrapperProps {
  pubkey: string;
  size?: "small" | "medium" | "large";
  showName?: boolean;
  showCopy?: boolean;
  showPubkey?: boolean;
}

export default function ProfileWrapper({ pubkey, size = "medium", showName = false, showCopy = true, showPubkey = false }: ProfileWrapperProps) {
  return <NostrProfile pubkey={pubkey} size={size} showName={showName} showCopy={showCopy} showPubkey={showPubkey} />;
}
