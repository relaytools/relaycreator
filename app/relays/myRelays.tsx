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

    const [showMyRelays, setShowMyRelays] = useState(true)

    const selectTypeRelays = () => {
        if (showMyRelays) {
            return (
                <div>
                    <input key="shomyrelays1" className="join-item btn btn-primary btn-active" onClick={() => setShowMyRelays(true)} type="radio" name="options" aria-label="My Relays" />
                    <input key="showpublicrelays1" className="join-item btn" onClick={() => setShowMyRelays(false)} type="radio" name="options" aria-label="Public Relays" />
                </div>
            )
        } else {
            return (
                <div>
                    <input key="myrelays1" className="join-item btn" onClick={() => setShowMyRelays(true)} type="radio" name="options" aria-label="My Relays" />
                    <input key="publicrelays1" className="join-item btn btn-primary btn-active" onClick={() => setShowMyRelays(false)} type="radio" name="options" aria-label="Public Relays" />
                </div>
            )
        }

    }

    return (
        <div>
            <div className="font-jetbrains mt-8 mb-8 px-4">
                {showMyRelays &&
                    <div className="">
                        <div className="lg:grid lg:grid-cols-3 gap-4 sm:flex sm:flex-col">
                            {props.myRelays.map((relay) => (
                                <Relay key={relay.id} relay={relay} showSettings={true} showEdit={false} showDetail={false} showExplorer={false} />
                            ))}
                        </div>
                        <div className="lg:grid lg:grid-cols-3 gap-4 sm:flex sm:flex-col">
                            {props.moderatedRelays.map((mod) => (
                                <div key={"modrelay" + mod.id} className="card image-full w-full bg-base-100 shadow-xl mb-4 z-[0]">
                                    <figure className="max-h-[400px] w-full">
                                        <img src={mod.relay.banner_image || "/green-check.png"} className="object-cover w-full" alt="mod.relay" />
                                    </figure>

                                    <div className="card-body">
                                        <h2 className="card-title">{mod.relay.name}</h2>
                                        <p>{"wss://" + mod.relay.name + ".nostr1.com"}</p>

                                        <p className="description mb5" style={{ whiteSpace: "pre-wrap", maxHeight: "200px", overflow: "auto" }}>{mod.relay.details || ""}</p>
                                        <div className="card-actions justify-begin">
                                            <a href={"https://relays.vercel.app/relay/" + nip19.nrelayEncode("wss://" + mod.relay.name + ".nostr1.com")} className="btn btn-secondary">
                                                open in relay explorer<span className="sr-only">, {mod.relay.id}</span>
                                            </a>
                                            <a href={"/posts?relay=" + nip19.nrelayEncode("wss://" + mod.relay.name + ".nostr1.com")} className="btn btn-secondary">
                                                open in relay explorer (alpha)<span className="sr-only">, {mod.relay.id}</span>
                                            </a>

                                        </div>
                                        <div className="card-actions justify-end">
                                            <a href={`/curator?relay_id=${mod.relay.id}`} className="btn btn-primary">
                                                settings<span className="sr-only">, {mod.relay.id}</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
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