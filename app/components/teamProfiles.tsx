"use client";

import { useEffect, useState } from 'react';
import NDK, { NDKEvent, NDKRelaySet } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';
import ProfileImage from './profileImage';
import { FaCopy, FaCheck, FaChevronDown, FaChevronUp, FaUsers, FaCrown } from 'react-icons/fa';

interface Profile {
  pubkey: string;
  content: ProfileContent;
}

interface ProfileContent {
  name?: string;
  picture?: string;
  nip05?: string;
  about?: string;
  [key: string]: any;
}

interface TeamMember {
  pubkey: string;
  roles: string[];
}

interface TeamProfilesProps {
  teamMembers: TeamMember[];
  size?: "small" | "medium" | "large";
  showName?: boolean;
  showCopy?: boolean;
  showPubkey?: boolean;
}

export default function TeamProfiles({ 
  teamMembers, 
  size = "medium", 
  showName = false, 
  showCopy = true, 
  showPubkey = false 
}: TeamProfilesProps) {
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [copiedPubkey, setCopiedPubkey] = useState<string | null>(null);
  const [npubs, setNpubs] = useState<Map<string, string>>(new Map());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Convert pubkeys to npub format
    const newNpubs = new Map<string, string>();
    teamMembers.forEach(member => {
      if (member.pubkey) {
        try {
          const encodedPubkey = nip19.npubEncode(member.pubkey);
          newNpubs.set(member.pubkey, encodedPubkey);
        } catch (e) {
          console.error("Error encoding pubkey:", e);
        }
      }
    });
    setNpubs(newNpubs);
    
    const fetchProfiles = async () => {
      if (teamMembers.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Create a single NDK instance
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

        // Get all pubkeys to fetch
        const pubkeys = teamMembers.map(member => member.pubkey);
        
        // Create a single subscription for all profiles
        const profileSub = ndk.subscribe(
          { kinds: [0], authors: pubkeys },
          { closeOnEose: true, groupable: true }
        );

        profileSub.on("event", (event: NDKEvent) => {
          try {
            const profileContent = JSON.parse(event.content);
            setProfiles(prevProfiles => {
              const newProfiles = new Map(prevProfiles);
              newProfiles.set(event.pubkey, {
                pubkey: event.pubkey,
                content: profileContent
              });
              return newProfiles;
            });
          } catch (e) {
            console.error("Error parsing profile content:", e);
          }
        });

        // Set a timeout to handle the case where not all profiles are found
        const timeout = setTimeout(() => {
          setLoading(false);
        }, 5000);

        profileSub.on("eose", () => {
          setLoading(false);
          clearTimeout(timeout);
        });

        return () => {
          clearTimeout(timeout);
          profileSub.stop();
        };
      } catch (e) {
        console.error("Error fetching profiles:", e);
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [teamMembers]);

  // Default image when no profile picture is available
  const defaultImage = "/green-check.png";
  
  // Determine image size class
  const sizeClass = {
    small: "w-8",
    medium: "w-12",
    large: "w-16"
  }[size];

  // Function to copy pubkey to clipboard
  const copyToClipboard = (pubkey: string) => {
    navigator.clipboard.writeText(pubkey).then(() => {
      setCopiedPubkey(pubkey);
      setTimeout(() => setCopiedPubkey(null), 2000);
    });
  };

  // Format pubkey for display
  const formatPubkey = (key: string) => {
    if (!key) return "";
    const npub = npubs.get(key) || "";
    if (npub.length > 12) {
      return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
    }
    return npub;
  };

  // Check if nip05 is present
  const hasNip05 = (nip05: string | undefined) => {
    return !!nip05;
  };

  // Determine image size class for the collapse bar
  const collapseSizeClass = {
    small: "w-6 h-6",
    medium: "w-8 h-8",
    large: "w-10 h-10"
  }[size];

  // Function to toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Collapsible header with overlapping profile pictures */}
      <div 
        className="bg-base-200 p-2 flex items-center justify-between cursor-pointer hover:bg-base-300 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="flex items-center">
          {/* Team icon */}
          <div className="bg-primary/10 p-2 rounded-full">
            <FaUsers className="text-primary" size={16} />
          </div>
          
          {/* Team info */}
          <span className="ml-3 font-medium flex flex-col">
            <span className="flex items-center gap-1">
              <span>Relay Team</span>
              <span className="text-xs text-base-content/70">({teamMembers.length})</span>
            </span>
            
            {/* Show first few team member names if available */}
            {teamMembers.length > 0 && (
              <span className="text-xs text-base-content/70">
                {teamMembers.slice(0, 2).map((member, index) => {
                  const profile = profiles.get(member.pubkey);
                  const name = profile?.content?.name || formatPubkey(member.pubkey);
                  return (
                    <span key={index}>
                      {name}{index < Math.min(2, teamMembers.length) - 1 ? ', ' : ''}
                    </span>
                  );
                })}
                {teamMembers.length > 2 && ` and ${teamMembers.length - 2} more`}
              </span>
            )}
          </span>
        </div>
        
        {/* Profile pictures in a clean row */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex gap-1 items-center">
            {teamMembers.slice(0, 3).map((member, index) => {
              const profile = profiles.get(member.pubkey);
              return (
                <div 
                  key={index} 
                  className={`${collapseSizeClass} rounded-full relative`}
                >
                  <ProfileImage 
                    imageUrl={profile?.content?.picture || defaultImage} 
                    altText={`${profile?.content?.name || 'Unknown user'}'s profile`}
                    className="rounded-full border-2 border-base-100"
                  />
                  {member.roles.includes('owner') && (
                    <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full w-3 h-3 border border-base-100"></div>
                  )}
                </div>
              );
            })}
            {teamMembers.length > 3 && (
              <div className="text-xs text-base-content/70 ml-1">+{teamMembers.length - 3}</div>
            )}
          </div>
          
          {isExpanded ? (
            <FaChevronUp className="text-base-content/70" />
          ) : (
            <FaChevronDown className="text-base-content/70" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-2 p-2 bg-base-100 border-t border-base-300">
          {teamMembers.map((member, index) => {
            const profile = profiles.get(member.pubkey);
            
            return (
              <div key={index} className="bg-base-200 p-2 rounded-lg flex items-center">
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Profile Image */}
                      <div className={`${sizeClass} aspect-square`}>
                        <ProfileImage 
                          imageUrl={profile?.content?.picture || defaultImage} 
                          altText={`${profile?.content?.name || 'Unknown user'}'s profile`}
                          className="border-2 border-primary/20 hover:border-primary/50 transition-all duration-200"
                        />
                      </div>
                      
                      {/* Profile Info */}
                      <div>
                        {showName && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">
                              {profile?.content?.name || 'Unknown'}
                            </span>
                            {profile?.content?.nip05 && (
                              <span className="text-xs text-gray-500">
                                {profile.content.nip05}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {showPubkey && (
                          <div className="text-xs text-gray-500 font-mono flex items-center gap-1">
                            {formatPubkey(member.pubkey)}
                            {showCopy && (
                              <button 
                                onClick={() => copyToClipboard(member.pubkey)}
                                className="text-gray-400 hover:text-primary transition-colors"
                              >
                                {copiedPubkey === member.pubkey ? (
                                  <FaCheck size={12} className="text-green-500" />
                                ) : (
                                  <FaCopy size={12} />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Role Badges */}
                    <div className="flex gap-2">
                      {member.roles.includes('owner') && (
                        <div className="tooltip" data-tip="Owner">
                          <FaCrown size={16} className="text-amber-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
