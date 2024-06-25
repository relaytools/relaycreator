"use client"
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


    //maybe try flex grow

    return (
        <div className="">
            <div className="">
                <h1 className="text-2xl mb-5 mt-4">Explore relays</h1>
                <div className="text-sm mb-5">Search and browse relays in the directory.  Check out their teams and mission statements and browse each relays content.</div>
                <div>
                    <div>
                        <input className="input input-bordered" placeholder="Search" onChange={(e) => handleSearch(e)} />
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-12">
                {results.map((relay) => (
                    <Relay key={"pub" + relay.id} modActions={false} relay={relay} showEdit={false} showSettings={false} showDetail={true} showExplorer={false} showCopy={false} />
                ))}
            </div>
        </div>
    )
}