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

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "http://localhost:3000"
    return (
        <div id={props.relay.id + "rootview"} className="">
            {props.showDetail &&
                <a href={"https://" + props.relay.name + "." + props.relay.domain} className="">
                    <div className="card w-96 shadow-xl text-white selectable mb-4 hover:bg-gray-800 hover:text-white hover:bg-opacity-80" style={{
                        backgroundImage: `url(${edited ? (profileBanner || "/green-check.png") : (props.relay.banner_image || "/green-check.png")})`,
                        backgroundSize: "cover",
                        textShadow: "0px 0px 5px rgba(0, 0, 0, 0.5)"
                    }}>
                        <div className="card-body items-center justify-end">
                            <div className="card h-48 w-96"></div>
                            <div className="card h-48 w-96">
                                <div className="card-body bg-black bg-opacity-80 hover:bg-gray-800 hover:text-white hover:bg-opacity-80">
                                    <h2 className="card-title mr-4 ml-2 mt-2" style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>{props.relay.name}</h2>
                                    <p className="mb-2 mr-4 ml-2 mt-2" style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>{"wss://" + props.relay.name + ".nostr1.com"}</p>
                                    <p className="mb-2 mr-4 ml-2 mt-2" style={{ whiteSpace: "pre-wrap", minHeight: "52px", maxHeight: "52px", overflow: "auto" }}>{edited ? (profileDetail || "") : (props.relay.details || "")}</p>
                                </div>
                            </div>
                        </div>
                    </div>


                </a>
            }

            {props.showCopy &&
                <div onClick={(e) => copyToClipboard(e, ("wss://" + props.relay.name + ".nostr1.com"))} className="card lg:w-full shadow-xl text-white selectable mb-4 hover:bg-gray-800 hover:text-white hover:bg-opacity-80" style={{
                    backgroundImage: `url(${edited ? (profileBanner || "/green-check.png") : (props.relay.banner_image || "/green-check.png")})`,
                    backgroundSize: "cover",
                    textShadow: "0px 0px 5px rgba(0, 0, 0, 0.5)"
                }}>
                    <div className="card-body items-center justify-end">
                        <div className="card h-48 w-96"></div>
                        <div className="card h-48 w-96">
                            <div className="card-body bg-black bg-opacity-80 hover:bg-gray-800 hover:text-white hover:bg-opacity-80">
                                <h2 className="card-title mr-4 ml-2 mt-2" style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>{props.relay.name}</h2>
                                <p className="mb-2 mr-4 ml-2 mt-2" style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>{"wss://" + props.relay.name + ".nostr1.com"}</p>
                                <p className="mb-2 mr-4 ml-2 mt-2" style={{ whiteSpace: "pre-wrap", minHeight: "52px", maxHeight: "52px", overflow: "auto" }}>{edited ? (profileDetail || "") : (props.relay.details || "")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            }

            {props.showSettings &&
                <a href={`/curator?relay_id=${props.relay.id}`} className="">
                    <div className="card w-96 shadow-xl text-white selectable mb-4 hover:bg-gray-800 hover:text-white hover:bg-opacity-80" style={{
                        backgroundImage: `url(${edited ? (profileBanner || "/green-check.png") : (props.relay.banner_image || "/green-check.png")})`,
                        backgroundSize: "cover",
                        textShadow: "0px 0px 5px rgba(0, 0, 0, 0.5)"
                    }}>
                        <div className="card-body items-center justify-end">
                            <div className="card h-48 w-96"></div>
                            <div className="card h-48 w-96">
                                <div className="card-body bg-black bg-opacity-80 hover:bg-gray-800 hover:text-white hover:bg-opacity-80">
                                    <h2 className="card-title mr-4 ml-2 mt-2" style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>{props.relay.name}</h2>
                                    <p className="mb-2 mr-4 ml-2 mt-2" style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>{"wss://" + props.relay.name + ".nostr1.com"}</p>
                                    <p className="mb-2 mr-4 ml-2 mt-2" style={{ whiteSpace: "pre-wrap", minHeight: "52px", maxHeight: "52px", overflow: "auto" }}>{edited ? (profileDetail || "") : (props.relay.details || "")}</p>
                                </div>
                            </div>
                        </div>
                    </div>


                </a>
            }
            {props.showCopy &&
                <div>
                    <div className="justify-center mt-2">
                        <button className="btn btn-notice"
                            onClick={(e) => copyToClipboard(e, ("wss://" + props.relay.name + ".nostr1.com"))}>
                            copy to clipboard
                        </button>
                    </div>
                </div>

            }

            {props.showEdit &&
                <div className="justify-center mt-2">
                    <button className="btn btn-primary"
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
                        <button className="btn btn-primary mt-2" onClick={(e) => handleSubmitEdit(e)}>Save</button>
                        <button className="btn btn-primary mt-2" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                </div>
            }
            {props.showExplorer &&
                <div>
                    <div className="justify-center mt-2">
                        <a href={"https://relays.vercel.app/relay/" + nip19.nrelayEncode("wss://" + props.relay.name + ".nostr1.com")} className="btn btn-secondary">
                            open in relay explorer<span className="sr-only">, {props.relay.id}</span>
                        </a>
                    </div>
                    <div className="justify-center mt-2">
                        <a href={rootDomain + "/posts?relay=" + nip19.nrelayEncode("wss://" + props.relay.name + ".nostr1.com")} className="btn btn-secondary">
                            open in relay explorer (alpha)<span className="sr-only">, {props.relay.id}</span>
                        </a>
                    </div>
                </div>
            }



        </div>

    )
}