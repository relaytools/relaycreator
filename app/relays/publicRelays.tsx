
"use client"
import { nip19 } from "nostr-tools"
import { RelayWithEverything } from "../components/relayWithEverything"
import { useState } from "react"
import Relay from "../components/relay"

export default function PublicRelays(
    props: React.PropsWithChildren<{
        relays: RelayWithEverything[];
    }>) {

    const [results, setResults] = useState(props.relays)

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        const targetToLower = e.target.value.toLowerCase()
        const r = props.relays.filter((relay) => {
            if (relay.name.includes(targetToLower)) {
                return true
            }
            if (relay.details && relay.details.includes(targetToLower)) {
                return true
            }
            return false
        })
        setResults(r)
    }

    return (
        <div className="flow-root mt-8 mb-8 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center">
                <a href={`/signup`} className="btn btn-primary">
                    Create Relay
                </a>
            </div>

            <div className="join">

                <input className="join-item btn" type="radio" name="options" aria-label="Public Relays" />

                <div>

                    <div>
                        <input className="input input-bordered join-item" placeholder="Search" onChange={(e) => handleSearch(e)} />

                    </div>

                </div>
            </div>

            <div className="mt-8">
                {results.map((relay) => (
                    <Relay relay={relay} showEdit={false} showSettings={false} />
                ))}
            </div>
        </div>
    )
}