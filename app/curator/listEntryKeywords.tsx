"use client"

import { useState } from "react";

export type ListEntryKeyword = {
    keyword: string;
    reason: string | null;
    id: string,
}

export default function ListEntryKeywords(props: React.PropsWithChildren<{
    keywords: ListEntryKeyword[];
    kind: string;
    relay_id: string;
}>) {

    const [keyword, setKeyword] = useState("");
    const [reason, setReason] = useState("");
    const [newkeyword, setNewKeyword] = useState(false);
    const [kind, setKind] = useState("all messages must include this keyword (OR) another existing keyword")
    const [keywords, setKeywords] = useState(props.keywords)

    let idkind = ""
    if (props.kind == "Allowed Keywords ✅") {
        idkind = "allowlist"
    } else {
        idkind = "blocklist"
    }

    const handleDelete = async (event: any) => {
        event.preventDefault();
        let deleteThisId = event.currentTarget.id
        // call to API to delete keyword
        const response = await fetch(`/api/relay/${props.relay_id}/${idkind}keyword?list_id=${event.currentTarget.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });

        // delete the entry from the props
        let newlist: ListEntryKeyword[] = []
        keywords.forEach((entry) => {
            if (entry.id != deleteThisId) {
                newlist.push(entry)
            }
        })
        setKeywords(newlist)
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        console.log(event.currentTarget.id)
        // call to API to add new keyword
        const response = await fetch(`/api/relay/${props.relay_id}/${idkind}keyword`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "keyword": keyword, "reason": reason })
        });

        if (response.ok) {
            const j = await response.json()
            const newKeywords = keywords
            newKeywords.push({ "keyword": keyword, "reason": reason, "id": j.id })
            setKeywords(newKeywords)
            setNewKeyword(false)
            setKeyword("")
            setReason("")
        }
    }

    const handleCancel = async () => {
        setNewKeyword(false)
        setKeyword("")
        setReason("")
    }

    const kinds = ["all messages must include this keyword (OR) another existing keyword", "all messages must include keyword (AND)"]

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="sm:flex sm:items-center">

            </div>
            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-0">
                                        {props.kind}
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">
                                        Reason
                                    </th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                                        <span className="sr-only">Edit</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {keywords.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                            {entry.keyword}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{entry.reason}</td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right">

                                            <button onClick={handleDelete} className="btn uppercase btn-secondary" id={entry.id}>Delete</button>
                                        </td>
                                    </tr>
                                ))}

                                {newkeyword &&

                                    <tr>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                            <form className="space-y-6" action="#" method="POST">
                                                <input
                                                    type="text"
                                                    name="keyword"
                                                    id={idkind + "newkeyword"}
                                                    className="input input-bordered input-primary w-full max-w-xs"
                                                    placeholder="add keyword"
                                                    value={keyword}
                                                    onChange={event => setKeyword(event.target.value)}
                                                />
                                                <input
                                                    type="text"
                                                    name="reason"
                                                    id={idkind + "newreason"}
                                                    className="input input-bordered input-primary w-full max-w-xs"
                                                    placeholder="add reason"
                                                    value={reason}
                                                    onChange={event => setReason(event.target.value)}
                                                />
                                                {/* hiding this for now, too complicated? */}
                                                {props.kind == "Allowed Keywords ✅" &&
                                                    <div className="hidden">
                                                        {kinds.map((kind, id) => (
                                                            <label className="label cursor-pointer" key={"kind" + idkind + id}>
                                                                <span className="label-text">{kind}</span>
                                                                <input
                                                                    className="radio"
                                                                    type="radio"
                                                                    name="kind"
                                                                    id={"kind" + idkind + id}
                                                                    placeholder="add kind"
                                                                    value={kind}
                                                                    onChange={event => setKind(event.target.value)}
                                                                    defaultChecked={kind === "all messages must include this keyword (OR) another existing keyword" ? true : false}
                                                                />
                                                            </label>
                                                        ))
                                                        }
                                                    </div>
                                                }
                                                <button onClick={handleSubmit} className="btn uppercase btn-secondary">Add</button>
                                                <button onClick={handleCancel} className="btn uppercase btn-secondary">Cancel</button>
                                            </form>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
                {!newkeyword &&
                    <div className="">
                        <button
                            onClick={() => setNewKeyword(true)}
                            type="button"
                            className="btn uppercase btn-primary"
                        >
                            Add keyword
                        </button>
                    </div>
                }
            </div>
        </div>
    )
}