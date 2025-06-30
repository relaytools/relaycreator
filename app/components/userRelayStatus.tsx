'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { nip19 } from 'nostr-tools';
import { FaUser, FaShieldAlt, FaBolt, FaCheck, FaBan, FaSignOutAlt, FaSearch } from 'react-icons/fa';
import { RelayWithEverything } from './relayWithEverything';
import ShowSmallSession from './smallsession';
import RelayPayment from './relayPayment';

interface UserRelayStatusProps {
    relay: RelayWithEverything;
}

export default function UserRelayStatus({ relay }: UserRelayStatusProps) {
    const { data: session } = useSession();
    const [myPubkey, setMyPubkey] = useState<string | null>(null);
    const [inputPubkey, setInputPubkey] = useState<string>('');
    const [checkedPubkey, setCheckedPubkey] = useState<string | null>(null);
    const [isModOrOwner, setIsModOrOwner] = useState(false);
    const [isMember, setIsMember] = useState(false);
    const [acceptsLightning, setAcceptsLightning] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get the active user's pubkey from the session
    useEffect(() => {
        if (session?.user?.name) {
            setMyPubkey(session.user.name);
        }
    }, [session]);

    // Process relay data to check user status and lightning payment acceptance
    useEffect(() => {
        // Use either the logged-in pubkey or a manually checked pubkey
        const pubkeyToCheck = myPubkey || checkedPubkey;
        if (!pubkeyToCheck || !relay) return;
        
        // Reset status when pubkey changes
        setIsModOrOwner(false);
        setIsMember(false);
        
        try {
            // Debug logs
            console.log('Checking pubkey:', pubkeyToCheck);
            console.log('Relay owner:', relay.owner?.pubkey);
            console.log('Moderators:', relay.moderators?.map(mod => mod.user.pubkey));
            
            // Check if user is owner or moderator - case insensitive comparison
            const isOwner = relay.owner?.pubkey?.toLowerCase() === pubkeyToCheck.toLowerCase();
            console.log('Is owner?', isOwner);
            
            // More detailed check for moderators with logging
            let isMod = false;
            if (relay.moderators && relay.moderators.length > 0) {
                for (const mod of relay.moderators) {
                    // Ensure we're comparing strings in the same format
                    const modPubkey = mod.user.pubkey.toLowerCase();
                    const checkPubkey = pubkeyToCheck.toLowerCase();
                    
                    console.log(`Comparing mod pubkey: ${modPubkey} with checked pubkey: ${checkPubkey}`);
                    
                    if (modPubkey === checkPubkey) {
                        console.log('Found matching moderator!');
                        isMod = true;
                        break;
                    }
                }
            }
            console.log('Is moderator?', isMod);
            
            setIsModOrOwner(Boolean(isOwner || isMod));
            
            // Check if user is a member (in allow list)
            const isInAllowList = relay.allow_list?.list_pubkeys?.some(
                (entry) => entry.pubkey.toLowerCase() === pubkeyToCheck.toLowerCase()
            ) || false;
            setIsMember(Boolean(isInAllowList));
            
            // Check if relay accepts lightning payments - check both field sets
            // Relay schema has both payment_required/payment_amount and request_payment/request_payment_amount
            const paymentRequired = Boolean(relay.payment_required || relay.request_payment);
            console.log('Relay payment fields:', {
                payment_required: relay.payment_required,
                request_payment: relay.request_payment,
                combined: paymentRequired
            });
            setAcceptsLightning(paymentRequired);
            
            // Get payment amount - check both field sets
            const amount = relay.payment_amount || relay.request_payment_amount || 0;
            console.log('Relay payment amount:', amount);
            setPaymentAmount(amount);
            
        } catch (error) {
            console.error('Error processing relay data:', error);
            setError('Failed to determine user status');
        }
    }, [myPubkey, checkedPubkey, relay]);
    
    // Handle pubkey check submission
    const handleCheckPubkey = (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); // Clear any previous errors
        
        if (inputPubkey.trim()) {
            // Clean the input - handle npub format or hex format
            let cleanPubkey = inputPubkey.trim();
            
            try {
                // Handle npub format
                if (cleanPubkey.startsWith('npub')) {
                    // Decode the npub to get the hex pubkey
                    const { type, data } = nip19.decode(cleanPubkey);
                    console.log('Decoded npub:', { type, data });
                    
                    if (type === 'npub') {
                        // Set the hex pubkey
                        const hexPubkey = data as string;
                        console.log('Setting checked pubkey to hex:', hexPubkey);
                        setCheckedPubkey(hexPubkey);
                        
                        // For debugging - show the npub that was entered
                        console.log('Original npub input:', cleanPubkey);
                    } else {
                        setError('Invalid npub format');
                    }
                } else {
                    // Assume it's already a hex pubkey
                    console.log('Using hex pubkey directly:', cleanPubkey);
                    setCheckedPubkey(cleanPubkey);
                }
            } catch (error) {
                console.error('Error processing pubkey:', error);
                setError('Invalid pubkey format');
            }
        }
    };

    if (isLoading) {
        return <div className="text-sm text-center py-2">Loading status...</div>;
    }

    if (error) {
        return <div className="text-sm text-center py-2 text-error">{error}</div>;
    }

    if (!myPubkey && !checkedPubkey) {
        return (
            <div className="card bg-base-100 shadow-xl mb-2">
                <div className="card-body">
                    <h2 className="card-title">Your Membership</h2>
                    <div className="divider my-1"></div>
                    
                    <div className="flex flex-col gap-4">
                        <div>
                            <ShowSmallSession pubkey="" />
                        </div>
                        
                        <div className="divider text-xs text-base-content/50">OR</div>
                        
                        <div>
                            <p className="text-sm mb-3">Check status by entering a pubkey</p>
                            <form onSubmit={handleCheckPubkey} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={inputPubkey}
                                    onChange={(e) => setInputPubkey(e.target.value)}
                                    placeholder="Enter npub or hex pubkey"
                                    className="input input-bordered input-sm flex-grow"
                                />
                                <button 
                                    type="submit" 
                                    className="btn btn-primary btn-sm"
                                    disabled={!inputPubkey.trim()}
                                >
                                    <FaSearch size={12} />
                                    Check
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

    return (
        <div className="card bg-base-100 shadow-xl mb-4">
            <div className="card-body">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="card-title">
                            {myPubkey ? 'Your Status' : 'Pubkey Status'}
                            {checkedPubkey && !myPubkey && (
                                <span className="text-xs font-normal text-base-content/70 ml-2">
                                    {checkedPubkey.substring(0, 8)}...{checkedPubkey.substring(checkedPubkey.length - 4)}
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(checkedPubkey)}
                                        className="ml-1 opacity-50 hover:opacity-100"
                                        title="Copy full pubkey"
                                    >
                                        📋
                                    </button>
                                </span>
                            )}
                        </h2>
                    </div>
                    
                    {myPubkey ? (
                        <button 
                            onClick={() => {
                                // Stay on the current relay page after signing out
                                signOut({ callbackUrl: "/#"});
                            }} 
                            className="btn btn-sm btn-ghost text-base-content/70 hover:text-error flex gap-1 items-center"
                            title="Sign out"
                        >
                            <FaSignOutAlt size={14} />
                            <span className="hidden sm:inline">Sign out</span>
                        </button>
                    ) : (
                        <button 
                            onClick={() => {
                                // Clear the checked pubkey to go back to the form
                                setCheckedPubkey(null);
                                setInputPubkey('');
                            }} 
                            className="btn btn-sm btn-ghost text-base-content/70 hover:text-primary flex gap-1 items-center"
                            title="Check another pubkey"
                        >
                            <FaSearch size={14} />
                            <span className="hidden sm:inline">Check another</span>
                        </button>
                    )}
                </div>
                <div className="divider my-1"></div>
                
                <div className="flex flex-col gap-2">
                    {/* User role */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Role:</span>
                        <div>
                            {isModOrOwner ? (
                                <span className="badge badge-primary gap-1">
                                    <FaShieldAlt size={12} /> Moderator/Owner
                                </span>
                            ) : isMember ? (
                                <span className="badge badge-success gap-1">
                                    <FaUser size={12} /> Member
                                </span>
                            ) : (
                                <span className="badge badge-ghost gap-1">
                                    <FaUser size={12} /> Visitor
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Access status */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Access:</span>
                        <div>
                            {isMember || isModOrOwner ? (
                                <span className="badge badge-success gap-1">
                                    <FaCheck size={12} /> Allowed
                                </span>
                            ) : (
                                <span className="badge badge-warning gap-1">
                                    <FaBan size={12} /> Limited
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Lightning payments */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Payment:</span>
                        <div>
                            {acceptsLightning ? (
                                <span className="badge badge-secondary gap-1">
                                    <FaBolt size={12} /> {paymentAmount} sats/mo
                                </span>
                            ) : (
                                <span className="badge badge-outline gap-1">
                                    No Payment Required
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="mt-4">
                    <div className="card bg-base-200 p-3">
                        {(isMember || isModOrOwner) && <a
                                            className="btn btn-primary uppercase mt-2 mb-2"
                                            href={session ? `/clientinvoices` : `/clientinvoices?pubkey=${checkedPubkey || myPubkey || ''}`}
                                        >
                                            <FaBolt size={12} className="mr-2 text-warning" />
                                            manage subscription
                                        </a>
                        }

                        {(!isMember && !isModOrOwner) && <RelayPayment relay={relay} pubkey={myPubkey || checkedPubkey || ''} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
