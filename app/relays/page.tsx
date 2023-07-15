import { getServerSession } from "next-auth/next"
import authOptions from "../../pages/api/auth/[...nextauth]"
import prisma from '../../lib/prisma'
import Image from "next/image"
import { nip19 } from 'nostr-tools'

export default async function Relays() {
    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user.name) {
        return (
            <>
                <div></div>
            </>
        )
    }

    const me = await prisma.user.findFirst({
        where: { pubkey: (session as any).user.name },
        include: {
            moderator: {
                include: { relay: true }
            },
            relays: true,
        }
    })

    return (
        <div className="bg-gray-900">
            <div className="mx-auto max-w-7xl">
                <div className="bg-gray-900 py-10">
                    <div className="px-4 sm:px-6 lg:px-8">
                        <div className="sm:flex sm:items-center">
                            <div className="sm:flex-auto">
                                <h1 className="text-base font-semibold leading-6 text-white">Relays (owner)</h1>
                                <p className="mt-2 text-sm text-gray-300">
                                    A list of all the relays that you own.
                                </p>
                            </div>
                            <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                                <a href={`/signup`} className="text-indigo-400 hover:text-indigo-300">
                                    Create Relay<span className="sr-only">, </span>
                                </a>
                            </div>
                        </div>
                        <div className="mt-8 flow-root">
                            {me && me.relays.map((relay) => (
                                <div className="card card-side bg-base-100 shadow-xl outline">
                                    <figure><Image src="/green-check.png" alt="relay" width={100} height={100} /></figure>
                                    <div className="card-body">
                                        <h2 className="card-title">{relay.name}</h2>
                                        <p>{"wss://" + relay.name + ".nostr1.com"}</p>
                                        <div className="card-actions justify-begin">
                                            <a href={"https://relays.vercel.app/relay/" + nip19.nrelayEncode("wss://" + relay.name + ".nostr1.com")} className="btn btn-secondary">
                                                open in relay explorer<span className="sr-only">, {relay.id}</span>
                                            </a>
                                        </div>
                                        <div className="card-actions justify-end">
                                            <a href={`/curator?relay_id=${relay.id}`} className="btn btn-primary">
                                                settings<span className="sr-only">, {relay.id}</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="sm:flex sm:items-center">
                            <div className="sm:flex-auto">
                                <h1 className="text-base font-semibold leading-6 text-white">Relays (moderator)</h1>
                                <p className="mt-2 text-sm text-gray-300">
                                    A list of all the relays that you moderate.
                                </p>
                            </div>
                        </div>
                        <div className="mt-8 flow-root">
                            {me && me.moderator.map((mod) => (
                                <div className="card card-side bg-base-100 shadow-xl outline">
                                    <figure><Image src="/green-check.png" alt="relay" width={100} height={100} /></figure>
                                    <div className="card-body">
                                        <h2 className="card-title">{mod.relay.name}</h2>
                                        <p>details</p>
                                        <h2 className="card-title">{mod.relay.id}</h2>
                                        <div className="card-actions justify-end">
                                            <a href={`/curator?relay_id=${mod.relay.id}`} className="text-indigo-400 hover:text-indigo-300">
                                                Details<span className="sr-only">, {mod.relay.id}</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div >
    )
}