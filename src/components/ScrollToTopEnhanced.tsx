import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollToTopProps {
  /**
   * Whether to preserve scroll position for back/forward navigation
   * @default false
   */
  preserveHistoryNavigation?: boolean;
  
  /**
   * Smooth scroll behavior
   * @default false (instant scroll)
   */
  smooth?: boolean;
  
  /**
   * Routes to exclude from auto-scroll (useful for modals, tabs, etc.)
   * @default []
   */
  excludeRoutes?: string[];
}

/**
 * Enhanced ScrollToTop Component
 * 
 * Provides more control over scroll behavior with options for:
 * - Preserving scroll on back/forward navigation
 * - Smooth scrolling
 * - Excluding specific routes
 */
const ScrollToTopEnhanced: React.FC<ScrollToTopProps> = ({
  preserveHistoryNavigation = false,
  smooth = false,
  excludeRoutes = []
}) => {
  const location = useLocation();

  useEffect(() => {
    // Check if current route should be excluded
    const shouldExclude = excludeRoutes.some(route => 
      location.pathname.startsWith(route)
    );
    
    if (shouldExclude) {
      return;
    }

    // If preserving history navigation, check if this is a back/forward navigation
    if (preserveHistoryNavigation) {
      // This is a simplified check - in a real app you might want to track navigation type
      const isHistoryNavigation = window.history.state?.idx !== undefined;
      if (isHistoryNavigation) {
        return;
      }
    }

    // Scroll to top
    if (smooth) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.search, preserveHistoryNavigation, smooth, excludeRoutes]);

  return null;
};

export default ScrollToTopEnhanced;