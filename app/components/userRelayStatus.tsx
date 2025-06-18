'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FaUser, FaShieldAlt, FaBolt, FaCheck, FaBan } from 'react-icons/fa';
import { RelayWithEverything } from './relayWithEverything';
import ShowSmallSession from '../smallsession';

interface UserRelayStatusProps {
    relay: RelayWithEverything;
}

export default function UserRelayStatus({ relay }: UserRelayStatusProps) {
    const { data: session } = useSession();
    const [myPubkey, setMyPubkey] = useState<string | null>(null);
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
        if (!myPubkey || !relay) return;
        
        try {
            // Check if user is owner or moderator
            const isOwner = relay.owner?.pubkey === myPubkey;
            const isMod = relay.moderators?.some((mod) => mod.user.pubkey === myPubkey);
            setIsModOrOwner(isOwner || isMod);
            
            // Check if user is a member (in allow list)
            const isInAllowList = relay.allow_list?.list_pubkeys?.some(
                (entry) => entry.pubkey === myPubkey
            );
            setIsMember(isInAllowList);
            
            // Check if relay accepts lightning payments
            // Ensure we always pass a boolean value to avoid TypeScript errors
            setAcceptsLightning(Boolean(relay.payment_required));
            
            // Get payment amount
            setPaymentAmount(relay.payment_amount || 0);
            
        } catch (error) {
            console.error('Error processing relay data:', error);
            setError('Failed to determine user status');
        }
    }, [myPubkey, relay]);

    if (isLoading) {
        return <div className="text-sm text-center py-2">Loading status...</div>;
    }

    if (error) {
        return <div className="text-sm text-center py-2 text-error">{error}</div>;
    }

    if (!myPubkey) {
        return (
            <div className="card bg-base-100 shadow-xl mb-4">
                <div className="card-body">
                    <h2 className="card-title">Your Status</h2>
                    <div className="divider my-1"></div>
                    <p className="text-sm mb-3">Sign in to see your status with this relay</p>
                    <ShowSmallSession pubkey="" />
                </div>
            </div>
        );
    }

    return (
        <div className="card bg-base-100 shadow-xl mb-4">
            <div className="card-body">
                <h2 className="card-title">Your Status</h2>
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
                                    <FaBolt size={12} /> {paymentAmount} sats Required
                                </span>
                            ) : (
                                <span className="badge badge-outline gap-1">
                                    No Payment Required
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                {acceptsLightning && !isMember && !isModOrOwner && (
                    <div className="mt-4">
                        <a href={`/clientinvoices?relayid=${relay.id}&pubkey=${myPubkey}&amount=${paymentAmount}`} className="btn btn-primary btn-sm w-full">
                            <FaBolt size={12} className="mr-1" /> Pay for Access
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
