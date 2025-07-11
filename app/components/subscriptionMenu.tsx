"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";

interface SubscriptionMenuProps {
  relay: any;
  renewSubscription: (relay: any, amount?: string) => void;
  createNewSubscription?: (relay: any, planType: string, customAmount?: string) => void;
  isFirstTimeSubscription?: boolean;
}

export default function SubscriptionMenu({ 
  relay, 
  renewSubscription, 
  createNewSubscription,
  isFirstTimeSubscription = false 
}: SubscriptionMenuProps) {
  const { data: session } = useSession();
  const [clientAmount, setClientAmount] = useState("");
  
  // Function to get user's most recent plan
  const getUserMostRecentPlan = (relay: any) => {
    if (!relay.orders || relay.orders.length === 0) return 'standard';
    
    // Sort orders by paid_at date (most recent first)
    const sortedOrders = [...relay.orders].sort((a, b) => {
      if (!a.paid_at) return 1;
      if (!b.paid_at) return -1;
      return new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime();
    });
    
    // Return the plan type of the most recent order
    return sortedOrders[0].order_type || 'standard';
  };

  // Handle subscription action based on whether it's first time or renewal
  const handleSubscription = (planType: string, amount?: string) => {
    if (isFirstTimeSubscription && createNewSubscription) {
      createNewSubscription(relay, planType, amount);
    } else {
      renewSubscription(relay, amount);
    }
  };

  const currentPlan = session ? getUserMostRecentPlan(relay) : 'standard';
  const title = isFirstTimeSubscription ? "Subscribe to Relay" : (session ? "Renew Subscription" : "Subscription Options");
  
  return (
    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600 mb-6">
      <details className="group" open={!session || isFirstTimeSubscription}>
        <summary className="flex justify-between items-center cursor-pointer text-lg font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
          {title}
          <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="mt-4">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
              Choose Your Plan
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <button
                className={`btn flex-col h-auto py-4 relative ${
                  currentPlan === 'standard' 
                    ? 'btn-primary' 
                    : 'btn-outline btn-primary'
                }`}
                onClick={() => handleSubscription('standard', relay.paymentAmount?.toString())}
              >
                {session && currentPlan === 'standard' && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Current
                  </div>
                )}
                <div className="font-bold">Standard Plan</div>
                <div className="text-sm opacity-70">Basic relay access</div>
                <div className="font-bold text-lg">{relay.paymentAmount || relay.payment_amount} sats/month</div>
              </button>
              <button
                className={`btn flex-col h-auto py-4 relative ${
                  currentPlan === 'premium' 
                    ? 'btn-secondary' 
                    : 'btn-outline btn-secondary'
                }`}
                onClick={() => handleSubscription('premium', relay.paymentPremiumAmount?.toString() || relay.payment_premium_amount?.toString())}
              >
                {session && currentPlan === 'premium' && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Current
                  </div>
                )}
                <div className="font-bold">Premium Plan</div>
                <div className="text-sm opacity-70">Enhanced features & Benefits</div>
                <div className="font-bold text-lg">{relay.paymentPremiumAmount || relay.payment_premium_amount} sats/month</div>
              </button>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Or enter custom amount:</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder="Custom amount in sats"
                  onChange={(e) => setClientAmount(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleSubscription('custom', clientAmount)}
                >
                  Pay Custom Amount
                </button>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
