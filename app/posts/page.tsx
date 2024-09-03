"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { nip19 } from "nostr-tools";
import {
    generateSecretKey,
    getPublicKey,
    finalizeEvent,
} from "nostr-tools/pure";
import NDK, {
    NDKEvent,
    NDKNip07Signer,
    NDKRelay,
    NDKRelayAuthPolicies,
    NDKAuthPolicy,
    NDKRelaySet,
    NDKSubscription,
} from "@nostr-dev-kit/ndk";

import { useSearchParams } from "next/navigation";
import { RelayWithEverything } from "../components/relayWithEverything";
import RelayMenuBar from "../relays/relayMenuBar";
import RelayDetail from "../components/relayDetail";
import RelayPayment from "../components/relayPayment";
import Terms from "../components/terms";
import Image from "next/image";
import ShowSmallSession from "../smallsession";

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

//const nip07signer = new NDKNip07Signer();

const ndk = new NDK({
    //   signer: nip07signer,
    autoConnectUserRelays: false,
    enableOutboxModel: false,
});

const ndkPool = ndk.pool;

function copyToClipboard(e: any, bolt: string) {
    e.preventDefault();
    navigator.clipboard.writeText(bolt).then(() => {
        console.log("Copied to clipboard!");
    });
}

export default function PostsPage(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
        publicRelays: RelayWithEverything[];
        stats: any;
    }>
) {
    const { data: session, status } = useSession();
    const [posts, setPosts] = useState<Event[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [relayStatus, setRelayStatus] = useState(["initializing"]);
    const [showPost, setShowPost] = useState<Event>();
    const [showImages, setShowImages] = useState(false);
    const [replyPost, setReplyPost] = useState("");
    const [myPubkey, setMyPubkey] = useState("");
    const [modActions, setModActions] = useState(false);
    const [showKind, setShowKind] = useState("1");
    const [showKindPicker, setShowKindPicker] = useState(false);
    const [anonPost, setAnonPost] = useState(false);
    const [postContent, setPostContent] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaReplyRef = useRef<HTMLTextAreaElement>(null);
    const postFormRef = useRef<HTMLFormElement>(null);
    const replyFormRef = useRef<HTMLFormElement>(null);

    const relayLimit = 100;

    async function grabNewKinds(newKind: string) {
        var kindOtherSub: NDKSubscription;
        const kindToInteger = parseInt(newKind);
        kindOtherSub = ndk.subscribe(
            { kinds: [kindToInteger], limit: relayLimit },
            { closeOnEose: false, groupable: false }
        );
        kindOtherSub.on("event", (event: NDKEvent) => {
            // do profile lookups on the fly
            /*
            if(lookupProfileName(event.pubkey) == event.pubkey) {
                const profileSubAuth = ndk.subscribe({ kinds: [0], authors: [event.pubkey] }, {closeOnEose: true, groupable: true});
                profileSubAuth.on("event", (pevent: NDKEvent) => {
                    addProfile(pevent);
                });
            } */
            //console.log("got new event", event);
            addPost(event);
        });
    }

    let signerFailed = false;

    async function eventListener(relay: NDKRelay) {
        const kindToInteger = parseInt(showKind);
        const kind1Sub = ndk.subscribe(
            { kinds: [kindToInteger], limit: relayLimit },
            { closeOnEose: false, groupable: false }
        );
        kind1Sub.on("event", (event: NDKEvent) => {
            // do profile lookups on the fly

            // p tagged profiles
            let pro: string[] = [];
            event.tags.map((tag: any) => {
                if (tag[0] == "p") {
                    if (lookupProfileName(tag[1]) == tag[1]) {
                        pro.push(tag[1]);
                    }
                }
            });

            // lookup author profile
            if (lookupProfileName(event.pubkey) == event.pubkey) {
                pro.push(event.pubkey);
            }

            if (pro.length > 0) {
                // main sub
                const profilesRelays = NDKRelaySet.fromRelayUrls(
                    [
                        nrelaydata,
                        "wss://profiles.nostr1.com",
                        "wss://purplepag.es",
                    ],
                    ndk
                );
                const profileSubAuth = ndk.subscribe(
                    { kinds: [0], authors: pro },
                    { closeOnEose: true, groupable: true },
                    profilesRelays,
                    true
                );
                profileSubAuth.on("event", (pevent: NDKEvent) => {
                    addProfile(pevent);
                });
            }
            addPost(event);
        });
    }

    async function grabStuff(nrelaydata: string, auth: boolean = false) {
        var kind1Sub: NDKSubscription;

        const nip07signer = new NDKNip07Signer();
        try {
            const activeUser = await nip07signer.blockUntilReady();
            ndk.signer = nip07signer;
        } catch (e) {
            console.log("signer extension timed out");
            if (useAuth == true) {
                signerFailed = true;
            }
        }

        ndkPool.on("flapping", (flapping: NDKRelay) => {
            addToStatus("relay is flapping: " + flapping.url);
        });
        ndkPool.on("relay:auth", (relay: NDKRelay, challenge: string) => {
            addToStatus("auth: " + props.relay.name);
        });

        ndkPool.on("relay:authed", (relay: NDKRelay) => {
            let normalized_url = nrelaydata + "/";
            normalized_url = normalized_url.toLowerCase();
            if (relay.url == normalized_url) {
                addToStatus("authed: " + props.relay.name);
                wipePosts();
                eventListener(relay);
                console.log("authing?");
            }
        });

        ndkPool.on("relay:disconnect", (relay: NDKRelay) => {
            let normalized_url = nrelaydata + "/";
            normalized_url = normalized_url.toLowerCase();
            if (relay.url == normalized_url) {
                if (kind1Sub != undefined) {
                    kind1Sub.stop();
                }
                addToStatus("disconnected: " + props.relay.name);
            }
        });

        ndkPool.on("relay:connect", (relay: NDKRelay) => {
            let normalized_url = nrelaydata + "/";
            normalized_url = normalized_url.toLowerCase();
            if (relay.url == normalized_url) {
                addToStatus("connected: " + props.relay.name);
                wipePosts();
                if (!auth) {
                    eventListener(relay);
                } else if (signerFailed) {
                    addToStatus("sign-in required: " + props.relay.name);
                }
            }
        });

        ndkPool.on("relay:connecting", (relay: NDKRelay) => {
            //addToStatus("connecting: " + relay.url);
        });

        ndkPool.on("relay:authfail", (relay: NDKRelay) => {
            let normalized_url = nrelaydata + "/";
            normalized_url = normalized_url.toLowerCase();
            if (relay.url == normalized_url) {
                addToStatus("unauthorized: " + props.relay.name);
            }
        });

        //const customAuthPolicy =

        ndk.addExplicitRelay(
            nrelaydata,
            NDKRelayAuthPolicies.signIn({ ndk }),
            true
        );
    }

    async function addToStatus(message: string) {
        setRelayStatus((arr) => [...arr, message]);
    }

    const addPost = (e: any) => {
        const newPost: Event = e;
        setPosts((prevPosts) => [newPost, ...prevPosts]);
    };

    const wipePosts = () => {
        setPosts([]);
    };

    const removePost = (e: any) => {
        var setNewPosts: Event[] = [];
        posts.forEach((post) => {
            if (post.id != e.id) {
                setNewPosts.push(post);
            }
        });
        setPosts(setNewPosts);
    };

    const removePostPubkey = (e: any) => {
        var setNewPosts: Event[] = [];
        posts.forEach((post) => {
            if (post.pubkey != e.pubkey) {
                setNewPosts.push(post);
            }
        });
        setPosts(setNewPosts);
    };

    const addProfile = (e: any) => {
        const newProfileContent: ProfileContent = JSON.parse(e.content);
        const newProfile: Profile = {
            pubkey: e.pubkey,
            content: newProfileContent,
        };
        setProfiles((prevProfiles) => [newProfile, ...prevProfiles]);
    };

    var nrelaydata: string;
    var useAuth: boolean;

    if (props.relay == null || props.relay.name == null) {
        nrelaydata = "wss://nostr21.com";
        useAuth = false;
    } else if (props.relay.is_external) {
        nrelaydata = "wss://" + props.relay.domain;
        useAuth = props.relay.auth_required;
    } else {
        nrelaydata = "wss://" + props.relay.name + "." + props.relay.domain;
        useAuth = props.relay.auth_required;
    }

    const activeUser = ndk.activeUser;
    const activePubkey = activeUser?.pubkey;
    if (activePubkey != null && activePubkey != myPubkey) {
        console.log("setting my pubkey", activePubkey);
        setMyPubkey(activePubkey);
        const isModOrOwner =
            props.relay.moderators.some(
                (mod) => mod.user.pubkey == activePubkey
            ) || props.relay.owner.pubkey == activePubkey;
        if (isModOrOwner && modActions == false) {
            setModActions(true);
        }
        console.log("setting mod status", isModOrOwner);
    }

    useEffect(() => {
        grabStuff(nrelaydata, useAuth);
    }, []);

    function summarizePubkey(pubkey: string): string {
        if (pubkey == null) {
            return "";
        }
        if (pubkey.length <= 60) {
            return pubkey;
        }
        const firstFour = pubkey.substring(0, 4);
        const lastFour = pubkey.substring(pubkey.length - 4);
        return `${firstFour}...${lastFour}`;
    }

    const lookupProfileName = (pubkey: string) => {
        for (let i = 0; i < profiles.length; i++) {
            if (profiles[i].pubkey == pubkey) {
                return profiles[i].content.name;
            }
        }

        return pubkey;
    };

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
        const pubkeySubstring = pubkey.substring(0, 4);
        return (
            <div className="avatar placeholder">
                <div className="bg-neutral-focus text-neutral-content rounded-full w-10">
                    <span className="text-sm">{pubkeySubstring}</span>
                </div>
            </div>
        );
    };

    const lookupNip05 = (pubkey: string) => {
        for (let i = 0; i < profiles.length; i++) {
            if (profiles[i].pubkey == pubkey) {
                return profiles[i].content.nip05;
            }
        }
        return "";
    };

    const handleClick = (e: any, post: Event) => {
        e.preventDefault();

        if (e.target.id == "") {
            console.log("clicked!" + e.target.parentElement.id);
        } else {
            console.log("clicked!" + e.target.id);
        }

        setShowPost(post);
    };

    const chatStartOrEnd = (post: Event) => {
        // post is from me, use chat-end
        if (ndk.activeUser?.pubkey == post.pubkey) {
            return "chat chat-end hover:bg-primary-focus hover:text-white";
        } else {
            // post is from someone else, use chat-start
            return "chat chat-start hover:bg-primary-focus hover:text-white chat-secondary";
        }
    };

    const sortPosts = (ascending: boolean = true) => {
        const sortedPosts = [...posts].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return ascending ? dateA - dateB : dateB - dateA;
        });
        return sortedPosts;
    };

    const showContentWithoutLinks4 = (content: string) => {
        if (content.length > 10020) {
            content = content.substring(0, 10020) + "...<truncated>";
        }
        const substrings = [
            {
                regex: "nostr:(npub[a-z0-9]+)",
                replace: (match: string, p1: string) => {
                    var usePub: any;
                    var prettyName: string;
                    try {
                        const decoded = nip19.decode(p1);
                        usePub = decoded.data;
                        prettyName = summarizePubkey(lookupProfileName(usePub));
                    } catch {
                        prettyName = "unknown";
                    }
                    return {
                        content: "@" + prettyName,
                        className: "link link-primary",
                    };
                },
            },
            {
                regex: "(nostr:nevent[a-z,0-9]+)",
                replace: () => ({
                    content: "<nevent>",
                    className: "font-condensed",
                }),
            },
            {
                regex: "(nostr:nprofile[a-z,0-9]+)",
                replace: () => ({
                    content: "<nprofile>",
                    className: "font-condensed",
                }),
            },
            {
                regex: "(nostr:note[a-z,0-9]+)",
                replace: () => ({
                    content: "<note1>",
                    className: "font-condensed",
                }),
            },
            {
                regex: "(https?:\\/\\/[^\\s^\\n]+\\.(?:jpg|png|gif|jpeg))",
                replace: () => ({
                    content: "<image>",
                    className: "link link-primary",
                }),
            },
            {
                regex: "(https?://[^\\s,^\\n]+)",
                replace: () => ({
                    content: "<link>",
                    className: "link link-secondary",
                }),
            },
            {
                regex: "lnbc[a-z,0-9]+",
                replace: () => ({
                    content: "<invoice>",
                    className: "link link-secondary",
                }),
            },
            {
                regex: "bc1[a-z,0-9]+",
                replace: () => ({
                    content: "<btcaddr>",
                    className: "link link-secondary",
                }),
            },
        ];
        var elementResult: React.JSX.Element[] = [];
        let otherResult = "";
        var result = [];
        let i = 0;
        const processTextContent = (textContent: string) => {
            textContent.split("\n").forEach((line, lineIndex) => {
                line.split(/(\s+)/).forEach((segment, segmentIndex) => {
                    if (segment.length > 23) {
                        elementResult.push(
                            <span
                                key={`text-${elementResult.length}-${lineIndex}-${segmentIndex}`}
                                className="overflow-wrap break-all whitespace-pre-line"
                            >
                                {segment}
                            </span>
                        );
                    } else {
                        otherResult += segment + " ";
                        /*
                        elementResult.push(
                            <span
                                key={`text-${elementResult.length}-${lineIndex}-${segmentIndex}`}
                                className="overflow-wrap break-normal whitespace-pre-line"
                            >
                                {segment}
                            </span>
                        );
                        */
                    }
                });
                /*
                if (lineIndex < textContent.split("\n").length - 1) {
                    elementResult.push(
                        <br key={`br-${elementResult.length}-${lineIndex}`} />
                    );
                }*/
                if (otherResult.length > 0) {
                    elementResult.push(
                        <span
                            key={`text-${elementResult.length}-${lineIndex}`}
                            className="overflow-wrap break-normal whitespace-pre-line"
                        >
                            {otherResult}
                        </span>
                    );

                    if (lineIndex < textContent.split("\n").length - 1) {
                        elementResult.push(
                            <br
                                key={`br-${elementResult.length}-${lineIndex}`}
                            />
                        );
                    }
                    otherResult = "";
                }
            });
        };

        while (i < content.length) {
            let matched = false;
            for (const { regex, replace } of substrings) {
                const re = new RegExp(regex);
                const match = content.slice(i).match(re);
                if (match && match.index === 0) {
                    if (i > 0) {
                        let textContent = content.slice(0, i);
                        processTextContent(textContent);
                    }
                    const newThing = [...match];
                    const replaceResult = replace(newThing[0], newThing[1]);
                    result.push(replaceResult.content);
                    elementResult.push(
                        <span
                            key={`match-${elementResult.length}`}
                            className={replaceResult.className}
                        >
                            {replaceResult.content}
                        </span>
                    );
                    content = content.slice(i + match[0].length);
                    i = 0;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                i++;
            }
        }
        if (content.length > 0) {
            processTextContent(content);
        }

        return elementResult;
    };

    const parseOutAndShowLinks = (content: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls: string[] = [];
        content.replace(urlRegex, (url: string) => {
            urls.push(url);
            return url;
        });

        const njumpRegex = /(nostr:n[^\s]+)/g;
        content.replace(njumpRegex, (njump: string) => {
            urls.push("https://njump.me/" + njump);
            return njump;
        });

        return urls;
    };

    const showLocalTime = (unixTime: any) => {
        const date = new Date(unixTime * 1000); // Convert to milliseconds
        const localTime = date.toLocaleString(); // Format as local time string
        return localTime;
    };

    const parseOutAndShowImages = (content: string) => {
        const urlRegex = /(https?:\/\/[^\s]+?\.(jpg|png|gif|jpeg))/g;
        const urls: string[] = [];
        content.replace(urlRegex, (url: string) => {
            urls.push(url);
            return url;
        });
        return urls;
    };

    const findReply = (eventId: string) => {
        let foundpost: any;
        posts.forEach((post) => {
            if (post.id == eventId) {
                foundpost = post;
            }
        });
        if (foundpost != undefined) {
            return (
                <div>
                    {/*<div>{isReply(foundpost)}</div>*/}
                    <div
                        key={"replyfoundpost" + foundpost.id}
                        className={
                            chatStartOrEnd(foundpost) + " overflow-hidden"
                        }
                        onClick={(e) => handleClick(e, foundpost)}
                    >
                        <div className="chat-image avatar">
                            {lookupProfileImg(foundpost.pubkey)}
                        </div>
                        <div className="chat-header">
                            <div className="flex items-center space-x-2">
                                <div className="hover:text-white overflow-x-auto">
                                    {summarizePubkey(
                                        lookupProfileName(foundpost.pubkey)
                                    )}
                                </div>
                                <time className="text-xs text-notice opacity-80">
                                    {lookupNip05(foundpost.pubkey)}
                                </time>
                            </div>
                        </div>

                        <div className="chat-bubble chat-bubble-gray-100 text-white selectable h-auto overflow-hidden">
                            {showContentWithoutLinks4(foundpost.content)}
                        </div>
                        <div className="chat-footer opacity-50">
                            {showLocalTime(foundpost.created_at)}
                        </div>
                    </div>
                </div>
            );
        } else {
            return <></>;
        }
    };

    const isReply = (post: Event) => {
        let etags: string[] = [];
        post.tags.forEach((t: any) => {
            if (t[0] == "e") {
                etags.push(t);
            }
        });
        let ptags: string[] = [];
        post.tags.forEach((t: any) => {
            if (t[0] == "p") {
                ptags.push(t);
            }
        });

        return (
            <div>
                {etags.map((tag: any) => (
                    <div key={"tage" + tag}>{findReply(tag[1])}</div>
                ))}
            </div>
        );
    };

    const handleReply = async (e: any) => {
        e.preventDefault();
        if (showPost != undefined) {
            if (anonPost) {
                const newSK = generateSecretKey();
                const newPK = getPublicKey(newSK);
                const event = finalizeEvent(
                    {
                        kind: 1,
                        content: replyPost,
                        tags: [
                            ["p", showPost.pubkey],
                            ["e", showPost.id],
                        ],
                        created_at: Math.floor(Date.now() / 1000),
                    },
                    newSK
                );
                const newEvent = new NDKEvent(ndk, event);
                await newEvent.publish();
            } else {
                const newEvent = new NDKEvent(ndk);
                newEvent.content = replyPost;
                newEvent.kind = 1;
                newEvent.tags = [
                    ["p", showPost.pubkey],
                    ["e", showPost.id],
                ];
                await newEvent.publish();
            }
            //clear the form
            setShowPost(undefined);
            setReplyPost("");
        }
    };

    // todo, delete from view
    const handleDeleteEvent = async (e: any) => {
        e.preventDefault();
        if (showPost != undefined) {
            const dEvent = new NDKEvent(ndk);
            dEvent.kind = 7;
            dEvent.tags = [["e", showPost.id]];
            dEvent.content = "❌";
            await dEvent.publish();
            removePost(showPost);
            //clear the form
            setShowPost(undefined);
        }
    };

    const handleBlockPubkey = async (e: any) => {
        e.preventDefault();
        if (showPost != undefined) {
            // call to API to add new keyword
            const response = await fetch(
                `/api/relay/${props.relay.id}/blocklistpubkey`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pubkey: showPost.pubkey,
                        reason: "mod action",
                    }),
                }
            );

            if (response.ok) {
                const j = await response.json();
            }
        }
    };

    const handleBlockAndDelete = async (e: any) => {
        e.preventDefault();
        // delete part
        if (showPost != undefined) {
            // deleting phase
            const dEvent = new NDKEvent(ndk);
            dEvent.kind = 7;
            dEvent.tags = [["p", showPost.pubkey]];
            dEvent.content = "🔨";
            await dEvent.publish();

            // blocking phase
            handleBlockPubkey(e);
            // remove from UI
            removePostPubkey(showPost);
            //clear the form
            setShowPost(undefined);
        }
    };

    const handleClosePost = async (e: any) => {
        e.preventDefault();
        setShowPost(undefined);
        setReplyPost("");
        setShowImages(false);
    };

    const handleSubmitPost = async (e: any) => {
        e.preventDefault();

        const form = e.target;
        const post = form.elements[0].value;

        // anonymous postin!
        // generates new key each time
        if (anonPost) {
            const newSK = generateSecretKey();
            const newPK = getPublicKey(newSK);
            const event = finalizeEvent(
                {
                    kind: 1,
                    created_at: Math.floor(Date.now() / 1000),
                    tags: [],
                    content: post,
                },
                newSK
            );

            const newEvent = new NDKEvent(ndk, event);
            await newEvent.publish();
        } else {
            const newEvent = new NDKEvent(ndk);
            newEvent.kind = 1;
            newEvent.content = post;
            await newEvent.publish();
        }

        //clear the form
        form.elements[0].value = "";
        setPostContent("");
    };

    const handleChangeKind = async (e: any) => {
        e.preventDefault();
        setShowKindPicker(false);
        setShowKind(e.target.value);
        wipePosts();
        await grabNewKinds(e.target.value);
    };

    const detectImages = (content: string) => {
        const urlRegex = /(https?:\/\/[^\s]+?\.(jpg|png|gif|jpeg))/g;
        const urls: string[] = [];
        content.replace(urlRegex, (url: string) => {
            urls.push(url);
            return url;
        });
        if (urls.length > 0) {
            return true;
        } else {
            return false;
        }
    };

    // textarea effects: auto expand multi-line
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [postContent]);

    useEffect(() => {
        if (textareaReplyRef.current) {
            textareaReplyRef.current.style.height = "auto";
            textareaReplyRef.current.style.height = `${textareaReplyRef.current.scrollHeight}px`;
        }
    }, [replyPost]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            postFormRef.current?.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true })
            );
        }
    };

    const handleKeyDownReply = (
        e: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            replyFormRef.current?.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true })
            );
        }
    };

    // this should be clickable and bring up some kind of menu/modal/drawer
    const displayRelayStatus = () => {
        var lastStatus: string;
        lastStatus = relayStatus[relayStatus.length - 1];
        var statusColor = "text-sm font-condensed ml-auto badge badge-neutral";
        if (
            lastStatus.includes("connected:") ||
            lastStatus.includes("authed:")
        ) {
            statusColor = "text-sm font-condensed ml-auto badge badge-success";
        }
        if (
            lastStatus.includes("disconnected:") ||
            lastStatus.includes("unauthorized:") ||
            lastStatus.includes("sign-in")
        ) {
            statusColor = "text-sm font-condensed ml-auto badge badge-warning";
        }
        return (
            <div className="drawer drawer-end justify-end">
                <input
                    id="my-drawer-4"
                    type="checkbox"
                    className="drawer-toggle"
                />
                <div className="drawer-content">
                    {/* Page content here */}
                    <label
                        htmlFor="my-drawer-4"
                        className="drawer-button flex items-center w-full"
                    >
                        <div className={statusColor}>
                            {relayStatus.findLast((item, i) => ({ item }))}
                        </div>
                        <div className="text-sm font-condensed ml-auto badge badge-neutral">
                            show options
                        </div>
                        <div className="bg-primary rounded-full">
                            <Image
                                alt="open drawer"
                                src="/gear-svgrepo-com.svg"
                                width={48}
                                height={48}
                            ></Image>
                        </div>
                    </label>
                </div>
                <div className="drawer-side z-10">
                    <label
                        htmlFor="my-drawer-4"
                        aria-label="close sidebar"
                        className="drawer-overlay"
                    ></label>
                    <div className="bg-base-200 text-base-content w-80 min-h-full">
                        <div className="mb-4">
                            <img
                                src={
                                    props.relay.banner_image ||
                                    "/green-check.png"
                                }
                            ></img>
                        </div>
                        <div className="text text-lg p-4 font-condensed">
                            {props.relay.details}
                        </div>
                        {props.relay.allow_list != null &&
                            !props.relay.default_message_policy && (
                                <div
                                    key="allowedpubkeycount"
                                    className="font-condensed p-4"
                                >
                                    Members:{" "}
                                    {props.relay.allow_list.list_pubkeys.length}
                                </div>
                            )}
                        <div className="mb-4">
                            <button
                                className="btn uppercase btn-secondary"
                                onClick={(e) => copyToClipboard(e, nrelaydata)}
                            >
                                copy url to clipboard
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center">
                            <div className="text-primary font-condensed text-lg font-bold">
                                anonymous posting {anonPost ? "ON" : "OFF"}
                            </div>
                            <label className="swap">
                                {/* this hidden checkbox controls the state */}
                                <input
                                    type="checkbox"
                                    onChange={(e) => setAnonPost(!anonPost)}
                                />

                                {/* volume on icon */}
                                <svg
                                    className="swap-off fill-current"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="48"
                                    height="48"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
                                </svg>

                                {/* volume off icon */}
                                <svg
                                    className="swap-on fill-current"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="48"
                                    height="48"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M3,9H7L12,4V20L7,15H3V9M16.59,12L14,9.41L15.41,8L18,10.59L20.59,8L22,9.41L19.41,12L22,14.59L20.59,16L18,13.41L15.41,16L14,14.59L16.59,12Z" />
                                </svg>
                            </label>
                        </div>

                        {props.relay.payment_required && (
                            <RelayPayment
                                relay={props.relay}
                                pubkey={myPubkey}
                            />
                        )}
                        {/*<RelayDetail relay={props.relay} />*/}
                        {<Terms />}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="">
            <div className="flex flex-wrap w-full fixed top-0 left-0 z-50 bg-base-100">
                <div className="flex w-full items-center mb-4">
                    <div className="drawer w-32">
                        <input
                            id="my-drawer"
                            type="checkbox"
                            className="drawer-toggle"
                        />
                        <div className="drawer-content">
                            <label
                                htmlFor="my-drawer"
                                className="drawer-button flex items-center"
                            >
                                <div className="bg-primary rounded-full">
                                    <Image
                                        alt="open drawer2"
                                        src="/arrow-left-square-svgrepo-com.svg"
                                        width={48}
                                        height={48}
                                    ></Image>
                                </div>
                                <div className="chat-image avatar">
                                    <div className="w-12 rounded-full">
                                        <img
                                            src={
                                                props.relay.banner_image ||
                                                "/green-check.png"
                                            }
                                        />
                                    </div>
                                </div>
                            </label>
                        </div>
                        <div className="drawer-side z-10">
                            <label
                                htmlFor="my-drawer"
                                aria-label="close sidebar"
                                className="drawer-overlay"
                            ></label>
                            <div className="menu bg-base-200 text-base-content min-h-full w-80">
                                {/* Sidebar content here */}
                                <RelayMenuBar relays={props.publicRelays} />
                            </div>
                        </div>
                    </div>
                    {displayRelayStatus()}
                </div>

                <div className="w-full p-2">
                    <form
                        ref={postFormRef}
                        onSubmit={(e) => handleSubmitPost(e)}
                        className="flex flex-wrap w-full items-center justify-center"
                    >
                        <textarea
                            ref={textareaRef}
                            key="post1"
                            placeholder="say something"
                            className="flex-grow p-4 max-w-7xl min-h-[40px] max-h-[300px] input input-bordered input-primary resize-none overflow-hidden"
                            onChange={(e) => setPostContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            value={postContent}
                            rows={1}
                        />
                        <button disabled={postContent == ""} className="btn uppercase btn-primary justify-end">
                            Post
                        </button>
                        {!showKindPicker && (
                            <button
                                onClick={(e) => setShowKindPicker(true)}
                                value={showKind}
                                key={showKind}
                                className="btn btn-secondary ml-2"
                            >
                                kind: {showKind}
                            </button>
                        )}
                    </form>
                </div>
                {showKindPicker && (
                    <div>
                        <div className="font-condensed items-center justify-center">
                            Event Kinds (seen) in the last 24 hours
                        </div>
                        <div className="flex flex-wrap rounded-sm border-primary border-2 w-full items-center justify-center">
                            {props.stats != undefined &&
                                props.stats.map((item: any) => (
                                    <button
                                        onClick={(e) => handleChangeKind(e)}
                                        value={item.kind}
                                        key={item.kind}
                                        className="btn btn-secondary"
                                    >
                                        kind: {item.kind} ({item._value})
                                    </button>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap bg-base-100 pt-32 sm:pt-32">
                {showPost != undefined && (
                    <div className="bg-base-100">
                        <dialog
                            key={"my_modal_5" + showPost.id}
                            className="modal modal-top modal-open sm:modal-middle h-auto"
                        >
                            <form method="dialog" className="modal-box w-full"
                                        ref={replyFormRef}
                                        onSubmit={(e) => handleReply(e)}
                            >
                                <div className="flex justify-end">
                                    <div
                                        className="btn uppercase"
                                        onClick={(e) => handleClosePost(e)}
                                    >
                                        X
                                    </div>
                                </div>
                                <div>{isReply(showPost)}</div>
                                <div
                                    key={"post" + showPost.id}
                                    className={chatStartOrEnd(showPost)}
                                >
                                    <div className="chat-image avatar">
                                        {lookupProfileImg(showPost.pubkey)}
                                    </div>
                                    <div className="chat-header overflow-hidden">
                                        <div className="flex flex-wrap items-center space-x-2">
                                            <div className="hover:text-white overflow-hidden break-words break-all">
                                                {summarizePubkey(
                                                    lookupProfileName(
                                                        showPost.pubkey
                                                    )
                                                )}
                                            </div>
                                            <time className="text-xs text-notice opacity-80 overflow-hidden break-words break-all">
                                                {lookupNip05(showPost.pubkey)}
                                            </time>
                                        </div>
                                    </div>

                                    <div className="chat-bubble text-white selectable h-auto overflow-wrap break-normal whitespace-pre-line">
                                        {showContentWithoutLinks4(
                                            showPost.content
                                        )}
                                    </div>
                                    <div className="chat-footer opacity-50">
                                        {showLocalTime(showPost.created_at)}
                                    </div>
                                </div>

                                {parseOutAndShowLinks(showPost.content).map(
                                    (url) => (
                                        <div
                                            key={"2" + url}
                                            className="mb-4 overflow-hidden"
                                        >
                                            <a
                                                href={url}
                                                className="link link-secondary overflow-hidden"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {url}
                                            </a>
                                        </div>
                                    )
                                )}

                                {detectImages(showPost.content) && (
                                    <div>
                                        {showImages &&
                                            parseOutAndShowImages(
                                                showPost.content
                                            ).map((url) => (
                                                <div key={"1" + url}>
                                                    <img
                                                        src={url}
                                                        className="h-auto overflow-hidden"
                                                    ></img>
                                                </div>
                                            ))}
                                        <span className="flex justify-between mt-4">
                                            <div
                                                className="btn uppercase mb-4"
                                                onClick={() =>
                                                    setShowImages(!showImages)
                                                }
                                            >
                                                show images
                                            </div>
                                        </span>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center justify-center mb-4 mt-2">
                                        <textarea
                                            ref={textareaReplyRef}
                                            key="replypost"
                                            placeholder="send reply"
                                            className="flex-grow p-4 max-w-7xl min-h-[40px] max-h-[300px] input input-bordered input-primary resize-none overflow-hidden"
                                            onChange={(e) =>
                                                setReplyPost(e.target.value)
                                            }
                                            onKeyDown={handleKeyDownReply}
                                            value={replyPost}
                                            rows={1}
                                        />
                                        <button
                                            className="btn uppercase btn-primary"
                                            onClick={(e) => handleReply(e)}
                                            disabled={replyPost == ""}
                                        >
                                            reply
                                        </button>
                                </div>

                                {modActions && (
                                    <div>
                                        <div className="w-full bg-gradient-to-r from-gray-600 to-gray-900 items-center h-5 px-3 sm:text-sm text-center mb-4">
                                            - actions -{" "}
                                        </div>
                                        <ShowSmallSession pubkey={myPubkey} />
                                        <div className="mb-4">
                                            <button
                                                className="btn uppercase"
                                                onClick={(e) =>
                                                    handleDeleteEvent(e)
                                                }
                                            >
                                                delete event
                                            </button>
                                        </div>
                                        <div className="mb-4">
                                            <button
                                                className="btn uppercase"
                                                onClick={(e) =>
                                                    handleBlockPubkey(e)
                                                }
                                            >
                                                block pubkey
                                            </button>
                                        </div>
                                        <div className="mb-4">
                                            <button
                                                className="btn uppercase"
                                                onClick={(e) =>
                                                    handleBlockAndDelete(e)
                                                }
                                            >
                                                block & delete pubkey
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-center">
                                    <div
                                        className="flex justify-end btn btn-primary uppercase"
                                        onClick={(e) => handleClosePost(e)}
                                    >
                                        next
                                    </div>
                                </div>
                            </form>
                        </dialog>
                    </div>
                )}
                <div className="flex flex-wrap h-auto w-full">
                    {sortPosts(false).map((post) => (
                        <div
                            key={"post" + post.id}
                            className={
                                chatStartOrEnd(post) + "flex-grow w-full"
                            }
                            onClick={(e) => handleClick(e, post)}
                            id={"eventid:" + post.id + ";pubkey:" + post.pubkey}
                        >
                            <div className="chat-image avatar">
                                {lookupProfileImg(post.pubkey)}
                            </div>
                            <div className="chat-header overflow-hidden">
                                <div className="flex flex-wrap items-center space-x-2">
                                    <div className="hover:text-white overflow-hidden break-normal">
                                        {summarizePubkey(
                                            lookupProfileName(post.pubkey)
                                        )}
                                    </div>
                                    <time className="text-xs text-notice opacity-80 overflow-hidden break-all">
                                        {lookupNip05(post.pubkey)}
                                    </time>
                                </div>
                            </div>

                            {post.kind == 1 && (
                                <div className="chat-bubble text-white selectable h-auto break-normal whitespace-pre-line">
                                    {showContentWithoutLinks4(post.content)}
                                </div>
                            )}
                            {post.kind != 1 && (
                                <div className="chat-bubble chat-bubble-gray-100 text-white selectable h-auto whitespace-pre-line break-normal">
                                    <div className="label label-text-sm">
                                        content
                                    </div>
                                    <div className="border-2 border-gray-300 rounded-lg p-4 whitespace-pre-line break-normal">
                                        {post.content && post.content}
                                        {!post.content && "no content"}
                                    </div>

                                    <div className="label label-text-sm">
                                        tags
                                    </div>
                                    <div className="border-2 border-gray-300 rounded-lg p-4 flex-col-2">
                                        {post.tags.map(
                                            (tag: any, index: number) => (
                                                <div className="flex">
                                                    {tag.map(
                                                        (
                                                            tval: any,
                                                            i: number
                                                        ) => (
                                                            <div
                                                                className="border-2 border-primary p-2 overflow-x-auto"
                                                                key={tval + i}
                                                            >
                                                                {tval}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="chat-footer opacity-50">
                                {showLocalTime(post.created_at)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
