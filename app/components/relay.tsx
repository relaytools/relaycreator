"use client"
import { nip19 } from "nostr-tools"
import { RelayWithEverything } from "./relayWithEverything"
import { useState } from "react"

export default function Relay(
    props: React.PropsWithChildren<{
        relay: RelayWithEverything;
        showEdit: boolean;
        showSettings: boolean;
    }>) {

    const [profileDetail, setProfileDetails] = useState(props.relay.details)
    const [profileBanner, setProfileBanner] = useState(props.relay.banner_image)
    const [edited, setEdited] = useState(false)
    const [editing, setEditing] = useState(false)

    const handleSubmitEdit = async (event: any) => {
        event.preventDefault();
        // call to API to save relay details 
        const profileDetailsObj = { details: profileDetail, banner_image: profileBanner };
        const profileDetailsJson = JSON.stringify(profileDetailsObj);
        const response = await fetch(`/api/relay/${props.relay.id}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: profileDetailsJson
        });
        setEditing(false)
        setEdited(true)
    }

    return (
        <div id={props.relay.id + "rootview"}>
            <div className="card image-full w-full bg-base-100 shadow-xl mb-4 z-[0]">
                <figure className="max-h-[400px] w-full">
                    <img src={edited ? (profileBanner || "/green-check.png") : (props.relay.banner_image || "/green-check.png")} className="object-cover w-full" alt="relay" />
                </figure>

                <div className="card-body">
                    <h2 className="card-title">{props.relay.name}</h2>
                    <p>{"wss://" + props.relay.name + ".nostr1.com"}</p>

                    <p className="description mb5" style={{ whiteSpace: "pre-wrap", maxHeight: "200px", overflow: "auto" }}>{edited ? (profileDetail || "") : (props.relay.details || "")}</p>
                    <div className="card-actions justify-begin">
                        <a href={"https://relays.vercel.app/relay/" + nip19.nrelayEncode("wss://" + props.relay.name + ".nostr1.com")} className="btn btn-secondary">
                            open in relay explorer<span className="sr-only">, {props.relay.id}</span>
                        </a>
                        <a href={"/posts?relay=" + nip19.nrelayEncode("wss://" + props.relay.name + ".nostr1.com")} className="btn btn-secondary">
                            open in relay explorer (alpha)<span className="sr-only">, {props.relay.id}</span>
                        </a>

                    </div>
                    {props.showSettings &&
                        <div className="card-actions justify-end">
                            <a href={`/curator?relay_id=${props.relay.id}`} className="btn btn-primary">
                                settings<span className="sr-only">, {props.relay.id}</span>
                            </a>
                        </div>
                    }
                    {props.showEdit &&
                        <div className="card-actions justify-end">
                            <button className="btn btn-primary"
                                onClick={() => setEditing(true)}>
                                Edit
                            </button>
                        </div>
                    }
                </div>

            </div>

            {editing &&
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
        </div>
    )
}