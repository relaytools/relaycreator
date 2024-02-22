"use client"
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Bolt11Invoice from '../components/invoice'
import {useState} from 'react';
import { useRouter } from 'next/navigation';

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



export default function Balances(
    props: React.PropsWithChildren<{
        RelayBalances: any;
        IsAdmin: boolean;
    }>) {

        const router = useRouter()

        async function getTopUpInvoice(b: any) {

            const response = await fetch(`/api/invoices?relayname=${b.relayName}&topup=true`);
            const responseJson = await response.json();
            console.log(responseJson);

            if(response.ok) {
                router.push(`/invoices?relayname=${b.relayName}&order_id=${responseJson.order_id}&pubkey=unknown`);
            }
        }

        //const sortedRelays = props.RelayBalances.sort((a: any, b: any) => a.owner.localeCompare(b.owner));
        const sortedRelays = props.RelayBalances.sort((a: any, b: any) => {
        const ownerComparison = a.owner.localeCompare(b.owner);
        return ownerComparison !== 0 ? ownerComparison : a.balance - b.balance;
        });

        return (
            <div>
            <h1>Balances</h1>
                    <div className="mt-8 flow-root">
                        <div className="overflow-x-auto">
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Relay Name</th>
                                        <th>Paid Relay bonus (sats)</th>
                                        <th>Remaining Balance (sats)</th>
                                        {props.IsAdmin && <th>Owner (pubkey)</th>}
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {sortedRelays.map((b: any) => (
                                        <tr key={b.relayId + "rowkey"}>
                                            <td>{b.relayName}</td>
                                            <td>{b.clientPayments}</td>
                                            <td>{b.balance}</td>
                                            {props.IsAdmin && <td>{b.owner}</td>}
                                            <td>
                                                <button className="btn btn-secondary"  
                                                onClick={() => getTopUpInvoice(b)}>
                                                    top up balance
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                  </div>  
                  </div>
        )
    }