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
        <div className="">
            <h1 className="mt-8 text-5xl text-primary text-center">The fastest and easiest way to launch new relays for nostr.</h1>
            <div className="mt-8 flex flex-wrap gap-12">
                <div className="bg-base-100 hidden flex-1 lg:flex-auto lg:block lg:w-1/4">
                    <div className="">
                        <h2 className="font-bold text-xl mb-2">What is nostr?</h2>
                        <p>Nostr is a magical journey where we discover how to take control over our social media experience. Relays are an important part of the nostr ecosystem.</p>
                    </div>
                </div>
                <div className="bg-base-100 flex-1 lg:flex-auto hidden lg:block lg:w-1/4">
                    <div className="">
                        <h2 className="font-bold text-xl mb-2">Discover, Create, Join</h2>
                        <p>
                            You can discover new relays to connect to.
                            You can create new relays. You can join a relay as a paid member or a moderator.
                        </p>
                    </div>
                </div>
                <div className="bg-base-100 flex-1 lg:flex-auto lg:w-1/4">
                    <div className="">
                        <h2 className="font-bold text-xl mb-2">Relay Creator</h2>
                        <p>Create relays of any type quickly and easily</p>
                        <p>Pricing: 12,000 sats/month</p>
                        <p className="">open source</p>
                        <a className="link" href="https://github.com/relaytools">github</a>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <a href={`/signup`} className="btn uppercase btn-primary rounded-lg"
                >
                    <Image src="buttonStart.svg" className="rounded-lg" alt="Start a Relay" width={200} height={50} />
                </a>
            </div>
        </div >
    )
}