"use client"
import { RelayWithEverything } from "./relayWithEverything"

export default function RelayDetail(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
    }>) {

    function modeString() {
        if (props.relay.default_message_policy == true) {
            return <div className="text-sm">This relay allows all messages to be posted with the exception of the rules in the Block List:</div>
        } else {
            return <div className="text-sm">This relay denies all messages to be posted with the exception of the rules in the Allow List:</div>
        }
    }

    return (
        <div>
            <div className="text-sm">Relay team:</div>
            <div className="text-sm text-gray-500">owner: {props.relay.owner.pubkey}</div >
            <div className="text-sm text-gray-500">moderators:</div>
            {
                props.relay.moderators.map((mod) => (
                    <div key={mod.id} className="text-sm text-gray-500 pl-2">
                        {mod.user.pubkey}
                    </div>
                ))
            }

            {modeString()}

            {props.relay.default_message_policy && <div className="text-sm">blocked keywords:</div>}
            {
                props.relay.block_list != null && props.relay.default_message_policy &&
                props.relay.block_list.list_keywords.map((keyword) => (
                    <span key={keyword.id} className="text-sm pl-2">
                        {keyword.keyword}
                    </span>
                ))
            }
            {props.relay.default_message_policy && <div className="text-sm">blocked pubkeys:</div>}
            {
                props.relay.block_list != null && props.relay.default_message_policy &&
                props.relay.block_list.list_pubkeys.map((pubkey) => (
                    <div key={pubkey.id} className="text-sm pl-2">
                        {pubkey.pubkey}
                    </div>
                ))
            }
            {!props.relay.default_message_policy && <div className="text-sm">allowed keywords:</div>}
            {
                props.relay.allow_list != null && !props.relay.default_message_policy &&
                props.relay.allow_list.list_keywords.map((keyword) => (
                    <span key={keyword.id} className="text-sm pl-2">
                        {keyword.keyword}
                    </span>
                ))
            }
            {!props.relay.default_message_policy && <div className="text-sm">allowed pubkeys: owner + mods +</div>}
            {
                props.relay.allow_list != null && !props.relay.default_message_policy &&
                props.relay.allow_list.list_pubkeys.map((pubkey) => (
                    <div key={pubkey.id} className="text-sm pl-2">
                        {pubkey.pubkey}
                    </div>
                ))
            }
        </div >

    )
}