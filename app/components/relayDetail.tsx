"use client"
import { RelayWithEverything } from "./relayWithEverything"

export default function RelayDetail(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
    }>) {

    function modeString() {
        if (props.relay.default_message_policy == true) {
            return <div className="text-wrap">This relay allows all messages to be posted with the exception of the rules in the Block List:</div>
        } else {
            return <div className="text-wrap">This relay denies all messages to be posted with the exception of the rules in the Allow List:</div>
        }
    }

    return (
        <div className="">
            <div className="">Relay team:</div>
            <div className="text-gray-500">owner: {props.relay.owner.pubkey}</div >
            <div className="text-gray-500">moderators:</div>
            {
                props.relay.moderators.map((mod) => (
                    <div key={mod.id} className="text-gray-500 pl-2">
                        {mod.user.pubkey}
                    </div>
                ))
            }

            {modeString()}

            {props.relay.default_message_policy && <div className="">blocked keywords:</div>}
            {
                props.relay.block_list != null && props.relay.default_message_policy &&
                props.relay.block_list.list_keywords.map((keyword) => (
                    <span key={keyword.id} className="pl-2">
                        {keyword.keyword}
                    </span>
                ))
            }
            {
                props.relay.block_list != null &&
                /*
                props.relay.block_list.list_pubkeys.map((pubkey) => (
                    <div key={pubkey.id} className="text-sm pl-2">
                        {pubkey.pubkey}
                    </div>
                ))

                */
                <div key="blockedpubkeycount" className="pl-2">
                    Blocked Pubkeys: {props.relay.block_list.list_pubkeys.length}
                </div>
            }
            {!props.relay.default_message_policy && <div className="">allowed keywords:</div>}
            {
                props.relay.allow_list != null &&
                props.relay.allow_list.list_keywords.map((keyword) => (
                    <span key={keyword.id} className="pl-2">
                        {keyword.keyword}
                    </span>
                ))
            }
            {
                props.relay.allow_list != null && !props.relay.default_message_policy &&

                /*
                props.relay.allow_list.list_pubkeys.map((pubkey) => (
                    <div key={pubkey.id} className="text-sm pl-2">
                        {pubkey.pubkey}
                    </div>
                ))*/

                <div key="allowedpubkeycount" className="pl-2">
                    Allowed Pubkeys: {props.relay.allow_list.list_pubkeys.length}
                </div>
            }
        </div >

    )
}