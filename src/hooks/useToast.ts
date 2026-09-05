import { useState, useRef, useCallback, useEffect } from 'react';

export interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export interface UseToastReturn {
  toast: ToastState | null;
  showToast: (state: ToastState) => void;
  dismissToast: () => void;
}

const TOAST_DURATION_MS = 4000;

export function useToast(): UseToastReturn {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const showToast = useCallback((state: ToastState) => {
    clearTimer();
    setToast(state);
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, TOAST_DURATION_MS);
  }, [clearTimer]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { toast, showToast, dismissToast };
}
