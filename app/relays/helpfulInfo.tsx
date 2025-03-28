"use client"
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

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
        <div className="font-condensed">
            <h1 className="mt-2 text-2xl leading-tight lg:leading-normal lg:text-5xl text-secondary text-center">The fastest and easiest way to launch new relays for nostr.</h1>
            <div className="mt-8 flex flex-wrap gap-12">
                <div className="bg-base-100 hidden flex-1 lg:flex-auto lg:block lg:w-1/4">
                    <div className="">
                        <h2 className="text-xl mb-2">What is Nostr?</h2>
                        <p className="font-roboto">Nostr is a distributed social media protocol for the internet aimed at taking back control over our social media experience. Relays are an important part of the nostr ecosystem.</p>
                    </div>
                </div>
                <div className="bg-base-100 flex-1 lg:flex-auto hidden lg:block lg:w-1/4">
                    <div className="">
                        <h2 className="font text-xl mb-2">Discover, Create, Join</h2>
                        <p className="font-roboto">
                            You can discover new relays to connect to.
                            You can create new relays. You can join a relay as a paid member or a moderator.
                        </p>
                    </div>
                </div>
                <div className="bg-base-100 flex-1 lg:flex-auto lg:w-1/4 text-center lg:text-left">
                    <div className="">
                        <h2 className="text-xl mb-2">Relay Creator</h2>
                        <div className="font-roboto">
                            <p>Create relays of any type quickly and easily</p>
                            <p>Pricing: 12,000 sats/month</p>
                            <p className="">open source on <a className="link" href="https://github.com/relaytools">github</a></p>
                            
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex lg:justify-end justify-center">
                <a href={`/signup`} className="btn uppercase btn-base-100 rounded-lg flex-grow">
                    <Image src="buttonStart.svg" className="rounded-lg" alt="Start a Relay" width={200} height={50} style={{ width: '200px', height: 'auto', objectFit: 'cover' }} />
                </a>
            </div>
        </div >
    )
}