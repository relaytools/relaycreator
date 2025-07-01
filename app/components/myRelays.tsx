"use client";
import {
    ModWithRelays,
    RelayWithEverything,
} from "./relayWithEverything";
import { useState, useEffect } from "react";
import Relay from "./relay";

export default function MyRelays() {
    const [myRelays, setMyRelays] = useState<RelayWithEverything[]>([]);
    const [moderatedRelays, setModeratedRelays] = useState<ModWithRelays[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
            {/* Relay Invoices Link */}
            <div className="mb-6">
                <a 
                    href="/invoices"
                    className="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer block"
                >
                    <div className="card-body text-center py-6">
                        <div className="text-4xl mb-2">📄</div>
                        <h3 className="card-title justify-center text-xl font-bold">Relay Invoices</h3>
                        <p className="text-sm opacity-90">View your relay billing & payment history</p>
                    </div>
                </a>
            </div>
            
            <div className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" defaultChecked /> 
                <div className="collapse-title text-lg font-bold text-center">
                    Relay Settings
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
        </div>
    );
}
