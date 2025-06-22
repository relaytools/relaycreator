"use client";

import { useState } from 'react';
import { FaCog } from 'react-icons/fa';
import Wizard from '../../curator/wizard';
import { RelayWithEverything } from '../../components/relayWithEverything';

export default function RelayPageClient({
  children,
  relay
}: {
  children: React.ReactNode;
  relay: RelayWithEverything;
}) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <>
      {/* Main content */}
      <div className={isWizardOpen ? 'hidden' : ''}>
        {/* Add a prominent button at the top of the page */}
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
        {children}
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
