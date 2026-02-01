import React, { useState, useMemo, useEffect } from 'react';
import { WorkOrder, WorkOrderType, User, ChecklistItem } from '../types';
import { getStatusColor, getStatusLabel } from '../services/mockData';
import { MapPin, Calendar, User as UserIcon, Mail, Phone, Clock, FileText, CheckSquare, Hammer, Wrench, AlertCircle, Package, ChevronDown, ChevronUp, Filter, X, Layers, ArrowRight } from 'lucide-react';
import { format, isValid, endOfDay } from 'date-fns';

interface GeneratedOrdersProps {
  orders: WorkOrder[];
  currentUser: User;
  onSelectOrder?: (order: WorkOrder) => void;
  initialFilters?: { status: string; type: WorkOrderType } | null;
}

const ProgressBar = ({ items }: { items: ChecklistItem[] }) => {
  if (!items || items.length === 0) return null;
  const checkedCount = items.filter(i => i.checked).length;
  const progress = Math.round((checkedCount / items.length) * 100);

  let colorClass = 'bg-blue-600';
  if (progress === 100) colorClass = 'bg-green-500';
  else if (progress > 0) colorClass = 'bg-blue-500';
  else colorClass = 'bg-gray-300';

  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
      <div 
        className={`h-1.5 rounded-full transition-all duration-500 ease-out ${colorClass}`} 
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

export const GeneratedOrders: React.FC<GeneratedOrdersProps> = ({ orders, currentUser, onSelectOrder, initialFilters }) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Filter States
  const [filterType, setFilterType] = useState<'ALL' | WorkOrderType>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Apply Initial Filters if provided
  useEffect(() => {
    if (initialFilters) {
      setFilterStatus(initialFilters.status);
      setFilterType(initialFilters.type);
    }
  }, [initialFilters]);

  const toggleOrder = (id: string) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };
  
  const safeFormat = (dateInput: string | Date | undefined, fmt: string = 'dd/MM/yyyy') => {
    if (!dateInput) return 'Não informado';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return isValid(d) ? format(d, fmt) : 'Data Inválida';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    let date = new Date(dateString);
    if (isNaN(date.getTime()) || (dateString.length === 10 && !dateString.includes('T'))) {
        date = new Date(dateString + 'T00:00:00');
    }
    return isValid(date) ? format(date, 'dd/MM/yyyy') : dateString;
  };

  // Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 0. Security / Role Filtering
      if (currentUser.role === 'CLIENT' && order.clientEmail !== currentUser.email) return false;
      
      // Allow access if user is the main technician OR assigned to specific environments
      if (currentUser.role === 'TECHNICIAN') {
         const isMainTech = order.technicianId === currentUser.id;
         const isEnvTech = order.environments?.some(env => env.technicianId === currentUser.id);
         
         if (!isMainTech && !isEnvTech) return false;
      }

      // 1. Filter by Type
      if (filterType !== 'ALL' && order.type !== filterType) return false;

      // 2. Filter by Status
      if (filterStatus !== 'ALL' && order.status !== filterStatus) return false;

      // 3. Filter by Date Range (Created At)
      if (dateStart || dateEnd) {
        // order.createdAt is full ISO string (Z-terminated typically in this mock)
        const orderDate = new Date(order.createdAt);
        
        if (dateStart) {
          // Equivalent to startOfDay(parseISO(dateStart))
          // dateStart is YYYY-MM-DD. Append T00:00:00 for local start of day.
          const start = new Date(dateStart + 'T00:00:00');
          if (isValid(start) && orderDate < start) return false;
        }
        
        if (dateEnd) {
          // Equivalent to endOfDay(parseISO(dateEnd))
          const end = endOfDay(new Date(dateEnd + 'T00:00:00'));
          if (isValid(end) && orderDate > end) return false;
        }
      }

      return true;
    });
  }, [orders, currentUser, filterType, filterStatus, dateStart, dateEnd]);

  const clearFilters = () => {
    setFilterType('ALL');
    setFilterStatus('ALL');
    setDateStart('');
    setDateEnd('');
  };

  const hasActiveFilters = filterType !== 'ALL' || filterStatus !== 'ALL' || dateStart !== '' || dateEnd !== '';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-3 rounded-xl">
             <FileText className="text-indigo-600" size={24} />
          </div>
          <div>
             <h2 className="text-2xl font-bold text-gray-800">Ordens Geradas</h2>
             <p className="text-gray-500">Histórico detalhado de solicitações.</p>
          </div>
        </div>
      </div>

      {/* --- Filter Bar --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          
          {/* Type Filter */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
             <button
               onClick={() => setFilterType('ALL')}
               className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <Layers size={14} /> Todas
             </button>
             <button
               onClick={() => setFilterType('ASSEMBLY')}
               className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all ${filterType === 'ASSEMBLY' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <Hammer size={14} /> <span className="hidden sm:inline">Montagens</span><span className="sm:hidden">Mont.</span>
             </button>
             <button
               onClick={() => setFilterType('ASSISTANCE')}
               className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all ${filterType === 'ASSISTANCE' ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <Wrench size={14} /> <span className="hidden sm:inline">Assistências</span><span className="sm:hidden">Assist.</span>
             </button>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
             <div className="relative flex-1">
               <span className="absolute left-3 top-2.5 pointer-events-none text-gray-600"><Calendar size={14}/></span>
               <input 
                 type="date" 
                 value={dateStart}
                 onChange={(e) => setDateStart(e.target.value)}
                 className="pl-9 pr-2 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-lg text-xs w-full focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-colors hover:bg-white focus:bg-white"
                 style={{ colorScheme: 'light' }}
               />
             </div>
             <span className="text-gray-600 text-xs font-bold shrink-0">até</span>
             <div className="relative flex-1">
               <span className="absolute left-3 top-2.5 pointer-events-none text-gray-600"><Calendar size={14}/></span>
               <input 
                 type="date" 
                 value={dateEnd}
                 onChange={(e) => setDateEnd(e.target.value)}
                 className="pl-9 pr-2 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-lg text-xs w-full focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-colors hover:bg-white focus:bg-white"
                 style={{ colorScheme: 'light' }}
               />
             </div>
          </div>
        </div>

        {/* Status Filter & Clear Row */}
        <div className="flex items-start gap-2 pt-3 border-t border-gray-100">
           {/* Icon */}
           <Filter size={18} className="text-gray-400 shrink-0 mt-1.5" />
           
           {/* Wrapped Status List */}
           <div className="flex flex-wrap gap-2 w-full">
              {['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors border shadow-sm
                    ${filterStatus === status 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {status === 'ALL' ? 'Todos' : getStatusLabel(status as any)}
                </button>
              ))}
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                 <button 
                   onClick={clearFilters}
                   className="px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 shadow-sm"
                   title="Limpar Filtros"
                 >
                   <X size={12} /> Limpar
                 </button>
               )}
           </div>
        </div>
      </div>

      {/* --- Orders List --- */}
      <div className="flex flex-col gap-4">
        {filteredOrders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const isAssembly = order.type === 'ASSEMBLY';

          // Determine visible environments based on user role and assignment
          let visibleEnvironments = order.environments || [];
          if (currentUser.role === 'TECHNICIAN' && isAssembly) {
            // If the technician is NOT the main lead, filter to show only their assigned environments
            if (order.technicianId !== currentUser.id) {
               visibleEnvironments = visibleEnvironments.filter(env => env.technicianId === currentUser.id);
            }
          }

          return (
            <div 
              key={order.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              {/* Summary Card (List View) */}
              <div 
                onClick={() => toggleOrder(order.id)}
                className="p-5 relative cursor-pointer group"
              >
                 {/* Left Colored Stripe */}
                 <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isAssembly ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>

                 <div className="pl-3">
                    {/* Header Row: ID, Badge, Status (Wrappable for Mobile Harmony) */}
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex flex-wrap items-center gap-2 pr-2">
                          <span className="font-bold text-gray-900 text-lg">{order.id}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 whitespace-nowrap
                            ${isAssembly ? 'bg-orange-50 text-orange-700' : 'bg-cyan-50 text-cyan-700'}`}>
                            {isAssembly ? <Hammer size={12}/> : <Wrench size={12}/>}
                            {isAssembly ? 'Montagem' : 'Assistência'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                         </span>
                       </div>
                       
                       <div className="shrink-0 mt-1">
                         {isExpanded ? <ChevronUp className="text-gray-400" size={20}/> : <ChevronDown className="text-gray-400" size={20}/>}
                       </div>
                    </div>

                    {/* Client Name */}
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{order.clientName}</h3>

                    {/* Address Line */}
                    <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                       <MapPin size={16} className="mt-0.5 shrink-0 text-gray-400" />
                       <span className="line-clamp-1">{order.address}</span>
                    </div>

                    {/* Footer Row: Date & Technician */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                       <div className="flex items-center gap-1.5">
                          <Calendar size={16} className="text-gray-400"/>
                          {/* Replaced parseISO with new Date(order.createdAt) */}
                          <span>Criado: {safeFormat(order.createdAt)}</span>
                       </div>
                       
                       {/* Display Assigned Technician if exists */}
                       {order.technicianName && (
                         <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            <UserIcon size={14} className="text-blue-500"/>
                            <span className="text-gray-700 font-medium text-xs">Téc: {order.technicianName}</span>
                         </div>
                       )}
                    </div>
                 </div>
              </div>

              {/* Expanded Details Section */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/30 p-6 pl-8 animate-fade-in relative">
                   {onSelectOrder && (
                     <div className="flex justify-end mb-4">
                       <button 
                         onClick={(e) => { e.stopPropagation(); onSelectOrder(order); }}
                         className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors"
                       >
                         Gerenciar Ordem <ArrowRight size={16}/>
                       </button>
                     </div>
                   )}

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      
                      {/* Left Column: Client & Address Details */}
                      <div className="space-y-6">
                         <div className="space-y-2">
                            {/* Updated Colors for Visibility */}
                            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                              <UserIcon size={14}/> Dados de Contato
                            </h4>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 text-sm space-y-2 shadow-sm">
                              <p className="flex items-center gap-2 text-gray-800 font-medium">
                                <Mail size={16} className="text-blue-500"/> {order.clientEmail}
                              </p>
                              <p className="flex items-center gap-2 text-gray-800 font-medium">
                                <Phone size={16} className="text-blue-500"/> {order.clientPhone}
                              </p>
                            </div>
                         </div>

                         <div className="space-y-2">
                            {/* Updated Colors for Visibility */}
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={14}/> Endereço Detalhado
                            </h4>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 text-sm shadow-sm">
                              <p className="font-bold text-gray-900">{order.address}</p>
                              <div className="flex gap-4 mt-1 text-xs text-gray-600 font-semibold">
                                 <span>CEP: {order.cep}</span>
                                 {order.referencePoint && <span>Ref: {order.referencePoint}</span>}
                              </div>
                           </div>
                         </div>
                      </div>

                      {/* Right Column: Service Details */}
                      <div className="space-y-6">
                         <div className="space-y-2">
                            {/* Updated Colors for Visibility */}
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                              <AlertCircle size={14}/> Descrição do Pedido
                            </h4>
                            {/* Improved Visibility: Darker Text and Border */}
                            <div className="text-sm text-gray-900 font-medium bg-yellow-50 p-3 rounded-lg border border-yellow-200 italic shadow-sm">
                               "{order.description}"
                            </div>
                         </div>

                         {/* Date Preference */}
                         {(order.suggestedDate || order.suggestedTime) && (
                           <div className="flex gap-4">
                              {order.suggestedDate && (
                                <div className="flex-1 bg-blue-50 p-2 rounded-lg border border-blue-100 flex items-center gap-2 text-sm text-blue-900">
                                  <Calendar size={16} className="text-blue-500"/> Data: <strong>{formatDate(order.suggestedDate)}</strong>
                                </div>
                              )}
                              {order.suggestedTime && (
                                <div className="flex-1 bg-blue-50 p-2 rounded-lg border border-blue-100 flex items-center gap-2 text-sm text-blue-900">
                                  <Clock size={16} className="text-blue-500"/> Hora: <strong>{order.suggestedTime}</strong>
                                </div>
                              )}
                           </div>
                         )}

                         {/* SPECIFIC: ASSISTANCE CHECKLIST */}
                         {order.type === 'ASSISTANCE' && order.assistanceChecklist && order.assistanceChecklist.length > 0 && (
                           <div className="space-y-2 pt-2 border-t border-dashed">
                              <h4 className="text-xs font-bold text-cyan-700 uppercase tracking-wider flex items-center gap-1">
                                <CheckSquare size={14}/> Checklist de Assistência
                              </h4>
                              
                              {/* ADDED PROGRESS BAR */}
                              <ProgressBar items={order.assistanceChecklist} />

                              <ul className="space-y-1">
                                {order.assistanceChecklist.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-800 bg-cyan-50/50 p-2 rounded">
                                     <div className={`mt-1 w-2 h-2 rounded-full ${item.checked ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                     {item.label}
                                  </li>
                                ))}
                              </ul>
                           </div>
                         )}

                         {/* SPECIFIC: ASSEMBLY ENVIRONMENTS */}
                         {isAssembly && visibleEnvironments.length > 0 && (
                           <div className="space-y-3 pt-2 border-t border-dashed">
                              <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1">
                                <Package size={14}/> Ambientes & Tarefas
                              </h4>
                              <div className="grid grid-cols-1 gap-3">
                                {visibleEnvironments.map((env, idx) => (
                                  <div key={idx} className="bg-orange-50/30 border border-orange-100 rounded-lg p-3">
                                     <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-gray-900 text-sm">{env.name}</span>
                                        <span className="text-[10px] bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                                          Est. {env.estimatedDays} dias
                                        </span>
                                     </div>
                                     {env.technicianName && (
                                        <div className="text-[10px] bg-white border border-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-bold mb-2 inline-flex items-center gap-1 w-fit">
                                            <UserIcon size={10}/> {env.technicianName}
                                        </div>
                                     )}
                                     
                                     {/* ADDED PROGRESS BAR FOR ENVIRONMENTS */}
                                     {env.checklist && <ProgressBar items={env.checklist} />}

                                     {env.checklist.length > 0 ? (
                                       <ul className="space-y-1 pl-1 mt-2">
                                         {env.checklist.map((item, cIdx) => (
                                           <li key={cIdx} className="text-xs text-gray-700 font-medium flex items-center gap-1.5">
                                             <div className={`w-1.5 h-1.5 rounded-full ${item.checked ? 'bg-green-500' : 'bg-orange-400'}`}></div>
                                             {item.label}
                                           </li>
                                         ))}
                                       </ul>
                                     ) : (
                                       <p className="text-xs text-gray-500 italic">Sem tarefas especificadas.</p>
                                     )}
                                  </div>
                                ))}
                              </div>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {filteredOrders.length === 0 && (
         <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <Filter className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-gray-500 font-medium">Nenhum resultado encontrado.</p>
            <p className="text-sm text-gray-400 mb-4">Tente ajustar os filtros selecionados.</p>
            <button onClick={clearFilters} className="text-blue-600 hover:underline text-sm font-bold">Limpar Filtros</button>
         </div>
      )}
    </div>
  );
};