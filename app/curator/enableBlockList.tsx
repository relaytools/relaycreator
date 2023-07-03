"use client"
import { useRouter } from 'next/navigation'

type Relay = {
    id: string;
}

export default function EnableBlockList(props: React.PropsWithChildren<{
    relay: Relay;
}>) {
    const router = useRouter();

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        const id = event.currentTarget.id
        console.log(event.currentTarget.id)
        // call to API to create a new blank AllowList and re-render page
        const response = await fetch(`/api/relay/${id}/blocklistkeyword`, {
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
                className="btn btn-primary"
            >
                Enable BlockList
            </button>
        </div>
    )
}