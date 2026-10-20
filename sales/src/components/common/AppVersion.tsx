import React from 'react';

export const AppVersion: React.FC<{ className?: string; portal?: string }> = ({
  className = '',
}) => (
  <p className={`text-center text-[10px] font-semibold tracking-wide text-slate-400 ${className}`}>
    Reproutes V{import.meta.env.VITE_SALES_APP_VERSION?.trim() || import.meta.env.VITE_APP_VERSION?.trim() || '1'}
  </p>
);
