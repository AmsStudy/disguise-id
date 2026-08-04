'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', visible, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => onClose(), duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  const config = {
    success: { icon: faCheckCircle, color: '#00E676', bg: 'rgba(0, 230, 118, 0.1)' },
    error: { icon: faExclamationCircle, color: '#FF3D3D', bg: 'rgba(255, 61, 61, 0.1)' },
    info: { icon: faInfoCircle, color: '#00CFE8', bg: 'rgba(0, 207, 232, 0.1)' },
  };

  const { icon, color, bg } = config[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#112236',
            border: `1px solid ${color}`,
            borderRadius: '12px',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 16px ${bg}`,
            zIndex: 9999,
            minWidth: '300px',
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color
          }}>
            <FontAwesomeIcon icon={icon} style={{ fontSize: '16px' }} />
          </div>
          <div style={{ flex: 1, color: '#E8F4F8', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500 }}>
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
