"use client"

import { useState } from "react";
import { useRouter } from "next/navigation"
import { checkServerIdentity } from "tls";
import prisma from '../../lib/prisma'

export type ListEntryKeyword = {
    keyword: string;
    reason: string | null;
}


export default function ListEntryKeywords(props: React.PropsWithChildren<{
    keywords: ListEntryKeyword[];
    kind: string;
}>) {

    const [keyword, setKeyword] = useState("");
    const [reason, setReason] = useState("");
    const [newkeyword, setNewKeyword] = useState(false);
    const [kind, setKind] = useState("all messages must include this keyword (OR) another existing keyword")

    const router = useRouter();

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const id = event.currentTarget.id
        console.log(event.currentTarget.id)
        // call to API to add new keyword
        const response = await fetch(`/api/relay/${id}/whitelist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
    }

    let idkind = ""
    if (props.kind == "Whitelisted Keywords") {
        idkind = "whitelist"
    } else {
        idkind = "blacklist"
    }

    const kinds = ["all messages must include this keyword (OR) another existing keyword", "all messages must include keyword (AND)"]

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="sm:flex sm:items-center">

            </div>
            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <table className="min-w-full divide-y divide-gray-300">
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
                                {props.keywords.map((entry) => (
                                    <tr key={entry.keyword}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                            {entry.keyword}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{entry.reason}</td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                            <a href="#" className="btn">
                                                Edit <span className="sr-only">, {entry.keyword}</span>
                                            </a>
                                            <a href="#" className="btn">
                                                Delete <span className="sr-only">, {entry.keyword}</span>
                                            </a>
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
                                                {props.kind == "Whitelisted keywords" &&
                                                    <div>
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
                                                <button onClick={handleSubmit} className="btn btn-primary">Add</button>
                                            </form>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
                {!newkeyword &&
                    <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                        <button
                            onClick={() => setNewKeyword(true)}
                            type="button"
                            className="block rounded-md bg-purple-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                        >
                            Add keyword
                        </button>
                    </div>
                }
            </div>
        </div>
    )
}