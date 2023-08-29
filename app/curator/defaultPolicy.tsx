"use client"

import { useState } from "react";

export default function DefaultPolicy(props: React.PropsWithChildren<{
    relay_id: string;
    allow: boolean;
    listed: boolean;
    pay: boolean;
    amount: string;
}>) {

    const [allow, setAllow] = useState(props.allow)
    const [listed, setListed] = useState(props.listed)
    const [pay, setPay] = useState(props.pay)
    const [satsAmount, setSatsAmount] = useState(props.amount)
    const [lightninghelp, setLightningHelp] = useState(false)

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
        const response = await fetch(`/api/relay/${props.relay_id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "default_message_policy": !allow, "listed_in_directory": listed, "payment_required": pay, "payment_amount": satsAmount })
        })
        if (allow) {
            setAllow(false)
        } else {
            setAllow(true)
        }
    }
    const handleListedChange = async (e: any) => {
        // call to API to set default policy
        e.preventDefault()
        const response = await fetch(`/api/relay/${props.relay_id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "listed_in_directory": !listed, "default_message_policy": allow, "payment_required": pay, "payment_amount": satsAmount })
        })
        if (listed) {
            setListed(false)
        } else {
            setListed(true)
        }
    }

    const handlePayChange = async (e: any) => {
        // call to API to set default policy
        e.preventDefault()
        let setNewAllow = allow
        if (allow && !pay) {
            setNewAllow = false
            setAllow(setNewAllow)
        }
        const response = await fetch(`/api/relay/${props.relay_id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "listed_in_directory": listed, "payment_required": !pay, "default_message_policy": setNewAllow, "payment_amount": satsAmount })
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
        const response = await fetch(`/api/relay/${props.relay_id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "payment_amount": satsAmount, "listed_in_directory": listed, "payment_required": pay, "default_message_policy": allow })
        })
    }

    const isAllow = () => {
        if (allow) {
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
                    <div className="btn btn-accent swap-on">Default message policy: ALLOW ✅</div>
                    <div className="btn btn-accent swap-off">Default message policy: DENY 🔨</div>
                </label>
            </div>
            <div className="mt-4">
                <label className={isListed()} onClick={(e) => handleListedChange(e)} >
                    <div className="btn btn-accent swap-on">Relay is listed in the public directory ✅</div>
                    <div className="btn btn-accent swap-off">Relay is NOT listed in the public directory 🙈</div>
                </label>
            </div>
            <div className="mt-4 flex">
                <label className={isPay()} onClick={(e) => handlePayChange(e)} >
                    <div className="btn btn-accent swap-on">Require lightning to post: on ⚡</div>
                    <div className="btn btn-accent swap-off">Require lightning to post: off</div>
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
                        placeholder={props.amount.toString()}
                        onChange={event => setSatsAmount(event.target.value)}
                    />
                    <button onClick={handleSaveSats} className="btn btn-primary">save</button>
                </div>
            }
        </div>
    )
}
