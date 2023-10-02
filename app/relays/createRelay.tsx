"use client"
import LogoComponent from "../components/logoComponent"
import TextString from "../components/textString"
import { IoArrowForwardOutline, IoLogoGithub } from 'react-icons/io5';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NoSSRWrapper from "../components/noSSRWrapper";

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
        // use javascript regex to detect if length is 64 characters

        // check for hex chars
        const validHex = /^[0-9a-fA-F]{64}$/.test(pubkey)
        //console.log(pubkey.length)
        //const isLong = pubkey.length == 64

        // use javascript regex to detect if pubkey starts with npub
        //const validNpub = /^npub[0-9a-zA-z]{64}$/.test(pubkey)

        if (validHex) {
            setPubkeyError("")
            setPubkeyErrorDescription("")
        } else {
            setPubkeyError("❌")
            setPubkeyErrorDescription("key must be valid hex")
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
        if (pubkeyError == "" && nameError == "" && name != "") {
            return true
        } else {
            return false
        }
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        // here double check name isn't taken via the api, if it's taken, the api will return error.  if it's available the api will
        // 'reserve it' to this user pubkey.. and return the order_id here. the next page, will lookup the order id and populate with invoice.
        const response = await fetch(`/api/invoices?relayname=${name}&pubkey=${pubkey}`)
        const newdata = await response.json()

        if (response.ok) {
            router.push(`/invoices?relayname=${name}&pubkey=${pubkey}&order_id=${newdata.order_id}`);
        } else {
            setNameError("❌")
            setNameErrorDescription(newdata.error)
        }
    }

    return (
        <div className="font-jetbrains">
            <div className="">
                <div className="flex items-center justify-center">
                    <div className=" ">
                        <div>
                            <div className="mt-2 flex rounded-md shadow-sm">
                                <input
                                    type="text"
                                    name="company-website"
                                    id="company-website"
                                    className="input block w-full min-w-0 flex-1 rounded-none rounded-l-md border-0 py-1.5 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-right"
                                    placeholder="mynewrelay"
                                    autoComplete="off"
                                    value={name}
                                    onChange={event => setRelayName(event.target.value)}
                                />
                                <span className="inline-flex items-center  border border-l-0 border-gray-300 px-3 sm:text-sm">
                                    .nostr1.com
                                </span>
                                <button className="btn btn-primary inline-flex items-center rounded-r-md border border-l-0 border-gray-300 px-3 sm:text-sm"
                                    onClick={handleSubmit}
                                    disabled={!isValidForm}
                                >
                                    Deploy {nameError} <span className="fl pl-2"><IoArrowForwardOutline /></span>
                                </button>

                            </div>
                        </div>

                        <span className="flex items-center font-medium tracking-wide text-red-600 text-xs mt-1 ml-1">
                            {nameErrorDescription}
                        </span>
                        <div className="p-6">
                            <NoSSRWrapper>
                                <LogoComponent />
                            </NoSSRWrapper>
                        </div>
                        <TextString />
                        <div>
                            <div>relay.tools 2023 &middot; Made with 🤙🏻 in the PNW &middot; <span className="fl pl-1"><a href="https://github.com/relaytools"><IoLogoGithub /></a></span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}