"use client"
import { nip19 } from "nostr-tools"
import { RelayWithEverything } from "./relayWithEverything"
import { useState } from "react"

function copyToClipboard(e: any, bolt: string) {
    e.preventDefault()
    navigator.clipboard.writeText(bolt).then(() => {
        console.log('Copied to clipboard!');
    });
}

export default function RelaySmall(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
    }>) {

    let useRelayWSS = "wss://" + props.relay.name + "." + props.relay.domain
    // if relay is external, use full domain name here
    if(props.relay.is_external) {
        useRelayWSS = "wss://" + props.relay.domain
    }

    let useRelayHttps = "https://" + props.relay.name + "." + props.relay.domain
    if(props.relay.is_external) {
        useRelayHttps = "https://" + props.relay.domain
    }

    let useDetails = ""
    if(props.relay.details) {
        useDetails = props.relay.details.split('\n').slice(0, 2).join('\n');
    }


    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "http://localhost:3000"

    if(process.env.NEXT_PUBLIC_DISABLE_MIDDLEWARE == "true") {
        useRelayHttps = "/relays/" + props.relay.name
    }

    return (
        <div id={props.relay.id + "rootview"} className="mb-4">
                <a href={useRelayHttps} className="flex shrink items-center">
                    <div className="chat-image avatar mr-2">
                        <div className="w-10 rounded-full">
                            <img src={props.relay.banner_image || '/green-check.png'} />
                        </div>
                    </div>
                    <div>
                        <div className="text-lg font-condensed">{props.relay.name}</div>
                    </div>
                </a>
        </div>

    )
}