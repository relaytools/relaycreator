"use client"
import { nip19 } from "nostr-tools"
import { ModWithRelays, RelayWithEverything } from "../components/relayWithEverything"
import { useState } from "react"
import Relay from "../components/relay"
import PublicRelays from "./publicRelays"

export default function MyRelays(
    props: React.PropsWithChildren<{
        myRelays: RelayWithEverything[];
        moderatedRelays: ModWithRelays[];
        publicRelays: RelayWithEverything[];
    }>) {

    const [showMyRelays, setShowMyRelays] = useState(false)

    const selectTypeRelays = () => {
        if (showMyRelays) {
            return (
                <div>
                    <input key="showpublicrelays1" className="join-item btn" onClick={() => setShowMyRelays(false)} type="radio" name="options" aria-label="Public Relays" />
                    <input key="shomyrelays1" className="join-item btn btn-primary btn-active" onClick={() => setShowMyRelays(true)} type="radio" name="options" aria-label="My Relays" />
                </div>
            )
        } else {
            return (
                <div>
                    <input key="publicrelays1" className="join-item btn btn-primary btn-active" onClick={() => setShowMyRelays(false)} type="radio" name="options" aria-label="Public Relays" />
                    <input key="myrelays1" className="join-item btn" onClick={() => setShowMyRelays(true)} type="radio" name="options" aria-label="My Relays" />
                </div>
            )
        }

    }

    return (
        <div>
            <div className="mt-8 mb-8 px-4">
                <div className="flex justify-center">
                    {selectTypeRelays()}
                </div>
                {showMyRelays &&
                    <div>
                        <div className="mt-8 lg:grid lg:grid-cols-3 gap-4 sm:flex sm:flex-col">
                            {props.myRelays.map((relay) => (
                                <Relay key={relay.id} relay={relay} showSettings={true} showEdit={false} showDetail={false} showExplorer={false} showCopy={false} />
                            ))}

                            {props.moderatedRelays.map((relay) => (
                                <Relay key={relay.id} relay={relay.relay} showSettings={true} showEdit={false} showDetail={false} showExplorer={false} showCopy={false} />
                            ))}
                        </div>
                    </div>
                }
                {
                    !showMyRelays &&
                    <PublicRelays relays={props.publicRelays} />
                }

            </div>

        </div >
    )
}