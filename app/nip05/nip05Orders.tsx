"use client";
import { UserWithNip05s } from "../components/userWithNip05s";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ShowClientOrder from "../components/showClientOrder";
import { useSession } from "next-auth/react";
import { nip19 } from "nostr-tools";
import ShowNip05Order from "../components/showNip05Order";

export default function Nip05Orders(
    props: React.PropsWithChildren<{
        user: UserWithNip05s;
        domains: string[];
    }>
) {
    const [pubkey, setPubkey] = useState("");
    const [pubkeyError, setPubkeyError] = useState("✅");
    const [pubkeyErrorDescription, setPubkeyErrorDescription] = useState("");
    const [showPubkeyInput, setShowPubkeyInput] = useState(true);
    const [showInvoice, setShowInvoice] = useState(false);
    const [nip05Order, setNip05Order] = useState({} as any);
    const [showSpinner, setShowSpinner] = useState(false);
    const [nip05Name, setNip05Name] = useState("");
    const [nip05Domain, setNip05Domain] = useState("");

    const { data: session, status } = useSession();

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    console.log(props.user);

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        setShowSpinner(true);
        const response = await fetch(
            `${rootDomain}/api/nip05orders?name=${nip05Name}&domain=${nip05Domain}&pubkey=${props.user.pubkey}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.ok) {
            // do response for nip05 order..
            const nip05Order = await response.json();
            setNip05Order(nip05Order.nip05Order);
            setShowPubkeyInput(false);
            setShowSpinner(false);
            setShowInvoice(true);
        }
    };

    return (
        <div className="p-4">
            <div className="mt-4">
                <h2 className="text-lg font-bold">Your Nip05s</h2>
                <ul>
                    {props.user.nip05Orders.map(
                        (nip05Order: any, index: number) => (
                            <li
                                key={index + "-nip05orders123"}
                                className="mt-2"
                            >
                                {nip05Order.nip05.name}
                                {"@"}
                                {nip05Order.nip05.domain}
                            </li>
                        )
                    )}
                </ul>
            </div>
            <div className="mt-4">
                <h2 className="text-lg font-bold">Create New Nip05</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Nip05 Name</span>
                        </label>
                        <input
                            type="text"
                            value={nip05Name}
                            onChange={(e) => setNip05Name(e.target.value)}
                            className="input input-bordered w-full"
                            placeholder="Enter Nip05 name"
                            required
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Nip05 Domain</span>
                        </label>
                        <select
                            value={nip05Domain}
                            onChange={(e) => setNip05Domain(e.target.value)}
                            className="input input-bordered w-full"
                            required
                        >
                            <option value="" disabled>
                                Select Nip05 domain
                            </option>
                            {props.domains.map((domain, index) => (
                                <option key={index} value={domain}>
                                    {domain}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-control mt-4">
                        <button type="submit" className="btn btn-primary">
                            Create Nip05
                        </button>
                    </div>
                </form>
                {showSpinner && (
                    <span className="loading loading-spinner text-primary" />
                )}
                {showInvoice && (
                    <ShowNip05Order nip05Order={nip05Order}></ShowNip05Order>
                )}
            </div>
        </div>
    );
}
