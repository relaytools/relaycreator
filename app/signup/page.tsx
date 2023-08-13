"use client"
import CreateRelay from '../relays/createRelay'

// two possible flows here:
// updated: decided not to implement 1. (yet)
// 1. user is not logged in, so we just need their nostr pubkey (by paste or by extension)
//    - display a form to paste their pubkey + invoice
//    - we assume they already submitted the name they wanted and it's available and reserved
//    - display detailed relay settings to submit with payment (to avoid login)

// 2. user IS logged in, so we use their pubkey from the session
//    - display an invoice
//    - they did not submit a name to use..

export default function SignupPage() {
    return (
        <CreateRelay />
    )
}
