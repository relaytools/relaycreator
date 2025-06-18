
import prisma from '../../../lib/prisma'
import { FaUser, FaShieldAlt, FaCheck, FaBan, FaGlobe, FaCalendarAlt, FaInfoCircle, FaLock, FaUnlock, FaChartLine } from 'react-icons/fa'
import { RelayWithEverything } from '../../components/relayWithEverything'
import DinosaurPosts from '../../components/dinosaurPosts'
import ConnectionStats from '../../components/connectionStats'
import UserRelayStatus from '../../components/userRelayStatus'
// Using regular img tag instead of Next.js Image for more flexibility with external URLs

export default async function RelayPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params;
    
    // Fetch the relay details from the database
    const relay = await prisma.relay.findFirst({
        where: {
            name: slug,
        },
        include: {
            owner: true,
            moderators: {
                include: { user: true },
            },
            block_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
                    list_kinds: true,
                },
            },
            allow_list: {
                include: {
                    list_keywords: true,
                    list_pubkeys: true,
                    list_kinds: true,
                },
            },
        },
    }) as RelayWithEverything | null;

    if (!relay) {
        return (
            <div className="container mx-auto p-4">
                <h1 className="text-2xl font-bold text-center">Relay not found</h1>
                <p className="text-center mt-4">
                    The relay you are looking for does not exist or has been removed.
                </p>
            </div>
        );
    }

    // Format creation date nicely
    const createdAt = relay.created_at ? new Date(relay.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'Unknown';

    // Auth required badge
    const authBadge = relay.auth_required ? 
        <span className="badge badge-secondary gap-1"><FaLock size={12} /> Auth required</span> : 
        <span className="badge badge-outline gap-1"><FaUnlock size={12} /> No auth</span>;
    

    // Check if banner_image exists and is not empty
    const bannerImage = relay.banner_image && relay.banner_image.trim() !== '' ? 
        relay.banner_image : '/green-check.png';
    
    // Log the banner URL for debugging
    console.log('Banner image URL:', bannerImage);

    return (
        <div className="container mx-auto p-4">
            <div className="hero rounded-box mb-6 overflow-hidden relative" style={{ height: '250px' }}>
                {/* Banner image as background */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-base-300 to-primary-focus">
                    {/* Fallback gradient background that will always show */}
                </div>
                
                {/* Banner image with error handling */}
                <div 
                    className="absolute inset-0 w-full h-full bg-cover bg-center" 
                    style={{ 
                        backgroundImage: `url('${bannerImage}')`,
                        opacity: 0.7
                    }}
                ></div>
                
                {/* Overlay gradient for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                
                <div className="hero-content text-center relative z-10 text-white">
                    <div>
                        <h1 className="text-4xl font-bold drop-shadow-md">{relay.name}</h1>
                        <p className="py-2 text-sm flex items-center justify-center gap-1">
                            <FaGlobe className="text-primary" /> 
                            <span className="font-mono">{'wss://' + relay.name + '.' + relay.domain}</span>
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                            {authBadge}
                            <span className="badge badge-neutral gap-1">
                                <FaCalendarAlt size={12} />est. {createdAt}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Relay details section */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Team card */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title flex items-center gap-2">
                                    <FaUser className="text-primary" /> Relay Team
                                </h2>
                                <div className="divider my-1"></div>
                                
                                <div className="mb-2">
                                    <div className="font-semibold flex items-center gap-1">
                                        <FaUser size={14} /> Owner
                                    </div>
                                    <div className="bg-base-200 p-2 rounded-md mt-1 font-mono text-xs overflow-x-auto">
                                        {relay.owner?.pubkey || 'Unknown'}
                                    </div>
                                </div>
                                
                                {relay.moderators.length > 0 && (
                                    <div>
                                        <div className="font-semibold flex items-center gap-1">
                                            <FaShieldAlt size={14} /> Moderators ({relay.moderators.length})
                                        </div>
                                        <div className="mt-1 space-y-1">
                                            {relay.moderators.map((mod) => (
                                                <div key={mod.id} className="bg-base-200 p-2 rounded-md font-mono text-xs overflow-x-auto">
                                                    {mod.user?.pubkey || 'Unknown'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Policy card */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title flex items-center gap-2">
                                    <FaInfoCircle className="text-primary" /> Relay Policy
                                </h2>
                                <div className="divider my-1"></div>
                                
                                <div className="alert alert-info">
                                    <div>
                                        {relay.default_message_policy ? 
                                            <p>This relay allows all messages by default, except those matching the block list rules.</p> :
                                            <p>This relay denies all messages by default, except those matching the allow list rules.</p>
                                        }
                                    </div>
                                </div>
                                
                                {/* Block list */}
                                {relay.default_message_policy && relay.block_list && (
                                    <div className="mt-3">
                                        <h3 className="font-semibold flex items-center gap-1">
                                            <FaBan size={14} /> Blocked Keywords
                                        </h3>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {relay.block_list.list_keywords.length > 0 ? 
                                                relay.block_list.list_keywords.map((keyword: { id: string, keyword: string }) => (
                                                    <span key={keyword.id} className="badge badge-error">{keyword.keyword}</span>
                                                )) : 
                                                <span className="text-sm italic">No blocked keywords</span>
                                            }
                                        </div>
                                        
                                        <div className="mt-3">
                                            <span className="badge badge-error">
                                                Blocked Pubkeys: {relay.block_list.list_pubkeys.length}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Allow list */}
                                {!relay.default_message_policy && relay.allow_list && (
                                    <div className="mt-3">
                                        <h3 className="font-semibold flex items-center gap-1">
                                            <FaCheck size={14} /> Allowed Keywords
                                        </h3>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {relay.allow_list.list_keywords.length > 0 ? 
                                                relay.allow_list.list_keywords.map((keyword: { id: string, keyword: string }) => (
                                                    <span key={keyword.id} className="badge badge-success">{keyword.keyword}</span>
                                                )) : 
                                                <span className="text-sm italic">No allowed keywords</span>
                                            }
                                        </div>
                                        
                                        <div className="mt-3">
                                            <span className="badge badge-success">
                                                Allowed Pubkeys: {relay.allow_list.list_pubkeys.length}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Stats card */}
                    <div className="card bg-base-100 shadow-xl mb-6">
                        <div className="card-body">
                            <h2 className="card-title flex items-center gap-2">
                                <FaChartLine className="text-primary" /> Relay Statistics
                            </h2>
                            <div className="divider my-1"></div>
                            
                            {/* Connection Stats Chart */}
                            <div className="mb-4">
                                <ConnectionStats relayName={slug} />
                            </div>
                        </div>
                    </div>
                    
                    {/* Posts related to this relay */}
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Explore Notes</h2>
                            <div className="divider my-1"></div>
                            <DinosaurPosts relayName={slug} />
                        </div>
                    </div>
                </div>
                
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    {/* User Relay Status Component */}
                    <UserRelayStatus relay={relay} />
                    
                    <div className="card bg-base-100 shadow-xl mb-4">
                        <div className="card-body">
                            <h2 className="card-title">Connect to Relay</h2>
                            <div className="divider my-1"></div>
                            <p className="text-sm mb-3">Use this relay URL in your Nostr client:</p>
                            <div className="bg-base-200 p-3 rounded-md font-mono text-xs break-all">
                                {'wss://' + relay.name + '.' + relay.domain}
                            </div>
                            <div className="card-actions justify-end mt-4">
                                <button className="btn btn-primary btn-sm">Copy URL</button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">About</h2>
                            <div className="divider my-1"></div>
                            <p>{relay.details || 'A Nostr relay powered by relay.tools'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}