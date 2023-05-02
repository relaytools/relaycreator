"use client"
import { useRouter } from 'next/navigation'

type Relay = {
    id: string;
}

export default function EnableWhiteList(props: React.PropsWithChildren<{
    relay: Relay;
}>) {
    const router = useRouter();

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const id = event.currentTarget.id
        console.log(event.currentTarget.id)
        // call to API to create a new blank whitelist and re-render page
        const response = await fetch(`/api/relay/${id}/whitelistkeyword`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        router.push(`/curator?relay_id=${id}`)
    }

    return (
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
                onClick={(e) => handleSubmit(e)}
                id={props.relay.id}
                type="button"
                className="block rounded-md bg-purple-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            >
                Enable Whitelist
            </button>
        </div>
    )
}