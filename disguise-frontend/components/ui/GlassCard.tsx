'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  glow?: 'teal' | 'cyan' | 'orange' | 'none';
  hover?: boolean;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const glowMap = {
  teal: '0 0 20px rgba(0, 151, 178, 0.4), 0 0 60px rgba(0, 151, 178, 0.15)',
  cyan: '0 0 20px rgba(0, 229, 255, 0.5), 0 0 80px rgba(0, 229, 255, 0.2)',
  orange: '0 0 20px rgba(255, 107, 53, 0.4), 0 0 60px rgba(255, 107, 53, 0.15)',
  none: 'none',
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, glow = 'none', hover = false, className = '', onClick, style }, ref) => {
    const base: React.CSSProperties = {
      background: 'rgba(17, 34, 54, 0.60)',
      border: '1px solid rgba(0, 229, 255, 0.15)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '20px',
      transition: 'all 0.3s ease',
      boxShadow: glow !== 'none' ? glowMap[glow] : undefined,
      ...style,
    };

    if (!hover) {
      return (
        <div ref={ref} style={base} className={className} onClick={onClick}>
          {children}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        style={base}
        className={className}
        onClick={onClick}
        whileHover={{
          borderColor: '#00E5FF',
          boxShadow: glowMap.cyan,
          y: -2,
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
