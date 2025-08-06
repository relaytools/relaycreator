import ServerStatus from "./serverStatus"

// two flows here:
// 1. user is not logged in, so we just need their nostr pubkey (by paste or by extension)
//    - display a form to paste their pubkey + invoice
//    - we assume they already submitted the name they wanted and it's available and reserved

// 2. user IS logged in, so we use their pubkey from the session
//    - display an invoice
//    - they did not submit a name to use..

// once the invoice is created
// we wait till we see it completed to finalize the 'login' if they're not logged in, 
// ie, in the database the user id, but still should exist so we can associate the payment_hash
// user should not be 'verified' until payment is received.

// payment page is the hub for server and client components here

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function PaymentPage(props: {
    searchParams: SearchParams,
}) {

    const p = await props.searchParams

    return (
        <div>
            {/* @ts-expect-error Server Component */}
            <ServerStatus relayname={p.relayname} pubkey={p.pubkey} order_id={p.order_id}></ServerStatus>
        </div>
    )

}