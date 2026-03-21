"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";

interface SubscriptionMenuProps {
  relay: any;
  renewSubscription: (relay: any, amount?: string) => void;
  createNewSubscription?: (relay: any, planType: 'standard' | 'premium' | 'custom', customAmount?: string) => void;
  isFirstTimeSubscription?: boolean;
  isSubdomainView?: boolean;
}

export default function SubscriptionMenu({ 
  relay, 
  renewSubscription, 
  createNewSubscription,
  isFirstTimeSubscription = false,
  isSubdomainView = false
}: SubscriptionMenuProps) {
  const { data: session } = useSession();
  const [clientAmount, setClientAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  
  // Function to get user's most recent plan
  const getUserMostRecentPlan = (relay: any) => {
    if (!relay.orders || relay.orders.length === 0) return 'standard';
    const sortedOrders = [...relay.orders].sort((a, b) => {
      if (!a.paid_at) return 1;
      if (!b.paid_at) return -1;
      return new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime();
    });
    return sortedOrders[0].order_type || 'standard';
  };

  const handleSubscription = (planType: 'standard' | 'premium' | 'custom', amount?: string) => {
    if (isFirstTimeSubscription && createNewSubscription) {
      createNewSubscription(relay, planType, amount);
    } else {
      renewSubscription(relay, amount);
    }
  };

  const currentPlan = session ? getUserMostRecentPlan(relay) : 'standard';
  const title = isFirstTimeSubscription ? "Subscribe to Relay" : (session ? "Renew Subscription" : "Subscription Options");

  const standardAmount = relay.paymentAmount || relay.payment_amount;
  const premiumAmount = relay.paymentPremiumAmount || relay.payment_premium_amount;

  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 border border-slate-200 dark:border-slate-600 mb-6">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Pay with Lightning ⚡ — click a plan below to generate an invoice
      </p>

      {/* Plan cards — primary actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">

        {/* Standard Plan */}
        <button
          onClick={() => handleSubscription('standard', standardAmount?.toString())}
          className={`group relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all duration-150 hover:shadow-md active:scale-[0.98] cursor-pointer
            ${currentPlan === 'standard'
              ? 'border-primary bg-primary/10 dark:bg-primary/20'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-primary/60'
            }`}
        >
          {/* Recommended badge */}
          {!session && (
            <span className="absolute -top-2.5 left-3 bg-primary text-primary-content text-xs font-semibold px-2 py-0.5 rounded-full">
              Recommended
            </span>
          )}
          {session && currentPlan === 'standard' && (
            <span className="absolute -top-2.5 left-3 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Current plan
            </span>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">Standard</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Basic relay access</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{standardAmount}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">sats / month</span>
          </div>
          <div className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-content group-hover:bg-primary/90 transition-colors">
            <span>⚡</span> Pay {standardAmount} sats
          </div>
        </button>

        {/* Premium Plan */}
        <button
          onClick={() => handleSubscription('premium', premiumAmount?.toString())}
          className={`group relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all duration-150 hover:shadow-md active:scale-[0.98] cursor-pointer
            ${currentPlan === 'premium'
              ? 'border-secondary bg-secondary/10 dark:bg-secondary/20'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-secondary/60'
            }`}
        >
          {session && currentPlan === 'premium' && (
            <span className="absolute -top-2.5 left-3 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Current plan
            </span>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">Premium</span>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">★ Pro</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Enhanced features &amp; benefits</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{premiumAmount}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">sats / month</span>
          </div>
          <div className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-secondary py-2 text-sm font-semibold text-secondary-content group-hover:bg-secondary/90 transition-colors">
            <span>⚡</span> Pay {premiumAmount} sats
          </div>
        </button>

      </div>

      {/* Custom amount — clearly secondary */}
      <div className="mt-2">
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          onClick={() => setShowCustom(v => !v)}
        >
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${showCustom ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Custom amount
        </button>

        {showCustom && (
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min="1"
              className="input input-bordered input-sm flex-1"
              placeholder="Amount in sats"
              value={clientAmount}
              onChange={(e) => setClientAmount(e.target.value)}
            />
            <button
              className="btn btn-sm btn-outline btn-primary"
              onClick={() => handleSubscription('custom', clientAmount)}
              disabled={!clientAmount || parseInt(clientAmount) <= 0}
            >
              ⚡ Pay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
