"use client"
import { RelayWithEverything } from "../components/relayWithEverything"
import { useState } from "react"
import RelaySmall from "../components/relaySmall"

export default function RelayMenuBar(
    props: React.PropsWithChildren<{
        relays: RelayWithEverything[];
    }>) {

    const [results, setResults] = useState(props.relays)

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        const targetToLower = e.target.value.toLowerCase()
        const r = props.relays.filter((relay) => {
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
                <div>
                    <div className="items-center justify-center lg:justify-left lg:items-left">
                        <input className="input input-bordered" placeholder="Search" onChange={(e) => handleSearch(e)} />
                    </div>
                </div>
            </div>

            <div className="mt-4 flex-col">
                {results.map((relay) => (
                    <RelaySmall key={"pub" + relay.id} relay={relay} />
                ))}
            </div>
        </div>
    )
}