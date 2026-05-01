import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children }) => {
  return (
    <div
      className="mb-6"
      style={{
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 14,
        padding: '16px 20px',
      }}
    >
      <div className="flex flex-wrap gap-4 items-end">
        {children}
      </div>
    </div>
  );
};
