import React, { useState, useMemo } from 'react';
import { Notification } from '../types';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import {
  Bell, Check, Info, AlertTriangle, CheckCircle,
  XCircle, Trash2, CheckSquare, Square, Eraser
} from 'lucide-react';
import { format } from 'date-fns';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onDeleteSelected: (ids: string[]) => void;
  onSelectOrder?: (orderId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications, onMarkAsRead, onMarkAllAsRead,
  onDelete, onDeleteSelected, onSelectOrder
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sortedNotifications = useMemo(() =>
    [...notifications].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ), [notifications]
  );

  // Only read notifications can be selected
  const readNotifications = useMemo(() =>
    sortedNotifications.filter(n => n.read), [sortedNotifications]
  );
  const allReadIds = useMemo(() => readNotifications.map(n => n.id), [readNotifications]);
  const allReadSelected = allReadIds.length > 0 && allReadIds.every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllRead = () => {
    if (allReadSelected) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all read
      setSelectedIds(new Set(allReadIds));
    }
  };

  const handleDeleteSelected = () => {
    onDeleteSelected([...selectedIds]);
    setSelectedIds(new Set());
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle className="text-green-500" size={24} />;
      case 'WARNING': return <AlertTriangle className="text-yellow-500" size={24} />;
      case 'ERROR':   return <XCircle className="text-red-500" size={24} />;
      default:        return <Info className="text-brand-500" size={24} />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Notificações"
        description="Acompanhe as atualizações das suas Ordens de Serviço"
        icon={<Bell className="text-brand-600" size={24} />}
        actionPrimary={
          notifications.some(n => !n.read) ? (
            <Button variant="secondary" onClick={onMarkAllAsRead} icon={<Check size={16} />}>
              Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />

      {/* ── Bulk-action toolbar ── */}
      {readNotifications.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Select-all toggle */}
          <button
            onClick={toggleSelectAllRead}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
            title={allReadSelected ? 'Desmarcar todas' : 'Selecionar todas as lidas'}
          >
            {allReadSelected
              ? <CheckSquare size={18} className="text-brand-500" />
              : <Square size={18} className="text-gray-400" />
            }
            {allReadSelected ? 'Desmarcar todas' : `Selecionar todas as lidas (${readNotifications.length})`}
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Badge: how many selected */}
          {someSelected && (
            <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}
            </span>
          )}

          {/* Delete selected */}
          <button
            onClick={handleDeleteSelected}
            disabled={!someSelected}
            className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all
              ${someSelected
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 cursor-pointer'
                : 'text-gray-300 border border-gray-200 cursor-not-allowed'
              }`}
            title={someSelected ? `Apagar ${selectedIds.size} notificação(ões)` : 'Selecione notificações lidas para apagar'}
          >
            <Eraser size={15} />
            Apagar selecionadas
          </button>
        </div>
      )}

      {/* ── Notification list ── */}
      <div className="space-y-3">
        {sortedNotifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Bell className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">Você não tem notificações no momento.</p>
          </div>
        ) : (
          sortedNotifications.map(notification => {
            const isSelected = selectedIds.has(notification.id);
            return (
              <div
                key={notification.id}
                className={`relative p-5 rounded-xl border transition-all flex gap-3 pr-14
                  ${isSelected
                    ? 'bg-red-50/60 border-red-200 shadow-sm'
                    : notification.read
                      ? 'bg-white border-gray-100 hover:shadow-md'
                      : 'bg-brand-50/50 border-brand-100 hover:shadow-md'
                  }
                  ${notification.relatedOrderId ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (!notification.read) onMarkAsRead(notification.id);
                  if (notification.relatedOrderId && onSelectOrder) onSelectOrder(notification.relatedOrderId);
                }}
              >
                {/* Checkbox (only for read notifications) */}
                {notification.read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(notification.id); }}
                    className="shrink-0 mt-1 text-gray-400 hover:text-brand-500 transition-colors"
                    title={isSelected ? 'Desmarcar' : 'Selecionar para apagar'}
                  >
                    {isSelected
                      ? <CheckSquare size={18} className="text-brand-500" />
                      : <Square size={18} />
                    }
                  </button>
                )}

                {/* Icon */}
                <div className={`shrink-0 mt-1 ${!notification.read ? '' : 'ml-0'}`}>
                  {getIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className={`font-semibold ${notification.read ? 'text-gray-800' : 'text-brand-900'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {format(new Date(notification.timestamp), 'dd/MM HH:mm')}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${notification.read ? 'text-gray-600' : 'text-gray-800'}`}>
                    {notification.message}
                  </p>
                  {notification.relatedOrderId && (
                    <div className="mt-2 inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                      O.S: {notification.relatedOrderId}
                    </div>
                  )}
                </div>

                {/* Unread dot / Delete individual */}
                {!notification.read ? (
                  <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-brand-500" title="Não lida" />
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(notification.id); setSelectedIds(prev => { const n = new Set(prev); n.delete(notification.id); return n; }); }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                    title="Excluir notificação"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
