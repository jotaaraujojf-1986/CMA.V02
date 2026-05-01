import React from 'react';
import { getStatusLabel } from '../../services/mockData';
import { Status } from '../../types';

interface StatusBadgeProps {
  status: Status | 'FINALIZADO' | 'PENDENTE' | string;
  customColor?: string;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  OPEN:           { bg: 'rgba(0,212,255,.12)',    color: '#00d4ff',  border: 'rgba(0,212,255,.3)' },
  ASSIGNED:       { bg: 'rgba(245,158,11,.12)',   color: '#fbbf24',  border: 'rgba(245,158,11,.3)' },
  IN_PROGRESS:    { bg: 'rgba(26,107,255,.15)',   color: '#60a5fa',  border: 'rgba(26,107,255,.35)' },
  PENDING_REVIEW: { bg: 'rgba(139,92,246,.15)',   color: '#a78bfa',  border: 'rgba(139,92,246,.35)' },
  COMPLETED:      { bg: 'rgba(16,185,129,.12)',   color: '#34d399',  border: 'rgba(16,185,129,.3)' },
  CANCELLED:      { bg: 'rgba(239,68,68,.12)',    color: '#f87171',  border: 'rgba(239,68,68,.3)' },
  FINALIZADO:     { bg: 'rgba(16,185,129,.12)',   color: '#34d399',  border: 'rgba(16,185,129,.3)' },
  PENDENTE:       { bg: 'rgba(245,158,11,.12)',   color: '#fbbf24',  border: 'rgba(245,158,11,.3)' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, customColor }) => {
  const label = ['OPEN','ASSIGNED','IN_PROGRESS','PENDING_REVIEW','COMPLETED','CANCELLED'].includes(status as string)
    ? getStatusLabel(status as Status)
    : status === 'FINALIZADO' ? 'FINALIZADO'
    : status === 'PENDENTE'   ? 'PENDENTE'
    : status;

  const s = STATUS_STYLES[status] ?? { bg: 'rgba(136,146,164,.15)', color: '#8892a4', border: 'rgba(136,146,164,.3)' };

  if (customColor) {
    return (
      <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase border ${customColor}`}>
        {label}
      </span>
    );
  }

  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      display: 'inline-block',
      lineHeight: '1.6',
    }}>
      {label}
    </span>
  );
};
