
import { createContext, useContext, type ReactNode } from 'react';
import { useMessaging, type UseMessagingResult } from '../../core/hooks/useMessaging';

const MessagingContext = createContext<UseMessagingResult | null>(null);

export function useMessagingContext(): UseMessagingResult {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessagingContext must be used inside <MessagingProvider>');
  return ctx;
}

export function MessagingProvider({ children }: { children: ReactNode }) {
  const value = useMessaging();
  if (!value) return null;
  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}