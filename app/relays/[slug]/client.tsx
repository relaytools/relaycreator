"use client";

import { useState, useEffect } from 'react';
import { FaCog } from 'react-icons/fa';
import Wizard from '../../curator/wizard';
import { RelayWithEverything } from '../../components/relayWithEverything';
import { useSession } from 'next-auth/react';

// Define the props interface for the component
export interface RelayPageClientProps {
  relay: RelayWithEverything;
}

export default function RelayPageClient({
  relay
}: RelayPageClientProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [canManageRelay, setCanManageRelay] = useState(false);
  const { data: session } = useSession();
  
  // Check if the user is an owner or moderator of the relay
  useEffect(() => {
    if (!session?.user?.name || !relay) return;
    
    const userPubkey = session.user.name.toLowerCase();
    
    // Check if user is owner
    const isOwner = relay.owner?.pubkey?.toLowerCase() === userPubkey;
    
    // Check if user is moderator
    const isModerator = relay.moderators?.some(
      mod => mod.user?.pubkey?.toLowerCase() === userPubkey
    );
    
    setCanManageRelay(isOwner || isModerator);
  }, [session, relay]);

  return (
    <>
      {/* Main content */}
      <div className={isWizardOpen ? 'hidden' : ''}>
        {/* Only show the settings button if the user can manage the relay */}
        {canManageRelay && (
          <div className="container mx-auto px-4 py-2 mb-4">
            <div className="flex justify-end">
              <button 
                onClick={() => setIsWizardOpen(true)}
                className="btn btn-primary gap-2"
                aria-label="Manage Relay Settings"
              >
                <FaCog size={16} /> Manage Relay Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-base-100 z-50 overflow-auto">
          <div className="p-4">
            <button 
              onClick={() => setIsWizardOpen(false)}
              className="btn btn-sm btn-circle absolute right-4 top-4"
            >
              ✕
            </button>
            <div className="pt-10">
              <Wizard relay={relay} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
