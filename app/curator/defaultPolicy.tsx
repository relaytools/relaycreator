"use client"
import { useState } from "react";
import { RelayWithEverything } from "../components/relayWithEverything"

export default function DefaultPolicy(props: React.PropsWithChildren<{
    relay: RelayWithEverything;
}>) {

    const [allow, setAllow] = useState(props.relay.default_message_policy)
    const [listed, setListed] = useState(props.relay.listed_in_directory)
    const [allowGiftwrap, setAllowGiftwrap] = useState(props.relay.allow_giftwrap)
    const [allowTagged, setAllowTagged] = useState(props.relay.allow_tagged)
    const [authRequired, setAuthRequired] = useState(props.relay.auth_required)
    const [pay, setPay] = useState(props.relay.payment_required)
    const [satsAmount, setSatsAmount] = useState(props.relay.payment_amount.toString())
    const [lightninghelp, setLightningHelp] = useState(false)
    const [allowKeywordPubkey, setAllowKeywordPubkey] = useState(props.relay.allow_keyword_pubkey)

    const toggleLightningHelp = () => {
        if (lightninghelp) {
            setLightningHelp(false)
        } else {
            setLightningHelp(true)
        }
    }

    const handleChange = async (e: any) => {
        // call to API to set default policy
        e.preventDefault()
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "default_message_policy": !allow })
        })
        if (allow) {
            setAllow(false)
        } else {
            setAllow(true)
        }
    }

    const handleAllowKeywordPubkey = async (e: any) => {
        e.preventDefault()
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "allow_keyword_pubkey": !allowKeywordPubkey })
        })
        if (allowKeywordPubkey) {
            setAllowKeywordPubkey(false)
        } else {
            setAllowKeywordPubkey(true)
        }
    }
    
    const handleListedChange = async (e: any) => {
        e.preventDefault()
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "listed_in_directory": !listed })
        })
        if (listed) {
            setListed(false)
        } else {
            setListed(true)
        }
    }

    const handleAuthChange = async (e: any) => {
        e.preventDefault()
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "auth_required": !authRequired })
        })
        if (authRequired) {
            setAuthRequired(false)
        } else {
            setAuthRequired(true)
        }
    }

    const handleGiftwrapChange = async (e: any) => {
        e.preventDefault()
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ allow_giftwrap: !allowGiftwrap })
        })
        if (allowGiftwrap) {
            setAllowGiftwrap(false)
        } else {
            setAllowGiftwrap(true)
        }
    }

    const handleTaggedChange = async (e: any) => {
        e.preventDefault()
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ allow_tagged: !allowTagged})
        })
        if (allowTagged) {
            setAllowTagged(false)
        } else {
            setAllowTagged(true)
        }
    }

    const handlePayChange = async (e: any) => {
        e.preventDefault()
        let setNewAllow = allow
        if (allow && !pay) {
            setNewAllow = false
            setAllow(setNewAllow)
        }
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "payment_required": !pay, default_message_policy: setNewAllow})
        })
        if (response.ok) {
            if (pay) {
                setPay(false)
            } else {
                setPay(true)
            }
        }
    }

    const handleSaveSats = async (e: any) => {
        e.preventDefault()
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "payment_amount": satsAmount })
        })
    }

    const isAllow = () => {
        if (allow) {
            return "swap swap-active"
        } else {
            return "swap"
        }
    }

    const isAllowKeywordPubkey = () => {
        if (allowKeywordPubkey) {
            return "swap swap-active"
        } else {
            return "swap"
        }
    }

    const isListed = () => {
        if (listed) {
            return "swap swap-active"
        } else {
            return "swap"
        }
    }

    const isAuthRequired = () => {
        if (authRequired) {
            return "swap swap-active"
        } else {
            return "swap"
        }
    }

    const isGiftwrap = () => {
        if (allowGiftwrap) {
            return "swap swap-active"
        } else {
            return "swap"
        }
    }

    const isTagged = () => {
        if (allowTagged) {
            return "swap swap-active"
        } else {
            return "swap"
        }
    }

    const isPay = () => {
        if (pay) {
            return "swap swap-active"
        } else {
            return "swap"
        }
    }

    return (
        <div className="flex flex-col">
            <div className="">
                <label className={isAllow()} onClick={(e) => handleChange(e)} >
                    <div className="btn uppercase btn-accent swap-on">Default message policy: ALLOW ✅</div>
                    <div className="btn uppercase btn-accent swap-off">Default message policy: DENY 🔨</div>
                </label>
            </div>
            <div className="mt-4">
                <label className={isAllowKeywordPubkey()} onClick={(e) => handleAllowKeywordPubkey(e)} >
                    <div className="btn uppercase btn-accent swap-on">Additional Policy: Allow Pubkeys -AND REQUIRE- Keywords</div>
                    <div className="btn uppercase btn-accent swap-off">Additional Policy: Allow Pubkeys -OR- Keywords</div>
                </label>
            </div>
            <div className="mt-4">
                <label className={isListed()} onClick={(e) => handleListedChange(e)} >
                    <div className="btn uppercase btn-accent swap-on">Relay is listed in the public directory ✅</div>
                    <div className="btn uppercase btn-accent swap-off">Relay is NOT listed in the public directory 🙈</div>
                </label>
            </div>
            <div className="mt-4">
                <label className={isAuthRequired()} onClick={(e) => handleAuthChange(e)} >
                    <div className="btn uppercase btn-accent swap-on">Relay requires AUTH (NIP42) ✅</div>
                    <div className="btn uppercase btn-accent swap-off">Relay does not require AUTH (NIP42) 🙈</div>
                </label>
            </div>
            <div className="mt-4">
                <label className={isGiftwrap()} onClick={(e) => handleGiftwrapChange(e)} >
                    <div className="btn uppercase btn-accent swap-on">Allow Private Groups ✅</div>
                    <div className="btn uppercase btn-accent swap-off">Do NOT allow Private Groups 🙈</div>
                </label>
            </div>
            <div className="mt-4">
                <label className={isTagged()} onClick={(e) => handleTaggedChange(e)} >
                    <div className="btn uppercase btn-accent swap-on">Allow Events Tagged to Pubkeys ✅</div>
                    <div className="btn uppercase btn-accent swap-off">Do NOT Allow Events Tagged to Pubkeys 🙈</div>
                </label>
            </div>
            <div className="mt-4 flex">
                <label className={isPay()} onClick={(e) => handlePayChange(e)} >
                    <div className="btn uppercase btn-accent swap-on">Require lightning to post: on ⚡</div>
                    <div className="btn uppercase btn-accent swap-off">Require lightning to post: off</div>
                </label>
                <img onClick={toggleLightningHelp} className="w-10 h-10" src="icons8-tooltip-64.png"></img>
            </div>
            {lightninghelp && <div>
                <p className="text-lg font-medium">How do paid relays work with relay.tools?</p>
                <ul>
                    <li><p>Payments are sent to relay.tools</p></li>
                    <li><p>Payments made to your relay help prevent spam and add credit toward your monthly invoice</p></li>
                    <li><p>Future options may or may not include: autozaps [on/off], programmatic zaps </p></li>
                </ul>
            </div>}
            {pay &&
                <div className="mt-4">
                    <label className="label">Set payment amount (sats)</label>
                    <input
                        type="text"
                        name="satsamount"
                        className="input input-bordered input-primary w-full max-w-xs"
                        placeholder={props.relay.payment_amount.toString()}
                        onChange={event => setSatsAmount(event.target.value)}
                    />
                    <button onClick={handleSaveSats} className="btn uppercase btn-primary">save</button>
                </div>
            }
        </div>
    )
}
