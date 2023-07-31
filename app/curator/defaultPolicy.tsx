"use client"

import { useState } from "react";

export default function DefaultPolicy(props: React.PropsWithChildren<{
    relay_id: string;
    allow: boolean;
    listed: boolean;
}>) {

    const [allow, setAllow] = useState(props.allow)
    const [listed, setListed] = useState(props.listed)

    const handleChange = async (e: any) => {
        // call to API to set default policy
        e.preventDefault()
        const response = await fetch(`/api/relay/${props.relay_id}/settings`, {
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
    const handleListedChange = async (e: any) => {
        // call to API to set default policy
        e.preventDefault()
        const response = await fetch(`/api/relay/${props.relay_id}/settings`, {
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
        </div>
    )
}
