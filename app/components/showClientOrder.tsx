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

export default function ShowClientOrder(
    props: React.PropsWithChildren<{
        clientOrder: any;
    }>) {

    const [status, setStatus] = useState(false)

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN

    const getClientOrderStatus = async (clientOrderId: string) => {
        const result = await fetch(rootDomain + `/api/clientorders/${clientOrderId}`)
        const j = await result.json()
        setStatus(j.clientOrder.paid)
    }

    useEffect(() => {
        const interval = setInterval(() => {
            getClientOrderStatus(props.clientOrder.id);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    alby(props.clientOrder.lnurl)

    return (
        <div className="">
            <div className="flex mt-4 mb-4">
                <Bolt11Invoice payment_request={props.clientOrder.lnurl} />
            </div>
            <div>
                <button
                    onClick={(e) => copyToClipboard(e, props.clientOrder.lnurl)}
                    type="submit"
                    className="flex justify-center rounded-md bg-purple-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-50 hover:text-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ring-1 ring-gray-300 mb-4"
                >
                    Copy ⚡ invoice to clipboard
                </button>
            </div>
            {status && <div>success<ZapAnimation redirect_to=""></ZapAnimation></div>}
            {!status && <div>waiting</div>}
        </div>
    )
}
