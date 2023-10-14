"use client"
//import 'websocket-polyfill'
import { useEffect, useState } from 'react'
import {
    relayInit,
} from 'nostr-tools'
import { useSession } from 'next-auth/react';
import { nip19 } from 'nostr-tools'
import { useSearchParams } from 'next/navigation'

interface Event {
    pubkey: string;
    content: any;
    kind: any;
    created_at: any;
    id: any;
    sig: any;
    tags: any;
}

interface ProfileContent {
    picture: any;
    nip05: any;
    name: any;
}

interface Profile {
    pubkey: any;
    content: any;
}

export default function PostsPage() {

    const { data: session, status } = useSession();
    //const myArray: Event[] = [];
    const [posts, setPosts] = useState<Event[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [relayStatus, setRelayStatus] = useState(["initializing"]);
    const [showPost, setShowPost] = useState<Event>();
    const [showImages, setShowImages] = useState(false);

    async function addToStatus(message: string) {
        setRelayStatus(arr => [...arr, message]);
    }

    const addPost = (e: any) => {
        const newPost: Event = e;
        setPosts(prevPosts => [newPost, ...prevPosts]);
    }

    const addProfile = (e: any) => {
        const newProfileContent: ProfileContent = JSON.parse(e.content);
        const newProfile: Profile = { pubkey: e.pubkey, content: newProfileContent };
        setProfiles(prevProfiles => [newProfile, ...prevProfiles]);
    };

    const searchParams = useSearchParams()
    var relayparam: any
    var relayLimit: any
    if (searchParams == null) {
        relayparam = nip19.nrelayEncode("wss://nostr21.com")
        relayLimit = 100
    } else {
        relayparam = searchParams.get('relay')
        if (relayparam == null) {
            relayparam = nip19.nrelayEncode("wss://nostr21.com")
        }
        const c = searchParams.get('limit')
        if (c == null) {
            relayLimit = 100
        } else {
            relayLimit = parseInt(c)
        }
    }

    let { type, data } = nip19.decode(relayparam)
    let nrelaydata: any;
    if (type === "nrelay") {
        nrelaydata = data;
    }

    useEffect(() => {
        const grabStuff = async (relayUrl: string) => {
            const relay = relayInit(relayUrl);
            relay.on('connect', () => {
                console.log(`connected to ${relay.url}`)
                addToStatus(relayUrl + ": connected")
                let sub = relay.sub([{ kinds: [1], limit: relayLimit }])
                sub.on('event', (event: any) => {
                    //console.log('got event:', event);
                    if (lookupProfileName(event.pubkey) == event.pubkey) {
                        let profileSub = relay.sub([{ kinds: [0], limit: 1, authors: [event.pubkey] }])
                        profileSub.on('event', (pevent: any) => {
                            //console.log('got profile event:', pevent);
                            profileSub.unsub()
                            addProfile(pevent)
                        })
                        profileSub.on('eose', () => {
                            profileSub.unsub()
                        })
                    }
                    addPost(event)
                })
                sub.on('eose', () => {
                    //sub.unsub()
                    //addToStatus(relayUrl + ": connected and eose received");
                    console.log("got EOSE!");
                })
            })
            relay.on('error', () => {
                console.log(`failed to connect to ${relayUrl}`);
                addToStatus(relayUrl + " connection failed");
            })
            await relay.connect();
        }
        grabStuff(nrelaydata)
        //grabStuff("wss://nostr21.com")
        //    .catch(console.error);
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

    const lookupProfileName = (pubkey: string) => {
        for (let i = 0; i < profiles.length; i++) {
            if (profiles[i].pubkey == pubkey) {
                //console.log("found profile name " + profiles[i].content.name)
                return profiles[i].content.name;
            }
        }

        return pubkey;
    }

    const lookupProfileImg = (pubkey: string) => {
        for (let i = 0; i < profiles.length; i++) {
            if (profiles[i].pubkey == pubkey) {
                return (
                    <div className="w-10 rounded-full">
                        <img src={profiles[i].content.picture} />
                    </div>
                );
            }
        }
        const pubkeySubstring = pubkey.substring(0, 4)
        return (

            <div className="avatar placeholder">
                <div className="bg-neutral-focus text-neutral-content rounded-full w-10">
                    <span className="text-sm">{pubkeySubstring}</span>
                </div>
            </div>
        );
    }

    const lookupNip05 = (pubkey: string) => {
        for (let i = 0; i < profiles.length; i++) {
            if (profiles[i].pubkey == pubkey) {
                return profiles[i].content.nip05;
            }
        }
        return "";
    }

    const handleClick = (e: any, post: Event) => {
        e.preventDefault();

        if (e.target.id == "") {
            console.log("clicked!" + e.target.parentElement.id);
        } else {
            console.log("clicked!" + e.target.id);
        }

        setShowPost(post)
    }

    const chatStartOrEnd = (post: Event) => {
        // post is from me, use chat-end
        if (session && session.user && session.user.name == post.pubkey) {
            return "chat chat-end hover:bg-primary-focus hover:text-white"
        } else {
            // post is from someone else, use chat-start
            return "chat chat-start hover:bg-primary-focus hover:text-white chat-secondary"
        }
    }

    const sortPosts = (ascending: boolean = true) => {
        const sortedPosts = [...posts].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return ascending ? dateA - dateB : dateB - dateA;
        });
        return sortedPosts;
    };

    const showContentWithoutLinks = (content: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return content.replace(urlRegex, "");
    }

    const parseOutAndShowLinks = (content: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls: string[] = [];
        content.replace(urlRegex, (url: string) => {
            urls.push(url);
            return url;
        });
        return urls;
    };
    const showLocalTime = (unixTime: any) => {
        const date = new Date(unixTime * 1000); // Convert to milliseconds
        const localTime = date.toLocaleString(); // Format as local time string
        return localTime;
    }

    const parseOutAndShowImages = (content: string) => {
        const urlRegex = /(https?:\/\/[^\s]+?\.(jpg|png|gif|jpeg))/g;
        const urls: string[] = [];
        content.replace(urlRegex, (url: string) => {
            urls.push(url)
            return url;
        });
        return urls;
    };

    const findReply = (eventId: string) => {
        console.log(posts.length)
        let foundpost: any
        posts.forEach((post) => {
            if (post.id == eventId) {
                console.log("foundreply")
                foundpost = post
            }

        })
        if (foundpost != undefined) {
            return (
                <div key={"replyfoundpost" + foundpost.id} className={chatStartOrEnd(foundpost) + " max-w-screen overflow-hidden"}
                    onClick={(e) => handleClick(e, foundpost)}
                >
                    <div className="chat-image avatar">
                        {lookupProfileImg(foundpost.pubkey)}
                    </div>
                    <div className="chat-header">
                        <div className="flex items-center space-x-2">
                            <div className="hover:text-white overflow-x-auto">{lookupProfileName(foundpost.pubkey)}</div>
                            <time className="text-xs text-notice opacity-80">{lookupNip05(foundpost.pubkey)}</time>
                        </div>
                    </div>

                    <div className="chat-bubble chat-bubble-gray-100 text-white selectable overflow-x-auto max-w-screen">{showContentWithoutLinks(foundpost.content)}</div>
                    <div className="chat-footer opacity-50">
                        {showLocalTime(foundpost.created_at)}
                    </div>
                </div>
            )
        } else {
            return (<></>)
        }
    }

    const isReply = (post: Event) => {
        let etags: string[] = []
        post.tags.forEach((t: any) => {
            if (t[0] == "e") {
                etags.push(t);
            }
        })
        let ptags: string[] = []
        post.tags.forEach((t: any) => {
            if (t[0] == "p") {
                ptags.push(t);
            }
        })

        return (
            <div>
                {etags.map((tag: any) => (
                    <div key={"tage" + tag}>
                        {findReply(tag[1])}
                    </div>
                ))}
            </div>

        )
    }



    const handleSubmitPost = async (e: any) => {
        e.preventDefault();

        const form = e.target;
        const post = form.elements[0].value;
        if (session && session.user) {
            const connectHere = relayInit(nrelaydata)
            connectHere.on('connect', () => {
                console.log(`connected to ${nrelaydata}`)
            })
            connectHere.on('error', () => {
                console.log(`failed to connect to ${nrelaydata}`)
            })
            await connectHere.connect()
            let event = {
                kind: 1,
                pubkey: session.user.name,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: post
            }
            let signedEvent = await (window as any).nostr.signEvent(event)

            console.log(signedEvent)

            const result = await connectHere.publish((signedEvent as any))
            console.log(result)
            connectHere.close()
            //clear the form
            form.elements[0].value = "";
        } else {
            form.elements[0].value = "";
            form.elements[0].placeholder = "not logged in"
        }

    }

    return (
        <div>
            <ul role="list" className="text-xs">
                {relayStatus.map((item, i) => (
                    <li key={"post" + i} className="px-1 py-1 sm:px-0">
                        {item}
                    </li>
                ))}
            </ul>
            <div className="flex items-center justify-center">
                <form onSubmit={(e) => handleSubmitPost(e)} className="flex items-center" >
                    <input type="text" key="post1" placeholder="say something" className="input input-bordered input-primary w-full" />
                    <button className="btn btn-primary">Post</button>
                </form>
            </div>
            {showPost != undefined &&
                <div className="font-jetbrains bg-base-100 flex">
                    <dialog key={"my_modal_5" + showPost.id} className="modal modal-top modal-open sm:modal-middle max-w-screen h-auto">

                        <form method="dialog" className="modal-box w-full">

                            <div>{isReply(showPost)}</div>
                            <div key={"post" + showPost.id} className={chatStartOrEnd(showPost) + " max-w-screen overflow-hidden"}>
                                <div className="chat-image avatar">
                                    {lookupProfileImg(showPost.pubkey)}
                                </div>
                                <div className="chat-header">
                                    <div className="flex items-center space-x-2">
                                        <div className="hover:text-white overflow-x-auto">{lookupProfileName(showPost.pubkey)}</div>
                                        <time className="text-xs text-notice opacity-80">{lookupNip05(showPost.pubkey)}</time>
                                    </div>
                                </div>

                                <div className="chat-bubble chat-bubble-gray-100 text-white selectable overflow-x-auto max-w-screen">{showContentWithoutLinks(showPost.content)}</div>
                                <div className="chat-footer opacity-50">
                                    {showLocalTime(showPost.created_at)}
                                </div>
                            </div>

                            {parseOutAndShowLinks(showPost.content).map((url) => (
                                <div key={"2" + url}>
                                    <a href={url} className="link link-primary">{url}</a>
                                </div>
                            ))}

                            {showImages && parseOutAndShowImages(showPost.content).map((url) => (
                                <div key={"1" + url}>
                                    <img src={url} className="max-w-screen h-auto overflow-hidden"></img>
                                </div>
                            ))}
                            <div className="btn" onClick={() => setShowImages(!showImages)}>show images</div>

                            <div className="modal-action">
                                {/* if there is a button in form, it will close the modal */}
                                <button className="btn" onClick={() => setShowPost(undefined)}>Actions</button>
                            </div>
                            <div className="modal-action">
                                {/* if there is a button in form, it will close the modal */}
                                <button className="btn" onClick={() => setShowPost(undefined)}>Close</button>
                            </div>
                        </form>
                    </dialog>
                </div>
            }
            {sortPosts(false).map((post) => (
                <div key={"post" + post.id} className={chatStartOrEnd(post) + " max-w-screen overflow-hidden"}
                    onClick={(e) => handleClick(e, post)}
                    id={"eventid:" + post.id + ";pubkey:" + post.pubkey}>

                    <div className="chat-image avatar">
                        {lookupProfileImg(post.pubkey)}
                    </div>
                    <div className="chat-header max-w-screen overflow-hidden">
                        <div className="flex items-center space-x-2">
                            <div className="hover:text-white max-w-screen overflow-hidden">{lookupProfileName(post.pubkey)}</div>
                            <time className="text-xs text-notice opacity-80">{lookupNip05(post.pubkey)}</time>
                        </div>
                    </div>

                    <div className="chat-bubble chat-bubble-gray-100 text-white selectable max-w-screen h-auto overflow-hidden">{post.content}</div>
                    <div className="chat-footer opacity-50">
                        {showLocalTime(post.created_at)}
                    </div>
                </div>
            ))
            }

        </div >
    );
}
