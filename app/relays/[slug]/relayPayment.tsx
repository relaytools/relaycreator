"use client";
import { RelayWithEverything } from "../../components/relayWithEverything";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ShowClientOrder from "./showClientOrder";
import { useSession } from "next-auth/react";

export default function RelayPayment(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
    }>
) {
    const [pubkey, setPubkey] = useState("");
    const [pubkeyError, setPubkeyError] = useState("");
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("");
    const [showPubkeyInput, setShowPubkeyInput] = useState(true);
    const [showInvoice, setShowInvoice] = useState(false);
    const [clientOrder, setClientOrder] = useState({} as any);
    const [showSpinner, setShowSpinner] = useState(false);

    const { data: session, status } = useSession();

    if (session && session.user?.name) {
        if (pubkey != session.user.name) {
            setAndValidatePubkey(session.user.name);
        }
    }

    const router = useRouter();

    function setAndValidatePubkey(pubkey: string) {
        setPubkey(pubkey);
        // use javascript regex to detect if length is 64 characters
        const validHex = /^[0-9a-fA-F]{64}$/.test(pubkey);
        // use javascript regex to detect if pubkey starts with npub
        const validNpub = /^npub1[0-9a-zA-Z]{58}$/.test(pubkey);

        if (validHex) {
            setPubkeyError("✅");
            setPubkeyErrorDescription("");
        } else if (validNpub) {
            setPubkeyError("✅");
            setPubkeyErrorDescription("");
        } else {
            setPubkeyError("❌");
            setPubkeyErrorDescription("key must be valid hex or npub");
        }
    }

    function isValidForm() {
        if (pubkey == "") {
            return false;
        }
        if (pubkeyError == "✅") {
            return true;
        } else {
            return false;
        }
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        setShowSpinner(true);
        // do a post request to the api to create a new order
        const response = await fetch(
            `${rootDomain}/api/clientorders?relayid=${props.relay.id}&pubkey=${pubkey}`,
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
    };

    // flow
    // 1. user enters pubkey and clicks pay
    // 2. call to the api to create a new relay order
    // 3. api creates an invoice and returns the order id
    // 4. then we poll for the invoice to be paid
    // 5. the api that is being polled, adds user to the list of allowed users when payment completes
    // 6. show success animation

    return (
        <div className="font-jetbrains">
            <div className="">
                <div className="flex">
                    <div className=" ">
                        <div>
                            <div className="text-lg">
                                This relay requires payment of{" "}
                                {props.relay.payment_amount} sats to post. ⚡
                            </div>
                            {showPubkeyInput && (

                                <div className="mt-2 flex rounded-md shadow-sm">
                                    <input
                                        type="text"
                                        name="pubkey"
                                        id="pubkey"
                                        className="input input-bordered input-primary w-full max-w-xs"
                                        // className="input block w-full min-w-0 flex-1 rounded-none rounded-l-md border-0 py-1.5 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-right"
                                        placeholder="sign-in or paste pubkey"
                                        autoComplete="off"
                                        value={pubkey}
                                        onChange={(event) =>
                                            setAndValidatePubkey(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <button
                                        className="btn btn-primary inline-flex items-center rounded-r-md border border-l-0 border-gray-300 px-3 sm:text-sm"
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
