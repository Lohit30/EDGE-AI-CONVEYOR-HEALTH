// =============================================================================
// IndustrialPanel — reusable dark panel wrapper
// =============================================================================

import React from 'react';
import './IndustrialPanel.css';

interface IndustrialPanelProps {
  title?: string;
  /** Optional right-side header content */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Removes padding from body — use when children handle their own spacing */
  noPadding?: boolean;
}

export const IndustrialPanel: React.FC<IndustrialPanelProps> = ({
  title,
  headerRight,
  children,
  className = '',
  noPadding = false,
}) => {
  return (
    <div className={`ip ${className}`}>
      {(title || headerRight) && (
        <div className="ip__header">
          {title && <span className="ip__title">{title}</span>}
          {headerRight && <div className="ip__header-right">{headerRight}</div>}
        </div>
      )}
      <div className={`ip__body${noPadding ? ' ip__body--no-pad' : ''}`}>
        {children}
      </div>
    </div>
  );
};
