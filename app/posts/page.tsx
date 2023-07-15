"use client"
import 'websocket-polyfill'
import { useEffect, useState } from 'react'
import ShowSession from '../mysession';
import { SessionProvider } from 'next-auth/react';
import Image from 'next/image'
import {
    relayInit,
    generatePrivateKey,
    getPublicKey,
    getEventHash,
    signEvent,
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
            <div className="px-4 sm:px-0">
                <h3 className="text-base font-semibold leading-7 text-white">Note Information</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6">noteid</p>
            </div>
            <div className="mt-6 border-t border-white/10">
                <dl className="divide-y divide-white/10">
                    <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6">Author</dt>
                        <dd className="mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0">{author}</dd>
                    </div>
                    <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6">Content</dt>
                        <dd className="mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0">
                            {post}
                        </dd>
                    </div>
                </dl>
            </div>
            <h2>Status Log</h2>
            <ul role="list" className="text-xs">
                {relayStatus.map((item, i) => (
                    <li key={"post" + i} className="px-1 py-1 sm:px-0">
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}
