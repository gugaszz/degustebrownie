import { useCallback, useRef, useState } from 'react';

/**
 * Prevents a form/confirm handler from running twice from a double click or
 * double tap. `disabled={isSubmitting}` on the button is NOT enough by
 * itself: when the handler does its work synchronously (as every store
 * mutation in this app does — local state updates immediately, the network
 * write to Supabase fires in the background without being awaited), calling
 * `setIsSubmitting(true)` then `setIsSubmitting(false)` within the same
 * handler call batches into a single React render. The button's `disabled`
 * attribute never actually becomes true for a frame, so a second click that
 * lands before the modal closes (very easy on a touchscreen, or on any
 * button that stays visible for a second after success) fires the handler
 * again — creating a real duplicate sale, transfer, reservation, etc.
 *
 * The `useRef` flag here is checked and set synchronously, independent of
 * React's render/state batching, so the second call is rejected immediately
 * no matter how close together the two clicks were.
 */
export function useSubmitGuard() {
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guard = useCallback(<T,>(fn: () => T): T | undefined => {
    if (submittingRef.current) return undefined;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      return fn();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  const guardAsync = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (submittingRef.current) return undefined;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      return await fn();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, guard, guardAsync };
}
