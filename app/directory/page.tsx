import PublicRelays from "../relays/publicRelays"

export default function DirectoryPage() {
    return (
        <div className="container mx-auto px-4 py-8">
<div className="flex items-center gap-4 mb-6 px-2">
                    <a 
                        href="/relays"
                        className="btn btn-ghost btn-sm"
                    >
                        ← Back to Dashboard
                    </a>
                    <h1 className="text-2xl sm:text-3xl font-bold">Relay Directory</h1>
                </div>
            <PublicRelays />
        </div>
    )
}
