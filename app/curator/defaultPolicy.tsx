"use client"

import { useState } from "react";
import { useRouter } from "next/navigation"

export default function DefaultPolicy(props: React.PropsWithChildren<{
    relay_id: string;
    allow: boolean;
}>) {

    const [allow, setAllow] = useState(props.allow)

    const handleChange = async (event: any) => {
        console.log(event)
        // call to API to set default policy
        let setPolicy = false
        if (event == "allow") {
            setPolicy = true
        }
        const response = await fetch(`/api/relay/${props.relay_id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "default_message_policy": setPolicy })
        })
        setAllow(event)
    }

    const isSelected = (kind: string) => {
        if (kind == "allow" && allow == true) {
            return true
        } else if (kind == "deny" && allow == false) {
            return true
        }
    }

    return (
        <div>
            <div className="form-control">
                <label className="label">
                    <span className="label-text">Default message policy</span>
                </label>
                <div className="input-group">
                    <select className="select select-primary select-bordered"
                        onChange={event => handleChange(event.target.value)}
                        defaultValue={isSelected("allow") ? "allow" : "deny"}
                    >
                        <option id="setrelaypropsallow">allow</option>
                        <option id="setrelaypropsdeny">deny</option>
                    </select>
                </div>
            </div>
            <div className="form-control">
                <label className="label">
                    <span className="label-text">Spam protection</span>
                </label>
                <div className="input-group">
                    <select className="select select-secondary select-bordered"
                        onChange={event => handleChange(event.target.value)}
                    >
                        <option id="setrelaypropsspamon">on</option>
                        <option id="setrelaypropsspamoff">off</option>
                    </select>
                </div>
            </div>
        </div>
    )
}
