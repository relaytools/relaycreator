"use client"
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IoArrowForwardOutline } from 'react-icons/io5';

export default function HelpfulInfo(props: React.PropsWithChildren<{}>) {
    const { data: session, status } = useSession();
    const p = useSearchParams();
    if (p == null) {
        return (
            <>
                no p
            </>
        )
    }

    const relayname = p.get('relayname');
    let useName = ""
    if (relayname) {
        useName = relayname
    }

    const router = useRouter()

    const handleCreateRelay = async (event: any) => {
        event.preventDefault();

    }

    return (
        <div className="font-jetbrains flex flex-col justify-center items-center">
            <h1 className="justify-center text-3xl text-primary">The fastest and easiest way to create nostr relays</h1>
            <div className="mt-2 lg:grid lg:grid-cols-3 lg:gap-2 sm:flex sm:flex-col sm:gap-4">
                <div className="card w-96 bg-base-100">
                    <div className="card-body">
                        <h2 className="card-title">What is Nostr?</h2>
                        <p>Nostr is a protocol that involves servers and clients.  The servers in nostr are called relays.  You can connect to any numer of relays from your favorite client.  (link for more info)</p>
                    </div>
                </div>
                <div className="card w-96 bg-base-100">
                    <div className="card-body">
                        <h2 className="card-title">Why relay tools</h2>
                        <p>Relay.tools is a web based control panel and deployment system for relays.

                            The web UI provides easy relay creation, moderation capabilities, spam prevention, filtering rules and best practice settings.
                        </p>
                    </div>
                </div>
                <div className="card w-96 bg-base-100">
                    <div className="card-body">
                        <h2 className="card-title">How it works</h2>
                        <p>You can start by creating a relay.  Relays cost 21k sats / month and can be paid for using the lightning network.</p>
                    </div>
                </div>
            </div>
            <div className="mt-2 flex rounded-md w-full items-center">
                <span className="w-full bg-gradient-to-r from-gray-200 to-gray-100 items-center h-5 px-3 sm:text-sm">
                </span>
                <a href={`/signup`} className="btn btn-primary inline-flex items-center rounded-md border border-l-0 border-gray-300 px-3 sm:text-sm"
                >
                    Create a relay<span className="fl pl-2"><IoArrowForwardOutline /></span>
                </a>
            </div>
        </div>
    )
}