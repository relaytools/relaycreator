"use client";
import { RelayWithEverything } from "./relayWithEverything";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ShowClientOrder from "./showClientOrder";
import { useSession } from "next-auth/react";
import { nip19 } from "nostr-tools";
import { convertOrValidatePubkey } from "../../lib/pubkeyValidation";

export default function RelayPayment(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
        pubkey: string;
    }>
) {
    const [pubkey, setPubkey] = useState("");
    const [pubkeyError, setPubkeyError] = useState("✅");
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("");
    const [showPubkeyInput, setShowPubkeyInput] = useState(true);
    const [showInvoice, setShowInvoice] = useState(false);
    const [clientOrder, setClientOrder] = useState({} as any);
    const [showSpinner, setShowSpinner] = useState(false);
    const router = useRouter();

    function setAndValidatePubkey(pubkey: string) {
        const validPubkey = convertOrValidatePubkey(pubkey);

        if (validPubkey) {
            setPubkeyError("✅");
            setPubkeyErrorDescription("");
        } else {
            setPubkeyError("❌");
            setPubkeyErrorDescription("key must be valid hex or npub");
        }
    }

    function isValidForm() {

        if( props.pubkey != "" && pubkey == "") {
            return true;
        } else if (pubkey == "") {
            return false;
        }

        return pubkeyError == "✅";

    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        setShowSpinner(true);
        // do a post request to the api to create a new order
        var usePub: string
        if(pubkey != "") {
            usePub = pubkey
        } else {
            usePub = props.pubkey
        }
        const validPubkey = convertOrValidatePubkey(usePub);
        if (validPubkey) {
            const response = await fetch(
                `${rootDomain}/api/clientorders?relayid=${props.relay.id}&pubkey=${validPubkey}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.ok) {
                const clientOrder = await response.json();
                setClientOrder(clientOrder.clientOrder);
                setShowPubkeyInput(false);
                setShowSpinner(false);
                setShowInvoice(true);
            }
        } else {
            setPubkeyError("❌");
            setPubkeyErrorDescription("key must be valid hex or npub");
        }
    };

    let alreadyPaid = false

    if(props.relay.allow_list && props.pubkey != null) {
        props.relay.allow_list.list_pubkeys.map((p) => {
            var usePub: any
            if(p.pubkey.startsWith("npub")) {
                const decodeRes = nip19.decode(p.pubkey)
                usePub = decodeRes.data 
            } else {
                usePub = p.pubkey
            }

            if (usePub == props.pubkey) {
                alreadyPaid = true
            }
        })
    }
    // to display their nip05 here, we need to get passed in, nip05 name/domain.. (already have pubkey)
    let alreadyNip05 = false


    // flow
    // 1. user enters pubkey and clicks pay
    // 2. call to the api to create a new relay order
    // 3. api creates an invoice and returns the order id
    // 4. then we poll for the invoice to be paid
    // 5. the api that is being polled, adds user to the list of allowed users when payment completes
    // 6. show success animation

    return (
        <div className="p-4">
            <div className="">
                <div className="flex">
                    <div className=" ">
                        <div>
                            <div className="lg:text-lg">
                                This relay requires payment of{" "}
                                {props.relay.payment_amount} sats to post. ⚡
                                {alreadyPaid && <div className="text-sm text-green-600">You've already paid for this relay, <a className="link-secondary" href={`${rootDomain}` + "/nip05"}>got nip05?</a></div>}
                            </div>
                            {showPubkeyInput && (

                                <div className="mt-2 flex rounded-md shadow-sm">
                                    <input
                                        type="text"
                                        name="pubkey"
                                        id="pubkey"
                                        className="input input-bordered input-primary w-full max-w-xs"
                                        // className="input block w-full min-w-0 flex-1 rounded-none rounded-l-md border-0 py-1.5 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-right"
                                        placeholder={props.pubkey || "enter pubkey"}
                                        autoComplete="off"
                                        value={pubkey}
                                        onChange={(event) =>
                                            setAndValidatePubkey(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <button
                                        className="btn uppercase btn-primary inline-flex items-center rounded-r-md border border-l-0 border-gray-300 px-3 sm:text-sm"
                                        onClick={handleSubmit}
                                        disabled={!isValidForm()}
                                    >
                                        Lightning Pay {pubkeyError}{" "}
                                        <span className="fl pl-2">⚡</span>
                                    </button>
                                </div>
                            )}

                            {showSpinner && (
                                <span className="loading loading-spinner text-primary" />
                            )}
                            {showInvoice && (
                                <ShowClientOrder clientOrder={clientOrder} />
                            )}
                        </div>

                        <span className="flex items-center font-medium tracking-wide text-red-600 text-xs mt-1 ml-1">
                            {pubkeyErrorDescription}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
