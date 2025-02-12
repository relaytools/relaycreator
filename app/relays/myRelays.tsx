"use client";
import {
    ModWithRelays,
    RelayWithEverything,
} from "../components/relayWithEverything";
import { useState, useEffect } from "react";
import Relay from "../components/relay";
import { useSearchParams } from "next/navigation";

export default function MyRelays() {
    const [myRelays, setMyRelays] = useState<RelayWithEverything[]>([]);
    const [moderatedRelays, setModeratedRelays] = useState<ModWithRelays[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showPublicRelays, setShowPublicRelays] = useState(false);

    useEffect(() => {
        const fetchRelays = async () => {
            try {
                const response = await fetch("/api/relay/myRelays");
                const data = await response.json();
                setMyRelays(data.myRelays);
                setModeratedRelays(data.moderatedRelays);
            } catch (error) {
                console.error("Error fetching relays:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRelays();
    }, []);

    // find duplicated relays across myRelays vs. moderatedRelays
    const myRelayIds = myRelays.map((relay) => relay.id);
    const moderatedRelayIds = moderatedRelays.map((relay) => relay.relay.id);
    const duplicatedRelays = myRelayIds.filter((id) =>
        moderatedRelayIds.includes(id)
    );

    return (
        <div>
            <div className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" defaultChecked /> 
                <div className="collapse-title text-lg font-bold text-center">
                    Your Relay(s)
                </div>
                <div className="collapse-content">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : (
                        <div className="mt-4 flex flex-wrap gap-12">
                            {myRelays.map((relay) => (
                                <Relay
                                    key={relay.id}
                                    relay={relay}
                                    showSettings={true}
                                    showEdit={false}
                                    showDetail={false}
                                    showExplorer={false}
                                    showCopy={false}
                                />
                            ))}

                            {moderatedRelays.map(
                                (relay) =>
                                    !duplicatedRelays.includes(relay.relay.id) && (
                                        <Relay
                                            key={relay.id}
                                            relay={relay.relay}
                                            showSettings={true}
                                            showEdit={false}
                                            showDetail={false}
                                            showExplorer={false}
                                            showCopy={false}
                                        />
                                    )
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="collapse collapse-arrow bg-base-200 mt-4">
                <input 
                    type="checkbox" 
                    onChange={(e) => setShowPublicRelays(e.target.checked)}
                /> 
                <div className="collapse-title text-center text-lg">
                    Public Relays
                </div>
                <div className="collapse-content">
                    {showPublicRelays && (
                        <div className="mt-4">
                            {(() => {
                                const PublicRelays = require('./publicRelays').default;
                                return <PublicRelays />;
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
