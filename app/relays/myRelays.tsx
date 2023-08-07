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
            <div className="mx-auto max-w-7xl">
                <div className="join px-4 sm:px-6 lg:px-8">
                    {selectTypeRelays()}
                </div>
                {showMyRelays &&
                    <div className="py-10">
                        <div className="px-4 sm:px-6 lg:px-8">
                            <div className="sm:flex sm:items-center">
                                <div className="sm:flex-auto">
                                    <h1 className="text-base font-semibold leading-6">Relays (owner)</h1>
                                    <p className="mt-2 text-sm">
                                        A list of all the relays that you own.
                                    </p>
                                </div>
                                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                                    <a href={`/signup`} className="btn btn-primary">
                                        Create Relay
                                    </a>
                                </div>
                            </div>
                            <div className="mt-8 flow-root">
                                {props.myRelays.map((relay) => (
                                    <Relay key={relay.id} relay={relay} showSettings={true} showEdit={false} />
                                ))}
                            </div>
                            <div className="sm:flex sm:items-center">
                                <div className="sm:flex-auto">
                                    <h1 className="text-base font-semibold leading-6">Relays (moderator)</h1>
                                    <p className="mt-2 text-sm">
                                        A list of all the relays that you moderate.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-8 flow-root">
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

                    </div>
                }
                {
                    !showMyRelays &&
                    <PublicRelays relays={props.publicRelays} />
                }

            </div>

        </div>
    )
}