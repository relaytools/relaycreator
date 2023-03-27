"use client"
import 'websocket-polyfill'
import { useEffect, useState } from 'react'
import ShowSession from '../mysession';
import { SessionProvider } from 'next-auth/react';
import {
    relayInit,
    generatePrivateKey,
    getPublicKey,
    getEventHash,
    signEvent
} from 'nostr-tools'
import '/styles/globals.css'

export default function PostsPage() {
    const [post, setPost] = useState("");
    const [author, setAuthor] = useState("");
    const [relay, setRelay] = useState("");
    const [relayStatus, setRelayStatus] = useState(["initializing"]);

    async function addToStatus(message: string) {
        setRelayStatus(arr => [...arr, message]);
    }

    useEffect(() => {
        const grabStuff = async (relayUrl: string) => {
            const relay = relayInit(relayUrl);
            relay.on('connect', () => {
                console.log(`connected to ${relay.url}`)
                addToStatus(relayUrl + ": connected")
                let sub = relay.sub([{ kinds: [1], limit: 5 }])
                sub.on('event', (event: any) => {
                    console.log('got event:', event);
                    setPost(event.content);
                    setAuthor(event.pubkey);
                    setRelay(relay.url);
                })
                sub.on('eose', () => {
                    //sub.unsub()
                    addToStatus(relayUrl + ": connected and eose received");
                    console.log("got EOSE!");
                })
            })
            relay.on('error', () => {
                console.log(`failed to connect to ${relayUrl}`);
                addToStatus(relayUrl + " connection failed");
            })
            await relay.connect();
        }
        grabStuff("wss://nostr21.com")
            .catch(console.error);
        /*
    grabStuff("wss://relay.damus.io")
        .catch(console.error);
    grabStuff("wss://relay.nostr.info")
        .catch(console.error);
    grabStuff("wss://nostr-relay.wlvs.space")
        .catch(console.error);
    grabStuff("wss://rsslay.fiatjaf.com")
        .catch(console.error);
    grabStuff("wss://expensive-relay.fiatjaf.com")
        .catch(console.error);
    grabStuff("wss://nostr-relay.freeberty.net")
        .catch(console.error);
    grabStuff("wss://nostrrr.bublina.eu.org")
        .catch(console.error);
    grabStuff("wss://nostr.bitcoiner.social")
        .catch(console.error);
    grabStuff("wss://astral.ninja")
        .catch(console.error);
    grabStuff("wss://nostr-pub.semisol.dev")
        .catch(console.error);
        */

    }, []);


    return (
        <div>


            <article key={author} className="flex max-w-xl flex-col items-start justify-between font-jetbrains py-12 px-6">
                <div className="flex items-center gap-x-4 text-xs">
                    <time className="text-gray-500">
                        00:00:00
                    </time>
                    <a
                        href={relay}
                        className="relative z-10 rounded-full bg-gray-50 py-1.5 px-3 font-medium text-gray-600 hover:bg-gray-100"
                    >
                        {relay}
                    </a>
                </div>
                <div className="group relative">
                    <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                        <a href={relay}>
                            <span className="absolute inset-0" />
                            {relay}
                        </a>
                    </h3>
                    <p className="mt-5 text-sm leading-6 text-gray-600 line-clamp-3">{post}</p>
                </div>
                <div className="relative mt-8 flex items-center gap-x-4">
                    <div className="avatar">
                        <div className="w-24 mask mask-squircle">
                            <img src="https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg" />
                        </div>
                    </div>
                    <div className="text-sm leading-6">
                        <p className="font-semibold text-gray-900">
                            <a href={author}>
                                <span className="absolute inset-0" />
                                {author}
                            </a>
                        </p>
                        <p className="text-gray-600">{relay}</p>
                    </div>
                </div>
            </article>







            <div className="flex max-w-xl flex-col items-start justify-between font-jetbrains p-6 border-t border-base-200">
                <h2>Status Log</h2>
                <ul role="list" className="text-xs">
                    {relayStatus.map((item, i) => (
                        <li key={"post" + i} className="px-1 py-1 sm:px-0">
                            {item}
                        </li>
                    ))}
                </ul>

            </div>
        </div>
    );
}
