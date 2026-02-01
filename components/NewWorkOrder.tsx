import React, { useState, useRef, useEffect } from 'react';
import { WorkOrder, WorkOrderType, Priority, User, Environment, ChecklistItem, Status } from '../types';
import { ArrowLeft, Plus, Trash, Calendar, Search, CheckSquare, Clock, ChevronDown, ListPlus, UserCog, ChevronLeft, ChevronRight, X, User as UserIcon } from 'lucide-react';
import { calculateEndDate } from '../services/mockData';
import { format, addMonths, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';

interface NewWorkOrderProps {
  currentUser: User;
  allUsers: User[];
  onCancel: () => void;
  onSubmit: (order: WorkOrder) => void;
}

// --- Custom Date Picker Component ---
const DatePicker = ({ label, value, onChange }: { label: string, value: string, onChange: (date: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Replaced parseISO with new Date(value + 'T00:00:00') to avoid potential timezone shifts on date-only strings
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value + 'T00:00:00') : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => setIsOpen(!isOpen);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  // Replaced subMonths with addMonths negative
  const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));

  // Helper for startOfMonth
  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  
  // Helper for startOfWeek (defaulting to Sunday)
  const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    return d;
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth))
  });

  const handleDayClick = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentMonth);

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
        <Calendar size={12} /> {label}
      </label>
      <div 
        onClick={toggleOpen}
        className="w-full p-3 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? format(new Date(value + 'T00:00:00'), 'dd/MM/yyyy') : 'Selecione uma data'}
        </span>
        <Calendar size={20} className="text-gray-400" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-[300px] animate-fade-in">
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
            <span className="font-bold text-gray-800 capitalize">{monthName}</span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400">{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = value ? isSameDay(day, new Date(value + 'T00:00:00')) : false;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`
                    h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                    ${isSelected ? 'bg-blue-600 text-white font-bold hover:bg-blue-700' : 'hover:bg-blue-50'}
                    ${isTodayDate && !isSelected ? 'border border-blue-600 text-blue-600 font-bold' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          
          <div className="mt-3 pt-3 border-t flex justify-center">
             <button 
               type="button"
               onClick={() => { setCurrentMonth(new Date()); }}
               className="text-xs text-blue-600 font-bold hover:underline"
             >
               Ir para Hoje
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const NewWorkOrder: React.FC<NewWorkOrderProps> = ({ currentUser, allUsers, onCancel, onSubmit }) => {
  const [type, setType] = useState<WorkOrderType>('ASSISTANCE');
  const [clientName, setClientName] = useState(currentUser.role === 'CLIENT' ? currentUser.name : '');
  const [clientPhone, setClientPhone] = useState(currentUser.role === 'CLIENT' ? currentUser.phone || '' : '');
  const [clientEmail, setClientEmail] = useState(currentUser.role === 'CLIENT' ? currentUser.email : '');
  const [address, setAddress] = useState(currentUser.role === 'CLIENT' ? currentUser.address || '' : '');
  const [cep, setCep] = useState(currentUser.role === 'CLIENT' ? currentUser.cep || '' : '');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  
  // Client Search State
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  // Assistance specific
  const [suggestedDate, setSuggestedDate] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
  const [assistanceChecklist, setAssistanceChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Assembly specific
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvDays, setNewEnvDays] = useState(1);
  const [newEnvStartDate, setNewEnvStartDate] = useState(''); // New state for Environment Start Date
  const [newEnvTechnicianId, setNewEnvTechnicianId] = useState(''); // New state for Environment specific technician
  const [newEnvSubItems, setNewEnvSubItems] = useState<string[]>([]);
  const [newEnvSubItemInput, setNewEnvSubItemInput] = useState('');

  // Generate time slots: 07:00 to 20:00, 30min intervals
  const timeSlots = [];
  for (let i = 7; i <= 20; i++) {
    const hour = i.toString().padStart(2, '0');
    timeSlots.push(`${hour}:00`);
    if (i < 20) {
      timeSlots.push(`${hour}:30`);
    }
  }

  const technicians = allUsers.filter(u => u.role === 'TECHNICIAN');

  // --- Environment Checklist Logic ---
  const handleAddEnvSubItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvSubItemInput.trim()) return;
    setNewEnvSubItems([...newEnvSubItems, newEnvSubItemInput]);
    setNewEnvSubItemInput('');
  };

  const removeEnvSubItem = (index: number) => {
    setNewEnvSubItems(newEnvSubItems.filter((_, i) => i !== index));
  };

  const handleAddEnvironment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvName) return;
    
    // Logic to determine start date
    const start = newEnvStartDate || suggestedDate || new Date().toISOString();
    
    // Find selected technician for this environment
    const envTech = technicians.find(t => t.id === newEnvTechnicianId);

    // Create checklist
    const checklist: ChecklistItem[] = newEnvSubItems.length > 0 
      ? newEnvSubItems.map((label, idx) => ({ id: idx.toString(), label, checked: false }))
      : [
          { id: '1', label: 'Conferir peças', checked: false },
          { id: '2', label: 'Limpeza do local', checked: false },
          { id: '3', label: 'Montagem completa', checked: false }
        ];

    const env: Environment = {
      id: Math.random().toString(36),
      name: newEnvName,
      estimatedDays: newEnvDays,
      status: 'PENDING',
      checklist: checklist,
      startDate: start,
      deadlineDate: calculateEndDate(start, newEnvDays),
      // Assign specific tech
      technicianId: envTech?.id,
      technicianName: envTech?.name
    };
    setEnvironments([...environments, env]);
    
    // Reset Form
    setNewEnvName('');
    setNewEnvDays(1);
    setNewEnvStartDate(''); 
    setNewEnvTechnicianId(''); // Reset env tech
    setNewEnvSubItems([]);
    setNewEnvSubItemInput('');
  };
  
  const handleAddAssistanceItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;
    const item: ChecklistItem = {
      id: Math.random().toString(36),
      label: newChecklistItem,
      checked: false
    };
    setAssistanceChecklist([...assistanceChecklist, item]);
    setNewChecklistItem('');
  };

  const removeAssistanceItem = (id: string) => {
    setAssistanceChecklist(assistanceChecklist.filter(item => item.id !== id));
  };

  const formatAddress = (u: User) => {
      if (u.address && !u.street) return u.address; // Fallback to simple address if detailed missing
      if (!u.street) return '';
      return `${u.street || ''}, ${u.addressNumber || ''} ${u.complement ? '- ' + u.complement : ''}, ${u.neighborhood || ''}, ${u.city || ''} - ${u.state || ''}`;
  };

  const handleSelectClient = (u: User) => {
      setClientName(u.name);
      setClientPhone(u.phone || '');
      setClientEmail(u.email);
      setCep(u.cep || '');
      setAddress(formatAddress(u));
      setClientSearchTerm('');
      setIsSearchingClient(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let initialStatus: Status = 'OPEN';
    
    // For Assembly, if any environment has a technician, mark the whole order as assigned (so it appears in dashboards)
    if (type === 'ASSEMBLY') {
      const hasAssignedEnv = environments.some(e => e.technicianId);
      if (hasAssignedEnv) {
        initialStatus = 'ASSIGNED';
      }
    }
    
    const history = [{ action: 'O.S. Criada', timestamp: new Date().toISOString(), user: currentUser.name }];
    
    const newOrder: WorkOrder = {
      id: `OS-${Math.floor(Math.random() * 10000)}`,
      type,
      clientName,
      clientEmail,
      clientPhone,
      address,
      cep,
      referencePoint: reference,
      description,
      priority: 'MEDIUM',
      status: initialStatus,
      // No main technician assigned initially, relies on environment assignment for Assembly
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: [],
      comments: [],
      history: history,
      suggestedDate,
      suggestedTime,
      // Type specifics
      ...(type === 'ASSISTANCE' ? { assistanceChecklist } : {}),
      ...(type === 'ASSEMBLY' ? { environments } : {})
    };
    onSubmit(newOrder);
  };

  // Helper to ensure dates display correctly in local time
  const formatEnvDate = (dateString: string) => {
    // If string is YYYY-MM-DD, append T00:00:00 to force local time parsing
    // otherwise new Date('YYYY-MM-DD') is treated as UTC
    if (dateString.length === 10 && !dateString.includes('T')) {
       return format(new Date(dateString + 'T00:00:00'), 'dd/MM/yyyy');
    }
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  return (
    <div className="bg-white min-h-[calc(100vh-80px)]">
      <div className="p-4 border-b flex items-center gap-3 sticky top-0 bg-white z-20 shadow-sm">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-gray-900">Nova Ordem de Serviço</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 max-w-2xl mx-auto space-y-6">
        
        {/* Type Selection */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setType('ASSISTANCE')}
            className={`p-4 rounded-xl border-2 font-bold text-center transition-all ${type === 'ASSISTANCE' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}
          >
            Assistência
          </button>
          <button
            type="button"
            onClick={() => setType('ASSEMBLY')}
            className={`p-4 rounded-xl border-2 font-bold text-center transition-all ${type === 'ASSEMBLY' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}
          >
            Montagem
          </button>
        </div>

        {/* Client Info */}
        <div className="space-y-4 border-b pb-6">
          <h3 className="font-semibold text-gray-800">Dados do Cliente</h3>
          
          {currentUser.role !== 'CLIENT' && (
            <div className="relative mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Buscar Cliente Cadastrado</label>
                <div className="relative">
                    <input 
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        placeholder="Digite nome ou email para buscar..."
                        value={clientSearchTerm}
                        onChange={e => { setClientSearchTerm(e.target.value); setIsSearchingClient(true); }}
                        onFocus={() => setIsSearchingClient(true)}
                    />
                    <Search className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                </div>
                {isSearchingClient && clientSearchTerm && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                        {allUsers.filter(u => u.role === 'CLIENT' && (u.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(clientSearchTerm.toLowerCase()))).map(u => (
                            <button key={u.id} type="button" onClick={() => handleSelectClient(u)} className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-0 transition-colors">
                                <p className="font-bold text-gray-900">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                            </button>
                        ))}
                         {allUsers.filter(u => u.role === 'CLIENT' && (u.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(clientSearchTerm.toLowerCase()))).length === 0 && (
                             <div className="p-3 text-center text-sm text-gray-400">Nenhum cliente encontrado</div>
                         )}
                    </div>
                )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nome</label>
              <input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
               <label className="text-xs font-semibold text-gray-500 uppercase">Telefone</label>
               <input required value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="space-y-1">
             <label className="text-xs font-semibold text-gray-500 uppercase">E-mail</label>
             <input required type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" placeholder="email@exemplo.com" />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4 border-b pb-6">
          <h3 className="font-semibold text-gray-800">Localização</h3>
          <div className="grid grid-cols-3 gap-4">
             <div className="col-span-1 space-y-1">
               <label className="text-xs font-semibold text-gray-500 uppercase">CEP</label>
               <input required value={cep} onChange={e => setCep(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" placeholder="00000-000" />
             </div>
             <div className="col-span-2 space-y-1">
               <label className="text-xs font-semibold text-gray-500 uppercase">Endereço Completo</label>
               <input required value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" placeholder="Rua, Número, Bairro, Cidade" />
             </div>
          </div>
          <div className="space-y-1">
             <label className="text-xs font-semibold text-gray-500 uppercase">Ponto de Referência</label>
             <input value={reference} onChange={e => setReference(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" placeholder="Próximo a..." />
          </div>
        </div>

        {/* Details based on Type */}
        <div className="space-y-4 border-b pb-6">
           <h3 className="font-semibold text-gray-800">Detalhes do Serviço</h3>
           
           <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Descrição do Problema / Serviço</label>
              <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" placeholder="Descreva o que precisa ser feito..." />
           </div>

           {type === 'ASSISTANCE' && (
             <div className="space-y-4 animate-fade-in">
               <div className="grid grid-cols-2 gap-4">
                 
                 {/* Replaced Native Date Input with Custom DatePicker */}
                 <DatePicker 
                   label="Data Sugerida"
                   value={suggestedDate}
                   onChange={setSuggestedDate}
                 />

                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                      <Clock size={12} /> Horário
                    </label>
                    <div className="relative">
                      <select 
                        value={suggestedTime} 
                        onChange={e => setSuggestedTime(e.target.value)} 
                        className="w-full p-3 pr-10 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 appearance-none cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                    </div>
                 </div>
               </div>

               {/* Assistance Checklist Builder */}
               <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100">
                  <h4 className="font-semibold text-cyan-800 mb-3 flex items-center gap-2">
                    <CheckSquare size={18} /> Checklist de Serviços
                  </h4>
                  <div className="flex gap-2 mb-3">
                    <input 
                      placeholder="Item a verificar (Ex: Regular porta)" 
                      value={newChecklistItem} 
                      onChange={e => setNewChecklistItem(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAssistanceItem(e)}
                    />
                    <button type="button" onClick={handleAddAssistanceItem} className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {assistanceChecklist.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                        <span className="text-gray-800 text-sm">{item.label}</span>
                        <button 
                          type="button" 
                          onClick={() => removeAssistanceItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                    {assistanceChecklist.length === 0 && <p className="text-xs text-center text-gray-500">Nenhum item adicionado ao checklist.</p>}
                  </div>
               </div>
             </div>
           )}

           {type === 'ASSEMBLY' && (
             <div className="space-y-4 animate-fade-in">
               <div className="grid grid-cols-2 gap-4">
                 
                 {/* Replaced Native Date Input with Custom DatePicker */}
                 <DatePicker 
                   label="Data de Início (Geral)"
                   value={suggestedDate}
                   onChange={setSuggestedDate}
                 />

                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                      <Clock size={12} /> Horário
                    </label>
                    <div className="relative">
                      <select 
                        value={suggestedTime} 
                        onChange={e => setSuggestedTime(e.target.value)} 
                        className="w-full p-3 pr-10 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 appearance-none cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                    </div>
                 </div>
               </div>

               <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <h4 className="font-semibold text-orange-800 mb-3 border-b border-orange-200 pb-2">Adicionar Ambiente e Serviços</h4>
                  
                  {/* Create Environment Form */}
                  <div className="space-y-3 mb-4">
                    <div className="flex gap-2">
                      <input 
                        placeholder="Nome do Ambiente (ex: Cozinha)" 
                        value={newEnvName} 
                        onChange={e => setNewEnvName(e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                      />
                      <div className="relative w-24">
                        <input 
                          type="number" 
                          min="1" 
                          value={newEnvDays} 
                          onChange={e => setNewEnvDays(parseInt(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          title="Dias Úteis"
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-gray-500">dias</span>
                      </div>
                    </div>
                    
                    {/* Admin Only: Environment Start Date & Technician */}
                    {currentUser.role === 'ADMIN' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                           <DatePicker 
                              label="Data de Início do Ambiente"
                              value={newEnvStartDate}
                              onChange={setNewEnvStartDate}
                           />
                           
                           {/* Specific Technician for Environment */}
                           <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                                <UserIcon size={12} /> Técnico (Opcional)
                              </label>
                              <div className="relative">
                                <select 
                                  value={newEnvTechnicianId} 
                                  onChange={e => setNewEnvTechnicianId(e.target.value)} 
                                  className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 appearance-none cursor-pointer"
                                >
                                  <option value="">Selecione um técnico...</option>
                                  {technicians.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                              </div>
                           </div>
                        </div>
                    )}

                    {/* Sub-items Builder */}
                    <div className="bg-white/50 p-3 rounded-lg border border-orange-200">
                       <label className="text-xs font-bold text-orange-800 mb-1 flex items-center gap-1">
                          <ListPlus size={14}/> Tarefas / Sub-tópicos do Ambiente
                       </label>
                       <div className="flex gap-2 mb-2">
                          <input 
                             placeholder="Ex: Montar armários aéreos"
                             value={newEnvSubItemInput}
                             onChange={e => setNewEnvSubItemInput(e.target.value)}
                             onKeyDown={e => e.key === 'Enter' && handleAddEnvSubItem(e)}
                             className="flex-1 p-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-900"
                          />
                          <button 
                            type="button" 
                            onClick={handleAddEnvSubItem}
                            className="bg-orange-200 text-orange-800 px-3 rounded-lg text-xs font-bold hover:bg-orange-300"
                          >
                            Add
                          </button>
                       </div>
                       
                       {/* Temporary List of Sub-items */}
                       {newEnvSubItems.length > 0 && (
                         <ul className="space-y-1 mb-2">
                           {newEnvSubItems.map((item, idx) => (
                             <li key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-gray-100 shadow-sm">
                               <span className="text-xs text-gray-700">• {item}</span>
                               <button type="button" onClick={() => removeEnvSubItem(idx)} className="text-red-400 hover:text-red-600"><Trash size={12}/></button>
                             </li>
                           ))}
                         </ul>
                       )}
                    </div>

                    <button 
                      type="button" 
                      onClick={handleAddEnvironment} 
                      disabled={!newEnvName}
                      className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Adicionar Ambiente à O.S.
                    </button>
                  </div>

                  {/* List of Added Environments */}
                  {environments.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-orange-200">
                      <p className="text-xs font-bold text-gray-500 uppercase">Ambientes Adicionados</p>
                      {environments.map((env, idx) => (
                        <div key={env.id} className="bg-white p-3 rounded-lg border shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-gray-800 block">{env.name}</span>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-xs text-gray-500">Previsto: {env.estimatedDays} dias úteis</span>
                                {env.startDate && (
                                   <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">Início: {formatEnvDate(env.startDate)}</span>
                                )}
                                {env.deadlineDate && (
                                   <span className="text-[10px] text-red-600 bg-red-50 px-1 rounded">Prazo: {formatEnvDate(env.deadlineDate)}</span>
                                )}
                                {env.technicianName && (
                                   <span className="text-[10px] text-purple-600 bg-purple-50 px-1 rounded flex items-center gap-1">
                                     <UserIcon size={10} /> {env.technicianName}
                                   </span>
                                )}
                              </div>
                              {env.checklist.length > 0 && (
                                <div className="mt-2 pl-2 border-l-2 border-orange-100">
                                  {env.checklist.map(c => (
                                    <p key={c.id} className="text-[10px] text-gray-600 truncate">• {c.label}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setEnvironments(environments.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {environments.length === 0 && <p className="text-xs text-center text-gray-500 mt-2">Nenhum ambiente adicionado ainda.</p>}
               </div>
             </div>
           )}
        </div>

        <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg">
          Criar Ordem de Serviço
        </button>

      </form>
    </div>
  );
};