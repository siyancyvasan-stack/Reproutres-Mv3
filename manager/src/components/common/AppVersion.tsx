import React from 'react';

export const AppVersion: React.FC<{ className?: string; portal?: string }> = ({
  className = '',
  portal = 'manager',
}) => {
  const raw =
    (portal === 'manager' ? import.meta.env.VITE_MANAGER_APP_VERSION : '') ||
    import.meta.env.VITE_MANAGER_APP_VERSION ||
    import.meta.env.VITE_APP_VERSION ||
    '';

  const version = raw ? raw.trim().replace(/^[vV]/, '') : '';

  return (
    <p className={`text-center text-[10px] font-semibold tracking-wide text-slate-400 ${className}`}>
      Reproutes{version ? ` V${version}` : '2.0'}
    </p>
  );
};
