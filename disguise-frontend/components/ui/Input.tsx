'use client';

import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#8BAFC4',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {icon && (
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#4A6B84',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            {...props}
            className={className}
            style={{
              width: '100%',
              padding: icon ? '10px 16px 10px 40px' : '10px 16px',
              background: 'rgba(17, 34, 54, 0.8)',
              border: `1px solid ${error ? 'rgba(255, 61, 61, 0.5)' : 'rgba(0, 229, 255, 0.15)'}`,
              borderRadius: '12px',
              color: '#E8F4F8',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              fontFamily: 'Inter, sans-serif',
              ...style,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#00E5FF';
              e.target.style.boxShadow = '0 0 0 2px rgba(0, 229, 255, 0.1)';
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? 'rgba(255, 61, 61, 0.5)' : 'rgba(0, 229, 255, 0.15)';
              e.target.style.boxShadow = 'none';
              props.onBlur?.(e);
            }}
          />
        </div>
        {error && (
          <span style={{ fontSize: '12px', color: '#FF3D3D', fontFamily: 'Inter, sans-serif' }}>{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label style={{ fontSize: '13px', fontWeight: 500, color: '#8BAFC4', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          {...props}
          className={className}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'rgba(17, 34, 54, 0.8)',
            border: `1px solid ${error ? 'rgba(255, 61, 61, 0.5)' : 'rgba(0, 229, 255, 0.15)'}`,
            borderRadius: '12px',
            color: '#E8F4F8',
            fontSize: '14px',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'Inter, sans-serif',
            minHeight: '100px',
            ...style,
          }}
          onFocus={(e) => { e.target.style.borderColor = '#00E5FF'; props.onFocus?.(e); }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(0, 229, 255, 0.15)'; props.onBlur?.(e); }}
        />
        {error && <span style={{ fontSize: '12px', color: '#FF3D3D' }}>{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label style={{ fontSize: '13px', fontWeight: 500, color: '#8BAFC4', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          {...props}
          className={className}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'rgba(17, 34, 54, 0.8)',
            border: `1px solid ${error ? 'rgba(255, 61, 61, 0.5)' : 'rgba(0, 229, 255, 0.15)'}`,
            borderRadius: '12px',
            color: '#E8F4F8',
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            ...style,
          }}
        >
          {children}
        </select>
        {error && <span style={{ fontSize: '12px', color: '#FF3D3D' }}>{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
