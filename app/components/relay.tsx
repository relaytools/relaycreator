"use client"
import { nip19 } from "nostr-tools"
import { RelayWithEverything } from "./relayWithEverything"
import { useState } from "react"

function copyToClipboard(e: any, bolt: string) {
    e.preventDefault()
    navigator.clipboard.writeText(bolt).then(() => {
        console.log('Copied to clipboard!');
    });
}

export default function Relay(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
        showEdit: boolean;
        showSettings: boolean;
        showDetail: boolean;
        showExplorer: boolean;
        showCopy: boolean;
        modActions?: boolean;
    }>) {

    const [profileDetail, setProfileDetails] = useState(props.relay.details)
    const [profileBanner, setProfileBanner] = useState(props.relay.banner_image)
    const [edited, setEdited] = useState(false)
    const [editing, setEditing] = useState(false)

    const handleSubmitEdit = async (event: any) => {
        event.preventDefault();
        // call to API to save relay details 
        const profileDetailsObj = { details: profileDetail, banner_image: profileBanner, payment_amount: props.relay.payment_amount };
        const profileDetailsJson = JSON.stringify(profileDetailsObj);
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: profileDetailsJson
        });
        setEditing(false)
        setEdited(true)
    }

    let useRelayWSS = "wss://" + props.relay.name + "." + props.relay.domain
    // if relay is external, use full domain name here
    if(props.relay.is_external) {
        useRelayWSS = "wss://" + props.relay.domain
    }

    let useRelayHttps = "https://" + props.relay.name + "." + props.relay.domain
    if(props.relay.is_external) {
        useRelayHttps = "https://" + props.relay.domain
    }

    let useDetails = ""
    if(props.relay.details) {
        useDetails = props.relay.details.split('\n').slice(0, 2).join('\n');
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "http://localhost:3000"
    return (
        <div id={props.relay.id + "rootview"} className="flex-1 lg:flex-auto lg:w-1/4">
            {props.showDetail &&
                <a href={useRelayHttps} className="">
                    <div className="card rounded-none text-white selectable hover:bg-gray-800 hover:text-white hover:bg-opacity-80" style={{
                        backgroundImage: `url(${edited ? (profileBanner || "/green-check.png") : (props.relay.banner_image || "/green-check.png")})`,
                        backgroundSize: "cover",
                        textShadow: "0px 0px 5px rgba(0, 0, 0, 0.5)",
                        height: "394px",
                    }}>
                        <div className="flex-grow h-1/2"/>
                        <div className="font-condensed card-body bg-black bg-opacity-80 hover:bg-gray-800 hover:text-white hover:bg-opacity-80 flex-grow h-1/2">
                            <h2 className="card-title" style={{ whiteSpace: "pre-line", overflow: "hidden" }}>{props.relay.name}</h2>
                            <p className="text-sm" style={{ whiteSpace: "pre-line", overflow: "hidden" }}>{useRelayWSS}</p>
                            <p className="text-sm" style={{ whiteSpace: "pre-line", overflow: "hidden" }}>{edited ? (profileDetail || "") : (useDetails)}</p>
                        </div>
                    </div>


                </a>
            }

            {props.showCopy &&
                <div onClick={(e) => copyToClipboard(e, (useRelayWSS))} className="card rounded-none text-white selectable hover:bg-gray-800 hover:text-white hover:bg-opacity-80" style={{
                    backgroundImage: `url(${edited ? (profileBanner || "/green-check.png") : (props.relay.banner_image || "/green-check.png")})`,
                    backgroundSize: "cover",
                    textShadow: "0px 0px 5px rgba(0, 0, 0, 0.5)",
                    height: "394px",
                }}>
                    <div className="flex-grow h-1/2"/>
                    <div className="font-condensed card-body bg-black bg-opacity-80 hover:bg-gray-800 hover:text-white hover:bg-opacity-80 flex-grow h-1/2">
                        <h2 className="card-title" style={{ whiteSpace: "pre-line", overflow: "hidden" }}>{props.relay.name}</h2>
                        <p className="text-sm" style={{ whiteSpace: "pre-line", overflow: "hidden" }}>{useRelayWSS}</p>
                        <p className="text-sm" style={{ whiteSpace: "pre-line", overflow: "hidden" }}>{edited ? (profileDetail || "") : (useDetails)}</p>
                    </div>
                </div>
            }

            {props.showSettings &&
                <a href={`/curator?relay_id=${props.relay.id}`} className="">
                    <div className="card rounded-none text-white selectable hover:bg-gray-800 hover:text-white hover:bg-opacity-80" style={{
                        backgroundImage: `url(${edited ? (profileBanner || "/green-check.png") : (props.relay.banner_image || "/green-check.png")})`,
                        backgroundSize: "cover",
                        textShadow: "0px 0px 5px rgba(0, 0, 0, 0.5)",
                        height: "394px",
                    }}>
                        <div className="flex-grow"/>
                        <div className="font-condensed card-body bg-black bg-opacity-80 hover:bg-gray-800 hover:text-white hover:bg-opacity-80 max-h-40">
                            <h2 className="card-title" style={{ whiteSpace: "pre-line", overflow: "hidden" }}>{props.relay.name}</h2>
                            <p className="text-sm" style={{ whiteSpace: "pre-line", overflow: "hidden" }}>{useRelayWSS}</p>
                            <p className="text-sm" style={{ whiteSpace: "pre-line", overflow: "hidden" }}>{edited ? (profileDetail || "") : (useDetails)}</p>
                        </div>
                    </div>
                </a>
            }
            {props.showCopy &&
                <div>
                    <div className="justify-center mt-2">
                        <button className="btn uppercase btn-notice"
                            onClick={(e) => copyToClipboard(e, (useRelayWSS))}>
                            copy to clipboard
                        </button>
                    </div>
                </div>

            }

            {props.showEdit &&
                <div className="justify-center mt-2">
                    <button className="btn uppercase btn-primary"
                        onClick={() => setEditing(true)}>
                        edit details
                    </button>
                </div>
            }
            {
                editing &&
                <div className="form-control mt-4">
                    <label className="label">
                        <span className="label-text">Relay Profile</span>
                    </label>
                    <textarea id={props.relay.id + "textareaedit"} className="textarea textarea-bordered h-24"
                        placeholder="description"
                        value={profileDetail || ""}
                        onChange={(e) => setProfileDetails(e.target.value)}>
                    </textarea>
                    <label className="label">
                        <span className="label-text">Banner image url</span>
                    </label>
                    <input id={props.relay.id + "urlid"} type="text" placeholder="enter image url" className="input input-bordered w-full"
                        onChange={(e) => setProfileBanner(e.target.value)}
                        value={profileBanner || ""} />
                    <div className="flex justify-end gap-2">
                        <button className="btn uppercase btn-primary mt-2" onClick={(e) => handleSubmitEdit(e)}>Save</button>
                        <button className="btn uppercase btn-primary mt-2" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                </div>
            }
            {props.showExplorer &&
                <div>
                    <div className="justify-center mt-2">
                        <a href={"https://nostrrr.com/relay/" + nip19.nrelayEncode(useRelayWSS)} className="btn uppercase btn-secondary">
                            open in relay explorer<span className="sr-only">, {props.relay.id}</span>
                        </a>
                    </div>

                    <div className="justify-center mt-2">
                        <a href={useRelayHttps} className="btn uppercase btn-secondary">
                            open in relay explorer (alpha)<span className="sr-only">, {props.relay.id}</span>
                        </a>
                    </div>

                </div>
            }
        </div>

    )
}