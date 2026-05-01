import React, { useState, useRef, useEffect } from 'react';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { WorkOrder, WorkOrderType, Priority, User, Environment, ChecklistItem, Status } from '../types';
import { ArrowLeft, Plus, Trash, Calendar, Search, CheckSquare, Clock, ChevronDown, ListPlus, UserCog, ChevronLeft, ChevronRight, X, User as UserIcon, Layers, Hammer, Wrench, MapPin, ClipboardList, FileText } from 'lucide-react';
import { calculateEndDate } from '../services/mockData';
import { format, addMonths, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';

interface NewWorkOrderProps {
  currentUser: User;
  allUsers: User[];
  orders?: WorkOrder[];
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
        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', color: 'var(--sf-white)', borderRadius: 8 }}
      className="w-full p-3 flex justify-between items-center cursor-pointer transition-colors"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? format(new Date(value + 'T00:00:00'), 'dd/MM/yyyy') : 'Selecione uma data'}
        </span>
        <Calendar size={20} className="text-gray-400" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 rounded-xl p-4 w-[300px] animate-fade-in" style={{ background: 'var(--navy3)', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 12px 40px rgba(0,0,0,.6)' }}>
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={prevMonth} className="p-1 rounded-full" style={{ color: 'var(--muted)' }}><ChevronLeft size={20} /></button>
            <span className="font-bold capitalize" style={{ color: 'var(--sf-white)' }}>{monthName}</span>
            <button type="button" onClick={nextMonth} className="p-1 rounded-full" style={{ color: 'var(--muted)' }}><ChevronRight size={20} /></button>
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
                  style={isSelected ? { background: 'var(--blue)', color: '#fff', fontWeight: 700 } : isTodayDate ? { border: '1px solid var(--blue)', color: 'var(--cyan)', fontWeight: 700 } : { color: isCurrentMonth ? 'var(--sf-white)' : 'var(--hint)' }}
                  className="h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors hover:opacity-80"
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
              className="text-xs text-brand-600 font-bold hover:underline"
            >
              Ir para Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const NewWorkOrder: React.FC<NewWorkOrderProps> = ({ currentUser, allUsers, orders = [], onCancel, onSubmit }) => {
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

  // Assistance Origin
  const [isPostAssembly, setIsPostAssembly] = useState(false);
  const [relatedAssemblyId, setRelatedAssemblyId] = useState('');
  const [relatedEnvironmentId, setRelatedEnvironmentId] = useState('');

  // Post-Assembly Categories
  const [assistanceCategory, setAssistanceCategory] = useState('');
  const [assistanceCategoryDetail, setAssistanceCategoryDetail] = useState('');
  const [assistanceOriginReason, setAssistanceOriginReason] = useState('');
  
  const ASSISTANCE_CATEGORIES = [
    'Ajuste de Porta',
    'Ajuste de Gaveta',
    'Ferragem / Dobradiça',
    'Corrediça',
    'Nivelamento / Prumo',
    'Acabamento / Fita de borda',
    'Avaria / Peça danificada',
    'Alinhamento de módulos',
    'Travamento / Atrito',
    'Outros'
  ];

  // Assembly specific
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvDays, setNewEnvDays] = useState(1);
  const [newEnvValueBrl, setNewEnvValueBrl] = useState<string>(''); // New field for Value
  const [newEnvStartDate, setNewEnvStartDate] = useState(''); // New state for Environment Start Date
  const [newEnvTechnicianId, setNewEnvTechnicianId] = useState(''); // New state for Environment specific technician
  const [newEnvSubItems, setNewEnvSubItems] = useState<string[]>([]);
  const [newEnvSubItemInput, setNewEnvSubItemInput] = useState('');

  // PDF project file for the environment being built
  const [newEnvProjectFile, setNewEnvProjectFile] = useState<{ url: string; name: string } | null>(null);
  const newEnvProjectFileInputRef = useRef<HTMLInputElement>(null);

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

    const numericValue = newEnvValueBrl ? Number(newEnvValueBrl.replace(/[^\d,]/g, '').replace(',', '.')) : 0;
    if (numericValue < 0) {
      alert("O valor do ambiente não pode ser negativo.");
      return;
    }
    if (numericValue === 0 && currentUser.role === 'ADMIN') {
      const confirmZero = window.confirm("Valor zerado, confirmar?");
      if (!confirmZero) return;
    }

    // Logic to determine start date
    const start = newEnvStartDate || suggestedDate || new Date().toISOString();

    // Find selected technician for this environment
    const envTech = technicians.find(t => t.id === newEnvTechnicianId);

    // Create checklist
    const checklist: ChecklistItem[] = newEnvSubItems.length > 0
      ? newEnvSubItems.map((label) => ({ id: Math.random().toString(36), label, checked: false }))
      : [
        { id: Math.random().toString(36), label: 'Conferir peças', checked: false },
        { id: Math.random().toString(36), label: 'Limpeza do local', checked: false },
        { id: Math.random().toString(36), label: 'Montagem completa', checked: false }
      ];

    const env: Environment = {
      id: Math.random().toString(36),
      name: newEnvName,
      estimatedDays: newEnvDays,
      status: 'PENDING',
      checklist: checklist,
      startDate: start,
      deadlineDate: calculateEndDate(start, newEnvDays),
      value_brl: numericValue,
      // Assign specific tech
      technicianId: envTech?.id,
      technicianName: envTech?.name,
      // Project PDF (ADMIN/ASSISTANT only)
      ...(newEnvProjectFile ? { projectFileUrl: newEnvProjectFile.url, projectFileName: newEnvProjectFile.name } : {})
    };
    setEnvironments([...environments, env]);

    // Reset Form
    setNewEnvName('');
    setNewEnvDays(1);
    setNewEnvValueBrl('');
    setNewEnvStartDate('');
    setNewEnvTechnicianId(''); // Reset env tech
    setNewEnvSubItems([]);
    setNewEnvSubItemInput('');
    setNewEnvProjectFile(null);
    if (newEnvProjectFileInputRef.current) newEnvProjectFileInputRef.current.value = '';
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
      ...(type === 'ASSISTANCE' ? {
        assistanceChecklist,
        assistanceOriginReason: assistanceOriginReason as WorkOrder['assistanceOriginReason'] || undefined,
        ...(isPostAssembly && relatedAssemblyId ? {
          isPostAssembly: true,
          relatedAssemblyWorkOrderId: relatedAssemblyId,
          relatedEnvironmentId: relatedEnvironmentId === 'NAO_INFORMADO' ? undefined : relatedEnvironmentId,
          relatedEnvironmentName: relatedEnvironmentId === 'NAO_INFORMADO'
                                    ? 'Não informado'
                                    : orders.find(o => o.id === relatedAssemblyId)?.environments?.find(e => e.id === relatedEnvironmentId)?.name,
          assistanceCategory,
          assistanceCategoryDetail: assistanceCategory === 'Outros' ? assistanceCategoryDetail : undefined,
          relatedAssemblyTechnicianId: orders.find(o => o.id === relatedAssemblyId)?.environments?.find(e => e.id === relatedEnvironmentId)?.technicianId
                                       || orders.find(o => o.id === relatedAssemblyId)?.technicianId,
          relatedAssemblyFinishedAt: orders.find(o => o.id === relatedAssemblyId)?.environments?.find(e => e.id === relatedEnvironmentId)?.finished_at
                                     || orders.find(o => o.id === relatedAssemblyId)?.updatedAt
        } : {
          assistanceCategory,
          assistanceCategoryDetail: assistanceCategory === 'Outros' ? assistanceCategoryDetail : undefined,
        })
      } : {}),
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
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="Nova Ordem de Serviço"
        description="Crie uma nova solicitação de montagem ou assistência."
        icon={<Plus size={24} className="text-brand-600" />}
      />

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">

        {/* Type Selection (Standardized Toggle) */}
        <div className="flex flex-col items-center mb-6">
          <label style={{ color: 'var(--hint)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }} className="mb-2 flex items-center gap-1.5">
            <Layers size={14} /> Selecione o Tipo de Serviço
          </label>
          <div className="flex rounded-xl p-1 h-12 w-full max-w-sm" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)' }}>
            <button
              type="button"
              onClick={() => setType('ASSISTANCE')}
              style={type === 'ASSISTANCE' ? { background: 'rgba(0,212,255,.15)', color: '#00d4ff', boxShadow: '0 2px 8px rgba(0,212,255,.2)' } : { color: 'var(--muted)' }}
              className="flex-1 flex items-center justify-center gap-2 px-2 text-[14px] font-bold rounded-lg transition-all h-full"
            >
              <Wrench size={16} /> Assistência
            </button>
            <button
              type="button"
              onClick={() => setType('ASSEMBLY')}
              style={type === 'ASSEMBLY' ? { background: 'rgba(251,146,60,.15)', color: '#fb923c', boxShadow: '0 2px 8px rgba(251,146,60,.2)' } : { color: 'var(--muted)' }}
              className="flex-1 flex items-center justify-center gap-2 px-2 text-[14px] font-bold rounded-lg transition-all h-full"
            >
              <Hammer size={16} /> Montagem
            </button>
          </div>
        </div>

        <div className="card !p-5 space-y-4 shadow-sm mb-6">
          <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
            <UserIcon className="text-brand-500" size={18} /> Dados do Cliente
          </h3>

          {currentUser.role !== 'CLIENT' && (
            <div className="relative mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Buscar Cliente Cadastrado</label>
              <div className="relative">
                <input
                  className="input-field pl-10"
                  placeholder="Digite nome ou email para buscar..."
                  value={clientSearchTerm}
                  onChange={e => { setClientSearchTerm(e.target.value); setIsSearchingClient(true); }}
                  onFocus={() => setIsSearchingClient(true)}
                />
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
              </div>
              {isSearchingClient && clientSearchTerm && (
                <div className="absolute z-10 w-full rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto" style={{ background: 'var(--navy3)', border: '1px solid var(--border2)' }}>
                  {allUsers.filter(u => u.role === 'CLIENT' && (u.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(clientSearchTerm.toLowerCase()))).map(u => (
                    <button key={u.id} type="button" onClick={() => handleSelectClient(u)} className="w-full text-left p-3 border-b last:border-0 transition-colors" style={{ borderColor: 'var(--border)' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,107,255,.1)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nome</label>
              <input required value={clientName} onChange={e => setClientName(e.target.value)} className="input-field" placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Telefone</label>
              <input required value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="input-field" placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">E-mail</label>
            <input required type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="input-field" placeholder="email@exemplo.com" />
          </div>
        </div>

        <div className="card !p-5 space-y-4 shadow-sm mb-6">
          <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
             <MapPin className="text-brand-500" size={18} /> Localização
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">CEP</label>
              <input required value={cep} onChange={e => setCep(e.target.value)} className="input-field" placeholder="00000-000" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Endereço Completo</label>
              <input required value={address} onChange={e => setAddress(e.target.value)} className="input-field" placeholder="Rua, Número, Bairro, Cidade" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Ponto de Referência</label>
            <input value={reference} onChange={e => setReference(e.target.value)} className="input-field" placeholder="Próximo a..." />
          </div>
        </div>

        <div className="card !p-5 space-y-4 shadow-sm mb-6">
          <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
             <ClipboardList className="text-brand-500" size={18} /> Detalhes do Serviço
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Descrição do Problema / Serviço</label>
            <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input-field !h-auto" placeholder="Descreva o que precisa ser feito..." />
          </div>

          {type === 'ASSISTANCE' && (
            <div className="space-y-4 animate-fade-in">
              {/* Origem da Assistência */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(26,107,255,.08)', border: '1px solid rgba(26,107,255,.2)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-brand-800 text-sm">Origem da Assistência</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-brand-600 font-medium">Essa assistência é relacionada a uma montagem anterior?</span>
                    <input type="checkbox" className="w-4 h-4 text-brand-600 rounded bg-white border-gray-300 pointer-events-auto" checked={isPostAssembly} onChange={e => { setIsPostAssembly(e.target.checked); setRelatedAssemblyId(''); setRelatedEnvironmentId(''); }} />
                  </label>
                </div>
                {isPostAssembly && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase">O.S. de Montagem Relacionada</label>
                      <select required className="input-field text-sm" value={relatedAssemblyId} onChange={e => { setRelatedAssemblyId(e.target.value); setRelatedEnvironmentId(''); }}>
                        <option value="">Selecione uma montagem concluída...</option>
                        {orders.filter(o => o.type === 'ASSEMBLY' && o.status === 'COMPLETED').map(o => (
                          <option key={o.id} value={o.id}>OS nº {o.id} - {o.clientName} (Concluída em: {new Date(o.updatedAt).toLocaleDateString()})</option>
                        ))}
                      </select>
                    </div>
                    {relatedAssemblyId && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Qual Ambiente apresentou problema?</label>
                        <select required className="input-field text-sm" value={relatedEnvironmentId} onChange={e => setRelatedEnvironmentId(e.target.value)}>
                          <option value="">Selecione um ambiente...</option>
                          {orders.find(o => o.id === relatedAssemblyId)?.environments?.map(env => (
                            <option key={env.id} value={env.id}>{env.name} - Montador: {env.technicianName || 'Não especificado'}</option>
                          ))}
                          {(!orders.find(o => o.id === relatedAssemblyId)?.environments || orders.find(o => o.id === relatedAssemblyId)?.environments?.length === 0) && (
                            <option value="NAO_INFORMADO">Não informado (Montagem sem ambientes cadastrados)</option>
                          )}
                        </select>
                        {(!orders.find(o => o.id === relatedAssemblyId)?.environments || orders.find(o => o.id === relatedAssemblyId)?.environments?.length === 0) && (
                          <p className="text-[10px] text-orange-500 mt-1">A montagem selecionada não possui ambientes. Você pode continuar informando "Não informado".</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Assistance Category Field (Always visible for Assistances) */}
              <div className="p-4 rounded-xl animate-fade-in space-y-3" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-800 uppercase flex items-center gap-1">
                    Defeito / Categoria da Assistência <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="input-field text-sm"
                    value={assistanceCategory}
                    onChange={e => {
                      setAssistanceCategory(e.target.value);
                      if (e.target.value !== 'Outros') setAssistanceCategoryDetail('');
                    }}
                  >
                    <option value="">Selecione a categoria principal...</option>
                    {ASSISTANCE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                {assistanceCategory === 'Outros' && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Qual é o defeito?</label>
                    <input
                      required
                      className="input-field"
                      placeholder="Descreva o defeito não listado..."
                      value={assistanceCategoryDetail}
                      onChange={e => setAssistanceCategoryDetail(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1 pt-1 border-t border-gray-100">
                  <label className="text-xs font-semibold text-gray-800 uppercase flex items-center gap-1">
                    Origem da Falha <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-gray-400 mb-1">Identifica a responsabilidade pelo problema para análise gerencial.</p>
                  <select
                    required
                    className="input-field text-sm"
                    value={assistanceOriginReason}
                    onChange={e => setAssistanceOriginReason(e.target.value)}
                  >
                    <option value="">Selecione a origem da falha...</option>
                    <option value="OPERATIONAL">Operacional — Erro de execução / instalação</option>
                    <option value="FACTORY">Fábrica — Defeito de fabricação / peça com problema</option>
                    <option value="TRANSPORT">Transporte — Avaria ocorrida no transporte</option>
                    <option value="PROJECT">Projeto — Problema na especificação / desenho do projeto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
                      className="input-field pr-10 cursor-pointer appearance-none"
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
              <div className="p-4 rounded-xl" style={{ background: 'rgba(0,212,255,.06)', border: '1px solid rgba(0,212,255,.15)' }}>
                <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--cyan)' }}>
                  <CheckSquare size={18} /> Checklist de Serviços
                </h4>
                <div className="flex gap-2 mb-3">
                  <input
                    placeholder="Item a verificar (Ex: Regular porta)"
                    value={newChecklistItem}
                    onChange={e => setNewChecklistItem(e.target.value)}
                    className="flex-1 input-field text-sm !h-auto !p-2"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAssistanceItem(e)}
                  />
                    <Button type="button" variant="primary" onClick={handleAddAssistanceItem} className="bg-cyan-600 hover:bg-cyan-700 border-transparent text-white px-4" icon={<Plus size={18} />}>
                      Adicionar
                    </Button>
                </div>

                <div className="space-y-2">
                  {assistanceChecklist.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)' }}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
                      className="input-field pr-10 cursor-pointer appearance-none"
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

              <div className="p-4 rounded-xl" style={{ background: 'rgba(251,146,60,.07)', border: '1px solid rgba(251,146,60,.2)' }}>
                <h4 className="font-semibold mb-3 pb-2" style={{ color: '#fb923c', borderBottom: '1px solid rgba(251,146,60,.2)' }}>Adicionar Ambiente e Serviços</h4>

                <div className="space-y-3 mb-4">
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      placeholder="Nome do Ambiente (ex: Cozinha)"
                      value={newEnvName}
                      onChange={e => setNewEnvName(e.target.value)}
                      className="flex-1 input-field text-sm !h-auto !p-2"
                    />
                    <div className="flex gap-2">
                      {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
                        <input
                          type="tel"
                          inputMode="numeric"
                          placeholder="R$ 0,00"
                          value={newEnvValueBrl}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (!val) {
                              setNewEnvValueBrl('');
                              return;
                            }
                            const num = Number(val) / 100;
                            setNewEnvValueBrl(num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                          }}
                          className="w-32 input-field text-sm !h-auto !p-2"
                        />
                      )}
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="1"
                          value={newEnvDays}
                          onChange={e => setNewEnvDays(parseInt(e.target.value) || 1)}
                          className="w-full input-field text-sm !h-auto !p-2"
                          title="Dias Úteis"
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-gray-500">dias</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin & Assistant: Environment Start Date & Technician */}
                  {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
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
                            className="input-field appearance-none cursor-pointer"
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
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(251,146,60,.25)' }}>
                    <label className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: '#fb923c' }}>
                      <ListPlus size={14} /> Tarefas / Sub-tópicos do Ambiente
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        placeholder="Ex: Montar armários aéreos"
                        value={newEnvSubItemInput}
                        onChange={e => setNewEnvSubItemInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddEnvSubItem(e)}
                        className="flex-1 input-field text-xs !h-auto !p-2"
                      />
                      <Button
                        type="button"
                        onClick={handleAddEnvSubItem}
                        className="bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200 shadow-none h-10"
                      >
                        Add
                      </Button>
                    </div>

                    {/* Temporary List of Sub-items */}
                    {newEnvSubItems.length > 0 && (
                      <ul className="space-y-1 mb-2">
                        {newEnvSubItems.map((item, idx) => (
                          <li key={idx} className="flex justify-between items-center px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)' }}>
                            <span className="text-xs text-gray-700">• {item}</span>
                            <button type="button" onClick={() => removeEnvSubItem(idx)} className="text-red-400 hover:text-red-600"><Trash size={12} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* PDF Project File — ADMIN and ASSISTANT only */}
                  {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(244,63,94,.06)', border: '1px solid rgba(244,63,94,.2)' }}>
                      <label className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#fb7185' }}>
                        <FileText size={14} />
                        Projeto do Ambiente (PDF)
                      </label>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        ref={newEnvProjectFileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (reader.result) {
                              setNewEnvProjectFile({ url: reader.result as string, name: file.name });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      {newEnvProjectFile ? (
                        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                          <FileText size={16} className="text-rose-500 flex-shrink-0" />
                          <span className="text-xs font-semibold text-rose-900 truncate flex-1">{newEnvProjectFile.name}</span>
                          <button
                            type="button"
                            onClick={() => { setNewEnvProjectFile(null); if (newEnvProjectFileInputRef.current) newEnvProjectFileInputRef.current.value = ''; }}
                            className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-full transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => newEnvProjectFileInputRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors w-full justify-center"
                        >
                          <Plus size={14} />
                          Add Projeto
                        </button>
                      )}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleAddEnvironment}
                    disabled={!newEnvName}
                    fullWidth
                    className="bg-orange-600 hover:bg-orange-700 text-white border-transparent"
                    icon={<Plus size={18} />}
                  >
                    Adicionar Ambiente à O.S.
                  </Button>
                </div>

                {/* List of Added Environments */}
                {environments.length > 0 && (
                  <div className="space-y-2 pt-4" style={{ borderTop: '1px solid rgba(251,146,60,.2)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-bold text-gray-500 uppercase">Ambientes Adicionados</p>
                      {currentUser.role === 'ADMIN' && (
                        <span className="text-sm font-bold text-orange-800 bg-orange-100 px-3 py-1 rounded-full shadow-sm border border-orange-200">
                          Total: {environments.reduce((sum, e) => sum + (e.value_brl || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      )}
                    </div>
                    {environments.map((env, idx) => (
                      <div key={env.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)' }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-gray-800 block">{env.name}</span>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              {env.value_brl !== undefined && currentUser.role === 'ADMIN' && (
                                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                  {env.value_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">Previsto: {env.estimatedDays} dias úteis</span>
                              {env.startDate && (
                                <span className="text-[10px] text-brand-600 bg-brand-50 px-1 rounded">Início: {formatEnvDate(env.startDate)}</span>
                              )}
                              {env.deadlineDate && (
                                <span className="text-[10px] text-red-600 bg-red-50 px-1 rounded">Prazo: {formatEnvDate(env.deadlineDate)}</span>
                              )}
                              {env.technicianName && (
                                <span className="text-[10px] text-purple-600 bg-purple-50 px-1 rounded flex items-center gap-1">
                                  <UserIcon size={10} /> {env.technicianName}
                                </span>
                              )}
                              {env.projectFileName && (
                                <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                                  <FileText size={10} /> {env.projectFileName}
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

        <Button type="submit" fullWidth className="py-4 text-lg shadow-xl shadow-brand-100/50">
          Criar Ordem de Serviço
        </Button>

      </form>
    </div>
  );
};
