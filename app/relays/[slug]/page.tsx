
import prisma from '../../../lib/prisma'
import { FaUser, FaShieldAlt, FaCheck, FaBan, FaGlobe, FaCalendarAlt, FaInfoCircle, FaLock, FaUnlock, FaChartLine, FaCrown } from 'react-icons/fa'
import { RelayWithEverything } from '../../components/relayWithEverything'
import DinosaurPosts from '../../components/dinosaurPosts'
import ConnectionStats from '../../components/connectionStats'
import UserRelayStatus from '../../components/userRelayStatus'
import ProfileImage from '../../components/profileImage'
import ProfileWrapper from '../../components/profileWrapper'
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
    
    // Use profile image if available, otherwise use banner image for the circular display
    const profileImage = relay.profile_image && relay.profile_image.trim() !== '' ?
        relay.profile_image : bannerImage;

    return (
        <div className="container mx-auto p-4">
            {/* Full-width banner with overlay */}
            <div className="relative rounded-xl overflow-hidden mb-6">
                {/* Banner image - full width */}
                <div className="w-full h-40 sm:h-48 md:h-64 bg-gradient-to-r from-primary/20 to-secondary/20 relative overflow-hidden">
                    {bannerImage && (
                        <div className="absolute inset-0 w-full h-full">
                            <img 
                                src={bannerImage} 
                                alt={`${relay.name} banner`}
                                className="w-full h-full object-cover opacity-50"
                            />
                        </div>
                    )}
                </div>
                
                {/* Overlay content */}
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-base-300/90 to-transparent">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                        {/* Profile image */}
                        <div className="relative sm:-mb-12 border-4 border-base-100 rounded-full overflow-hidden bg-base-100 w-20 h-20 sm:w-24 sm:h-24 mx-auto sm:mx-0">
                            <ProfileImage 
                                imageUrl={profileImage} 
                                altText={`${relay.name} profile`} 
                                className="w-full h-full"
                            />
                        </div>
                        
                        {/* Relay info container - stacked on mobile, side by side on larger screens */}
                        <div className="flex flex-col sm:flex-row w-full justify-between items-center sm:items-end mt-2 sm:mt-0">
                            {/* Relay name and URL */}
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white text-center sm:text-left">{relay.name}</h1>
                                <p className="text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-1 text-white/90 mt-1">
                                    <FaGlobe className="text-primary" /> 
                                    <span className="font-mono overflow-hidden text-ellipsis">{'wss://' + relay.name + '.' + relay.domain}</span>
                                </p>
                            </div>
                            
                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-end mt-3 sm:mt-0">
                                {authBadge}
                                <span className="badge badge-neutral gap-1">
                                    <FaCalendarAlt size={12} />est. {createdAt}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* About section - adjust margin top for mobile */}
            <div className="card bg-base-100 shadow-xl mb-6 mt-8 sm:mt-12">
                <div className="card-body">
                    <h2 className="card-title">About</h2>
                    <div className="divider my-1"></div>
                    <p>{relay.details || 'A Nostr relay powered by relay.tools'}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Left column - Team and Stats */}
                <div className="lg:col-span-2">
                    {/* Team card */}
                    <div className="card bg-base-100 shadow-xl mb-6">
                        <div className="card-body">
                            <h2 className="card-title flex items-center gap-2">
                                <FaUser className="text-primary" /> Relay Team
                            </h2>
                            <div className="divider my-1"></div>
                            
                            <div className="space-y-2">
                                {/* Create a combined, deduplicated team list */}
                                {(() => {
                                    // Define team member type
                                    interface TeamMember {
                                        pubkey: string;
                                        roles: string[];
                                    }
                                    
                                    // Start with the owner
                                    const teamMembers: TeamMember[] = [];
                                    const seenPubkeys = new Set<string>();
                                                                               // Add owner if exists
                                    if (relay.owner?.pubkey) {
                                        teamMembers.push({
                                            pubkey: relay.owner.pubkey,
                                            roles: ['owner']
                                        });
                                        seenPubkeys.add(relay.owner.pubkey);
                                    }
                                    
                                    // Add moderators, avoiding duplicates
                                    relay.moderators.forEach(mod => {
                                        if (mod.user?.pubkey) {
                                            if (seenPubkeys.has(mod.user.pubkey)) {
                                                // This user is already in the list (as owner), add moderator role
                                                const existingMember = teamMembers.find(m => m.pubkey === mod.user.pubkey);
                                                if (existingMember) {
                                                    existingMember.roles.push('moderator');
                                                }
                                            } else {
                                                // New team member
                                                teamMembers.push({
                                                    pubkey: mod.user.pubkey,
                                                    roles: ['moderator']
                                                });
                                                seenPubkeys.add(mod.user.pubkey);
                                            }
                                        }
                                    });
                                    
                                    return (
                                        <div>
                                            {teamMembers.map((member, index) => (
                                                <div key={index} className="bg-base-200 p-3 rounded-lg flex items-center">
                                                    <div className="w-full">
                                                        <div className="flex items-center justify-between">
                                                            <ProfileWrapper 
                                                                pubkey={member.pubkey} 
                                                                size="small" 
                                                                showName={true} 
                                                                showPubkey={true} 
                                                                showCopy={true} 
                                                            />
                                                            <div className="flex gap-2">
                                                                {member.roles.includes('owner') && (
                                                                    <div className="tooltip" data-tip="Owner">
                                                                        <FaCrown size={16} className="text-amber-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
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
                    
                    {/* About card - only shown on mobile */}
                    <div className="card bg-base-100 shadow-xl md:hidden">
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