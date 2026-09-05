/**
 * Scroll Configuration Utilities
 * 
 * Provides utilities for managing scroll behavior in the application
 */

/**
 * Disable automatic scroll restoration
 * Call this once when the app initializes
 */
export const disableScrollRestoration = (): void => {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
};

/**
 * Enable automatic scroll restoration
 * Call this to restore default browser behavior
 */
export const enableScrollRestoration = (): void => {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'auto';
  }
};

/**
 * Scroll to top utility function
 */
export const scrollToTop = (smooth: boolean = false): void => {
  if (smooth) {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  } else {
    window.scrollTo(0, 0);
  }
};

/**
 * Save current scroll position to session storage
 */
export const saveScrollPosition = (key: string): void => {
  const scrollPosition = {
    x: window.scrollX,
    y: window.scrollY
  };
  sessionStorage.setItem(`scroll-${key}`, JSON.stringify(scrollPosition));
};

/**
 * Restore scroll position from session storage
 */
export const restoreScrollPosition = (key: string): boolean => {
  const saved = sessionStorage.getItem(`scroll-${key}`);
  if (saved) {
    try {
      const { x, y } = JSON.parse(saved);
      window.scrollTo(x, y);
      return true;
    } catch (error) {
      console.warn('Failed to restore scroll position:', error);
    }
  }
  return false;
};