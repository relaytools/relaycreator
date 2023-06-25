"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";

export type User = {
    pubkey: string;
}

export type Moderator = {
    user: User;
}

export default function Moderators(props: React.PropsWithChildren<{
    moderators: Moderator[];
    relay_id: string;
}>) {

    const [pubkey, setPubkey] = useState("");
    const [newpubkey, setNewPubkey] = useState(false);

    const router = useRouter();

    const handleDelete = async (event: any) => {
        event.preventDefault();
        console.log(event.currentTarget.id)
        // call to API to delete moderator
        const response = await fetch(`/api/relay/${props.relay_id}/moderator?pubkey=${event.currentTarget.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });
        router.push(`/curator?relay_id=${props.relay_id}`)
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const id = event.currentTarget.id
        console.log(event.currentTarget.id)
        // call to API to add new keyword
        const response = await fetch(`/api/relay/${props.relay_id}/moderator`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "pubkey": pubkey })
        });
        if (response.ok) {
            setNewPubkey(false)
            router.push(`/curator?relay_id=${props.relay_id}`)
        }
    }

    const handleCancel = async () => {
        setNewPubkey(false)
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <table className="table table-md">
                            <thead>
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-0">
                                        Mods
                                    </th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                                        <span className="sr-only">Edit</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {props.moderators.map((entry) => (
                                    <tr>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                            {entry.user.pubkey}
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right">

                                            <button onClick={handleDelete} className="btn btn-secondary" id={entry.user.pubkey}>Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {newpubkey &&
                                    <tr>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                            <form className="space-y-6" action="#" method="POST">
                                                <input
                                                    type="text"
                                                    name="pubkey"
                                                    id="newpubkey"
                                                    className="input input-bordered input-primary w-full max-w-xs"
                                                    placeholder="add pubkey"
                                                    value={pubkey}
                                                    onChange={event => setPubkey(event.target.value)}
                                                />
                                                <button onClick={handleSubmit} className="btn btn-primary">Add</button>
                                                <button onClick={handleCancel} className="btn btn-primary">Cancel</button>
                                            </form>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
            {!newpubkey &&
                <div className="">
                    <button
                        onClick={() => setNewPubkey(true)}
                        type="button"
                        className="btn btn-primary"
                    >
                        Add pubkey
                    </button>
                </div>
            }
        </div>
    )
}