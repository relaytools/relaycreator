"use client"
import React from 'react'
import Bolt11Invoice from './invoice'
import { useEffect, useState } from 'react'
import ZapAnimation from '../lightningsuccess/lightning'

function copyToClipboard(e: any, bolt: string) {
    e.preventDefault()
    navigator.clipboard.writeText(bolt).then(() => {
        console.log('Copied to clipboard!');
    });
}

export async function alby(lnurl: string) {
    // const lnurl = (provided by your application backend)
    try {
        await (window as any).webln.enable();
        const result = await (window as any).webln.sendPayment(lnurl); // promise resolves once the LNURL process is finished 
    } catch (error) {
        console.log("something went wrong with webln: " + error)
    }
}

export default function ShowNip05Order(
    props: React.PropsWithChildren<{
        nip05Order: any;
        onPaymentSuccess?: () => void;
    }>) {

    const [status, setStatus] = useState(false)

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN

    const getNip05OrderStatus = async (clientOrderId: string) => {
        const result = await fetch(`/api/nip05orders/${props.nip05Order.id}`)
        const j = await result.json()
        const wasPaid = status;
        setStatus(j.nip05Order.paid)
        
        // If payment just completed, trigger callback
        if (!wasPaid && j.nip05Order.paid && props.onPaymentSuccess) {
            props.onPaymentSuccess();
        }
    }

    useEffect(() => {
        const interval = setInterval(() => {
            getNip05OrderStatus(props.nip05Order.id);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    alby(props.nip05Order.lnurl)

    return (
        <div className="">
            <div className="flex mt-4 mb-4">
                <Bolt11Invoice payment_request={props.nip05Order.lnurl} />
            </div>
            <div>
                <button
                    onClick={(e) => copyToClipboard(e, props.nip05Order.lnurl)}
                    type="submit"
                    className="flex justify-center rounded-md bg-purple-600 py-2 px-3 text-sm font-semibold text-white shadow-xs hover:bg-gray-50 hover:text-purple-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ring-1 ring-gray-300 mb-4"
                >
                    Copy ⚡ invoice to clipboard
                </button>
            </div>
            {status && <div>success<ZapAnimation redirect_to="/nip05"></ZapAnimation></div>}
            {!status && <div>waiting</div>}
        </div>
    )
}
