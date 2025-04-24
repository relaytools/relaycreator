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
            `/api/invoices?relayname=${name}&pubkey=${submitHex}`
        );
        const newdata = await response.json();

        if (response.ok) {
            router.push(
                `/invoices?relayname=${name}&pubkey=${submitHex}&order_id=${newdata.order_id}&referrer=${referrer}`
            );
        } else {
            setNameError("❌");
            setNameErrorDescription(newdata.error);
        }
    };

    const useDomain = process.env.NEXT_PUBLIC_CREATOR_DOMAIN || "nostr1.com";

    return (
        <div className="">
            <div className="flex items-center justify-center flex-col">
                <div className="card w-96 bg-base-100 border-2">
                    <div className="card-body">
                        <span className="badge badge-xs badge-warning">
                            Most Popular
                        </span>
                        <div className="flex justify-between">
                            <h2 className="text-3xl font-bold">
                                Standard Relay
                            </h2>
                            <span className="text-xl">7,000 sats/mo</span>
                        </div>
                        <ul className="mt-6 flex flex-col gap-2 text-xs">
                            <li>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="size-4 me-2 inline-block text-success"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span>Customizable on-the-fly</span>
                            </li>
                            <li>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="size-4 me-2 inline-block text-success"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span>Inbox / Outbox</span>
                            </li>
                            <li>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="size-4 me-2 inline-block text-success"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span>Public / Private</span>
                            </li>
                            <li>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="size-4 me-2 inline-block text-success"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span>Communities / DMs</span>
                            </li>
                        </ul>
                        <label className="label">pubkey</label>
                        <input
                            type="text"
                            name="pubkey"
                            id="newpubkey"
                            className="input input-bordered input-primary w-full max-w-xs"
                            placeholder="sign-in or paste pubkey"
                            autoComplete="off"
                            value={pubkey}
                            onChange={(event) =>
                                setAndValidatePubkey(event.target.value)
                            }
                        />
                        <div className="text-sm text-error">
                            {pubkeyErrorDescription}
                        </div>
                        <label className="label label-primary">
                            relay subdomain
                        </label>
                        <input
                            type="text"
                            name="company-website"
                            id="company-website"
                            className="input input-bordered input-primary w-full max-w-xs"
                            placeholder="name"
                            autoComplete="off"
                            value={name}
                            onChange={(event) =>
                                setRelayName(event.target.value)
                            }
                        />
                        <button className="btn uppercase disabled mt-2">
                            .{useDomain}
                        </button>
                        <button
                            className="btn uppercase btn-primary items-center mt-2"
                            onClick={handleSubmit}
                            disabled={!isValidForm()}
                        >
                            Deploy {nameError}{" "}
                        </button>
                    </div>

                    <span className="flex items-center font-medium tracking-wide text-red-600 text-xs mt-1 ml-1">
                        {nameErrorDescription}
                    </span>
                </div>
            </div>
            <div className="flex items-center justify-center text-center">
                relay.tools 2025 &middot; Made with 🤙🏻 in the PNW &middot;{" "}
                <span className="fl pl-1">
                    <a href="https://github.com/relaytools">
                        <IoLogoGithub />
                    </a>
                </span>
            </div>
        </div>
    );
}
