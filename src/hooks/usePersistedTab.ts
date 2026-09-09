import { useState, useEffect, useCallback } from 'react';

/**
 * Persists the active tab value in localStorage so it survives
 * browser-tab switches, re-renders, and page refreshes.
 */
export function usePersistedTab(storageKey: string, defaultValue: string) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // storage full / private browsing – ignore
    }
  }, [storageKey, value]);

  return [value, setValue] as const;
}
