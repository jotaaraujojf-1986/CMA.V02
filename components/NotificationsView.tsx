import React from 'react';
import { Notification } from '../types';
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, onMarkAsRead, onMarkAllAsRead, onDelete }) => {
  const sortedNotifications = [...notifications].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle className="text-green-500" size={24} />;
      case 'WARNING': return <AlertTriangle className="text-yellow-500" size={24} />;
      case 'ERROR': return <XCircle className="text-red-500" size={24} />;
      default: return <Info className="text-blue-500" size={24} />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
             <Bell className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Notificações</h2>
            <p className="text-sm text-gray-500">Acompanhe as atualizações das suas Ordens de Serviço</p>
          </div>
        </div>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={onMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <Check size={16} /> Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sortedNotifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Bell className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">Você não tem notificações no momento.</p>
          </div>
        ) : (
          sortedNotifications.map(notification => (
            <div 
              key={notification.id} 
              className={`relative p-5 rounded-xl border transition-all hover:shadow-md flex gap-4 pr-12
                ${notification.read ? 'bg-white border-gray-100' : 'bg-blue-50/50 border-blue-100 cursor-pointer'}`}
              onClick={() => !notification.read && onMarkAsRead(notification.id)}
            >
              <div className="shrink-0 mt-1">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className={`font-semibold ${notification.read ? 'text-gray-800' : 'text-blue-900'}`}>
                    {notification.title}
                  </h4>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
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
              
              {!notification.read ? (
                <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-blue-500" title="Não lida"></div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                  title="Excluir notificação"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};