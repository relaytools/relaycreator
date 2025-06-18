"use client";
import { useEffect, useState } from "react";
import NDK, { NDKEvent, NDKNip07Signer, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { FaCopy, FaCheck, FaTwitter } from "react-icons/fa";
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

interface NostrProfileProps {
  pubkey: string;
  size?: "small" | "medium" | "large";
  showName?: boolean;
  showCopy?: boolean;
  showPubkey?: boolean;
}

export default function NostrProfile({ pubkey, size = "medium", showName = false, showCopy = true, showPubkey = false }: NostrProfileProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [npub, setNpub] = useState<string>("");

  useEffect(() => {
    // Convert pubkey to npub format
    if (pubkey) {
      try {
        const encodedPubkey = nip19.npubEncode(pubkey);
        setNpub(encodedPubkey);
      } catch (e) {
        console.error("Error encoding pubkey:", e);
      }
    }
    
    const fetchProfile = async () => {
      if (!pubkey) {
        setLoading(false);
        return;
      }

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

        const profileSub = ndk.subscribe(
          { kinds: [0], authors: [pubkey] },
          { closeOnEose: true, groupable: true }
        );

        profileSub.on("event", (event: NDKEvent) => {
          try {
            const profileContent = JSON.parse(event.content);
            setProfile({
              pubkey: event.pubkey,
              content: profileContent
            });
            console.log(profile)
          } catch (e) {
            console.error("Error parsing profile content:", e);
          }
          setLoading(false);
        });

        // Set a timeout to handle the case where no profile is found
        const timeout = setTimeout(() => {
          setLoading(false);
        }, 5000);

        return () => {
          clearTimeout(timeout);
          profileSub.stop();
        };
      } catch (e) {
        console.error("Error fetching profile:", e);
        setLoading(false);
      }
    };

    fetchProfile();
  }, [pubkey]);

  // Default image when no profile picture is available
  const defaultImage = "/green-check.png";
  
  // Determine image size class
  const sizeClass = {
    small: "w-8",
    medium: "w-12",
    large: "w-16"
  }[size];

  // Function to copy pubkey to clipboard
  const copyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Format pubkey for display
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
            {profile?.content?.nip05 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span>({profile.content.nip05})</span>
                {profile.content.nip05.includes("@twitter.com") && (
                  <FaTwitter className="text-blue-400 text-xs" />
                )}
              </span>
            )}
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
