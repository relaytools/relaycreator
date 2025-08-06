"use client";
import Link from "next/link";

export default function RelayDashboard() {



    return (
        <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        <Link 
                            href="/clientinvoices"
                            className="card bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                        >
                            <div className="card-body text-center">
                                <div className="text-5xl mb-3">⚡</div>
                                <h3 className="card-title justify-center text-xl font-bold">Subscriptions</h3>
                                <p className="text-sm opacity-90">Lightning payments & memberships</p>
                            </div>
                        </Link>
                        <Link 
                            href="/nip05"
                            className="card bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                        >
                            <div className="card-body text-center">
                                <div className="text-5xl mb-3">🔐</div>
                                <h3 className="card-title justify-center text-xl font-bold">NIP-05 Identity</h3>
                                <p className="text-sm opacity-90">Setup your Nostr identity</p>
                            </div>
                        </Link>
                        <Link 
                            href="/relays/myrelays"
                            className="card bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                        >
                            <div className="card-body text-center">
                                <div className="text-5xl mb-3">🛠️</div>
                                <h3 className="card-title justify-center text-xl font-bold">My Relays</h3>
                                <p className="text-sm opacity-90">Configure & manage relays</p>
                            </div>
                        </Link>
                        <Link 
                            href="/directory"
                            className="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                        >
                            <div className="card-body text-center">
                                <div className="text-5xl mb-3">🌐</div>
                                <h3 className="card-title justify-center text-xl font-bold">Browse Relays</h3>
                                <p className="text-sm opacity-90">Discover & browse relays</p>
                            </div>
                        </Link>
                </div>
            </div>
        </div>
    );
}
