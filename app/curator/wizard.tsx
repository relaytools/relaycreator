"use client";
import ListEntryKeywords from "./listEntryKeywords";
import ListEntryPubkeys from "./listEntryPubkeys";
import ListEntryKinds from "./listEntryKinds";
import Moderators from "./moderators";
import { useState, useEffect } from "react";
import Relay from "../components/relay";
import { RelayWithEverything } from "../components/relayWithEverything";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import RelaySmall from "../components/relaySmall";

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

    // ACL sources
    const [aclSources, setAclSources] = useState<Array<{id: string, url: string, aclType: string}>>([]);
    const [aclSourceUrl, setAclSourceUrl] = useState("");
    const [aclSourceType, setAclSourceType] = useState("grapevine"); // can be "grapevine" or "nip05"
    
    // Load ACL sources when component mounts
    useEffect(() => {
        const loadAclSources = async () => {
            try {
                const response = await fetch(`/api/relay/${props.relay.id}/aclsources`);
                if (response.ok) {
                    const data = await response.json();
                    setAclSources(data);
                }
            } catch (error) {
                console.error("Error loading ACL sources:", error);
            }
        };
        
        loadAclSources();
    }, [props.relay.id]);

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
    
    // Handler for adding ACL sources
    const handleAddAclSource = async (newSource: {
        url: string;
        type: string;
    }) => {
        const response = await fetch(`/api/relay/${props.relay.id}/aclsources`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: newSource.url,
                type: newSource.type, // API expects 'type' parameter
            }),
        });

        if (response.ok) {
            const responseData = await response.json();
            const updatedSources = [...aclSources, responseData];
            setAclSources(updatedSources);
            toast.success("ACL source added");
        } else {
            const errorMessage = await response.json();
            toast.error("Error adding ACL source: " + errorMessage.error);
        }
    };
    
    // Handler for removing ACL sources
    const handleRemoveAclSource = async (indexToRemove: number) => {
        const response = await fetch(`/api/relay/${props.relay.id}/aclsources`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: aclSources[indexToRemove].id }),
        });

        if (response.ok) {
            const updatedSources = aclSources.filter((_, index) => index !== indexToRemove);
            setAclSources(updatedSources);
            toast.success("ACL source removed");
        } else {
            toast.error("Failed to remove ACL source");
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
    const router = useRouter();
    const handleDeleteRelay = async () => {
        // call to API to delete relay
        const response = await fetch(`/api/relay/${props.relay.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
            toast.success("Relay deleted", {
                onClose: () => {
                    router.push("/");
                },
            });
        } else {
            toast.error("Error deleting relay");
        }
    };

    const [menuOpen, setMenuOpen] = useState(false);

    // Add new state for ACL submenu
    const [aclSection, setAclSection] = useState("auth"); // Possible values: "auth", "tags", "allowed-pubkeys", "allowed-keywords", "allowed-kinds", "blocked-pubkeys", "blocked-keywords", "blocked-kinds"

    return (
        <div className="flex flex-row min-h-screen relative">
            {/* Mobile Menu Button */}
            <button
                className="lg:hidden fixed top-4 left-4 z-20 btn btn-circle"
                onClick={() => setMenuOpen(!menuOpen)}
            >
                {menuOpen ? "✕" : "☰"}
            </button>

            {/* Side Menu - updated with check marks */}
            <div
                className={`${
                    menuOpen ? "translate-x-0" : "-translate-x-full"
                } lg:translate-x-0 fixed lg:static w-64 h-full bg-base-200 p-4 transition-transform duration-300 ease-in-out z-10 flex flex-col`}
            >
                <ul className="menu menu-vertical grow">
                    <li>
                        <button
                            className={`${
                                checked === 1 ? "active" : ""
                            } flex justify-between items-center`}
                            onClick={() => {
                                setChecked(1);
                                setMenuOpen(false);
                            }}
                        >
                            <span>Relay Setup Wizard</span>
                            {props.relay.relay_kind_description && (
                                <span className="text-success">✓</span>
                            )}
                        </button>
                    </li>
                    <li>
                        <button
                            className={`${
                                checked === 2 ? "active" : ""
                            } flex justify-between items-center`}
                            onClick={() => {
                                setChecked(2);
                                setMenuOpen(false);
                            }}
                        >
                            <span>Choose Relay Type</span>
                            {props.relay.relay_kind_description && (
                                <span className="text-success">✓</span>
                            )}
                        </button>
                    </li>
                    <li>
                        <button
                            className={`${checked === 3 ? "active" : ""}`}
                            onClick={() => {
                                setChecked(3);
                                setMenuOpen(true);
                            }}
                        >
                            Profile & Directory
                        </button>
                    </li>
                    <li>
                        <button
                            className={`${checked === 4 ? "active" : ""}`}
                            onClick={() => {
                                setChecked(4);
                                setMenuOpen(false);
                            }}
                        >
                            Moderators
                        </button>
                    </li>
                    <li>
                        <button
                            className={`${checked === 5 ? "active" : ""}`}
                            onClick={() => {
                                setChecked(5);
                                setMenuOpen(false);
                            }}
                        >
                            Access Control Mode
                        </button>
                    </li>
                    <li>
                        <button
                            className={`${checked === 6 ? "active" : ""}`}
                            onClick={() => {
                                setChecked(6);
                                setMenuOpen(true);
                            }}
                        >
                            Access Control Lists
                        </button>
                        {checked === 6 && (
                            <ul className="menu menu-vertical pl-4">
                                <li>
                                    <button
                                        className={
                                            aclSection === "auth"
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() => {
                                            setAclSection("auth");
                                            setMenuOpen(false);
                                        }}
                                    >
                                        Authentication (NIP42)
                                    </button>
                                </li>

                                {!allow && (
                                    <>
                                        <li>
                                            <button
                                                className={
                                                    aclSection === "tags"
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() => {
                                                    setAclSection("tags");
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                Allow Tags
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={
                                                    aclSection ===
                                                    "allowed-pubkeys"
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() => {
                                                    setAclSection(
                                                        "allowed-pubkeys"
                                                    );
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                Allowed Pubkeys
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={
                                                    aclSection ===
                                                    "allowed-keywords"
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() => {
                                                    setAclSection(
                                                        "allowed-keywords"
                                                    );
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                Allowed Keywords
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={
                                                    aclSection ===
                                                    "allowed-kinds"
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() => {
                                                    setAclSection(
                                                        "allowed-kinds"
                                                    );
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                Allowed Kinds
                                            </button>
                                        </li>
                                    </>
                                )}
                                <li>
                                    <button
                                        className={
                                            aclSection === "blocked-pubkeys"
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() => {
                                            setAclSection("blocked-pubkeys");
                                            setMenuOpen(false);
                                        }}
                                    >
                                        Blocked Pubkeys
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className={
                                            aclSection === "blocked-keywords"
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() => {
                                            setAclSection("blocked-keywords");
                                            setMenuOpen(false);
                                        }}
                                    >
                                        Blocked Keywords
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className={
                                            aclSection === "blocked-kinds"
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() => {
                                            setAclSection("blocked-kinds");
                                            setMenuOpen(false);
                                        }}
                                    >
                                        Blocked Kinds
                                    </button>
                                </li>
                            </ul>
                        )}
                    </li>
                    <li>
                        <button
                            className={`${checked === 7 ? "active" : ""}`}
                            onClick={() => {
                                setChecked(7);
                                setMenuOpen(false);
                            }}
                        >
                            Lightning Payments
                        </button>
                    </li>
                    <li>
                        <button
                            className={`${checked === 8 ? "active" : ""}`}
                            onClick={() => {
                                setChecked(8);
                                setMenuOpen(false);
                            }}
                        >
                            Streams Configuration
                        </button>
                    </li>
                    <li>
                        <button
                            className={`${checked === 8 ? "active" : ""}`}
                            onClick={() => {
                                setChecked(9);
                                setMenuOpen(false);
                            }}
                        >
                            ACL Sources Configuration
                        </button>
                    </li>
                    <div className="divider"></div>
                    <li>
                        <button
                            className="text-error"
                            onClick={() => {
                                setChecked(10);
                                setMenuOpen(false);
                            }}
                        >
                            Delete Relay
                        </button>
                    </li>
                </ul>
            </div>

            {/* Main Content - adjusted padding for mobile menu button */}
            <div className="flex-1 p-6 lg:p-6 pt-16 lg:pt-6">
                <div className="flex flex-col lg:items-center lg:justify-center">
                    <div className="flex grow w-full mb-4">
                        {checked === 0 && (
                            <Relay
                                showEdit={false}
                                showSettings={false}
                                showDetail={true}
                                showExplorer={true}
                                showCopy={false}
                                relay={props.relay}
                            />
                        )}

                        {checked != 0 && (
                            <div>
                                <RelaySmall relay={props.relay} />
                                <div className="badge badge-neutral mt-4 mb-4">
                                    status: {props.relay.status}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content sections - only show the active one */}
                    {checked === 1 && (
                        <div className="w-full">
                            <h2 className="text-lg font-bold mb-4">
                                Relay Setup Wizard
                            </h2>
                            <article className="prose">
                                <p>
                                    This wizard will walk you through the
                                    process of setting up your relay. You can
                                    always re-configure your relay after you
                                    complete the setup.
                                </p>
                                <p>
                                    There are many capabilities available for
                                    all types of relays and you can
                                    mix-and-match them to suit your needs.
                                </p>
                                <ul>
                                    <li>Lightning Payments</li>
                                    <li>Moderation</li>
                                    <li>
                                        Access Control by Pubkey, Event Kind,
                                        and Keywords
                                    </li>
                                    <li>Access Control for read/write</li>
                                    <li>
                                        Specialized support for DMs, private
                                        groups, and lists.
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
                    )}

                    {checked === 2 && (
                        <div className="w-full">
                            <h2 className="text-lg font-bold mb-4">
                                {relayKindDescription == ""
                                    ? "Choose a Relay Type"
                                    : relayKindDescription}
                            </h2>
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
                                            optionally setup lightning payments
                                            and invite friends.
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
                                            backups of your notes. Enhanced
                                            privacy for Nostr DMs, and read
                                            access controls.
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
                                                    setAndPostAuthRequired(
                                                        true
                                                    );
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
                                            This relay can be setup for the
                                            general public with lightning
                                            payments to join.
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
                                                    setAndPostAllowTagged(
                                                        false
                                                    );
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
                                            This relay allows free access. This
                                            is not recommended unless you have a
                                            solid moderation team.
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
                    )}

                    {checked === 3 && (
                        <div className="w-full">
                            <h2 className="text-lg font-bold mb-4">
                                Relay Profile and Directory Listing
                            </h2>
                            <article className="prose">
                                <p>
                                    Setup your relay banner image and details.
                                </p>
                                <p>
                                    This will be the icon used for your relay
                                    and it's public facing image.
                                </p>
                                <p>
                                    Decide if you want the relay to be listed in
                                    the public directory.
                                </p>
                            </article>
                            <div className="form-control mt-4">
                                <div className="mt-4">
                                    <label
                                        className={isListed()}
                                        onClick={(e) => handleListedChange(e)}
                                    >
                                        <div className="btn uppercase btn-primary swap-on">
                                            Relay is listed in the public
                                            directory ✅
                                        </div>
                                        <div className="btn uppercase btn-primary swap-off">
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
                                    className="textarea textarea-bordered h-24 w-full"
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
                    )}

                    {checked === 4 && (
                        <div className="w-full">
                            <h2 className="text-lg font-bold mb-4">
                                Moderators
                            </h2>
                            <article className="prose">
                                <p>
                                    Moderators can edit the access control
                                    lists.
                                </p>
                                <p>
                                    Moderators also have access to post by
                                    default.
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
                    )}

                    {checked === 5 && (
                        <div className="w-full">
                            <h2 className="text-lg font-bold mb-4">
                                Access Control Mode
                            </h2>
                            <article className="prose">
                                <p>
                                    There are two different ways you can setup
                                    access control for your relay.
                                </p>
                                <ul>
                                    <li>
                                        Block events by default and specifically
                                        allow pubkeys, keywords or kinds. This
                                        mode is easier to manage.
                                    </li>
                                    <li>
                                        Allow events by default and specifically
                                        block pubkeys, keywords or kinds. This
                                        mode requires more moderation.
                                    </li>
                                </ul>
                                <p>
                                    You may still allow or block pubkeys,
                                    keywords and kinds regardless of the default
                                    mode.
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
                                {relayKindDescription ==
                                    "Public Paid Relay" && (
                                    <p>
                                        Since you would like a{" "}
                                        {relayKindDescription} we recommend you
                                        start with Blocking
                                    </p>
                                )}
                                {relayKindDescription ==
                                    "Public Free Relay" && (
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
                                    <div className="btn uppercase btn-primary swap-on">
                                        Allow by default and block what I don't
                                        want 🔨
                                    </div>
                                    <div className="btn uppercase btn-primary swap-off">
                                        Block by default and then allow what I
                                        want ✅
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
                    )}

                    {checked === 6 && (
                        <div className="w-full">
                            <h2 className="text-lg font-bold mb-4">
                                Access Control Lists (ACLs)
                            </h2>

                            {aclSection === "auth" && (
                                <div>
                                    <article className="prose">
                                        <p>
                                            This setting controls whether your
                                            relay requires authentication to
                                            connect.
                                        </p>
                                        <p>Also known as NIP-42 AUTH</p>
                                        <p>
                                            Most clients support this, however
                                            blastr and nostr search engines do
                                            not (yet). So if you enjoy having
                                            the greater nostr network discover
                                            and blast your relay you may want to
                                            have this off. But if you are
                                            providing private messaging support
                                            to your members you will want it on.
                                        </p>
                                        <p>
                                            In the future, all relays will
                                            likely use this. You can turn it on
                                            and off depending on your needs.
                                        </p>
                                    </article>
                                    <div className="mt-4">
                                        <label
                                            className={isAuthRequired()}
                                            onClick={(e) => handleAuthChange(e)}
                                        >
                                            <div className="btn uppercase btn-primary swap-on">
                                                Relay requires AUTH (NIP42) ✅
                                            </div>
                                            <div className="btn uppercase btn-primary swap-off">
                                                Relay does not require AUTH
                                                (NIP42) 🙈
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {aclSection === "tags" && !allow && (
                                <div>
                                    <article className="prose">
                                        <p>
                                            This setting will allow users on the
                                            wider nostr network to send events
                                            to this relay that are tagged to
                                            your pubkeys.
                                        </p>
                                        <p>
                                            This is useful if you want people to
                                            be able to DM you that are not a
                                            member of the relay or if you want
                                            to backup conversations with
                                            non-member users.
                                        </p>
                                        <p>
                                            Since this is a commonly requested
                                            feature we recommend you start with
                                            this turned on. However if you get a
                                            lot of unwanted comments or stalkers
                                            and get tired of blocking them you
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
                                            <div className="btn uppercase btn-primary swap-on">
                                                Allow Events Tagged to Pubkeys
                                                ✅
                                            </div>
                                            <div className="btn uppercase btn-primary swap-off">
                                                Do NOT Allow Events Tagged to
                                                Pubkeys 🙈
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Continue with similar pattern for other ACL sections */}
                            {aclSection === "allowed-pubkeys" && !allow && (
                                <div>
                                    <p>
                                        These are pubkeys that will be allowed
                                        to post.
                                    </p>
                                    {props.relay?.allow_list?.list_pubkeys && (
                                        <ListEntryPubkeys
                                            pubkeys={
                                                props.relay.allow_list
                                                    .list_pubkeys
                                            }
                                            relay_id={props.relay.id}
                                            relay_url={relayUrl}
                                            kind="Allowed Pubkeys ✅"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Add similar sections for other ACL components */}
                            {aclSection === "allowed-keywords" && !allow && (
                                <div>
                                    <p>
                                        These are keywords that will be allowed
                                        to post.
                                    </p>
                                    {props.relay?.allow_list?.list_keywords && (
                                        <ListEntryKeywords
                                            keywords={
                                                props.relay.allow_list
                                                    .list_keywords
                                            }
                                            relay_id={props.relay.id}
                                            kind="Allowed Keywords ✅"
                                        />
                                    )}
                                </div>
                            )}

                            {aclSection === "allowed-kinds" && !allow && (
                                <div>
                                    <p>
                                        These are kinds that will be allowed to
                                        post.
                                    </p>
                                    {props.relay?.allow_list?.list_kinds && (
                                        <ListEntryKinds
                                            kinds={
                                                props.relay.allow_list
                                                    .list_kinds
                                            }
                                            relay_id={props.relay.id}
                                            allowdeny="Allowed Kinds ✅"
                                        />
                                    )}
                                </div>
                            )}

                            {aclSection === "blocked-pubkeys" && (
                                <div>
                                    <p>
                                        These are pubkeys that will be blocked
                                        from posting.
                                    </p>
                                    {props.relay?.block_list?.list_pubkeys && (
                                        <ListEntryPubkeys
                                            pubkeys={
                                                props.relay.block_list
                                                    .list_pubkeys
                                            }
                                            relay_id={props.relay.id}
                                            relay_url={relayUrl}
                                            kind="Blocked Pubkeys 🙈"
                                        />
                                    )}
                                </div>
                            )}

                            {aclSection === "blocked-keywords" && (
                                <div>
                                    <p>
                                        These are keywords that will be blocked
                                        from posting.
                                    </p>
                                    {props.relay?.block_list?.list_keywords && (
                                        <ListEntryKeywords
                                            keywords={
                                                props.relay.block_list
                                                    .list_keywords
                                            }
                                            relay_id={props.relay.id}
                                            kind="Blocked Keywords 🙈"
                                        />
                                    )}
                                </div>
                            )}

                            {aclSection === "blocked-kinds" && (
                                <div>
                                    <p>
                                        These are kinds that will be blocked
                                        from posting.
                                    </p>
                                    {props.relay?.block_list?.list_kinds && (
                                        <ListEntryKinds
                                            kinds={
                                                props.relay.block_list
                                                    .list_kinds
                                            }
                                            relay_id={props.relay.id}
                                            allowdeny="Blocked Kinds 🙈"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {checked === 7 && (
                        <div className="w-full">
                            <h2 className="text-lg font-bold mb-4">
                                Lightning Payments
                            </h2>
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
                                    <div className="btn uppercase btn-primary swap-on">
                                        Require lightning to post: on ⚡
                                    </div>
                                    <div className="btn uppercase btn-primary swap-off">
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
                    )}

                    {checked === 8 && (
                        <div className="w-full">
                            <h2 className="text-lg font-bold mb-4">
                                Streams Configuration
                            </h2>
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
                                            setStreamDirection(e.target.value)
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
                                                    direction: streamDirection,
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
                                        <div className="grow break-all font-bold">
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
                        </div>
                    )}

                    {checked === 9 && (
                        <div className="w-full">
                            <h2 className="text-lg font-bold mb-4">
                                ACL Source Configuration
                            </h2>
                            <article className="prose">
                                <p>
                                    Add ACL sources like grapevine scores or nip05 domains
                                </p>
                            </article>

                            <div className="form-control mt-4">
                                <input
                                    type="text"
                                    placeholder="Enter ACL source URL (https://...)"
                                    className="input input-bordered w-full"
                                    value={aclSourceUrl}
                                    onChange={(e) =>
                                        setAclSourceUrl(e.target.value)
                                    }
                                />

                                <div className="flex gap-2 mt-2">
                                    <select
                                        className="select select-bordered"
                                        value={aclSourceType}
                                        onChange={(e) =>
                                            setAclSourceType(e.target.value)
                                        }
                                    >
                                        <option value="grapevine">grapevine</option>
                                        <option value="nip05">nip05 domain</option>
                                    </select>

                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            if (aclSourceUrl && aclSourceUrl.startsWith('https://')) {
                                                handleAddAclSource({
                                                    url: aclSourceUrl,
                                                    type: aclSourceType,
                                                });
                                                setAclSourceUrl("");
                                            } else {
                                                toast.error("URL must start with https://");
                                            }
                                        }}
                                    >
                                        Add ACL Source
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-4">
                                {aclSources.map((source, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-base-200 rounded-lg border"
                                    >
                                        <div className="grow break-all font-bold">
                                            <span className="font-bold mr-4">
                                                source url
                                            </span>
                                            <span className="font-condensed">
                                                {source.url}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="font-bold">
                                                type
                                            </span>
                                            <span className="font-condensed">
                                                {source.aclType}
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-sm btn-error"
                                            onClick={() =>
                                                handleRemoveAclSource(index)
                                            }
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {checked === 10 && (
                        <div className="w-full">
                            <h2 className="text-lg font-bold mb-4">
                                Delete Relay
                            </h2>
                            <div className="alert alert-error">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="stroke-current shrink-0 h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                                <div>
                                    <h3 className="font-bold">Warning!</h3>
                                    <div className="text-sm">
                                        This action cannot be undone. This will
                                        permanently delete the relay and all
                                        associated data.
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4">
                                <button
                                    className="btn btn-error"
                                    onClick={() => {
                                        if (
                                            confirm(
                                                "Are you sure you want to delete this relay?"
                                            )
                                        ) {
                                            handleDeleteRelay();
                                        }
                                    }}
                                >
                                    Delete Relay
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
