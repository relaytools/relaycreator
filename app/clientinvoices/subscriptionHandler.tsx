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

  // Function to handle subscription creation
  const createNewSubscription = async (relay: any, planType: string, customAmount?: string) => {
    let amount = relay.payment_amount || 0;
    
    if (planType === 'premium') {
      amount = relay.payment_premium_amount || 2100;
    } else if (planType === 'custom' && customAmount) {
      amount = parseInt(customAmount, 10);
      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        return;
      }
    }

    // Redirect to the payment page with the appropriate parameters
    router.push(`/clientinvoices?relayid=${relay.id}&pubkey=${pubkey}&amount=${amount}&order_type=${planType}`);
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
    <SubscriptionMenu 
      relay={relay} 
      renewSubscription={handleRenewSubscription}
      isFirstTimeSubscription={true}
    />
  );
}
