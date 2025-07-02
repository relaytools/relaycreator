"use client";
import { useEffect, useState } from "react";
import NDK, { NDKEvent, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { FaCopy, FaCheck, FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
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

interface ListEntry {
  id: string;
  pubkey: string;
  reason?: string | null;
}

interface BatchedProfileListProps {
  entries: ListEntry[];
  onEdit?: (entry: ListEntry, newReason: string) => void;
  onDelete?: (entryId: string) => void;
  onDeleteAll?: (entryIds: string[]) => void;
  isEditing?: boolean;
  editingEntryId?: string;
  editingReason?: string;
  onStartEdit?: (entryId: string, currentReason: string) => void;
  onCancelEdit?: () => void;
  onReasonChange?: (reason: string) => void;
  itemsPerPage?: number;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  kind?: string;
}

export default function BatchedProfileList({ 
  entries, 
  onEdit, 
  onDelete,
  onDeleteAll,
  isEditing,
  editingEntryId,
  editingReason,
  onStartEdit,
  onCancelEdit,
  onReasonChange,
  itemsPerPage = 20,
  searchTerm = "",
  onSearchChange,
  kind = "entries"
}: BatchedProfileListProps) {
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [copiedPubkey, setCopiedPubkey] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter entries based on search term (reason and profile name)
  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    
    const profile = profiles.get(entry.pubkey);
    const profileName = profile?.content?.name?.toLowerCase() || "";
    const reason = entry.reason?.toLowerCase() || "";
    const searchLower = searchTerm.toLowerCase();
    
    return reason.includes(searchLower) || profileName.includes(searchLower);
  });

  // Calculate pagination based on filtered entries
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = filteredEntries.slice(startIndex, endIndex);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (entries.length === 0) {
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

        // Fetch ALL profiles for search functionality
        const allPubkeys = entries.map(entry => entry.pubkey);
        const profilesMap = new Map<string, Profile>();

        // Process all pubkeys in batches of 500
        const batchSize = 500;
        for (let i = 0; i < allPubkeys.length; i += batchSize) {
          const batch = allPubkeys.slice(i, i + batchSize);
          
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
  }, [entries]);

  // Reset to page 1 when entries change (e.g., filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [entries.length]);

  const copyToClipboard = async (text: string, pubkey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPubkey(pubkey);
      setTimeout(() => setCopiedPubkey(""), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const getDisplayName = (pubkey: string) => {
    const profile = profiles.get(pubkey);
    if (profile?.content?.name) {
      return profile.content.name;
    }
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
  };

  const getNpub = (pubkey: string) => {
    try {
      return nip19.npubEncode(pubkey);
    } catch (e) {
      return pubkey;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-2">Loading profiles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      {onSearchChange && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search by name or reason..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input input-bordered input-sm flex-1"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="btn btn-sm btn-ghost"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Pagination Info */}
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <span>
          Showing {startIndex + 1}-{Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries
          {searchTerm && filteredEntries.length !== entries.length && (
            <span className="ml-1 text-primary">(filtered from {entries.length})</span>
          )}
        </span>
        <span>Page {currentPage} of {totalPages}</span>
      </div>

      {/* Delete All Button */}
      {onDeleteAll && filteredEntries.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              const entryIds = filteredEntries.map(entry => entry.id);
              onDeleteAll(entryIds);
            }}
            className="btn btn-error btn-sm"
          >
            Delete All {filteredEntries.length} {searchTerm ? 'Filtered ' : ''}{kind}
          </button>
        </div>
      )}

      {/* Profile Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentEntries.map((entry) => {
        const profile = profiles.get(entry.pubkey);
        const npub = getNpub(entry.pubkey);
        
        return (
          <div
            key={entry.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700 p-4"
          >
            {/* Profile Section */}
            <div className="flex items-start space-x-3 mb-3">
              <div className="flex-shrink-0">
                <ProfileImage
                  imageUrl={profile?.content?.picture || '/green-check.png'}
                  altText={profile?.content?.name || "Profile"}
                  className="w-10 h-10"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {getDisplayName(entry.pubkey)}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                    {entry.pubkey.slice(0, 16)}...
                  </span>
                  <button
                    onClick={() => copyToClipboard(npub, entry.pubkey)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Copy npub"
                  >
                    {copiedPubkey === entry.pubkey ? (
                      <FaCheck className="w-3 h-3 text-green-500" />
                    ) : (
                      <FaCopy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Reason Section */}
            {entry.reason && (
              <div className="mb-3">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                  Reason:
                </div>
                {isEditing && editingEntryId === entry.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingReason || ""}
                      onChange={(e) => onReasonChange?.(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onEdit?.(entry, editingReason || "");
                        }
                      }}
                      className="input input-bordered input-sm w-full"
                      placeholder="Enter reason..."
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEdit?.(entry, editingReason || "")}
                        className="btn btn-success btn-xs"
                      >
                        <FaSave className="w-3 h-3 mr-1" />
                        Save
                      </button>
                      <button
                        onClick={onCancelEdit}
                        className="btn btn-ghost btn-xs"
                      >
                        <FaTimes className="w-3 h-3 mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm bg-gray-50 dark:bg-gray-700 rounded p-2 break-words">
                    {entry.reason}
                  </div>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              {!isEditing && (
                <>
                  <button
                    onClick={() => onStartEdit?.(entry.id, entry.reason || "")}
                    className="btn btn-primary btn-xs"
                    title="Edit reason"
                  >
                    <FaEdit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDelete?.(entry.id)}
                    className="btn btn-error btn-xs"
                    title="Delete pubkey"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn btn-sm btn-outline"
          >
            Previous
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage = page === 1 || page === totalPages || 
                              Math.abs(page - currentPage) <= 1;
              
              if (!showPage && page === 2 && currentPage > 4) {
                return <span key={page} className="px-2">...</span>;
              }
              if (!showPage && page === totalPages - 1 && currentPage < totalPages - 3) {
                return <span key={page} className="px-2">...</span>;
              }
              if (!showPage) return null;
              
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`btn btn-sm ${
                    currentPage === page ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-sm btn-outline"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
