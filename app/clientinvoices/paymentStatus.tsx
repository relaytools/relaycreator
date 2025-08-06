"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Bolt11Invoice from "../components/invoice";

function copyToClipboard(e: any, bolt: string) {
    e.preventDefault();
    navigator.clipboard.writeText(bolt).then(() => {
        console.log("Copied to clipboard!");
    });
}

export async function alby(lnurl: string) {
    try {
        await (window as any).webln.enable();
        const result = await (window as any).webln.sendPayment(lnurl);
    } catch (error) {
        console.log("something went wrong with webln: " + error);
    }
}

export default function PaymentStatus(
    props: React.PropsWithChildren<{
        amount: number;
        payment_hash: string;
        payment_request: string;
    }>
) {
    const { data: session, status } = useSession();

    const p = useSearchParams();
    if (p == null) {
        return <>no p</>;
    }
    let pubkey = p.get("pubkey");

    let relayname = p.get("relayname");
    if (!relayname) {
        relayname = "";
    }

    let useAmount = props.amount;

    let newAmount = p.get("sats");
    if (newAmount) {
        useAmount = parseInt(newAmount);
    }

    if (session && session.user?.name) {
        pubkey = session.user.name;
    }

    alby(props.payment_request);

    return (
        <div className="card w-96 bg-base-100 border-2">
            <div className="card-body">
                <span className="badge badge-xs badge-warning">client subscription</span>
                <div className="flex justify-between">
                    <h2 className="text-3xl font-bold"></h2>
                    <span className="text-xl">{props.amount} sats</span>
                </div>
                <div className="col-span-3 flex justify-center mb-4 mt-4">
                    <Bolt11Invoice payment_request={props.payment_request} />
                </div>
                <div>
                    <button
                        onClick={(e) =>
                            copyToClipboard(e, props.payment_request)
                        }
                        type="submit"
                        className="flex w-full justify-center rounded-md btn-primary btn mb-4"
                    >
                        Copy ⚡ invoice to clipboard
                    </button>
                </div>
            </div>
        </div>
    );
}
