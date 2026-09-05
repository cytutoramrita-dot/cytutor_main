import React from 'react';
import { useScrollToTop } from '../hooks/useScrollToTop';

// Example 1: Basic usage in a component
const BasicExample: React.FC = () => {
  // Automatically scroll to top when this component's route changes
  useScrollToTop();
  
  return <div>Your component content</div>;
};

// Example 2: With smooth scrolling and delay
const SmoothScrollExample: React.FC = () => {
  useScrollToTop({
    smooth: true,
    delay: 100 // Wait 100ms before scrolling (useful for loading states)
  });
  
  return <div>Your component content</div>;
};

// Example 3: Excluding certain routes
const ConditionalScrollExample: React.FC = () => {
  useScrollToTop({
    excludeRoutes: ['/modal', '/popup', '/tabs'] // Don't scroll on these routes
  });
  
  return <div>Your component content</div>;
};

// Example 4: Manually controlling scroll behavior
const ManualScrollExample: React.FC = () => {
  const [shouldScroll, setShouldScroll] = React.useState(true);
  
  useScrollToTop({
    enabled: shouldScroll
  });
  
  return (
    <div>
      <button onClick={() => setShouldScroll(!shouldScroll)}>
        Toggle Auto Scroll: {shouldScroll ? 'ON' : 'OFF'}
      </button>
      <div>Your component content</div>
    </div>
  );
};

export { BasicExample, SmoothScrollExample, ConditionalScrollExample, ManualScrollExample };