"use client";
import ListEntryKeywords from "./listEntryKeywords";
import ListEntryPubkeys from "./listEntryPubkeys";
import ListEntryKinds from "./listEntryKinds";
import Moderators from "./moderators";
import { useState } from "react";
import Relay from "../components/relay";
import { RelayWithEverything } from "../components/relayWithEverything";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function Wizard(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
    }>
) {
    // Nav and relay types
    const [relayKindDescription, setRelayKindDescription] = useState(
        props.relay.relay_kind_description
    );

    let useInitialCheck = 1;
    if (props.relay.relay_kind_description != "") {
        useInitialCheck = 0;
    }

    const [checked, setChecked] = useState(useInitialCheck);

    const isChecked = (step: number): boolean => {
        if (step === checked) {
            return true;
        } else {
            return false;
        }
    };

    let relayUrl = "";
    if (!props.relay.is_external) {
        relayUrl = "wss://" + props.relay.name + "." + props.relay.domain;
    } else {
        relayUrl = "wss://" + props.relay.domain;
    }

    const setAndPostRelayKindDescription = (description: string) => {
        setRelayKindDescription(description);
        const response = fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ relay_kind_description: description }),
        });
    };

    // streams
    const [streams, setStreams] = useState(props.relay.streams);
    const [streamUrl, setStreamUrl] = useState("");
    const [streamDirection, setStreamDirection] = useState("both"); // can be "up", "down", "both"

    const handleAddStream = async (newStream: {
        url: string;
        direction: string;
    }) => {
        const response = await fetch(`/api/relay/${props.relay.id}/streams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: newStream.url,
                direction: newStream.direction,
            }),
        });

        if (response.ok) {
            const responseData = await response.json();
            const updatedStreams = [...streams, responseData];
            setStreams(updatedStreams);
            toast.success("Stream configuration saved");
        } else {
            const errorMessage = await response.json();
            toast.error("Error saving stream: " + errorMessage.error);
        }
    };

    // Add this handler for removing streams
    const handleRemoveStream = async (streamToRemove: any) => {
        const response = await fetch(`/api/relay/${props.relay.id}/streams`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: streamToRemove.id }),
        });

        if (response.ok) {
            const updatedStreams = streams.filter(
                (stream) => stream !== streamToRemove
            );
            setStreams(updatedStreams);
            toast.success("Stream configuration updated");
        } else {
            toast.error("Failed to delete stream: ");
        }
    };

    // Image and Summary
    const [profileDetail, setProfileDetails] = useState(props.relay.details);
    const [profileBanner, setProfileBanner] = useState(
        props.relay.banner_image
    );
    const [listed, setListed] = useState(props.relay.listed_in_directory);

    const handleSubmitProfile = async (event: any) => {
        event.preventDefault();
        // call to API to save relay details
        const profileDetailsObj = {
            details: profileDetail,
            banner_image: profileBanner,
        };
        const profileDetailsJson = JSON.stringify(profileDetailsObj);
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: profileDetailsJson,
        });
        setChecked(4);
    };

    const handleProfileCancel = () => {
        setProfileDetails(props.relay.details);
        setProfileBanner(props.relay.banner_image);
    };

    const handleListedChange = async (e: any) => {
        e.preventDefault();
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listed_in_directory: !listed }),
        });
        if (listed) {
            setListed(false);
        } else {
            setListed(true);
        }
    };

    const isListed = () => {
        if (listed) {
            return "swap swap-active";
        } else {
            return "swap";
        }
    };

    // Access Control Modes
    const [allow, setAllow] = useState(props.relay.default_message_policy);

    const setAndPostAllow = (setting: boolean) => {
        setAllow(setting);
        const response = fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ default_message_policy: setting }),
        });
    };

    const isAllow = () => {
        if (allow) {
            return "swap swap-active";
        } else {
            return "swap";
        }
    };

    const handleAllowChange = async (e: any) => {
        e.preventDefault();
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ default_message_policy: !allow }),
        });
        if (allow) {
            setAllow(false);
        } else {
            setAllow(true);
        }
    };

    // Allow tagged to pubkeys
    const [allowTagged, setAllowTagged] = useState(props.relay.allow_tagged);

    const setAndPostAllowTagged = (setting: boolean) => {
        setAllowTagged(setting);
        const response = fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ allow_tagged: setting }),
        });
    };

    const handleTaggedChange = async (e: any) => {
        e.preventDefault();
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ allow_tagged: !allowTagged }),
        });
        if (allowTagged) {
            setAllowTagged(false);
        } else {
            setAllowTagged(true);
        }
    };

    const isTagged = () => {
        if (allowTagged) {
            return "swap swap-active";
        } else {
            return "swap";
        }
    };

    // NIP42 AUTH setting
    const [authRequired, setAuthRequired] = useState(props.relay.auth_required);

    const handleAuthChange = async (e: any) => {
        e.preventDefault();
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ auth_required: !authRequired }),
        });
        if (authRequired) {
            setAuthRequired(false);
        } else {
            setAuthRequired(true);
        }
    };

    const isAuthRequired = () => {
        if (authRequired) {
            return "swap swap-active";
        } else {
            return "swap";
        }
    };

    const setAndPostAuthRequired = (setting: boolean) => {
        setAuthRequired(setting);
        const response = fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ auth_required: setting }),
        });
    };

    // Allow Keyword Pubkey Setting
    const [allowKeywordPubkey, setAllowKeywordPubkey] = useState(
        props.relay.allow_keyword_pubkey
    );
    const isAllowKeywordPubkey = () => {
        if (allowKeywordPubkey) {
            return "swap swap-active";
        } else {
            return "swap";
        }
    };

    const handleAllowKeywordPubkey = async (e: any) => {
        e.preventDefault();
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ allow_keyword_pubkey: !allowKeywordPubkey }),
        });
        if (allowKeywordPubkey) {
            setAllowKeywordPubkey(false);
        } else {
            setAllowKeywordPubkey(true);
        }
    };

    // Lightning payments
    const [pay, setPay] = useState(props.relay.payment_required);
    const [satsAmount, setSatsAmount] = useState(
        props.relay.payment_amount.toString()
    );

    const isPay = () => {
        if (pay) {
            return "swap swap-active";
        } else {
            return "swap";
        }
    };
    const handleSaveSats = async (e: any) => {
        e.preventDefault();
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payment_amount: satsAmount }),
        });
    };

    const handlePayChange = async (e: any) => {
        e.preventDefault();
        let setNewAllow = allow;
        if (allow && !pay) {
            setNewAllow = false;
            setAllow(setNewAllow);
        }
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                payment_required: !pay,
                default_message_policy: setNewAllow,
            }),
        });
        if (response.ok) {
            if (pay) {
                setPay(false);
            } else {
                setPay(true);
            }
        }
    };

    // Advanced
    // Delete
    const [deleteModal, setDeleteModal] = useState(false);
    const router = useRouter();
    const handleDeleteRelay = async (event: any) => {
        event.preventDefault();
        // call to API to delete relay
        setDeleteModal(false);
        const response = await fetch(`/api/relay/${props.relay.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });
        router.push("/");
    };

    return (
        <div className="flex flex-col lg:items-center lg:justify-center">
            <div className="badge badge-neutral mt-4 mb-4">
                status: {props.relay.status}
            </div>
            <div className="flex flex-grow w-full mb-4">
                <Relay
                    modActions={true}
                    relay={props.relay}
                    showEdit={false}
                    showSettings={false}
                    showDetail={true}
                    showExplorer={true}
                    showCopy={false}
                />
            </div>
            <div className="join join-vertical w-full">
                <div className="collapse join-item border-base-300 border">
                    <input
                        type="radio"
                        name="my-accordion-4"
                        onChange={() => setChecked(1)}
                        checked={isChecked(1)}
                    />

                    <div className="collapse-title text-lg">
                        <h2>Relay Setup Wizard</h2>
                    </div>

                    <div className="collapse-content">
                        <article className="prose">
                            <p>
                                This wizard will walk you through the process of
                                setting up your relay. You can always
                                re-configure your relay after you complete the
                                setup.
                            </p>
                            <p>
                                There are many capabilities available for all
                                types of relays and you can mix-and-match them
                                to suit your needs.
                            </p>
                            <ul>
                                <li>Lightning Payments</li>
                                <li>Moderation</li>
                                <li>
                                    Access Control by Pubkey, Event Kind, and
                                    Keywords
                                </li>
                                <li>Access Control for read/write</li>
                                <li>
                                    Specialized support for DMs, private groups,
                                    and lists.
                                </li>
                            </ul>
                        </article>

                        <div className="flex justify-center">
                            <div
                                className="btn btn-primary"
                                onClick={() => setChecked(2)}
                            >
                                Let's Go!
                            </div>
                        </div>
                    </div>
                </div>

                <div className="collapse  join-item border-base-300 border">
                    <input
                        type="radio"
                        name="my-accordion-4"
                        onChange={() => setChecked(2)}
                        checked={isChecked(2)}
                    />

                    <div className="collapse-title text-lg">
                        {relayKindDescription == "" && (
                            <h2>Choose a Relay Type</h2>
                        )}
                        {relayKindDescription != "" && (
                            <h2>{relayKindDescription}</h2>
                        )}
                    </div>

                    <div className="collapse-content">
                        <div className="flex flex-wrap">
                            <div className="card bg-base-100 w-96 shadow-xl lg:mr-4 mb-4">
                                <div className="card-body">
                                    <h2 className="card-title">
                                        Public Community Relay
                                    </h2>
                                    <p>
                                        This relay can shared with multiple
                                        people. You can use this relay for
                                        backups of your notes. You can
                                        optionally setup lightning payments and
                                        invite friends.
                                    </p>
                                    <div className="card-actions justify-end">
                                        <button
                                            className="btn btn-primary uppercase"
                                            onClick={(e) => {
                                                setAndPostRelayKindDescription(
                                                    "Community Relay"
                                                );
                                                setChecked(3);
                                                setAndPostAllow(false);
                                                setAndPostAllowTagged(true);
                                            }}
                                        >
                                            select
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="card bg-base-100 w-96 shadow-xl lg:mr-4 mb-4">
                                <div className="card-body">
                                    <h2 className="card-title">
                                        Private Community Relay
                                    </h2>
                                    <p>
                                        This relay can shared with multiple
                                        people. You can use this relay for
                                        backups of your notes. Enhanced privacy
                                        for Nostr DMs, and read access controls.
                                    </p>
                                    <div className="card-actions justify-end">
                                        <button
                                            className="btn btn-primary uppercase"
                                            onClick={(e) => {
                                                setAndPostRelayKindDescription(
                                                    "Private Community Relay"
                                                );
                                                setChecked(3);
                                                setAndPostAllow(false);
                                                setAndPostAllowTagged(true);
                                                setAndPostAuthRequired(true);
                                            }}
                                        >
                                            select
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="card bg-base-100 w-96 shadow-xl lg:mr-4 mb-4">
                                <div className="card-body">
                                    <h2 className="card-title">
                                        Public Paid Relay
                                    </h2>
                                    <p>
                                        This relay can be setup for the general
                                        public with lightning payments to join.
                                    </p>
                                    <div className="card-actions justify-end">
                                        <button
                                            className="btn btn-primary uppercase"
                                            onClick={(e) => {
                                                setAndPostRelayKindDescription(
                                                    "Public Paid Relay"
                                                );
                                                setChecked(3);
                                                setAndPostAllow(false);
                                                setAndPostAllowTagged(false);
                                            }}
                                        >
                                            select
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="card bg-base-100 w-96 shadow-xl mb-4">
                                <div className="card-body">
                                    <h2 className="card-title">
                                        Public Free Relay
                                    </h2>
                                    <p>
                                        This relay allows free access. This is
                                        not recommended unless you have a solid
                                        moderation team.
                                    </p>
                                    <div className="card-actions justify-end">
                                        <button
                                            className="btn btn-primary uppercase"
                                            onClick={(e) => {
                                                setAndPostRelayKindDescription(
                                                    "Public Free Relay"
                                                );
                                                setChecked(3);
                                                setAndPostAllow(true);
                                            }}
                                        >
                                            select
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="collapse  join-item border-base-300 border">
                    <input
                        type="radio"
                        name="my-accordion-4"
                        onChange={() => setChecked(3)}
                        checked={isChecked(3)}
                    />
                    <div className="collapse-title text-lg">
                        <h2>Relay Profile and Directory Listing</h2>
                    </div>
                    <div className="collapse-content">
                        <article className="prose">
                            <p>Setup your relay banner image and details.</p>
                            <p>
                                This will be the icon used for your relay and
                                it's public facing image.
                            </p>
                            <p>
                                Decide if you want the relay to be listed in the
                                public directory.
                            </p>
                        </article>
                        <div className="form-control mt-4">
                            <div className="mt-4">
                                <label
                                    className={isListed()}
                                    onClick={(e) => handleListedChange(e)}
                                >
                                    <div className="btn uppercase btn-accent swap-on">
                                        Relay is listed in the public directory
                                        ✅
                                    </div>
                                    <div className="btn uppercase btn-accent swap-off">
                                        Relay is NOT listed in the public
                                        directory 🙈
                                    </div>
                                </label>
                            </div>
                            <label className="label">
                                <span className="label-text">
                                    Relay Profile
                                </span>
                            </label>
                            <textarea
                                id={props.relay.id + "textareaedit"}
                                className="textarea textarea-bordered h-24"
                                placeholder="description"
                                value={profileDetail || ""}
                                onChange={(e) =>
                                    setProfileDetails(e.target.value)
                                }
                            ></textarea>
                            <label className="label">
                                <span className="label-text">
                                    Banner image url
                                </span>
                            </label>
                            <input
                                id={props.relay.id + "urlid"}
                                type="text"
                                placeholder="enter image url"
                                className="input input-bordered w-full"
                                onChange={(e) =>
                                    setProfileBanner(e.target.value)
                                }
                                value={profileBanner || ""}
                            />
                            <div className="flex justify-center gap-2">
                                <button
                                    className="btn uppercase btn-primary mt-2"
                                    onClick={(e) => handleSubmitProfile(e)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="collapse join-item border-base-300 border">
                    <input
                        type="radio"
                        name="my-accordion-4"
                        onChange={() => setChecked(4)}
                        checked={isChecked(4)}
                    />

                    <div className="collapse-title text-lg">
                        <h2>Moderators</h2>
                    </div>

                    <div className="collapse-content">
                        <article className="prose">
                            <p>Moderators can edit the access control lists.</p>
                            <p>
                                Moderators also have access to post by default.
                            </p>
                        </article>
                        {props.relay != null &&
                            props.relay.moderators != null && (
                                <Moderators
                                    moderators={props.relay.moderators}
                                    relay_id={props.relay.id}
                                ></Moderators>
                            )}

                        <div className="flex justify-center">
                            <div
                                className="btn btn-primary"
                                onClick={() => setChecked(5)}
                            >
                                Next
                            </div>
                        </div>
                    </div>
                </div>

                <div className="collapse join-item border-base-300 border">
                    <input
                        type="radio"
                        name="my-accordion-4"
                        onChange={() => setChecked(5)}
                        checked={isChecked(5)}
                    />
                    <div className="collapse-title text-lg">
                        <h2>Access Control Mode</h2>
                    </div>
                    <div className="collapse-content">
                        <article className="prose">
                            <p>
                                There are two different ways you can setup
                                access control for your relay.
                            </p>
                            <ul>
                                <li>
                                    Block events by default and specifically
                                    allow pubkeys, keywords or kinds. This mode
                                    is easier to manage.
                                </li>
                                <li>
                                    Allow events by default and specifically
                                    block pubkeys, keywords or kinds. This mode
                                    requires more moderation.
                                </li>
                            </ul>
                            <p>
                                You may still allow or block pubkeys, keywords
                                and kinds regardless of the default mode.
                            </p>
                            {relayKindDescription == "Community Relay" && (
                                <p>
                                    Since you would like a{" "}
                                    {relayKindDescription} we recommend you
                                    start with Blocking
                                </p>
                            )}
                            {relayKindDescription ==
                                "Private Community Relay" && (
                                <p>
                                    Since you would like a{" "}
                                    {relayKindDescription} we recommend you
                                    start with Blocking
                                </p>
                            )}
                            {relayKindDescription == "Public Paid Relay" && (
                                <p>
                                    Since you would like a{" "}
                                    {relayKindDescription} we recommend you
                                    start with Blocking
                                </p>
                            )}
                            {relayKindDescription == "Public Free Relay" && (
                                <p>
                                    Since you would like a{" "}
                                    {relayKindDescription} we recommend you
                                    start with Allowing
                                </p>
                            )}
                        </article>
                        <div className="mt-4">
                            <div className="text-sm font-condensed">
                                current setting is:
                            </div>
                            <label
                                className={isAllow()}
                                onClick={(e) => handleAllowChange(e)}
                            >
                                <div className="btn uppercase btn-accent swap-on">
                                    Allow by default and block what I don't want
                                    🔨
                                </div>
                                <div className="btn uppercase btn-accent swap-off">
                                    Block by default and then allow what I want
                                    ✅
                                </div>
                            </label>
                        </div>
                        <div className="flex justify-center">
                            <div
                                className="btn btn-primary uppercase mt-4"
                                onClick={() => setChecked(6)}
                            >
                                next
                            </div>
                        </div>
                    </div>
                </div>

                <div className="collapse  join-item border-base-300 border">
                    <input
                        type="radio"
                        name="my-accordion-4"
                        onChange={() => setChecked(6)}
                        checked={isChecked(6)}
                    />

                    {!allow && (
                        <div className="collapse-title text-lg">
                            <h2>Access Control Lists (ACLs)</h2>
                        </div>
                    )}

                    {allow && (
                        <div className="collapse-title text-lg">
                            <h2>Access Control Lists (ACLs)</h2>
                        </div>
                    )}

                    <div className="collapse-content">
                        <article className="prose mb-4">
                            {!allow && (
                                <div>
                                    <p>
                                        You can allow or block by pubkeys,
                                        keywords and event kinds.
                                    </p>
                                    <p>
                                        You can also set settings for
                                        authentication, and tagging.
                                    </p>
                                    <p>
                                        Owners and moderators are already
                                        allowed by default.
                                    </p>
                                </div>
                            )}
                            {allow && (
                                <div>
                                    <p>
                                        Your access control mode will allow all
                                        events by default unless you set these
                                        settings. This means you will want to
                                        have a moderation team and setup these
                                        block lists or you may be over-run by
                                        spam or unwanted content. The block
                                        lists below will help you maintain your
                                        relay.
                                    </p>
                                    <p>
                                        You can block by pubkeys, keywords and
                                        event kinds.
                                    </p>
                                </div>
                            )}
                        </article>

                        {isChecked(6) && (
                            <div>
                                <div className="collapse collapse-plus join-item border-base-300 border">
                                    <input
                                        type="radio"
                                        name="my-accordion-allow-lists"
                                        defaultChecked
                                    />
                                    <div className="collapse-title text-lg font-condensed">
                                        <h2>
                                            READ authentication (NIP42 AUTH)
                                        </h2>
                                    </div>
                                    <div className="collapse-content">
                                        <article className="prose">
                                            <p>
                                                This setting controls whether
                                                your relay requires
                                                authentication to connect.
                                            </p>
                                            <p>Also known as NIP-42 AUTH</p>
                                            <p>
                                                Most clients support this,
                                                however blastr and nostr search
                                                engines do not (yet). So if you
                                                enjoy having the greater nostr
                                                network discover and blast your
                                                relay you may want to have this
                                                off. But if you are providing
                                                private messaging support to
                                                your members you will want it
                                                on.
                                            </p>
                                            <p>
                                                In the future, all relays will
                                                likely use this. You can turn it
                                                on and off depending on your
                                                needs.
                                            </p>
                                        </article>
                                        <div className="mt-4">
                                            <label
                                                className={isAuthRequired()}
                                                onClick={(e) =>
                                                    handleAuthChange(e)
                                                }
                                            >
                                                <div className="btn uppercase btn-accent swap-on">
                                                    Relay requires AUTH (NIP42)
                                                    ✅
                                                </div>
                                                <div className="btn uppercase btn-accent swap-off">
                                                    Relay does not require AUTH
                                                    (NIP42) 🙈
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {!allow && (
                                    <div className="collapse collapse-plus join-item border-base-300 border">
                                        <input
                                            type="radio"
                                            name="my-accordion-allow-lists"
                                        />
                                        <div className="collapse-title text-lg font-condensed">
                                            <h2>Allow Tags</h2>
                                        </div>
                                        <div className="collapse-content">
                                            <article className="prose">
                                                <p>
                                                    This setting will allow
                                                    users on the wider nostr
                                                    network to send events to
                                                    this relay that are tagged
                                                    to your pubkeys.
                                                </p>
                                                <p>
                                                    This is useful if you want
                                                    people to be able to DM you
                                                    that are not a member of the
                                                    relay or if you want to
                                                    backup conversations with
                                                    non-member users.
                                                </p>
                                                <p>
                                                    Since this is a commonly
                                                    requested feature we
                                                    recommend you start with
                                                    this turned on. However if
                                                    you get a lot of unwanted
                                                    comments or stalkers and get
                                                    tired of blocking them you
                                                    can turn it off at any time.
                                                </p>
                                            </article>
                                            <div className="mt-4">
                                                <label
                                                    className={isTagged()}
                                                    onClick={(e) =>
                                                        handleTaggedChange(e)
                                                    }
                                                >
                                                    <div className="btn uppercase btn-accent swap-on">
                                                        Allow Events Tagged to
                                                        Pubkeys ✅
                                                    </div>
                                                    <div className="btn uppercase btn-accent swap-off">
                                                        Do NOT Allow Events
                                                        Tagged to Pubkeys 🙈
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!allow && (
                                    <div className="collapse collapse-plus join-item border-base-300 border">
                                        <input
                                            type="radio"
                                            name="my-accordion-allow-lists"
                                        />
                                        <div className="collapse-title text-lg font-condensed">
                                            <h2>Allowed Pubkeys</h2>
                                        </div>
                                        <div className="collapse-content">
                                            <p>
                                                These are pubkeys that will be
                                                allowed to post.
                                            </p>
                                            <p>
                                                You can add them from a listr
                                                list or one at a time.
                                            </p>
                                            {props.relay != null &&
                                                props.relay.allow_list !=
                                                    null &&
                                                props.relay.allow_list
                                                    .list_pubkeys != null && (
                                                    <ListEntryPubkeys
                                                        pubkeys={
                                                            props.relay
                                                                .allow_list
                                                                .list_pubkeys
                                                        }
                                                        relay_id={
                                                            props.relay.id
                                                        }
                                                        relay_url={relayUrl}
                                                        kind="Allowed Pubkeys ✅"
                                                    ></ListEntryPubkeys>
                                                )}
                                        </div>
                                    </div>
                                )}

                                {!allow && (
                                    <div className="collapse collapse-plus join-item border-base-300 border">
                                        <input
                                            type="radio"
                                            name="my-accordion-allow-lists"
                                        />
                                        <div className="collapse-title text-lg font-condensed">
                                            <h2>Allowed Keywords</h2>
                                        </div>
                                        <div className="collapse-content">
                                            <article className="prose">
                                                <p>
                                                    Here you may block by
                                                    keywords. These can be
                                                    anything and will perform a
                                                    case-insensitive substring
                                                    match on content for all
                                                    kinds.
                                                </p>
                                                <p>
                                                    When choosing to allow by
                                                    keywords, there are two
                                                    modes:
                                                </p>
                                                <ul>
                                                    <li>
                                                        Allow the event if the
                                                        pubkey -OR- the keyword
                                                        is present.
                                                    </li>
                                                    <li>
                                                        Allow the event only if
                                                        the pubkey is allowed
                                                        -AND- the keyword is
                                                        present.
                                                    </li>
                                                </ul>
                                            </article>
                                            <div className="mt-4">
                                                <div className="text-sm font-condensed">
                                                    current setting is:
                                                </div>
                                                <label
                                                    className={isAllowKeywordPubkey()}
                                                    onClick={(e) =>
                                                        handleAllowKeywordPubkey(
                                                            e
                                                        )
                                                    }
                                                >
                                                    <div className="btn uppercase btn-accent swap-on">
                                                        Allow Pubkeys -AND
                                                        REQUIRE- Keywords
                                                    </div>
                                                    <div className="btn uppercase btn-accent swap-off">
                                                        Allow Pubkeys -OR-
                                                        Keywords
                                                    </div>
                                                </label>
                                            </div>
                                            {props.relay != null &&
                                                props.relay.allow_list !=
                                                    null &&
                                                props.relay.allow_list
                                                    .list_keywords != null && (
                                                    <ListEntryKeywords
                                                        keywords={
                                                            props.relay
                                                                .allow_list
                                                                .list_keywords
                                                        }
                                                        relay_id={
                                                            props.relay.id
                                                        }
                                                        kind="Allowed Keywords ✅"
                                                    ></ListEntryKeywords>
                                                )}
                                        </div>
                                    </div>
                                )}

                                {!allow && (
                                    <div className="collapse collapse-plus join-item border-base-300 border">
                                        <input
                                            type="radio"
                                            name="my-accordion-allow-lists"
                                        />
                                        <div className="collapse-title text-lg font-condensed">
                                            <h2>Allowed Kinds</h2>
                                        </div>
                                        <div className="collapse-content">
                                            <article className="prose">
                                                <p>
                                                    You may choose to allow
                                                    events by kind.
                                                </p>
                                                <p>
                                                    If you add kinds here, this
                                                    will override the pubkey
                                                    Access Control and allow all
                                                    pubkeys to post these kinds.
                                                </p>
                                                <p>
                                                    If you leave this empty, ALL
                                                    kinds are allowed if matched
                                                    by the other ACLs.
                                                </p>
                                            </article>
                                            {props.relay != null &&
                                                props.relay.allow_list !=
                                                    null &&
                                                props.relay.allow_list
                                                    .list_kinds != null && (
                                                    <ListEntryKinds
                                                        kinds={
                                                            props.relay
                                                                .allow_list
                                                                .list_kinds
                                                        }
                                                        relay_id={
                                                            props.relay.id
                                                        }
                                                        allowdeny="Allowed Kinds ✅"
                                                    ></ListEntryKinds>
                                                )}
                                        </div>
                                    </div>
                                )}
                                <div className="collapse collapse-plus join-item border-base-300 border">
                                    <input
                                        type="radio"
                                        name="my-accordion-allow-lists"
                                    />
                                    <div className="collapse-title text-lg font-condensed">
                                        <h2>Blocked Pubkeys</h2>
                                    </div>
                                    <div className="collapse-content">
                                        <article className="prose">
                                            <p>
                                                These are pubkeys that will be
                                                blocked from posting.
                                            </p>
                                            <p>
                                                You can add them from a listr
                                                list or one at a time.
                                            </p>
                                            {!allow && (
                                                <div>
                                                    <p>
                                                        You are already blocking
                                                        by default.
                                                    </p>
                                                    <p>
                                                        However if you have
                                                        allowed kinds or
                                                        keywords in the above
                                                        allow lists, you may
                                                        also choose to
                                                        specifically block
                                                        pubkeys here and it will
                                                        override and block them.
                                                    </p>
                                                </div>
                                            )}
                                        </article>
                                        {props.relay != null &&
                                            props.relay.block_list != null &&
                                            props.relay.block_list
                                                .list_pubkeys != null && (
                                                <ListEntryPubkeys
                                                    pubkeys={
                                                        props.relay.block_list
                                                            .list_pubkeys
                                                    }
                                                    relay_id={props.relay.id}
                                                    relay_url={relayUrl}
                                                    kind="Blocked Pubkeys"
                                                ></ListEntryPubkeys>
                                            )}
                                    </div>
                                </div>
                                <div className="collapse collapse-plus join-item border-base-300 border">
                                    <input
                                        type="radio"
                                        name="my-accordion-allow-lists"
                                    />
                                    <div className="collapse-title text-lg font-condensed">
                                        <h2>Blocked Keywords</h2>
                                    </div>
                                    <div className="collapse-content">
                                        <article className="prose">
                                            <p>
                                                Here you may block by keywords.
                                                These can be anything and will
                                                perform a case-insensitive
                                                substring match on content for
                                                all kinds.
                                            </p>
                                            {!allow && (
                                                <div>
                                                    <p>
                                                        You are already blocking
                                                        by default.
                                                    </p>
                                                    <p>
                                                        However if you have
                                                        allowed pubkeys or kinds
                                                        in the above allow
                                                        lists, you may also
                                                        choose to specifically
                                                        block keywords here and
                                                        it will override and
                                                        block them.
                                                    </p>
                                                </div>
                                            )}
                                        </article>
                                        {props.relay != null &&
                                            props.relay.block_list != null &&
                                            props.relay.block_list
                                                .list_keywords != null && (
                                                <ListEntryKeywords
                                                    keywords={
                                                        props.relay.block_list
                                                            .list_keywords
                                                    }
                                                    relay_id={props.relay.id}
                                                    kind="Blocked Keywords"
                                                ></ListEntryKeywords>
                                            )}
                                    </div>
                                </div>
                                <div className="collapse collapse-plus join-item border-base-300 border">
                                    <input
                                        type="radio"
                                        name="my-accordion-allow-lists"
                                    />
                                    <div className="collapse-title text-lg font-condensed">
                                        <h2>Blocked Kinds</h2>
                                    </div>
                                    <div className="collapse-content">
                                        <article className="prose">
                                            <p>
                                                You may choose to block events
                                                by kind.
                                            </p>
                                            {!allow && (
                                                <div>
                                                    <p>
                                                        You are already blocking
                                                        by default.
                                                    </p>
                                                    <p>
                                                        However if you have
                                                        allowed pubkeys or
                                                        keywords in the above
                                                        allow lists, you may
                                                        also choose to
                                                        specifically block kinds
                                                        here and it will
                                                        override and block them.
                                                    </p>
                                                </div>
                                            )}
                                        </article>
                                        {props.relay != null &&
                                            props.relay.block_list != null &&
                                            props.relay.block_list.list_kinds !=
                                                null && (
                                                <ListEntryKinds
                                                    kinds={
                                                        props.relay.block_list
                                                            .list_kinds
                                                    }
                                                    relay_id={props.relay.id}
                                                    allowdeny="Blocked Kinds"
                                                ></ListEntryKinds>
                                            )}
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <div
                                        className="btn btn-primary uppercase mt-4"
                                        onClick={() => setChecked(7)}
                                    >
                                        next
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="collapse join-item border-base-300 border">
                        <input
                            type="radio"
                            name="my-accordion-4"
                            onChange={() => setChecked(7)}
                            checked={isChecked(7)}
                        />
                        <div className="collapse-title text-lg">
                            <h2>Lightning Payments</h2>
                        </div>
                        <div className="collapse-content">
                            <article className="prose">
                                <p>
                                    Lightning payments can be enabled and will
                                    modify the allow list for you when someone
                                    pays with lightning for access.
                                </p>
                                <p>
                                    This is a great way to prevent spam on your
                                    relay.
                                </p>
                                <p>
                                    The payments received will go toward the
                                    cost of running the relay in your monthly
                                    invoices.
                                </p>
                            </article>
                            <div className="mt-4 flex">
                                <label
                                    className={isPay()}
                                    onClick={(e) => handlePayChange(e)}
                                >
                                    <div className="btn uppercase btn-accent swap-on">
                                        Require lightning to post: on ⚡
                                    </div>
                                    <div className="btn uppercase btn-accent swap-off">
                                        Require lightning to post: off
                                    </div>
                                </label>
                            </div>
                            {pay && (
                                <div className="mt-4">
                                    <label className="label">
                                        Set payment amount (sats)
                                    </label>
                                    <input
                                        type="text"
                                        name="satsamount"
                                        className="input input-bordered input-primary w-full max-w-xs"
                                        placeholder={props.relay.payment_amount.toString()}
                                        onChange={(event) =>
                                            setSatsAmount(event.target.value)
                                        }
                                    />
                                    <button
                                        onClick={handleSaveSats}
                                        className="btn uppercase btn-primary"
                                    >
                                        save
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-center">
                                <div
                                    className="btn btn-primary uppercase mt-4"
                                    onClick={() => setChecked(8)}
                                >
                                    DONE
                                </div>
                            </div>
                        </div>
                        <div className="collapse join-item border-base-300 border">
                            <input
                                type="radio"
                                name="my-accordion-4"
                                onChange={() => setChecked(8)}
                                checked={isChecked(8)}
                            />
                            <div className="collapse-title text-lg">
                                <h2>Streams Configuration</h2>
                            </div>
                            <div className="collapse-content">
                                <article className="prose">
                                    <p>
                                        Add stream URLs that this relay should
                                        connect to.
                                    </p>
                                </article>

                                <div className="form-control mt-4">
                                    <input
                                        type="text"
                                        placeholder="Enter stream URL"
                                        className="input input-bordered w-full"
                                        value={streamUrl}
                                        onChange={(e) =>
                                            setStreamUrl(e.target.value)
                                        }
                                    />

                                    <div className="flex gap-2 mt-2">
                                        <select
                                            className="select select-bordered"
                                            value={streamDirection}
                                            onChange={(e) =>
                                                setStreamDirection(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="down">down</option>
                                            <option value="up">up</option>
                                            <option value="both">
                                                bi-directional
                                            </option>
                                        </select>

                                        <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                                if (streamUrl) {
                                                    handleAddStream({
                                                        url: streamUrl,
                                                        direction:
                                                            streamDirection,
                                                    });
                                                    setStreamUrl("");
                                                }
                                            }}
                                        >
                                            Add Stream
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-col gap-4">
                                    {streams.map((stream) => (
                                        <div
                                            key={stream.id}
                                            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-base-200 rounded-lg border"
                                        >
                                            <div className="flex-grow break-all font-bold">
                                                <span className="font-bold mr-4">
                                                    relay url
                                                </span>
                                                <span className="font-condensed">
                                                    {stream.url}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="font-bold">
                                                    direction
                                                </span>
                                                <span className="font-condensed">
                                                    {stream.direction}
                                                </span>
                                            </div>
                                            <button
                                                className="btn btn-sm btn-error"
                                                onClick={() =>
                                                    handleRemoveStream(stream)
                                                }
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-center">
                                    <div
                                        className="btn btn-primary uppercase mt-4"
                                        onClick={() => setChecked(9)}
                                    >
                                        next
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="divider">Advanced</div>

                        <button
                            className="btn uppercase btn-neutral"
                            onClick={() => setDeleteModal(true)}
                        >
                            Delete relay
                        </button>
                        {deleteModal && (
                            <dialog
                                id="delete_modal"
                                className="modal modal-open"
                            >
                                <form className="modal-box bg-gray-900">
                                    <h3 className="text-white">Delete Relay</h3>
                                    <p className="text-base text-sm text-white">
                                        Are you SURE you want to delete this
                                        relay?
                                    </p>
                                    <div className="modal-action flex justify-between">
                                        <button
                                            className="btn uppercase"
                                            onClick={(e) =>
                                                handleDeleteRelay(e)
                                            }
                                        >
                                            Yes
                                        </button>
                                        <button
                                            className="btn uppercase"
                                            onClick={() =>
                                                setDeleteModal(false)
                                            }
                                        >
                                            No
                                        </button>
                                    </div>
                                </form>
                            </dialog>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
