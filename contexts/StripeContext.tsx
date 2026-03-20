import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Platform } from "react-native";

interface StripeContextType {
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  lastTransaction: any;
  setLastTransaction: (value: any) => void;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

export function StripeContextProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    // Only initialize Stripe on native platforms
    if (Platform.OS !== "web") {
      try {
        const { initStripe } = require("@stripe/stripe-react-native");
        const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
        if (publishableKey && initStripe) {
          initStripe({ publishableKey, urlScheme: "hd2d" }).then(() => setStripeReady(true));
        }
      } catch (e) {
        console.warn("Stripe not available on this platform");
        setStripeReady(true);
      }
    } else {
      setStripeReady(true);
    }
  }, []);

  return (
    <StripeContext.Provider value={{ isProcessing, setIsProcessing, lastTransaction, setLastTransaction }}>
      {stripeReady && children}
    </StripeContext.Provider>
  );
}

export function useStripe() {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error("useStripe must be used within StripeContextProvider");
  }
  return context;
}
