"use client"
import LogoComponent from "../components/logoComponent"
import TextString from "../components/textString"
import { IoArrowForwardOutline, IoLogoGithub } from 'react-icons/io5';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NoSSRWrapper from "../components/noSSRWrapper";
import { nip19 } from "nostr-tools";
import { convertOrValidatePubkey } from "../../lib/pubkeyValidation";

export default function CreateRelay(props: React.PropsWithChildren<{}>) {
    const { data: session, status } = useSession();
    const p = useSearchParams();
    if (p == null) {
        return (
            <>
                no p
            </>
        )
    }
    const relayname = p.get('relayname');
    let useName = ""
    if (relayname) {
        useName = relayname
    }

    const [name, setName] = useState(useName)
    const [nameError, setNameError] = useState("")
    const [pubkeyError, setPubkeyError] = useState("")
    const [nameErrorDescription, setNameErrorDescription] = useState("")
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("")

    const [pubkey, setPubkey] = useState("")

    const router = useRouter()

    function setRelayName(name: string) {
        setName(name);
        if (validateRelayName(name)) {
            setNameError("");
        } else {
            setNameError("❌")
        }
    }

    if (session && session.user?.name) {
        if (pubkey != session.user.name) {
            setPubkey(session.user.name)
        }
    }

    function setAndValidatePubkey(pubkey: string) {
        setPubkey(pubkey)
        const validPubkey = convertOrValidatePubkey(pubkey);
        setPubkeyError("")
        if (validPubkey) {
            setPubkeyError("✅")
            setPubkeyErrorDescription("")
        } else {
            setPubkeyError("❌")
            setPubkeyErrorDescription("key must be valid hex or npub")
        }
    }


    function validateRelayName(name: string) {
        // use javascript regex to detect hostname from name
        const valid = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}$/.test(name);

        // check blank
        if (name == "") {
            setNameErrorDescription("name cannot be blank")
            return false
        }

        if (valid) {
            setNameErrorDescription("")
        } else {
            setNameErrorDescription("name must be valid hostname")
        }
        return valid;
    }

    function isValidForm() {
        if (pubkey != "" && pubkeyError == "✅" && nameError == "" && name != "") {
            return true
        } else {
            return false
        }
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();

        const validNpub = /^npub1[0-9a-zA-Z]{58}$/.test(pubkey)
        let submitHex: any
        if (validNpub) {
            const decoded = nip19.decode(pubkey)
            submitHex = decoded.data
        } else {
            submitHex = pubkey
        }

        // here double check name isn't taken via the api, if it's taken, the api will return error.  if it's available the api will
        // 'reserve it' to this user pubkey.. and return the order_id here. the next page, will lookup the order id and populate with invoice.
        const response = await fetch(`/api/invoices?relayname=${name}&pubkey=${submitHex}`)
        const newdata = await response.json()

        if (response.ok) {
            router.push(`/invoices?relayname=${name}&pubkey=${submitHex}&order_id=${newdata.order_id}`);
        } else {
            setNameError("❌")
            setNameErrorDescription(newdata.error)
        }
    }

    const useDomain = process.env.NEXT_PUBLIC_CREATOR_DOMAIN || "nostr1.com"

    return (
        <div className="">
            <div className="flex flex-col">
                <div className="flex items-center justify-center flex-col">
                    <div className="card w-96 bg-base-100">
                        <div className="card-body">
                            <h2 className="card-title">relay creator</h2>
                            <p>create relays of any type quickly and easily</p>
                            <p>pricing: 12,000 sats/month</p>
                        </div>
                    </div>
                    <div className="flex flex-col-2 mb-2">

                        <label className="label">pubkey</label>
                        <input
                            type="text"
                            name="pubkey"
                            id="newpubkey"
                            className="input input-bordered input-primary w-full max-w-xs"
                            placeholder="sign-in or paste pubkey"
                            autoComplete="off"
                            value={pubkey}
                            onChange={event => setAndValidatePubkey(event.target.value)}
                        />
                        <div className="text-center">
                            {pubkeyError}
                        </div>
                    </div>
                    <div className="text-sm text-neutral">{pubkeyErrorDescription}</div>
                </div>
                <div className="flex flex-col">
                    <div className="mt-2 flex-col-3 rounded-md shadow-sm text-center">
                        <div className="flex-col">
                            <div className="flex-col-3 px-3 sm:text-sm">
                                <input
                                    type="text"
                                    name="company-website"
                                    id="company-website"
                                    className="input input-primary text-center border-0 py-1.5 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                                    placeholder="mynewrelay"
                                    autoComplete="off"
                                    value={name}
                                    onChange={event => setRelayName(event.target.value)}
                                />
                                <button className="btn uppercase disabled">.{useDomain}</button>
                                <button className="btn uppercase btn-primary items-center rounded-r-md eborder border-l-0 border-gray-300 px-3 sm:text-sm mt-2"
                                    onClick={handleSubmit}
                                    disabled={!isValidForm()}
                                >
                                    Deploy {nameError} <span className="fl pl-2"><IoArrowForwardOutline /></span>
                                </button>
                            </div>
                        </div>

                    </div>

                    <span className="flex items-center font-medium tracking-wide text-red-600 text-xs mt-1 ml-1">
                        {nameErrorDescription}
                    </span>
                    <div className="p-6 flex items-center justify-center">
                        <NoSSRWrapper>
                            <div className=" max-h-[200px]">
                                <LogoComponent />
                            </div>
                        </NoSSRWrapper>
                    </div>
                    <div className="flex items-center justify-center">
                        <TextString />
                    </div>
                    <div>
                        <div className="flex items-center justify-center text-center">relay.tools 2023 &middot; Made with 🤙🏻 in the PNW &middot; <span className="fl pl-1"><a href="https://github.com/relaytools"><IoLogoGithub /></a></span></div>
                    </div>
                </div>
            </div>
        </div >
    )
}