"use client";
import { useEffect, useMemo, useState } from "react";
import NDK, { NDKEvent, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { FaCopy, FaCheck } from "react-icons/fa";
import { nip19 } from "nostr-tools";
import ProfileImage from "./profileImage";

interface ProfileContent {
  picture?: string;
  name?: string;
  nip05?: string;
}

interface Profile {
  pubkey: string;
  content: ProfileContent;
}

interface ProfileDisplayProps {
  pubkey: string;
  size?: "small" | "medium" | "large";
  showName?: boolean;
  showCopy?: boolean;
  showPubkey?: boolean;
}

interface BatchedProfileDisplayProps {
  pubkeys: string[];
  children: (profileMap: Map<string, Profile>, loading: boolean) => React.ReactNode;
}

// Individual profile display component
export function ProfileDisplay({ 
  pubkey, 
  profileMap, 
  size = "small", 
  showName = true, 
  showCopy = true, 
  showPubkey = true 
}: ProfileDisplayProps & { profileMap: Map<string, Profile> }) {
  const [copied, setCopied] = useState(false);
  const [npub, setNpub] = useState<string>("");

  useEffect(() => {
    if (pubkey) {
      try {
        const encodedPubkey = nip19.npubEncode(pubkey);
        setNpub(encodedPubkey);
      } catch (e) {
        console.error("Error encoding pubkey:", e);
      }
    }
  }, [pubkey]);

  const profile = profileMap.get(pubkey);
  const defaultImage = "/green-check.png";
  
  const sizeClass = {
    small: "w-8",
    medium: "w-12",
    large: "w-16"
  }[size];

  const copyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatPubkey = (key: string) => {
    if (!key) return "";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClass} aspect-square`}>
        <ProfileImage 
          imageUrl={profile?.content?.picture || defaultImage} 
          altText={`${profile?.content?.name || 'Unknown user'}'s profile`}
          className="border-2 border-primary/20 hover:border-primary/50 transition-all duration-200"
        />
      </div>
      
      <div className="flex flex-col">
        {showName && (
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm">
              {profile?.content?.name || 'Unknown user'}
            </span>
          </div>
        )}
        
        {showPubkey && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs font-mono bg-base-200 px-2 py-0.5 rounded">
              {formatPubkey(pubkey)}
            </span>
            {showCopy && (
              <button 
                onClick={() => copyToClipboard(npub || pubkey)}
                className="text-xs p-1 rounded-full hover:bg-base-200 transition-colors duration-200"
                title={copied ? "Copied!" : "Copy npub to clipboard"}
              >
                {copied ? <FaCheck className="text-green-500" /> : <FaCopy className="text-gray-400 hover:text-primary" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Batched profile fetcher component
export default function BatchedProfileDisplay({ pubkeys, children }: BatchedProfileDisplayProps) {
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  // Create a stable key for pubkeys content to avoid refetching when the array identity changes
  const pubkeysKey = useMemo(() => {
    try {
      const normalized = Array.from(new Set(pubkeys.filter(Boolean))).sort();
      return normalized.join(",");
    } catch {
      return "";
    }
  }, [pubkeys]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (pubkeys.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const ndk = new NDK({
          autoConnectUserRelays: false,
          enableOutboxModel: false,
        });

        // Connect to profile-specific relays
        const profilesRelays = NDKRelaySet.fromRelayUrls(
          [
            "wss://purplepag.es",
            "wss://profiles.nostr1.com",
          ],
          ndk
        );
        
        await ndk.connect();

        const profilesMap = new Map<string, Profile>();

        // Process pubkeys in batches of 500
        const batchSize = 500;
        for (let i = 0; i < pubkeys.length; i += batchSize) {
          const batch = pubkeys.slice(i, i + batchSize);
          
          const profileSub = ndk.subscribe(
            { kinds: [0], authors: batch },
            { closeOnEose: true, groupable: true }
          );

          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              profileSub.stop();
              resolve();
            }, 5000); // 5 second timeout per batch

            profileSub.on("event", (event: NDKEvent) => {
              try {
                const profileContent = JSON.parse(event.content);
                profilesMap.set(event.pubkey, {
                  pubkey: event.pubkey,
                  content: profileContent
                });
              } catch (e) {
                console.error("Error parsing profile content:", e);
              }
            });

            profileSub.on("eose", () => {
              clearTimeout(timeout);
              profileSub.stop();
              resolve();
            });
          });
        }

        setProfiles(profilesMap);
        setLoading(false);
      } catch (e) {
        console.error("Error fetching profiles:", e);
        setLoading(false);
      }
    };

    fetchProfiles();
    // Only refetch when the content of pubkeys changes, not on array identity change
  }, [pubkeysKey]);

  return <>{children(profiles, loading)}</>;
}
