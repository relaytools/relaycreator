"use client";
import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { nip19 } from "nostr-tools";
import NDK, { NDKEvent, NDKNip07Signer, NDKPublishError, NDKRelay, NDKRelayAuthPolicies, NDKAuthPolicy, NDKRelaySet, NDKSubscription } from "@nostr-dev-kit/ndk";
import { getRelayListForUser, getRelayListForUsers } from "@nostr-dev-kit/ndk";

function copyToClipboard(e: any, bolt: string) {
    e.preventDefault();
    navigator.clipboard.writeText(bolt).then(() => {
        console.log("Copied to clipboard!");
    });
}

export async function alby(lnurl: string) {
    // const lnurl = (provided by your application backend)
    try {
        await (window as any).webln.enable();
        const result = await (window as any).webln.sendPayment(lnurl); // promise resolves once the LNURL process is finished
    } catch (error) {
        console.log("something went wrong with webln: " + error);
    }
}

const ndk = new NDK({
    autoConnectUserRelays: false,
    enableOutboxModel: false,
});

const ndkPool = ndk.pool;

export default function AdminInvoices(props: any) {
    const router = useRouter();
    const [showOrdersState, setShowOrdersState] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [balanceDueFilter, setBalanceDueFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("balance");
    const [sortOrder, setSortOrder] = useState("desc");
    const [showDetails, setShowDetails] = useState<string[]>([]);
    
    // Debug: Log balance data on component mount
    console.log('AdminInvoices - Total relays:', props.RelayBalances?.length);
    console.log('AdminInvoices - Sample balance data:', props.RelayBalances?.slice(0, 3));
    
    // Debug: Check for negative balances
    const negativeBalances = props.RelayBalances?.filter((relay: any) => relay.balance < 0) || [];
    console.log('AdminInvoices - Relays with negative balances:', negativeBalances.length);
    console.log('AdminInvoices - Negative balance examples:', negativeBalances.slice(0, 3));

    let useAmount = "";

    // Helper function to check if balance is in range
    function isBalanceInRange(balance: number, range: string): boolean {
        switch (range) {
            case "all":
                return true;
            case "positive":
                return balance > 0;
            case "good":
                return balance >= -50 && balance <= 0;
            case "warning":
                return balance >= -200 && balance < -50;
            case "30d overdue":
                return balance >= -700 && balance < -200;
            case "60d+ overdue":
                return balance >= -1400 && balance < -700;
            case "critical":
                return balance < -1400;
            default:
                return true;
        }
    }

    // Helper function to get balance status
    function getBalanceStatus(balance: number) {
        if (balance > 0) return { status: 'positive', label: 'Credit', color: 'text-success' };
        if (balance >= -50) return { status: 'good', label: 'Good', color: 'text-success' };
        if (balance >= -200) return { status: 'warning', label: 'Warning', color: 'text-warning' };
        if (balance >= -700) return { status: '30d overdue', label: '30d Overdue', color: 'text-error' };
        if (balance >= -1400) return { status: '60d+ overdue', label: '60d+ Overdue', color: 'text-error' };
        return { status: 'critical', label: 'Critical', color: 'text-error' };
    }

    // Helper function to get current plan info
    function getCurrentPlan(relay: any) {
        // Check if relay has plan changes
        if (relay.relayPlanChanges && relay.relayPlanChanges.length > 0) {
            const currentPlan = relay.relayPlanChanges.find((pc: any) => !pc.ended_at);
            if (currentPlan) {
                return {
                    type: currentPlan.plan_type,
                    amount: currentPlan.amount_paid,
                    startedAt: new Date(currentPlan.started_at)
                };
            }
        }
        
        // Fallback to most recent order (by date, like client invoices)
        if (relay.orders && relay.orders.length > 0) {
            // Sort orders by paid_at date (most recent first)
            const sortedOrders = [...relay.orders].sort((a: any, b: any) => {
                if (!a.paid_at) return 1;
                if (!b.paid_at) return -1;
                return new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime();
            });
            
            const mostRecentOrder = sortedOrders[0];
            const standardAmount = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || "21");
            const premiumAmount = parseInt(process.env.NEXT_PUBLIC_INVOICE_PREMIUM_AMOUNT || "2100");
            
            // Use order_type if available, otherwise determine from amount
            const planType = mostRecentOrder.order_type || 
                (mostRecentOrder.amount >= premiumAmount ? 'premium' : 'standard');
            
            // Use current environment variable pricing instead of historical amount
            const currentAmount = planType === 'premium' ? premiumAmount : standardAmount;
            
            return {
                type: planType,
                amount: currentAmount,
                startedAt: mostRecentOrder.paid_at ? new Date(mostRecentOrder.paid_at) : null
            };
        }
        
        // Default fallback - use current environment variable pricing
        const standardAmount = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || "21");
        return { type: 'standard', amount: standardAmount, startedAt: null };
    }

    function getTopUpInvoice(b: any) {
        const amount = useAmount || Math.abs(b.balance).toString();
        router.push(`/invoices?relayname=${b.relayName}&pubkey=${b.owner}&amount=${amount}`);
    }

    function showOrdersFor(b: any) {
        return showOrdersState.includes(b);
    }

    function setShowOrders(relayId: string) {
        if (showOrdersState.includes(relayId)) {
            setShowOrdersState(prev => prev.filter(id => id !== relayId));
        } else {
            setShowOrdersState(prev => [...prev, relayId]);
        }
    }

    const handleUserNotification = async(relayBalance: any, notifyType: string) => {
        // handle user notification
        const nip07signer = new NDKNip07Signer();
        const activeUser = await nip07signer.blockUntilReady();
        ndk.signer = nip07signer;
        ndk.addExplicitRelay("wss://purplepag.es");
        ndk.addExplicitRelay("wss://nostr21.com");
        ndk.addExplicitRelay("wss://relay.damus.io");
        ndk.addExplicitRelay("wss://nos.lol");
        ndk.addExplicitRelay("wss://relay.nostr.band");
        const specialRelay = ndk.addExplicitRelay("wss://" + relayBalance.relayName + "." + relayBalance.relayDomain);
        const recipient = ndk.getUser({pubkey: relayBalance.owner});
        console.log("getting recipient profile")
        await recipient.fetchProfile();
        console.log("got recipient profile")
        console.log("getting relay list for recipient", recipient)
        let relayList = await getRelayListForUser(recipient.pubkey, ndk);
        const recipientProfile = recipient.profile;
        const newEvent = new NDKEvent(ndk);
        newEvent.kind = 4;
        let recipientName = "";
        if (recipientProfile && recipientProfile.name) {
            recipientName = recipientProfile.name;
        }

        if(notifyType == "pause") {
            newEvent.content = "Hello " + "nostr:" + nip19.npubEncode(relayBalance.owner) + " Your relay has been paused for non-payment.  Please visit https://relay.tools/invoices to top up your balance and resume service.  Your relay data is still available, but may be deleted if left paused for too long.  Contact me for more details.";
        } else if(notifyType == "notify" ) {
            newEvent.content = "Hello " + "nostr:" + nip19.npubEncode(relayBalance.owner) + " Please visit https://relay.tools/invoices to top up your balance.";
        }

        newEvent.tag(recipient, "mention");

        await newEvent.encrypt();

        ndk.on("event:publish-failed", (event: NDKEvent, error: NDKPublishError, relays: any) => {
            console.log("event publish failed", event, error);
            console.log("event publish failed to send to all relays:", relays);
        });

        //relayList.relaySet.addRelay(new NDKRelay("wss://" + relayBalance.relayName + "." + relayBalance.relayDomain));
        const newSet = relayList.relaySet;
        newSet.addRelay(specialRelay);
        const howMany = newSet.size;
        const publishedTo = await newEvent.publish(newSet, 10000, howMany);
        console.log("event was published to: ", publishedTo);
    }

    const handlePauseRelay = async(relayBalance: any) => {
        // pause relay call to api
        const response = await fetch(`/api/relay/${relayBalance.relayId}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "status": "paused" })
        })
        await handleUserNotification(relayBalance, "pause");
    }

    const handleNotifyUser = async(b: any) => {
        handleUserNotification(b, "notify");
    }

    // Enhanced sorting and filtering logic
    const sortedRelays = useMemo(() => {
        return props.RelayBalances
            .filter((relayBalance: any) => {
                // Status filter
                if (statusFilter !== "all" && relayBalance.relayStatus !== statusFilter) {
                    return false;
                }
                
                // Balance filter
                if (!isBalanceInRange(relayBalance.balance, balanceDueFilter)) {
                    return false;
                }
                
                // Search filter
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const matchesName = relayBalance.relayName.toLowerCase().includes(searchLower);
                    const matchesOwner = relayBalance.owner.toLowerCase().includes(searchLower);
                    const matchesNpub = nip19.npubEncode(relayBalance.owner).toLowerCase().includes(searchLower);
                    
                    if (!matchesName && !matchesOwner && !matchesNpub) {
                        return false;
                    }
                }
                
                return true;
            })
            .sort((a: any, b: any) => {
                let aValue, bValue;
                
                switch (sortBy) {
                    case "balance":
                        aValue = a.balance;
                        bValue = b.balance;
                        break;
                    case "relayName":
                        aValue = a.relayName.toLowerCase();
                        bValue = b.relayName.toLowerCase();
                        break;
                    case "owner":
                        aValue = a.owner.toLowerCase();
                        bValue = b.owner.toLowerCase();
                        break;
                    case "status":
                        aValue = a.relayStatus;
                        bValue = b.relayStatus;
                        break;
                    case "clientRevenue":
                        aValue = a.clientPayments;
                        bValue = b.clientPayments;
                        break;
                    case "totalRevenue":
                        aValue = a.orders.reduce((sum: number, order: any) => sum + order.amount, 0) + a.clientPayments;
                        bValue = b.orders.reduce((sum: number, order: any) => sum + order.amount, 0) + b.clientPayments;
                        break;
                    default:
                        aValue = a.balance;
                        bValue = b.balance;
                }
                
                if (sortOrder === "asc") {
                    return aValue > bValue ? 1 : -1;
                } else {
                    return aValue < bValue ? 1 : -1;
                }
            });
    }, [props.RelayBalances, statusFilter, balanceDueFilter, searchTerm, sortBy, sortOrder]);

    function amountPrecision(amount: number) {
        return Math.round(amount * 100) / 100;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">SUPER ADMIN - Relay Management</h1>
                <div className="stats shadow">
                    <div className="stat">
                        <div className="stat-title">Total Relays</div>
                        <div className="stat-value text-primary">{props.RelayBalances.length}</div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Filtered Results</div>
                        <div className="stat-value text-secondary">{sortedRelays.length}</div>
                    </div>
                </div>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <input 
                    type="text"
                    placeholder="Search relays, owners..."
                    className="input input-bordered w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                <select 
                    className="select select-bordered w-full"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Statuses</option>
                    <option value="running">Running</option>
                    <option value="paused">Paused</option>
                </select>
                
                <select 
                    className="select select-bordered w-full"
                    value={balanceDueFilter}
                    onChange={(e) => setBalanceDueFilter(e.target.value)}
                >
                    <option value="all">All Balances</option>
                    <option value="positive">Positive Balance</option>
                    <option value="good">Good Standing</option>
                    <option value="warning">Warning</option>
                    <option value="30d overdue">30d Overdue</option>
                    <option value="60d+ overdue">60d+ Overdue</option>
                    <option value="critical">Critical</option>
                </select>
                
                <div className="flex gap-2">
                    <select 
                        className="select select-bordered flex-1"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="balance">Sort by Balance</option>
                        <option value="relayName">Sort by Name</option>
                        <option value="owner">Sort by Owner</option>
                        <option value="status">Sort by Status</option>
                        <option value="clientRevenue">Sort by Client Revenue</option>
                        <option value="totalRevenue">Sort by Total Revenue</option>
                    </select>
                    <button 
                        className="btn btn-outline"
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    >
                        {sortOrder === "asc" ? "↑" : "↓"}
                    </button>
                </div>
            </div>

            <div className="mt-4">
                {sortedRelays.map((b: any) => {
                    const balanceStatus = getBalanceStatus(b.balance);
                    const currentPlan = getCurrentPlan(b);
                    const totalRevenue = b.orders.reduce((sum: number, order: any) => sum + order.amount, 0) + b.clientPayments;
                    const isExpanded = showDetails.includes(b.relayId);
                    
                    return (
                        <div
                            key={b.relayId + "rowkey"}
                            className="card bg-base-100 shadow-lg mb-4 border"
                        >
                            <div className="card-body">
                                {/* Header Row */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h2 className="card-title text-xl">
                                            {b.relayName}
                                            <div className={`badge ${b.relayStatus === 'running' ? 'badge-success' : 'badge-error'}`}>
                                                {b.relayStatus}
                                            </div>
                                            <div className={`badge ${currentPlan.type === 'premium' ? 'badge-secondary' : 'badge-primary'}`}>
                                                {currentPlan.type}
                                            </div>
                                        </h2>
                                        <p className="text-sm opacity-70">
                                            ID: <a href={process.env.NEXT_PUBLIC_ROOT_DOMAIN + "/curator/?relay_id=" + b.relayId} className="link link-primary">{b.relayId}</a>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-2xl font-bold ${balanceStatus.color}`}>
                                            {amountPrecision(b.balance)} sats
                                        </div>
                                        <div className={`badge ${balanceStatus.status === 'positive' ? 'badge-success' : balanceStatus.status === 'good' ? 'badge-success' : balanceStatus.status === 'warning' ? 'badge-warning' : 'badge-error'}`}>
                                            {balanceStatus.label}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Key Metrics Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="stat bg-base-200 rounded-lg p-3">
                                        <div className="stat-title text-xs">Client Revenue</div>
                                        <div className="stat-value text-sm text-success">{b.clientPayments} sats</div>
                                    </div>
                                    <div className="stat bg-base-200 rounded-lg p-3">
                                        <div className="stat-title text-xs">Total Revenue</div>
                                        <div className="stat-value text-sm text-primary">{totalRevenue} sats</div>
                                    </div>
                                    <div className="stat bg-base-200 rounded-lg p-3">
                                        <div className="stat-title text-xs">Plan Cost</div>
                                        <div className="stat-value text-sm">{currentPlan.amount} sats/mo</div>
                                    </div>
                                    <div className="stat bg-base-200 rounded-lg p-3">
                                        <div className="stat-title text-xs">Orders</div>
                                        <div className="stat-value text-sm">{b.orders.length} paid / {b.unpaidOrders.length} pending</div>
                                    </div>
                                </div>
                                
                                {/* Owner Info */}
                                <div className="flex items-center gap-4 mb-4 p-3 bg-base-200 rounded-lg">
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold">Owner</div>
                                        <a href={"https://njump.me/" + nip19.npubEncode(b.owner)} className="link link-secondary text-xs">
                                            {nip19.npubEncode(b.owner)}
                                        </a>
                                    </div>
                                    {currentPlan.startedAt && (
                                        <div>
                                            <div className="text-sm font-semibold">Plan Started</div>
                                            <div className="text-xs opacity-70">{currentPlan.startedAt.toLocaleDateString()}</div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <button
                                        className={`btn btn-sm ${isExpanded ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => {
                                            if (isExpanded) {
                                                setShowDetails(prev => prev.filter(id => id !== b.relayId));
                                            } else {
                                                setShowDetails(prev => [...prev, b.relayId]);
                                            }
                                        }}
                                    >
                                        {isExpanded ? 'Hide Details' : 'Show Details'}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-info"
                                        onClick={() => setShowOrders(b.relayId)}
                                    >
                                        {showOrdersFor(b.relayId) ? 'Hide Orders' : 'Show Orders'}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-warning"
                                        onClick={(e) => handleNotifyUser(b)}
                                    >
                                        Send Balance Notify
                                    </button>
                                    <button
                                        className="btn btn-sm btn-error"
                                        onClick={(e) => handlePauseRelay(b)}
                                    >
                                        Pause Relay
                                    </button>
                                </div>
                                
                                {/* Top-up Section */}
                                <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg mb-4">
                                    <input
                                        type="text"
                                        name="satsamount"
                                        className="input input-bordered input-sm flex-1"
                                        placeholder={Math.abs(amountPrecision(b.balance)).toString()}
                                        onChange={event => {useAmount = event.target.value}}
                                    />
                                    <span className="text-sm">sats</span>
                                    <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => getTopUpInvoice(b)}
                                    >
                                        Create Top-up Invoice
                                    </button>
                                </div>
                                
                                {/* Expanded Details Section */}
                                {isExpanded && (
                                    <div className="bg-base-300 rounded-lg p-4 mb-4">
                                        <h3 className="font-semibold mb-3">Additional Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-sm font-semibold">Relay Domain</div>
                                                <div className="text-sm opacity-70">{b.relayDomain || 'Not set'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">Monthly Cost</div>
                                                <div className="text-sm opacity-70">{currentPlan.amount} sats/month</div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">Plan Type</div>
                                                <div className="text-sm opacity-70">{currentPlan.type} ({currentPlan.amount} sats/month)</div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">Balance Status</div>
                                                <div className={`text-sm ${balanceStatus.color}`}>{balanceStatus.label}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Orders Section */}
                                {showOrdersFor(b.relayId) && (
                                    <div className="bg-base-300 rounded-lg p-4">
                                        <h3 className="font-semibold mb-3">Order History</h3>
                                        
                                        {/* Unpaid Orders */}
                                        {b.unpaidOrders.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="font-medium text-warning mb-2">Pending Orders ({b.unpaidOrders.length})</h4>
                                                {b.unpaidOrders.map((order: any) => (
                                                    <div key={order.id + "colkey"} className="card bg-base-100 shadow-sm mb-2">
                                                        <div className="card-body p-3">
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <div className="font-semibold">{order.amount} sats</div>
                                                                    <div className="text-sm opacity-70">
                                                                        Expires: {order.expires_at ? new Date(order.expires_at).toLocaleString() : "No expiration"}
                                                                    </div>
                                                                </div>
                                                                <a
                                                                    className="btn btn-sm btn-primary"
                                                                    href={`/invoices?relayname=${b.relayName}&pubkey=${b.owner}&order_id=${order.id}`}
                                                                >
                                                                    View Invoice
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Paid Orders */}
                                        {b.orders.length > 0 && (
                                            <div>
                                                <h4 className="font-medium text-success mb-2">Paid Orders ({b.orders.length})</h4>
                                                {b.orders.map((order: any) => (
                                                    <div key={order.id + "colkey"} className="card bg-base-100 shadow-sm mb-2">
                                                        <div className="card-body p-3">
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <div className="font-semibold">{amountPrecision(order.amount)} sats</div>
                                                                    <div className="text-sm opacity-70">
                                                                        Paid: {order.paid_at ? new Date(order.paid_at).toLocaleString() : "Unknown"}
                                                                    </div>
                                                                </div>
                                                                <div className="badge badge-success">Paid</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
