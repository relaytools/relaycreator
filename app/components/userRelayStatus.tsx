'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FaUser, FaShieldAlt, FaBolt, FaCheck, FaBan } from 'react-icons/fa';
import { RelayWithEverything } from './relayWithEverything';
import ShowSmallSession from '../smallsession';
import RelayPayment from './relayPayment';

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
            const isMod = relay.moderators?.some((mod) => mod.user.pubkey === myPubkey) || false;
            setIsModOrOwner(Boolean(isOwner || isMod));
            
            // Check if user is a member (in allow list)
            const isInAllowList = relay.allow_list?.list_pubkeys?.some(
                (entry) => entry.pubkey === myPubkey
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
                
                {/* Payment section - always show for debugging */}
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-2">
                    Payment required: {acceptsLightning ? 'Yes' : 'No'}, 
                    Amount: {paymentAmount} sats, 
                    Member: {isMember ? 'Yes' : 'No'}, 
                    Mod/Owner: {isModOrOwner ? 'Yes' : 'No'}
                </div>
                
                {/* TESTING: Always show payment component */}
                <div className="mt-4">
                    <div className="card bg-base-200 p-3">
                        <h3 className="font-medium flex items-center mb-2">
                            <FaBolt size={12} className="mr-2 text-warning" /> Pay for Access ({paymentAmount} sats)
                        </h3>
                        <RelayPayment relay={relay} pubkey={myPubkey || ''} />
                    </div>
                </div>
            </div>
        </div>
    );
}
