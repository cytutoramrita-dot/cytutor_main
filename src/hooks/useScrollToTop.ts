import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UseScrollToTopOptions {
  /**
   * Whether to scroll to top on route change
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Smooth scroll behavior
   * @default false
   */
  smooth?: boolean;
  
  /**
   * Delay before scrolling (in milliseconds)
   * Useful for waiting for content to load
   * @default 0
   */
  delay?: number;
  
  /**
   * Routes to exclude from auto-scroll
   * @default []
   */
  excludeRoutes?: string[];
}

/**
 * Custom hook for managing scroll-to-top behavior
 * 
 * @param options Configuration options
 * 
 * @example
 * ```tsx
 * // Basic usage
 * useScrollToTop();
 * 
 * // With options
 * useScrollToTop({
 *   smooth: true,
 *   delay: 100,
 *   excludeRoutes: ['/modal', '/tabs']
 * });
 * ```
 */
export const useScrollToTop = (options: UseScrollToTopOptions = {}) => {
  const {
    enabled = true,
    smooth = false,
    delay = 0,
    excludeRoutes = []
  } = options;
  
  const location = useLocation();

  useEffect(() => {
    if (!enabled) return;

    // Check if current route should be excluded
    const shouldExclude = excludeRoutes.some(route => 
      location.pathname.startsWith(route)
    );
    
    if (shouldExclude) return;

    const scrollToTop = () => {
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

    if (delay > 0) {
      const timeoutId = setTimeout(scrollToTop, delay);
      return () => clearTimeout(timeoutId);
    } else {
      scrollToTop();
    }
  }, [location.pathname, location.search, enabled, smooth, delay, excludeRoutes]);
};

export default useScrollToTop;