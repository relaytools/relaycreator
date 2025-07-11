"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import SubscriptionMenu from "../components/subscriptionMenu";

interface SubscriptionHandlerProps {
  relay: any;
  pubkey: string;
}

export default function SubscriptionHandler({ relay, pubkey }: SubscriptionHandlerProps) {
  const router = useRouter();
  const [clientAmount, setClientAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Function to handle subscription creation
  const createNewSubscription = async (relay: any, planType: string, customAmount?: string) => {
    setIsProcessing(true);
    let useAmount = relay.payment_amount || 0;
    
    if (planType === 'premium') {
      useAmount = relay.payment_premium_amount || 2100;
    } else if (planType === 'custom' && customAmount) {
      useAmount = parseInt(customAmount, 10);
      if (isNaN(useAmount) || useAmount <= 0) {
        alert("Please enter a valid amount");
        setIsProcessing(false);
        return;
      }
    }

    try {
      // First create a client order
      const response = await fetch(
        `/api/clientorders?relayid=${relay.id}&pubkey=${pubkey}&sats=${useAmount}&order_type=${planType}`
      );
      const responseJson = await response.json();
      
      if (response.ok) {
        // Then redirect to the payment page with the order_id
        router.push(
          `/clientinvoices?relayid=${relay.id}&order_id=${responseJson.clientOrder.id}&pubkey=${pubkey}&sats=${useAmount}`
        );
      } else {
        alert("Error creating subscription: " + (responseJson.error || "Unknown error"));
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      alert("Error creating subscription. Please try again.");
      setIsProcessing(false);
    }
  };
  
  // This function matches the signature expected by SubscriptionMenu
  const handleRenewSubscription = (relay: any, amount?: string) => {
    if (amount) {
      createNewSubscription(relay, 'custom', amount);
    } else {
      createNewSubscription(relay, 'standard');
    }
  };

  return (
    <div className="relative">
      {isProcessing && (
        <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 flex items-center justify-center z-10 rounded-lg">
          <div className="flex flex-col items-center">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="mt-2 text-slate-700 dark:text-slate-300">creating invoice...</p>
          </div>
        </div>
      )}
      <SubscriptionMenu 
        relay={relay} 
        renewSubscription={handleRenewSubscription}
        isFirstTimeSubscription={true}
      />
    </div>
  );
}
