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
        <div className="">
            <h1 className="mt-8 text-3xl text-primary text-center">The fastest and easiest way to launch new relays for nostr.</h1>
            <div className="mt-8 lg:grid lg:grid-cols-3 lg:gap-2 sm:flex sm:flex-col sm:gap-4">
                <div className="bg-base-100 hidden lg:block mr-8">
                    <div className="">
                        <h2 className="font-bold text-xl">What is nostr?</h2>
                        <p>Nostr is a magical journey where we discover how to take control over our social media experience. Relays are an important part of the nostr ecosystem.</p>
                    </div>
                </div>
                <div className="bg-base-100 hidden lg:block mr-8">
                    <div className="">
                        <h2 className="font-bold text-xl">Discover, Create, Join</h2>
                        <p>
                            You can discover new relays to connect to.
                            You can create new relays. You can join a relay as a paid member or a moderator.
                        </p>
                    </div>
                </div>
                <div className="bg-base-100">
                    <div className="">
                        <h2 className="font-bold text-xl">relay creator</h2>
                        <p>create relays of any type quickly and easily</p>
                        <p>pricing: 12,000 sats/month</p>
                        <h2 className="">open source</h2>
                        <a className="link" href="https://github.com/relaytools">github</a>
                    </div>
                </div>
            </div>
            <div className="mt-2 flex rounded-md w-full items-center">
                <span className="w-full bg-gradient-to-r from-gray-200 to-gray-100 items-center h-5 px-3 sm:text-sm">
                </span>
                <a href={`/signup`} className="btn btn-primary inline-flex text-center rounded-md border border-l-0 border-gray-300 px-3 sm:text-sm"
                >
                    Create a relay<span className="fl pl-2"><IoArrowForwardOutline /></span>
                </a>
            </div>
        </div >
    )
}