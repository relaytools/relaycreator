import ServerStatus from "./serverStatus.tsx"

// Client invoices page handles payments made by clients to relays
// This is different from regular invoices which are payments made by relay owners

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function ClientPaymentPage(props: {
    searchParams?: SearchParams,
}) {

    const p = await props.searchParams

    let gotParams=false
    if(p != null) {
        gotParams = true
    } 

    return (
        <div>
            {p != null &&
                <ServerStatus relayname={p.relayname as any} pubkey={p.pubkey as any} order_id={p.order_id as any} relayid={p.relayid as any}></ServerStatus>
            }
            {!gotParams &&
                <ServerStatus relayname={""} pubkey={""} order_id={""} relayid={""}></ServerStatus>
            }
        </div>
    )

}
