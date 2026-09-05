import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick, hover = false }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        glass-panel rounded-xl p-6 border border-white/5 
        ${hover ? 'hover:border-neon-green/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:-translate-y-1 cursor-pointer transition-all duration-300' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;