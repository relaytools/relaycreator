
export default function Faq() {
    // TODO: fill this out.  for now just using githu
    return (
        <div>
            <div className="text-2xl text text-primary text-center">Popular Relay Types</div>
            <div className="flex flex-col flex-col-2">
                <div className="flex-col-2">
                    Relay types overview
                    <h1 className="header">topical relay</h1>
                    uses keyword filters to selectively decide what topics are going to show up on the relay.
                    <h1>invite only relay</h1>
                    uses pubkey filters to allow a list of pubkeys to post to the relay
                    <h1>paid public relay</h1>
                    paid relay accepts a fee and then adds the pubkey to the allowed list of pubkeys (similar to invite only)
                    <h1>free public relay</h1>
                    allows anyone to post
                </div>
                <div className="flex-col-2">
                    Topical Relays
                </div>
            </div>
        </div>
    )
}