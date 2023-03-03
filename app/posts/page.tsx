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
import '../globals.css'

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
                    //console.log('got event:', event);
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
            <div>
                <h1>Posts</h1>
                <div className="overflow-hidden bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Post</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">by: {author}</p>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                        <dl className="sm:divide-y sm:divide-gray-200">
                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">content</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                                    {post}
                                </dd>
                            </div>
                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">relay</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{relay}</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
            <div>
                <h2>status log</h2>
                <ul role="list" className="divide-y divide-gray-200">
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