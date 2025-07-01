"use client";
import { useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const MyRelays = dynamic(() => import("./myRelays"), { ssr: false });
const PublicRelays = dynamic(() => import("./publicRelays"), { ssr: false });

type MenuSection = 'relays' | 'publicrelays';

interface RelayDashboardProps {
    session: any;
}

export default function RelayDashboard({ session }: RelayDashboardProps) {
    const [activeSection, setActiveSection] = useState<MenuSection | null>(null);
    const router = useRouter();

    const renderSectionWithBack = (title: string, content: ReactNode) => {
        return (
            <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
                <div className="w-full px-2 sm:px-4 py-8">
                    <div className="flex items-center gap-4 mb-6 px-2">
                        <button 
                            onClick={() => setActiveSection(null)}
                            className="btn btn-ghost btn-sm"
                        >
                            ← Back to Menu
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
                    </div>
                    <div className="w-full">
                        {content}
                    </div>
                </div>
            </div>
        );
    };



    // Show menu if no section is selected
    if (!activeSection) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
                <div className="container mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        <Link 
                            href="/clientinvoices"
                            className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                        >
                            <div className="card-body text-center">
                                <div className="text-4xl mb-2">💳</div>
                                <h3 className="card-title justify-center text-lg">Relay Subscriptions</h3>
                                <p className="text-sm opacity-90">Manage memberships</p>
                            </div>
                        </Link>
                        <Link 
                            href="/nip05"
                            className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                        >
                            <div className="card-body text-center">
                                <div className="text-4xl mb-2">🆔</div>
                                <h3 className="card-title justify-center text-lg">NIP-05 Identity</h3>
                                <p className="text-sm opacity-90">Verify identity</p>
                            </div>
                        </Link>
                        <button 
                            onClick={() => setActiveSection('relays')}
                            className="btn btn-lg h-auto p-6 flex-col gap-3 bg-gradient-to-br from-orange-500/10 to-red-600/10 border-orange-200/20 hover:shadow-lg transition-all"
                        >
                            <div className="text-3xl">⚡</div>
                            <div className="text-lg font-semibold">Relay Settings</div>
                            <div className="text-sm opacity-70">Configure relays</div>
                        </button>
                        <Link 
                            href="/publicrelays"
                            className="card bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                        >
                            <div className="card-body text-center">
                                <div className="text-4xl mb-2">🌐</div>
                                <h3 className="card-title justify-center text-lg">Public Relays</h3>
                                <p className="text-sm opacity-90">Browse relays</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Show selected section - each section handles its own layout
    switch (activeSection) {
        case 'relays':
            return renderSectionWithBack("My Relays", <MyRelays />);
        case 'publicrelays':
            return renderSectionWithBack("Public Relays", <PublicRelays />);
        default:
            return null;
    }
}
