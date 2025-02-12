"use client"
import { RelayWithEverything } from "../components/relayWithEverything"
import { useState, useEffect } from "react"
import Relay from "../components/relay"

export default function PublicRelays() {
    const [results, setResults] = useState<RelayWithEverything[]>([])
    const [allRelays, setAllRelays] = useState<RelayWithEverything[]>([])

    useEffect(() => {
        const fetchRelays = async () => {
            try {
                const response = await fetch(`/api/relay/guiRelays`)
                const data = await response.json()
                setResults(data.publicRelays)
                setAllRelays(data.publicRelays)
            } catch (error) {
                console.error('Error fetching relays:', error)
            }
        }
        fetchRelays()
    }, [])

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        const targetToLower = e.target.value.toLowerCase()
        const r = allRelays.filter((relay) => {
            if (relay.name.toLowerCase().includes(targetToLower)) {
                return true
            }

            if (relay.details && relay.details.toLowerCase().includes(targetToLower)) {
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
                <h1 className="text-2xl mb-5 mt-4 text-center lg:text-left">Explore relays</h1>
                <div className="text-sm lg:visible hidden mb-5">Search and browse relays in the directory.  Check out their teams and mission statements and browse each relays content.</div>
                <div>
                    <div className="items-center justify-center lg:justify-left lg:items-left">
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