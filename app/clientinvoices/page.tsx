import ServerStatus from "./serverStatus.tsx"

// Client invoices page handles payments made by clients to relays
// This is different from regular invoices which are payments made by relay owners

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function ClientPaymentPage(props: {
    searchParams: SearchParams,
}) {

    const p = await props.searchParams

    return (
        <div>
            {/* @ts-expect-error Server Component */}
            <ServerStatus relayname={p.relayname} pubkey={p.pubkey} order_id={p.order_id} relayid={p.relayid}></ServerStatus>
        </div>
    )

}
