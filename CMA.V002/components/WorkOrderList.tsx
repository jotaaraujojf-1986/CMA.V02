import React, { useState } from 'react';
import { WorkOrder, User, WorkOrderType } from '../types';
import { getStatusColor, getStatusLabel, getPriorityLabel } from '../services/mockData';
import { Filter, Search, MapPin, Calendar, User as UserIcon, Hammer, Wrench, Layers } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface WorkOrderListProps {
  orders: WorkOrder[];
  currentUser: User;
  onSelectOrder: (order: WorkOrder) => void;
}

export const WorkOrderList: React.FC<WorkOrderListProps> = ({ orders, currentUser, onSelectOrder }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | WorkOrderType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter Logic
  const filteredOrders = orders.filter(order => {
    // Role based filtering
    if (currentUser.role === 'TECHNICIAN' && order.technicianId !== currentUser.id) return false;
    if (currentUser.role === 'CLIENT' && order.clientEmail !== currentUser.email) return false;

    // Search
    const matchesSearch = 
      order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.address.toLowerCase().includes(searchTerm.toLowerCase());

    // Status
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;

    // Type
    const matchesType = filterType === 'ALL' || order.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Filters Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 sticky top-0 z-10">
        
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          {/* Search */}
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome, ID ou endereço..." 
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type Filters */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit self-start md:self-auto">
             <button
               onClick={() => setFilterType('ALL')}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <Layers size={14} /> Todas
             </button>
             <button
               onClick={() => setFilterType('ASSEMBLY')}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === 'ASSEMBLY' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <Hammer size={14} /> Montagens
             </button>
             <button
               onClick={() => setFilterType('ASSISTANCE')}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === 'ASSISTANCE' ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <Wrench size={14} /> Assistências
             </button>
          </div>
        </div>
        
        {/* Status Filters */}
        <div className="flex items-center gap-2 w-full overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <Filter size={20} className="text-gray-400 shrink-0" />
          {['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                ${filterStatus === status 
                  ? 'bg-brand-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'}`}
            >
              {status === 'ALL' ? 'Todos os Status' : getStatusLabel(status as any)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">
            Nenhuma ordem de serviço encontrada com os filtros atuais.
          </div>
        ) : (
          filteredOrders.map(order => (
            <div 
              key={order.id} 
              onClick={() => onSelectOrder(order)}
              className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col md:flex-row gap-4 relative overflow-hidden"
            >
              {/* Colored Stripe based on Type */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${order.type === 'ASSEMBLY' ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>

              <div className="flex-1 space-y-2 pl-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{order.id}</span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${order.type === 'ASSEMBLY' ? 'bg-orange-50 text-orange-700' : 'bg-cyan-50 text-cyan-700'}`}>
                      {order.type === 'ASSEMBLY' ? <Hammer size={10} /> : <Wrench size={10} />}
                      {order.type === 'ASSEMBLY' ? 'Montagem' : 'Assistência'}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                
                <h3 className="font-semibold text-lg text-gray-900">{order.clientName}</h3>
                
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <span>{order.address}</span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>Criado: {format(new Date(order.createdAt), 'dd/MM/yyyy')}</span>
                  </div>
                  {order.technicianName && (
                    <div className="flex items-center gap-1">
                      <UserIcon size={14} />
                      <span>Téc: {order.technicianName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                     <span className={`w-2 h-2 rounded-full ${order.priority === 'HIGH' ? 'bg-red-500' : order.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                     <span>Prioridade {getPriorityLabel(order.priority)}</span>
                  </div>
                </div>

                {/* --- Post-Assembly Details Badge --- */}
                {order.isPostAssembly && order.type === 'ASSISTANCE' && (
                  <div className="mt-2 text-left">
                    <div className="inline-flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-medium text-gray-600">
                      <span className="font-bold text-gray-900 border-r border-gray-300 pr-1.5">Pós-Montagem</span>
                      <span className="flex items-center gap-1"><Layers size={10} className="text-gray-400"/> {order.relatedEnvironmentName || 'Ambiente N/A'}</span>
                      <span className="text-gray-300">•</span>
                      <span className="flex items-center gap-1"><Wrench size={10} className="text-gray-400"/> {order.assistanceCategory || 'Categoria N/A'}</span>
                      {order.relatedAssemblyFinishedAt && (
                        <>
                           <span className="text-gray-300">•</span>
                           <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1 rounded font-bold">
                              D+{Math.abs(differenceInDays(new Date(order.createdAt), new Date(order.relatedAssemblyFinishedAt)))} dias
                           </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
