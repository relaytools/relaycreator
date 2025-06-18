"use client";

import TeamProfiles from './teamProfiles';

interface TeamMember {
  pubkey: string;
  roles: string[];
}

interface TeamProfilesWrapperProps {
  teamMembers: TeamMember[];
  size?: "small" | "medium" | "large";
  showName?: boolean;
  showCopy?: boolean;
  showPubkey?: boolean;
}

export default function TeamProfilesWrapper({ 
  teamMembers, 
  size = "medium", 
  showName = false, 
  showCopy = true, 
  showPubkey = false 
}: TeamProfilesWrapperProps) {
  return (
    <TeamProfiles 
      teamMembers={teamMembers} 
      size={size} 
      showName={showName} 
      showCopy={showCopy} 
      showPubkey={showPubkey} 
    />
  );
}
