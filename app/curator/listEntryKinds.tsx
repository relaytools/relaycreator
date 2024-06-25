"use client"
import { useState } from "react";
import { useSession } from "next-auth/react";

type ListEntryKind = {
    kind: number;
    reason: string | null;
    id: string,
}

export default function ListEntryKinds(props: React.PropsWithChildren<{
    kinds: ListEntryKind[];
    allowdeny: string;
    relay_id: string;
}>) {

    const { data: session, status } = useSession();

    const [kind, setKind] = useState("");
    const [reason, setReason] = useState("");
    const [newkind, setNewKind] = useState(false);
    const [kinds, setKinds] = useState(props.kinds)

    let idallowdeny = ""
    if (props.allowdeny == "Allowed Kinds ✅") {
        idallowdeny = "allowlist"
    } else {
        idallowdeny = "blocklist"
    }

    const handleDelete = async (event: any) => {
        event.preventDefault();
        const deleteThisId = event.currentTarget.id
        // call to API to delete keyword
        const response = await fetch(`/api/relay/${props.relay_id}/${idallowdeny}kind?list_id=${event.currentTarget.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });
        // delete the entry from the props
        let newlist: ListEntryKind[] = []
        kinds.forEach((entry) => {
            if (entry.id != deleteThisId) {
                newlist.push(entry)
            }
        })
        setKinds(newlist)
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const id = event.currentTarget.id
        console.log(event.currentTarget.id)
        // call to API to add new keyword
        const response = await fetch(`/api/relay/${props.relay_id}/${idallowdeny}kind`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "kind": parseInt(kind, 10), "reason": reason })
        });

        if (response.ok) {
            const j = await response.json()
            setNewKind(false)
            kinds.push({ "kind": parseInt(kind, 10), "reason": reason, "id": j.id })
            setKind("")
            setReason("")
        }
    }

    const setNewKindHandler = async () => {
        setNewKind(true)
    }

    const handleCancel = async () => {
        setNewKind(false)
        setKind("")
        setReason("")
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-0">
                                        {props.allowdeny}
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">
                                        Reason
                                    </th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                                        <span className="sr-only">Edit</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {kinds.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                            {entry.kind.toString()}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{entry.reason}</td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right">

                                            <button onClick={handleDelete} className="btn uppercase btn-secondary" id={entry.id}>Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {newkind &&
                                    <tr>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                            <form className="space-y-6" action="#" method="POST">
                                                <input
                                                    type="text"
                                                    name="kind"
                                                    id={idallowdeny + "newkind"}
                                                    className="input input-bordered input-primary w-full max-w-xs"
                                                    placeholder="add kind"
                                                    value={kind}
                                                    onChange={event => setKind(event.target.value)}
                                                />
                                                <input
                                                    type="text"
                                                    name="reason"
                                                    id={idallowdeny + "newreason"}
                                                    className="input input-bordered input-primary w-full max-w-xs"
                                                    placeholder="add reason"
                                                    value={reason}
                                                    onChange={event => setReason(event.target.value)}
                                                />
                                                <button onClick={handleSubmit} className="btn uppercase btn-primary">Add</button>
                                                <button onClick={handleCancel} className="btn uppercase btn-primary">Cancel</button>
                                            </form>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
            {!newkind &&
                <div className="">
                    <button
                        onClick={() => setNewKindHandler()}
                        type="button"
                        className="btn uppercase btn-primary mr-4"
                    >
                        Add kind
                    </button>
                </div>
            }
        </div>
    )
}