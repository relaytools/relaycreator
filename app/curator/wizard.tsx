"use client"
import ListEntryKeywords from "./listEntryKeywords"
import ListEntryPubkeys from "./listEntryPubkeys"
import ListEntryKinds from "./listEntryKinds"
import EnableAllowList from "./enableAllowList"
import EnableBlockList from "./enableBlockList"
import DefaultPolicy from "./defaultPolicy"
import Moderators from "./moderators"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Relay from "../components/relay"
import { RelayWithEverything } from "../components/relayWithEverything"

export default function Wizard(props: React.PropsWithChildren<{
    relay: RelayWithEverything;
}>) {

    const [crumbState, setCrumbState] = useState(1)

    const crumbs = () => {
        switch (crumbState) {
            case 1:
                return (
                    <ul className="steps steps-vertical lg:steps-horizontal">
                        <li className="step step-primary"><a onClick={() => setCrumbState(1)}>Getting Started</a></li>
                        <li className="step"><a onClick={() => setCrumbState(2)}>Relay Types</a></li>
                        <li className="step"><a onClick={() => setCrumbState(3)}>Access Control</a></li>
                    </ul>
                )
            case 2:
                return (
                    <ul className="steps steps-vertical lg:steps-horizontal">
                        <li className="step step-primary"><a onClick={() => setCrumbState(1)}>Getting Started</a></li>
                        <li className="step step-primary"><a onClick={() => setCrumbState(2)}>Relay Types</a></li>
                        <li className="step"><a onClick={() => setCrumbState(3)}>Access Control</a></li>
                    </ul>
                )
            case 3:
                return (
                    <ul className="steps steps-vertical lg:steps-horizontal">
                        <li className="step step-primary"><a onClick={() => setCrumbState(1)}>Getting Started</a></li>
                        <li className="step step-primary"><a onClick={() => setCrumbState(2)}>Relay Types</a></li>
                        <li className="step step-primary"><a onClick={() => setCrumbState(3)}>Access Control</a></li>
                    </ul>

                )
        }
    }

    const crumbAdvance = () => {
        setCrumbState(crumbState + 1)
    }

    return (
        <div className="flex flex-col lg:items-center lg:justify-center">
            <div className="flex flex-wrap mb-4">
                {crumbs()}
            </div>

            <article className="prose lg:prose-lg">
                {crumbState == 1 && <h2>Relay Setup Wizard</h2>}
                {crumbState == 2 && <h2>Choose a relay type</h2>}

                {crumbState == 1 &&
                <div>
                    <p>This wizard will help you walk through the process of setting up your relay.  You can always re-configure your relay after you complete the setup.</p>
                    <p>There are many capabilities available for all types of relays and you can mix-and-match them to suit your needs.</p>
                    <ul>
                        <li>Lightning Payments</li>
                        <li>Moderation</li>
                        <li>Access Control by Pubkey, Event Kind, and Keywords</li>
                        <li>Access Control for read/write</li>
                        <li>Specialized support for DMs, private groups, and lists.</li>
                    </ul>
                </div>
                }

            </article>
            {crumbState == 1 && <div className="btn btn-primary"
                onClick={() => crumbAdvance()}>Let's Go!</div> }

            
            {crumbState == 2 && 
            <div className="flex flex-wrap">

                <div className="card bg-base-100 w-96 shadow-xl mr-4 mb-4">
                    <div className="card-body">
                        <h2 className="card-title">Community Relay</h2>
                        <p>This relay can be used to shared with multiple people.  You can optionally setup payment options and invite friends.</p>
                        <div className="card-actions justify-end">
                            <button className="btn btn-primary">select</button>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 w-96 shadow-xl mr-4 mb-4">
                    <div className="card-body">
                        <h2 className="card-title">Public Paid Relay</h2>
                        <p>This relay can be setup for the general public with lightning payments.</p>
                        <div className="card-actions justify-end">
                            <button className="btn btn-primary">select</button>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 w-96 shadow-xl mb-4">
                    <div className="card-body">
                        <h2 className="card-title">Public Free Relay</h2>
                        <p>This relay allows free access.  This is not recommended unless you are willing to have a solid moderation team.</p>
                        <div className="card-actions justify-end">
                            <button className="btn btn-primary">select</button>
                        </div>
                    </div>
                </div>

            </div>
            }
        </div>
    )

}