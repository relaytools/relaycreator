"use client"
import { RelayWithEverything } from "../components/relayWithEverything"
import { useState } from "react"
import RelaySmall from "../components/relaySmall"
import Image from 'next/image'

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
                <div className="bg-base-200 rounded-full mb-4">
                    <a
                        href={process.env.NEXT_PUBLIC_ROOT_DOMAIN + "/"}
                        className="flex items-center"
                    >
                        <Image
                            className="bg-primary rounded-full"
                            alt="open drawer2"
                            src="/arrow-left-square-svgrepo-com.svg"
                            width={48}
                            height={48}
                        ></Image>
                        <div className="font-condensed text:lg mr-2">RELAY.TOOLS</div>
                    </a>
                </div>
            </div>
            <div className="">
                <div>
                    <div className="items-center justify-center lg:justify-left lg:items-left">
                        <input className="input input-bordered" placeholder="Search" onChange={(e) => handleSearch(e)} />
                    </div>
                </div>
            </div>

            <div className="mt-4 flex-col">
                {results && results.map((relay) => (
                    <RelaySmall key={"pub" + relay.id} relay={relay} />
                ))}
            </div>
            
        </div>
    )
}