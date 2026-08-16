'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'fox';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
  'aria-label'?: string;
  id?: string;
  style?: React.CSSProperties;
}

const variantStyles = {
  primary: {
    background: 'linear-gradient(135deg, #0097B2, #00B4D8)',
    color: '#E8F4F8',
    border: '1px solid rgba(0, 229, 255, 0.3)',
    hoverShadow: '0 0 20px rgba(0, 151, 178, 0.5)',
  },
  secondary: {
    background: 'rgba(17, 34, 54, 0.8)',
    color: '#00CFE8',
    border: '1px solid rgba(0, 229, 255, 0.4)',
    hoverShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
  },
  ghost: {
    background: 'transparent',
    color: '#8BAFC4',
    border: '1px solid rgba(0, 229, 255, 0.1)',
    hoverShadow: 'none',
  },
  danger: {
    background: 'rgba(255, 61, 61, 0.15)',
    color: '#FF3D3D',
    border: '1px solid rgba(255, 61, 61, 0.3)',
    hoverShadow: '0 0 20px rgba(255, 61, 61, 0.3)',
  },
  fox: {
    background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)',
    color: '#060D14',
    border: '1px solid rgba(255, 107, 53, 0.4)',
    hoverShadow: '0 0 20px rgba(255, 107, 53, 0.5)',
  },
};

const sizeStyles = {
  sm: { padding: '6px 16px', fontSize: '13px', borderRadius: '8px' },
  md: { padding: '10px 24px', fontSize: '14px', borderRadius: '12px' },
  lg: { padding: '14px 32px', fontSize: '16px', borderRadius: '999px' },
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
  'aria-label': ariaLabel,
  id,
  style,
}) => {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <motion.button
      id={id}
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02, boxShadow: v.hoverShadow } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      style={{
        ...s,
        background: disabled ? 'rgba(74, 107, 132, 0.3)' : v.background,
        color: disabled ? '#4A6B84' : v.color,
        border: v.border,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      className={className}
    >
      {loading && <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '16px' }} />}
      {children}
    </motion.button>
  );
};
