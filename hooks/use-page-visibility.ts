"use client";

import { useEffect, useRef } from "react";

/**
 * Hook to execute a callback when the page becomes visible again
 * Useful for refreshing data when user returns to the tab
 * 
 * @param callback - Function to execute when page becomes visible
 * @param deps - Dependencies array for the callback (optional)
 */
export function usePageVisibility(
  callback: () => void,
  deps: React.DependencyList = []
) {
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible
        callbackRef.current();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
