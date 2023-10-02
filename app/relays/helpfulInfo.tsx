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
            <div className="mt-8 lg:grid lg:grid-cols-3 lg:gap-4 sm:flex sm:flex-col sm:gap-4">
                <div className="card w-96 bg-base-100">
                    <div className="card-body">
                        <h2 className="card-title">What is Nostr?</h2>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sagittis in ante et euismod. Curabitur viverra porta purus nec rhoncus. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Donec sed nisi at velit aliquet blandit. Nulla eu l</p>
                    </div>
                </div>
                <div className="card w-96 bg-base-100">
                    <div className="card-body">
                        <h2 className="card-title">Why relay tools</h2>
                        <p>If a dog chews shoes whose shoes does he choose?</p>
                    </div>
                </div>
                <div className="card w-96 bg-base-100">
                    <div className="card-body">
                        <h2 className="card-title">How it works</h2>
                        <p>If a dog chews shoes whose shoes does he choose?</p>
                    </div>
                </div>
            </div>
            <div className="mt-2 flex rounded-md w-full items-center">
                <span className="w-full bg-gradient-to-r from-gray-200 to-gray-100 items-center h-5 px-3 sm:text-sm">
                </span>
                <button className="btn btn-primary inline-flex items-center rounded-md border border-l-0 border-gray-300 px-3 sm:text-sm"
                >
                    Start a relay<span className="fl pl-2"><IoArrowForwardOutline /></span>
                </button>
            </div>
        </div>
    )
}