"use client";
import { IoLogoGithub } from "react-icons/io5";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { nip19 } from "nostr-tools";
import { convertOrValidatePubkey } from "../../lib/pubkeyValidation";

export default function CreateRelay(props: React.PropsWithChildren<{}>) {
    const { data: session, status } = useSession();
    const p = useSearchParams();

    const [referrer, setReferrer] = useState("");

    useEffect(() => {
        setReferrer(document.referrer);
    }, []);

    console.log("DETECTING REFERRER");
    console.log(referrer);

    if (p == null) {
        return <>no p</>;
    }
    const relayname = p.get("relayname");
    let useName = "";
    if (relayname) {
        useName = relayname;
    }

    const [name, setName] = useState(useName);
    const [nameError, setNameError] = useState("");
    const [pubkeyError, setPubkeyError] = useState("✅");
    const [nameErrorDescription, setNameErrorDescription] = useState("");
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("");

    const [pubkey, setPubkey] = useState("");
    const [selectedPlan, setSelectedPlan] = useState("standard");

    const router = useRouter();

    function setRelayName(name: string) {
        setName(name);
        if (validateRelayName(name)) {
            setNameError("");
        } else {
            setNameError("❌");
        }
    }

    if (session && session.user?.name) {
        if (pubkey != session.user.name) {
            setPubkey(session.user.name);
        }
    }

    function setAndValidatePubkey(pubkey: string) {
        setPubkey(pubkey);
        const validPubkey = convertOrValidatePubkey(pubkey);
        setPubkeyError("");
        console.log(validPubkey);
        if (validPubkey) {
            setPubkeyError("✅");
            setPubkeyErrorDescription("");
        } else {
            setPubkeyError("❌");
            setPubkeyErrorDescription("key must be valid hex or npub");
        }
    }

    function validateRelayName(name: string) {
        // use javascript regex to detect hostname from name
        const valid = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}$/.test(name);

        // check blank
        if (name == "") {
            setNameErrorDescription("name cannot be blank");
            return false;
        }

        if (valid) {
            setNameErrorDescription("");
        } else {
            setNameErrorDescription("name must be valid hostname");
        }
        return valid;
    }

    function isValidForm() {
        if (
            pubkey != "" &&
            pubkeyError == "✅" &&
            nameError == "" &&
            name != ""
        ) {
            return true;
        } else {
            return false;
        }
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();

        const validNpub = /^npub1[0-9a-zA-Z]{58}$/.test(pubkey);
        let submitHex: any;
        if (validNpub) {
            const decoded = nip19.decode(pubkey);
            submitHex = decoded.data;
        } else {
            submitHex = pubkey;
        }

        // here double check name isn't taken via the api, if it's taken, the api will return error.  if it's available the api will
        // 'reserve it' to this user pubkey.. and return the order_id here. the next page, will lookup the order id and populate with invoice.
        const response = await fetch(
            `/api/invoices?relayname=${name}&pubkey=${submitHex}&plan=${selectedPlan}`
        );
        const newdata = await response.json();

        if (response.ok) {
            router.push(
                `/invoices?relayname=${name}&pubkey=${submitHex}&order_id=${newdata.order_id}&referrer=${referrer}&plan=${selectedPlan}`
            );
        } else {
            setNameError("❌");
            setNameErrorDescription(newdata.error);
        }
    };

    const useDomain = process.env.NEXT_PUBLIC_CREATOR_DOMAIN || "nostr1.com";

    return (
        <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200 p-4">
            <div className="container mx-auto max-w-6xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary mb-2">Create Your Nostr Relay</h1>
                    <p className="text-lg text-gray-600">Choose your plan and get started in minutes</p>
                </div>

                {/* Plan Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Standard Plan */}
                    <div 
                        className={`card border-2 cursor-pointer transition-all ${
                            selectedPlan === "standard" 
                                ? "border-primary bg-primary/10 shadow-lg" 
                                : "border-base-300 hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedPlan("standard")}
                    >
                        <div className="card-body">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="card-title text-2xl">Standard Plan</h2>
                                <input 
                                    type="radio" 
                                    name="plan" 
                                    className="radio radio-primary" 
                                    checked={selectedPlan === "standard"}
                                    onChange={() => setSelectedPlan("standard")}
                                />
                            </div>
                            <div className="text-3xl font-bold text-primary mb-4">
                                {process.env.NEXT_PUBLIC_INVOICE_AMOUNT || "21"} sats
                                <span className="text-sm font-normal text-gray-500 ml-2">initial payment</span>
                            </div>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center">
                                    <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Customizable on-the-fly
                                </li>
                                <li className="flex items-center">
                                    <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Inbox / Outbox support
                                </li>
                                <li className="flex items-center">
                                    <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Public / Private modes
                                </li>
                                <li className="flex items-center">
                                    <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Communities / DMs
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Premium Plan */}
                    <div 
                        className={`card border-2 cursor-pointer transition-all ${
                            selectedPlan === "premium" 
                                ? "border-secondary bg-secondary/10 shadow-lg" 
                                : "border-base-300 hover:border-secondary/50"
                        }`}
                        onClick={() => setSelectedPlan("premium")}
                    >
                        <div className="card-body">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="card-title text-2xl">Premium Plan</h2>
                                <input 
                                    type="radio" 
                                    name="plan" 
                                    className="radio radio-secondary" 
                                    checked={selectedPlan === "premium"}
                                    onChange={() => setSelectedPlan("premium")}
                                />
                            </div>
                            <div className="badge badge-secondary badge-sm mb-2">RECOMMENDED</div>
                            <div className="text-3xl font-bold text-secondary mb-4">
                                {process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || "2100"} sats
                                <span className="text-sm font-normal text-gray-500 ml-2">initial payment</span>
                            </div>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center">
                                    <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    All standard features
                                </li>
                                <li className="flex items-center">
                                    <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Streaming from other relays 
                                </li>
                                <li className="flex items-center">
                                    <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Enhanced filtering by social graph 
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Configuration Form */}
                <div className="card shadow-xl">
                    <div className="card-body">
                        <h3 className="card-title text-xl mb-6">Configure Your Relay</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Your Pubkey</span>
                                </label>
                                <input
                                    type="text"
                                    name="pubkey"
                                    className="input input-bordered w-full"
                                    placeholder="sign-in or paste pubkey"
                                    autoComplete="off"
                                    value={pubkey}
                                    onChange={(event) => setAndValidatePubkey(event.target.value)}
                                />
                                {pubkeyErrorDescription && (
                                    <div className="text-sm text-error mt-1">{pubkeyErrorDescription}</div>
                                )}
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Relay Subdomain</span>
                                </label>
                                <div className="flex">
                                    <input
                                        type="text"
                                        className="input input-bordered flex-1"
                                        placeholder="yourname"
                                        autoComplete="off"
                                        value={name}
                                        onChange={(event) => setRelayName(event.target.value)}
                                    />
                                    <span className="input input-bordered input-disabled flex items-center px-3 ml-2">
                                        .{useDomain}
                                    </span>
                                </div>
                                {nameErrorDescription && (
                                    <div className="text-sm text-error mt-1">{nameErrorDescription}</div>
                                )}
                                {name && (
                                    <div className="text-sm text-gray-600 mt-1">
                                        Your relay: <span className="font-semibold text-primary">{name}.{useDomain}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-center mt-8">
                            <button
                                className="btn btn-primary btn-lg px-8"
                                onClick={handleSubmit}
                                disabled={!isValidForm()}
                            >
                                Deploy {selectedPlan === "premium" ? "Premium" : "Standard"} Relay {nameError}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="text-center mt-8 text-gray-600">
                    relay.tools 2025 &middot; Made with 🤙🏻 in the PNW &middot;{" "}
                    <a href="https://github.com/relaytools" className="link">
                        <IoLogoGithub className="inline" />
                    </a>
                </div>
            </div>
        </div>
    );
}
