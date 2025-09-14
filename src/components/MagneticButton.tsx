import React from 'react';
import { useMagnetic } from '../hooks/useMagnetic';
import { MagneticProps } from '../utils/types';

export const MagneticButton: React.FC<MagneticProps> = ({
  children,
  config,
  className = '',
  style = {},
  ...props
}) => {
  const magneticRef = useMagnetic<HTMLButtonElement>(config);

  return (
    <button
      ref={magneticRef}
      className={`magnetic-button ${className}`}
      style={{
        padding: '12px 24px',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: '#007bff',
        color: 'white',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '500',
        transition: 'background-color 0.2s ease',
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
};
