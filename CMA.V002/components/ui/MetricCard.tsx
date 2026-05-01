import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, subValue, icon, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col justify-center transition-all ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.07)',
        borderRadius: 12,
        padding: '14px 16px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color .18s, background .18s, transform .1s',
      }}
      onMouseEnter={e => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.14)';
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.055)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.07)';
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.03)';
      }}
    >
      {/* Top shimmer line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.06), transparent)',
      }} />

      <div className="flex items-start justify-between mb-3 gap-2">
        <p style={{
          fontSize: 10, fontWeight: 600, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '.06em', lineHeight: '1.3',
        }}>
          {label}
        </p>
        <div style={{
          background: 'rgba(26,107,255,.15)',
          border: '1px solid rgba(26,107,255,.25)',
          borderRadius: 8, padding: 7, flexShrink: 0,
          color: 'var(--cyan)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>
      <div>
        <h3 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 28, fontWeight: 700,
          color: 'var(--sf-white)',
          lineHeight: 1, letterSpacing: '-.02em',
        }}>
          {value}
        </h3>
        {subValue && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontWeight: 500 }}>{subValue}</p>
        )}
      </div>
    </div>
  );
};
