import React, { useState } from 'react';
import { X, Bell, MessageCircle, ClipboardList, Clock, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Notification } from '../types';

// --- Re-export navigateTo type ---
export type AlertNav = 'DETAILS' | 'CHAT';

// --- Sound Generator ---
export const playAlertSound = (alertType: 'NEW_ORDER' | 'ORDER_UPDATE' | 'CHAT_MESSAGE') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const play = (freq: number, start: number, duration: number, gain: number, shape: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = shape;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    };
    if (alertType === 'NEW_ORDER')        { play(523,0,0.25,0.35); play(659,0.18,0.25,0.35); play(784,0.36,0.4,0.35); }
    else if (alertType === 'ORDER_UPDATE') { play(880,0,0.2,0.3);  play(880,0.25,0.2,0.25); }
    else                                  { play(1046,0,0.12,0.2,'sine'); play(1318,0.08,0.15,0.18,'sine'); }
  } catch { /* ignore */ }
};

// Soft reminder sound (played on login when unread alerts are restored)
export const playReminderSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value = 440;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* ignore */ }
};

// --- Config per alertType ---
type AlertDisplayType = 'NEW_ORDER' | 'ORDER_UPDATE' | 'CHAT_MESSAGE';

const ALERT_CONFIG: Record<AlertDisplayType, {
  icon: React.ReactNode; label: string; accent: string;
  iconBg: string; iconColor: string; hoverBg: string; badgeBg: string;
}> = {
  NEW_ORDER:   { icon: <ClipboardList size={18}/>, label: 'Nova O.S.',   accent: 'bg-brand-500',   iconBg: 'bg-brand-50',   iconColor: 'text-brand-600',   hoverBg: 'hover:bg-brand-50/40',   badgeBg: 'bg-brand-500'   },
  ORDER_UPDATE:{ icon: <Bell          size={18}/>, label: 'Atualização', accent: 'bg-amber-500',   iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   hoverBg: 'hover:bg-amber-50/40',   badgeBg: 'bg-amber-500'   },
  CHAT_MESSAGE:{ icon: <MessageCircle size={18}/>, label: 'Chat',        accent: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', hoverBg: 'hover:bg-emerald-50/40', badgeBg: 'bg-emerald-500' },
};

const DEFAULT_CONFIG = ALERT_CONFIG.ORDER_UPDATE;

const timeAgo = (ts: string): string => {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5)      return 'agora';
  if (diff < 60)     return `${diff}s atrás`;
  if (diff < 3600)   return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
};

// --- Single Toast Card (backed by Notification) ---
const ToastCard: React.FC<{
  notification: Notification;
  onDismiss: (id: string) => void;
  onNavigate?: (orderId: string, tab: AlertNav) => void;
  interactive?: boolean;
}> = ({ notification, onDismiss, onNavigate, interactive = true }) => {
  const [exiting, setExiting] = useState(false);
  const cfg = notification.alertType ? ALERT_CONFIG[notification.alertType] : DEFAULT_CONFIG;
  const isNavigable = !!notification.relatedOrderId && !!onNavigate;

  const dismiss = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExiting(true);
    setTimeout(() => onDismiss(notification.id), 280);
  };

  const handleClick = () => {
    if (!interactive) return;
    if (isNavigable) {
      onNavigate!(notification.relatedOrderId!, notification.navigateTo ?? 'DETAILS');
      onDismiss(notification.id);
    } else {
      dismiss();
    }
  };

  return (
    <div
      onClick={handleClick}
      title={!interactive ? undefined : isNavigable ? `Clique para abrir a O.S. ${notification.relatedOrderId}` : 'Clique para dispensar'}
      className={`
        group relative w-[340px] rounded-2xl border border-gray-100 bg-white
        shadow-xl overflow-hidden select-none
        transition-all duration-280 ease-in-out
        ${interactive ? `cursor-pointer ${cfg.hoverBg}` : 'cursor-default'}
        ${exiting ? 'opacity-0 translate-x-8 scale-95 pointer-events-none' : 'opacity-100'}
      `}
      style={{ willChange: 'transform, opacity' }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.accent} rounded-l-2xl`} />
      <div className="flex items-start gap-3 pl-4 pr-3 py-3.5">
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor} shadow-sm`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-sm font-bold text-gray-900 leading-tight truncate">{notification.title}</p>
            <span className={`flex-shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white ${cfg.badgeBg}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{notification.message}</p>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1">
              <Clock size={10} className="text-gray-300" />
              <span className="text-[10px] text-gray-400">{timeAgo(notification.timestamp)}</span>
            </div>
            {isNavigable && interactive && (
              <span className="text-[10px] font-semibold text-brand-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {notification.navigateTo === 'CHAT' ? '💬 Abrir chat' : '📋 Ver O.S.'} →
              </span>
            )}
          </div>
        </div>
        {interactive && (
          <button onClick={dismiss} className="flex-shrink-0 p-1 text-gray-300 group-hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Dispensar">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// --- Stack constants ---
const MAX_PEEK    = 3;
const PEEK_OFFSET = 9;
const PEEK_SCALE  = 0.04;

// --- Toast Container (driven by unread Notifications from Supabase) ---
export const AlertToastContainer: React.FC<{
  notifications: Notification[];        // unread notifications for current user
  onDismiss: (id: string) => void;     // marks notification as read in Supabase
  onNavigate?: (orderId: string, tab: AlertNav) => void;
}> = ({ notifications, onDismiss, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);

  // Only show toast-type notifications (those created by the alert system)
  const toasts = notifications.filter(n => !n.read && !!n.alertType);

  if (toasts.length === 0) {
    if (expanded) setExpanded(false);
    return null;
  }

  // Newest first
  const sorted = [...toasts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const dismissAll = () => { toasts.forEach(n => onDismiss(n.id)); setExpanded(false); };

  // ---- COLLAPSED: stacked deck ----
  if (!expanded) {
    const stackDepth = Math.min(sorted.length, MAX_PEEK);
    // Increased base height from 88 to 115 to prevent overlap with dynamic 2-line cards
    const containerHeight = 115 + (stackDepth - 1) * PEEK_OFFSET;

    return (
      <div className="fixed top-5 right-5 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
        <div className="pointer-events-auto relative" style={{ width: 340, height: containerHeight }}>
          {sorted.slice(0, MAX_PEEK).map((notif, idx) => {
            const isTop = idx === 0;
            return (
              <div
                key={notif.id}
                style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: `translateX(-50%) translateY(${idx * PEEK_OFFSET}px) scale(${1 - idx * PEEK_SCALE})`,
                  transformOrigin: 'top center',
                  zIndex: MAX_PEEK - idx,
                  opacity: 1 - idx * 0.13,
                  pointerEvents: isTop ? 'auto' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                <ToastCard notification={notif} onDismiss={onDismiss} onNavigate={onNavigate} interactive={isTop} />
              </div>
            );
          })}
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {sorted.length > 1 && (
            <span className="text-[11px] font-bold text-gray-500 bg-white border border-gray-200 shadow-sm rounded-full px-2.5 py-0.5 flex items-center gap-1">
              <Layers size={11} /> {sorted.length} alertas
            </span>
          )}
          {sorted.length > 1 && (
            <button onClick={() => setExpanded(true)} className="text-[11px] font-bold text-brand-600 bg-white border border-brand-200 hover:bg-brand-50 px-3 py-1 rounded-full shadow-sm transition-all flex items-center gap-1.5">
              <ChevronDown size={12} /> Ver todos
            </button>
          )}
          <button onClick={dismissAll} className="text-[11px] font-bold text-gray-400 hover:text-red-500 bg-white border border-gray-200 hover:border-red-300 px-3 py-1 rounded-full shadow-sm transition-all flex items-center gap-1.5">
            <X size={11} /> Dispensar
          </button>
        </div>
      </div>
    );
  }

  // ---- EXPANDED: full list ----
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2">
        <button onClick={() => setExpanded(false)} className="text-[11px] font-bold text-brand-600 bg-white border border-brand-200 hover:bg-brand-50 px-3 py-1 rounded-full shadow-sm transition-all flex items-center gap-1.5">
          <ChevronUp size={12} /> Recolher
        </button>
        <button onClick={dismissAll} className="text-[11px] font-bold text-gray-400 hover:text-red-500 bg-white border border-gray-200 hover:border-red-300 px-3 py-1 rounded-full shadow-sm transition-all flex items-center gap-1.5">
          <X size={11} /> Dispensar todos ({sorted.length})
        </button>
      </div>
      <div className="pointer-events-auto flex flex-col gap-2 overflow-y-auto overflow-x-hidden pr-0.5" style={{ maxHeight: 'calc(100vh - 80px)' }}>
        {sorted.map(notif => (
          <ToastCard key={notif.id} notification={notif} onDismiss={onDismiss} onNavigate={onNavigate} interactive />
        ))}
      </div>
    </div>
  );
};
