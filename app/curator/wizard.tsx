"use client";
import ListEntryKeywords from "./listEntryKeywords";
import ListEntryPubkeys from "./listEntryPubkeys";
import ListEntryKinds from "./listEntryKinds";
import EnableAllowList from "./enableAllowList";
import EnableBlockList from "./enableBlockList";
import DefaultPolicy from "./defaultPolicy";
import Moderators from "./moderators";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Relay from "../components/relay";
import { RelayWithEverything } from "../components/relayWithEverything";

export default function Wizard(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
    }>
) {
    // Nav and relay types
    const [checked, setChecked] = useState(1);
    const [relayType, setRelayType] = useState("");

    const isChecked = (step: number): boolean => {
        if (step === checked) {
            return true;
        } else {
            return false;
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

    return (
        <div className="flex flex-col lg:items-center lg:justify-center">
            <div className="join join-vertical w-full">
                <div className="collapse collapse-arrow join-item border-base-300 border">
                    <input
                        type="radio"
                        name="my-accordion-4"
                        onChange={() => setChecked(1)}
                        checked={isChecked(1)}
                    />

                    <div className="collapse-title text-xl font-medium">
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

                <div className="collapse collapse-arrow join-item border-base-300 border">
                    <input
                        type="radio"
                        name="my-accordion-4"
                        onChange={() => setChecked(2)}
                        checked={isChecked(2)}
                    />

                    <div className="collapse-title text-xl font-medium">
                        {relayType == "" && <h2>Choose a relay type</h2>}
                        {relayType != "" && <h2>{relayType}</h2>}
                    </div>

                    <div className="collapse-content">
                        <div className="flex flex-wrap">
                            <div className="card bg-base-100 w-96 shadow-xl lg:mr-4 mb-4">
                                <div className="card-body">
                                    <h2 className="card-title">
                                        Community Relay
                                    </h2>
                                    <p>
                                        This relay can shared with multiple
                                        people. You can optionally setup
                                        lightning payments and invite friends.
                                    </p>
                                    <div className="card-actions justify-end">
                                        <button
                                            className="btn btn-primary uppercase"
                                            onClick={() => {
                                                setRelayType("Community Relay");
                                                setChecked(3);
                                                setAllow(false);
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
                                        people. Enhanced privacy for Nostr DMs,
                                        and read access controls.
                                    </p>
                                    <div className="card-actions justify-end">
                                        <button
                                            className="btn btn-primary uppercase"
                                            onClick={() => {
                                                setRelayType(
                                                    "Private Community Relay"
                                                );
                                                setChecked(3);
                                                setAllow(false);
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
                                            onClick={() => {
                                                setRelayType(
                                                    "Public Paid Relay"
                                                );
                                                setChecked(3);
                                                setAllow(false);
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
                                            onClick={() => {
                                                setRelayType(
                                                    "Public Free Relay"
                                                );
                                                setChecked(3);
                                                setAllow(true);
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

                <div className="collapse collapse-arrow join-item border-base-300 border">
                    <input
                        type="radio"
                        name="my-accordion-4"
                        onChange={() => setChecked(3)}
                        checked={isChecked(3)}
                    />
                    <div className="collapse-title text-xl font-medium">
                        <h2>Image and summary</h2>
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

                <div className="collapse collapse-arrow join-item border-base-300 border">
                    <input
                        type="radio"
                        name="my-accordion-4"
                        onChange={() => setChecked(4)}
                        checked={isChecked(4)}
                    />
                    <div className="collapse-title text-xl font-medium">
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
                            {relayType == "Community Relay" && (
                                <p>
                                    Since you would like a {relayType} we
                                    recommend you start with Blocking
                                </p>
                            )}
                            {relayType == "Private Community Relay" && (
                                <p>
                                    Since you would like a {relayType} we
                                    recommend you start with Blocking
                                </p>
                            )}
                            {relayType == "Public Paid Relay" && (
                                <p>
                                    Since you would like a {relayType} we
                                    recommend you start with Blocking
                                </p>
                            )}
                            {relayType == "Public Free Relay" && (
                                <p>
                                    Since you would like a {relayType} we
                                    recommend you start with Allowing
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
                                onClick={() => setChecked(5)}
                            >
                                next
                            </div>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow join-item border-base-300 border">
                        <input
                            type="radio"
                            name="my-accordion-4"
                            onChange={() => setChecked(5)}
                            checked={isChecked(5)}
                        />

                        {!allow && (
                            <div className="collapse-title text-xl font-medium">
                                <h2>Allow and Block Lists</h2>
                            </div>
                        )}

                        {allow && (
                            <div className="collapse-title text-xl font-medium">
                                <h2>Block Lists</h2>
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
                                            Owners and moderators are already allowed by default.
                                        </p>
                                    </div>
                                )}
                                {allow && (
                                    <div>
                                        <p>
                                            Your access control mode will allow
                                            all events by default unless you set
                                            these settings. This means you will
                                            want to have a moderation team and
                                            setup these block lists or you may
                                            be over-run by spam or unwanted
                                            content. The block lists below will
                                            help you maintain your relay.
                                        </p>
                                        <p>
                                            You can block by pubkeys, keywords
                                            and event kinds.
                                        </p>
                                    </div>
                                )}
                            </article>

                            {isChecked(5) && (
                                <div>
                                    {!allow && (
                                        <div className="collapse collapse-arrow join-item border-base-300 border">
                                            <input
                                                type="radio"
                                                name="my-accordion-allow-lists"
                                                defaultChecked
                                            />
                                            <div className="collapse-title text-lg font-condensed">
                                                <h2>Allowed Pubkeys</h2>
                                            </div>
                                            <div className="collapse-content">
                                                <p>
                                                    These are pubkeys that will
                                                    be allowed to post.
                                                </p>
                                                <p>
                                                    You can add them from a
                                                    listr list or one at a time.
                                                </p>
                                                {props.relay != null &&
                                                    props.relay.allow_list !=
                                                        null &&
                                                    props.relay.allow_list
                                                        .list_pubkeys !=
                                                        null && (
                                                        <ListEntryPubkeys
                                                            pubkeys={
                                                                props.relay
                                                                    .allow_list
                                                                    .list_pubkeys
                                                            }
                                                            relay_id={
                                                                props.relay.id
                                                            }
                                                            kind="Allowed Pubkeys ✅"
                                                        ></ListEntryPubkeys>
                                                    )}
                                            </div>
                                        </div>
                                    )}

                                    {!allow && (
                                        <div className="collapse collapse-arrow join-item border-base-300 border">
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
                                                        anything and will
                                                        perform a
                                                        case-insensitive
                                                        substring match on
                                                        content for all kinds.
                                                    </p>
                                                    <p>
                                                        When choosing to allow
                                                        by keywords, there are
                                                        two modes:
                                                    </p>
                                                    <ul>
                                                        <li>
                                                            Allow the event if
                                                            the pubkey -OR- the
                                                            keyword is present.
                                                        </li>
                                                        <li>
                                                            Allow the event only
                                                            if the pubkey is
                                                            allowed -AND- the
                                                            keyword is present.
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
                                                        .list_keywords !=
                                                        null && (
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
                                        <div className="collapse collapse-arrow join-item border-base-300 border">
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
                                                        If you add kinds here,
                                                        the event must be sent
                                                        by an allowed pubkey
                                                        -AND- be of an allowed
                                                        kind.
                                                    </p>
                                                    <p>
                                                        If you leave this empty,
                                                        ALL kinds are allowed.
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
                                    <div className="collapse collapse-arrow join-item border-base-300 border">
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
                                                    These are pubkeys that will
                                                    be blocked from posting.
                                                </p>
                                                <p>
                                                    You can add them from a
                                                    listr list or one at a time.
                                                </p>
                                                {!allow && (
                                                    <div>
                                                        <p>
                                                            You are already
                                                            blocking by default.
                                                        </p>
                                                        <p>
                                                            However if you have
                                                            allowed kinds or
                                                            keywords in the
                                                            above allow lists,
                                                            you may also choose
                                                            to specifically
                                                            block pubkeys here
                                                            and it will override
                                                            and block them.
                                                        </p>
                                                    </div>
                                                )}
                                            </article>
                                            {props.relay != null &&
                                                props.relay.block_list !=
                                                    null &&
                                                props.relay.block_list
                                                    .list_pubkeys != null && (
                                                    <ListEntryPubkeys
                                                        pubkeys={
                                                            props.relay
                                                                .block_list
                                                                .list_pubkeys
                                                        }
                                                        relay_id={
                                                            props.relay.id
                                                        }
                                                        kind="Blocked Pubkeys"
                                                    ></ListEntryPubkeys>
                                                )}
                                        </div>
                                    </div>
                                    <div className="collapse collapse-arrow join-item border-base-300 border">
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
                                                    Here you may block by
                                                    keywords. These can be
                                                    anything and will perform a
                                                    case-insensitive substring
                                                    match on content for all
                                                    kinds.
                                                </p>
                                                {!allow && (
                                                    <div>
                                                        <p>
                                                            You are already
                                                            blocking by default.
                                                        </p>
                                                        <p>
                                                            However if you have
                                                            allowed pubkeys or
                                                            kinds in the above
                                                            allow lists, you may
                                                            also choose to
                                                            specifically block
                                                            keywords here and it
                                                            will override and
                                                            block them.
                                                        </p>
                                                    </div>
                                                )}
                                            </article>
                                            {props.relay != null &&
                                                props.relay.block_list !=
                                                    null &&
                                                props.relay.block_list
                                                    .list_keywords != null && (
                                                    <ListEntryKeywords
                                                        keywords={
                                                            props.relay
                                                                .block_list
                                                                .list_keywords
                                                        }
                                                        relay_id={
                                                            props.relay.id
                                                        }
                                                        kind="Blocked Keywords"
                                                    ></ListEntryKeywords>
                                                )}
                                        </div>
                                    </div>
                                    <div className="collapse collapse-arrow join-item border-base-300 border">
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
                                                    You may choose to block
                                                    events by kind.
                                                </p>
                                                {!allow && (
                                                    <div>
                                                        <p>
                                                            You are already
                                                            blocking by default.
                                                        </p>
                                                        <p>
                                                            However if you have
                                                            allowed pubkeys or
                                                            keywords in the
                                                            above allow lists,
                                                            you may also choose
                                                            to specifically
                                                            block kinds here and
                                                            it will override and
                                                            block them.
                                                        </p>
                                                    </div>
                                                )}
                                            </article>
                                            {props.relay != null &&
                                                props.relay.block_list !=
                                                    null &&
                                                props.relay.block_list
                                                    .list_kinds != null && (
                                                    <ListEntryKinds
                                                        kinds={
                                                            props.relay
                                                                .block_list
                                                                .list_kinds
                                                        }
                                                        relay_id={
                                                            props.relay.id
                                                        }
                                                        allowdeny="Blocked Kinds"
                                                    ></ListEntryKinds>
                                                )}
                                        </div>
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
                            )}
                        </div>
                        <div className="collapse collapse-arrow join-item border-base-300 border">
                            <input
                                type="radio"
                                name="my-accordion-4"
                                onChange={() => setChecked(6)}
                                checked={isChecked(6)}
                            />
                            <div className="collapse-title text-xl font-medium">
                                <h2>Lightning Payments</h2>
                            </div>
                            <div className="collapse-content">
                                <article className="prose">
                                    <p>
                                        Lightning payments can be enabled and
                                        will modify the allow list for you when
                                        someone pays with lightning for access.
                                    </p>
                                    <p>
                                        This is a great way to prevent spam on
                                        your relay.
                                    </p>
                                    <p>
                                        The payments received will go toward the
                                        cost of running the relay in your
                                        monthly invoices.
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
                                                setSatsAmount(
                                                    event.target.value
                                                )
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
                                        onClick={() => setChecked(7)}
                                    >
                                        next
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
