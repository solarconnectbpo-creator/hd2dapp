import React, { createContext, useContext, useState } from 'react';

interface PurchasedLeadsContextType {
  purchasedLeads: Set<string>;
  addPurchasedLead: (leadId: string) => void;
  isPurchased: (leadId: string) => boolean;
}

const PurchasedLeadsContext = createContext<PurchasedLeadsContextType | undefined>(undefined);

export function PurchasedLeadsProvider({ children }: { children: React.ReactNode }) {
  const [purchasedLeads, setPurchasedLeads] = useState<Set<string>>(new Set());

  const addPurchasedLead = (leadId: string) => {
    setPurchasedLeads(prev => new Set([...prev, leadId]));
  };

  const isPurchased = (leadId: string) => purchasedLeads.has(leadId);

  return (
    <PurchasedLeadsContext.Provider value={{ purchasedLeads, addPurchasedLead, isPurchased }}>
      {children}
    </PurchasedLeadsContext.Provider>
  );
}

export function usePurchasedLeads() {
  const context = useContext(PurchasedLeadsContext);
  if (!context) {
    throw new Error('usePurchasedLeads must be used within PurchasedLeadsProvider');
  }
  return context;
}
