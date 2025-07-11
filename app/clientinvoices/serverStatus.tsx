import { getServerSession } from "next-auth/next";
import { headers } from "next/headers";
import authOptions from "../../pages/api/auth/[...nextauth]";
import PaymentStatus from "./paymentStatus";
import PaymentSuccess from "./paymentSuccess";
import SubscriptionMenu from "../components/subscriptionMenu";
import ClientBalances from "./balances";
import prisma from "../../lib/prisma";
import ShowSmallSession from "../components/smallsession";
import SubscriptionHandler from "./subscriptionHandler";

// Define a type for relay client order data structure
type RelayClientOrderData = {
    owner: string;
    relayName: string;
    relayStatus: string | null;
    relayId: string;
    relayDomain: string | null;
    totalClientPayments: number;
    orders: Array<any>; // Using any to accommodate different date formats
    unpaidOrders: Array<any>;
    paymentAmount: number;
    paymentPremiumAmount: number | undefined;
    paymentRequired: boolean;
    isInAllowList: boolean;
    banner_image: string | null;
    profile_image: string | null;
    needsInitialSubscription?: boolean;
}

export const dynamic = "force-dynamic";

export default async function ServerStatus(props: {
    relayname: string|undefined,
    order_id: string|undefined,
    pubkey: string|undefined,
    relayid: string|undefined,
}) {

    const session = await getServerSession(authOptions);
    const headersList = await headers();
    const rewritten = headersList.get('middleware-rewritten');

    const relayname = props.relayname;
    const relayid = props.relayid;
    const pubkey = props.pubkey;
    const order_id = props.order_id;

    // Case 1: User is logged in but no specific order is being viewed
    if (!relayid || !pubkey || !order_id) {
        // Case 1a: User is logged in with a session
        if (session && (session as any).user.name) {
            const userPubkey = (session as any).user.name;
            
            // Find all client orders for the current user (as a client)
            let clientOrders = await prisma.clientOrder.findMany({
                where: {
                    pubkey: userPubkey, // Only include orders where the client is the current user
                },
                include: {
                    relay: {
                        include: {
                            owner: true
                        }
                    },
                },
            });

            // Find relays where the user's pubkey exists in AllowList
            const allowListRelays = await prisma.relay.findMany({
                where: {
                    allow_list: {
                        list_pubkeys: {
                            some: {
                                pubkey: userPubkey
                            }
                        }
                    },
                    OR: [{ status: "running" }, { status: "paused" }, { status: null}],
                },
                include: {
                    owner: true,
                    allow_list: {
                        include: {
                            list_pubkeys: true
                        }
                    }
                }
            });

            // Get unique relay IDs from both client orders and allow list entries
            const clientOrderRelayIds = clientOrders.map(order => order.relayId);
            const allowListRelayIds = allowListRelays.map(relay => relay.id);
            const relayIds = [...new Set([...clientOrderRelayIds, ...allowListRelayIds])];
            
            // Fetch those relays
            let relays = await prisma.relay.findMany({
                where: {
                    id: {
                        in: relayIds
                    },
                    OR: [{ status: "running" }, { status: "paused" }, { status: null}],
                },
                include: {
                    ClientOrder: {
                        where: {
                            pubkey: userPubkey // Only include orders for the current user
                        }
                    },
                    owner: true,
                    allow_list: {
                        include: {
                            list_pubkeys: true
                        }
                    }
                },
            });

            // Group client orders by relay

            let foundOrderForSpecificRelay = false

            const relayClientOrders: RelayClientOrderData[] = relays.map((relay) => {
                // Extract subdomain from rewritten for proper comparison
                if (rewritten) {
                    let subdomainToMatch = rewritten;
                    if (rewritten.includes('.')) {
                        subdomainToMatch = rewritten.split('.')[0];
                    }
                    
                    // Check if this relay matches the subdomain (case-insensitive)
                    if (relay.name.toLowerCase() === subdomainToMatch.toLowerCase()) {
                        foundOrderForSpecificRelay = true;
                    }
                }

                const paidOrders = relay.ClientOrder.filter(
                    (order) => order.paid === true
                );

                const unpaidOrders = relay.ClientOrder.filter(
                    (order) => order.expires_at &&
                    order.expires_at > new Date() &&
                    !order.paid
                );

                const totalAmount = paidOrders.reduce((sum, order) => {
                    return sum + order.amount;
                }, 0);

                // Check if user is in allow list
                const isInAllowList = relay.allow_list?.list_pubkeys?.some(
                    (entry) => entry.pubkey === userPubkey
                ) || false;

                return {
                    owner: relay.owner.pubkey,
                    relayName: relay.name,
                    relayStatus: relay.status,
                    relayId: relay.id,
                    relayDomain: relay.domain,
                    totalClientPayments: totalAmount,
                    orders: paidOrders,
                    unpaidOrders: unpaidOrders,
                    paymentAmount: relay.payment_amount || 0,
                    paymentPremiumAmount: relay.payment_premium_amount,
                    paymentRequired: relay.payment_required || false,
                    isInAllowList: isInAllowList,
                    banner_image: relay.banner_image,
                    profile_image: relay.profile_image
                } as RelayClientOrderData;
            });

            // If a specific relay was requested via subdomain but not found in user's orders
            if(rewritten && !foundOrderForSpecificRelay) {
                console.log("adding additional order for " + rewritten)
                // Extract the subdomain from the full domain
                let subdomain = rewritten;
                
                // If it contains dots, it's likely a full domain - extract the subdomain part
                if (rewritten.includes('.')) {
                    // Split by dots and take the first part as the subdomain
                    subdomain = rewritten.split('.')[0];
                }
                
                // Find the relay by name (case-insensitive) to get its details
                // Use startsWith instead of contains for better matching
                const requestedRelay = await prisma.relay.findFirst({
                    where: {
                        // Use case-insensitive search with startsWith
                        // We need to use a raw SQL query for case insensitive search
                        name: {
                            startsWith: subdomain
                        },
                        OR: [{ status: "running" }, { status: "paused" }, { status: null}],
                    },
                    include: {
                        // Include the User relation
                        owner: true
                    }
                });
                
                if (requestedRelay) {
                    // Get the owner information
                    const ownerPubkey = requestedRelay.owner?.pubkey || userPubkey || "";
                    
                    // Check if the user already has paid orders for this relay
                    const existingPaidOrders = await prisma.clientOrder.findMany({
                        where: {
                            relayId: requestedRelay.id,
                            pubkey: userPubkey,
                            paid: true
                        }
                    });
                    
                    // Only set needsInitialSubscription to true if the user has no paid orders
                    const needsInitial = existingPaidOrders.length === 0;
                    
                    // Add the relay to the list with no orders
                    relayClientOrders.push({
                        owner: ownerPubkey,
                        relayName: requestedRelay.name,
                        relayStatus: requestedRelay.status,
                        relayId: requestedRelay.id,
                        relayDomain: requestedRelay.domain,
                        totalClientPayments: existingPaidOrders.reduce((sum, order) => sum + order.amount, 0),
                        orders: existingPaidOrders,
                        unpaidOrders: [],
                        paymentAmount: requestedRelay.payment_amount || 0,
                        paymentPremiumAmount: requestedRelay.payment_premium_amount,
                        paymentRequired: requestedRelay.payment_required || false,
                        isInAllowList: false,
                        banner_image: requestedRelay.banner_image,
                        profile_image: requestedRelay.profile_image,
                        needsInitialSubscription: needsInitial // Only true if user has no paid orders
                    } as RelayClientOrderData);
                }
            }

            console.log(relayClientOrders)

            return (
                <div>
                    <ClientBalances 
                        IsAdmin={false} 
                        RelayClientOrders={relayClientOrders as any}
                        rewrittenSubdomain={rewritten}
                    />
                </div>
            );
        } 
        // Case 1b: Has pubkey only - show payment options for all relays with previous orders
        else if(pubkey) {
            // show option to pay with lightning, the payment amount
            // do not show balances, only payment options.
            
            // Find all client orders for this pubkey
            const clientOrders = await prisma.clientOrder.findMany({
                where: {
                    pubkey: pubkey
                },
                include: {
                    relay: {
                        include: {
                            owner: true,
                            allow_list: {
                                include: {
                                    list_pubkeys: true
                                }
                            }
                        }
                    }
                }
            });
            
            // Get unique relays from the orders
            let uniqueRelays = Array.from(
                new Map(clientOrders.map(order => [order.relayId, order.relay])).values()
            );
            
            // Filter by subdomain if rewritten subdomain is provided
            if (rewritten) {
                const subdomainName = rewritten.split('.')[0];
                const matchingRelays = uniqueRelays.filter((relay: any) => 
                    relay.name.toLowerCase() === subdomainName.toLowerCase()
                );
                
                // Only filter if we found matching relays, otherwise show all
                if (matchingRelays.length > 0) {
                    uniqueRelays = matchingRelays;
                }
            }
            
            // If we have a rewritten subdomain but no matching relays in orders,
            // try to find the relay directly and show the initial subscription form
            if (uniqueRelays.length === 0 && rewritten) {
                const subdomainName = rewritten.split('.')[0];
                
                // Find the relay by name (case-insensitive)
                const requestedRelay = await prisma.relay.findFirst({
                    where: {
                        name: { startsWith: subdomainName } as any, // Type assertion for Prisma filter
                        OR: [{status: "running"}, {status: "paused"}, {status: null}]
                    },
                    include: { owner: true }
                });
                
                if (requestedRelay) {
                    // Check if the user already has paid orders for this relay
                    const existingPaidOrders = await prisma.clientOrder.findMany({
                        where: {
                            relayId: requestedRelay.id,
                            pubkey: pubkey,
                            paid: true
                        }
                    });
                    
                    // Only set needsInitialSubscription to true if the user has no paid orders
                    const needsInitial = existingPaidOrders.length === 0;
                    
                    // Create a relay client order with the needsInitialSubscription flag
                    const relayClientOrders = [{
                        owner: (requestedRelay as any).owner?.pubkey || "",
                        relayName: requestedRelay.name,
                        relayStatus: requestedRelay.status,
                        relayId: requestedRelay.id,
                        relayDomain: requestedRelay.domain,
                        totalClientPayments: existingPaidOrders.reduce((sum, order) => sum + order.amount, 0),
                        orders: existingPaidOrders,
                        unpaidOrders: [],
                        paymentAmount: requestedRelay.payment_amount || 0,
                        paymentPremiumAmount: requestedRelay.payment_premium_amount,
                        paymentRequired: requestedRelay.payment_required || false,
                        isInAllowList: false,
                        banner_image: requestedRelay.banner_image,
                        profile_image: requestedRelay.profile_image,
                        needsInitialSubscription: needsInitial // Only true if user has no paid orders
                    }];
                    
                    return (
                        <div>
                            <ClientBalances 
                                IsAdmin={false} 
                                RelayClientOrders={relayClientOrders as any}
                                rewrittenSubdomain={rewritten}
                            />
                        </div>
                    );
                }
            }
            
            // If no relays found at all, show the no relays message
            if (uniqueRelays.length === 0) {
                return (
                    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                        <div className="container mx-auto px-4 py-6">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">No relays found for this pubkey</h1>
                            </div>
                        </div>
                    </div>
                );
            }
            
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                    <div className="container mx-auto px-4 py-6">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Client Subscription Payment</h1>
                                        <p className="text-slate-600 dark:text-slate-400">Pay for client access to relays with Lightning</p>
                                    </div>
                                </div>
                                <ShowSmallSession pubkey={pubkey} />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                💡 Hint: You can pay here without logging in. If you do login, you will see additional information about your memberships.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {uniqueRelays.map((relay: any) => {
                                // Check if banner_image exists and is not empty
                                const bannerImage = relay.banner_image && relay.banner_image.trim() !== '' ? 
                                    relay.banner_image : null;
                                
                                // Use profile image if available, otherwise use banner image for the circular display
                                const profileImage = relay.profile_image && relay.profile_image.trim() !== '' ?
                                    relay.profile_image : (bannerImage || '/green-check.png');

                                return (
                                    <div
                                        key={relay.id + "payment"}
                                        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow duration-300"
                                    >
                                        {/* Banner Section */}
                                        <div className="relative h-32 sm:h-40 overflow-hidden">
                                            {/* Banner image */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 dark:from-blue-600/30 dark:to-purple-700/30">
                                                {bannerImage && (
                                                    <img 
                                                        src={bannerImage} 
                                                        alt={`${relay.name} banner`}
                                                        className="w-full h-full object-cover opacity-60"
                                                    />
                                                )}
                                            </div>
                                            
                                            {/* Overlay content */}
                                            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-900/90 to-transparent">
                                                <div className="flex items-end gap-4">
                                                    {/* Profile image */}
                                                    <div className="w-16 h-16 border-4 border-white dark:border-slate-800 rounded-full overflow-hidden bg-white dark:bg-slate-800 flex-shrink-0">
                                                        <img 
                                                            src={profileImage} 
                                                            alt={`${relay.name} profile`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    
                                                    {/* Relay info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h2 className="text-xl font-bold text-white truncate">{relay.name}</h2>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="p-6">
                                            <div className="mb-4">
                                                <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                                    Subscription Options
                                                </p>
                                            </div>
                                            <SubscriptionHandler relay={relay as any} pubkey={pubkey} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }
        
        // Case 1c: Not logged in but might have a subdomain from rewritten URL
        if (rewritten) {
            // Extract subdomain from the rewritten URL
            let subdomain = rewritten;
            if (rewritten.includes('.')) {
                subdomain = rewritten.split('.')[0];
            }
            
            // Find the relay by name (case-insensitive)
            const requestedRelay = await prisma.relay.findFirst({
                where: {
                    name: { startsWith: subdomain } as any, // Type assertion for Prisma filter
                    OR: [{status: "running"}, {status: "paused"}, {status: null}]
                },
                include: { owner: true }
            });
            
            if (requestedRelay) {
                // Check if the user already has paid orders for this relay
                const existingPaidOrders = await prisma.clientOrder.findMany({
                    where: {
                        relayId: requestedRelay.id,
                        pubkey: pubkey,
                        paid: true
                    }
                });
                
                // Only set needsInitialSubscription to true if the user has no paid orders
                const needsInitial = existingPaidOrders.length === 0;
                
                // Create a relay client order with the needsInitialSubscription flag
                // Use the pubkey from the URL parameter if available
                const relayClientOrders = [{
                    relayName: requestedRelay.name,
                    relayStatus: requestedRelay.status,
                    relayId: requestedRelay.id,
                    relayDomain: requestedRelay.domain,
                    paymentAmount: requestedRelay.payment_amount || 0,
                    paymentPremiumAmount: requestedRelay.payment_premium_amount,
                    paymentRequired: requestedRelay.payment_required || false,
                    isInAllowList: false,
                    banner_image: requestedRelay.banner_image,
                    profile_image: requestedRelay.profile_image,
                    needsInitialSubscription: needsInitial // Only true if user has no paid orders
                }];
                
                return (
                    <div>
                        <ClientBalances 
                            IsAdmin={false} 
                            RelayClientOrders={relayClientOrders as any}
                            rewrittenSubdomain={rewritten}
                        />
                    </div>
                );
            }
        }
        
        // If no subdomain or relay not found
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="container mx-auto px-4 py-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Please login to view your subscriptions</h1>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">Or visit a specific relay subdomain to subscribe</p>
                    </div>
                </div>
            </div>
        );
    }

    let usePubkey = "";
    if (pubkey) {
        usePubkey = pubkey;
    }

    const o = await prisma.clientOrder.findFirst({
        where: { id: order_id },
        include: {
            relay: true,
        },
    });

    if (o == null) {
        console.log("client order not found");
        return;
    }

    const paymentsEnabled = process.env.PAYMENTS_ENABLED == "true";

    if (!paymentsEnabled) {
        return (
            <div className="flow-root">
                <h1>payments are disabled</h1>
            </div>
        );
    }

    // if the order is paid, show the success page
    if (o.paid) {
        return (
            <div className="flow-root">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:text-center">
                        <h2 className="text-base font-semibold leading-7 text-indigo-600">
                            Client Payment Complete
                        </h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                            Thanks for your payment!
                        </p>
                        <p className="mt-6 text-lg leading-8">
                            Your payment has been received and your client access to the relay is confirmed.
                        </p>
                    </div>
                    <PaymentSuccess
                        signed_in={session ? true : false}
                        relay_id={o.relayId}
                        payment_hash={o.payment_hash}
                        payment_request={o.lnurl}
                        order_id={o.id}
                    />
                </div>
            </div>
        );
    }

    // if the order is not paid, show the invoice
    return (
        <div className="flow-root">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-base font-semibold leading-7 text-indigo-600">
                        Client Subscription Payment
                    </h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                        Pay for client access to {o.relay.name}
                    </p>
                    <p className="mt-6 text-lg leading-8">
                        Scan the QR code below or click the button to pay with your Lightning wallet.
                    </p>
                </div>
                <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <PaymentStatus
                            amount={o.amount}
                            payment_hash={o.payment_hash}
                            payment_request={o.lnurl}
                        />
                    </div>
                </div>
                <PaymentSuccess
                        signed_in={session ? true : false}
                        relay_id={o.relayId}
                        payment_hash={o.payment_hash}
                        payment_request={o.lnurl}
                        order_id={o.id}
                    />
            </div>
        </div>
    );
}
