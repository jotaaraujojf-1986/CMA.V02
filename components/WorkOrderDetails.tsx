import React, { useState, useRef, useEffect } from 'react';
import { WorkOrder, User, Comment, Environment, Status, Rating, ChecklistItem } from '../types';
import { getStatusColor, getStatusLabel, MOCK_USERS, calculateEndDate } from '../services/mockData';
import { ArrowLeft, Send, Paperclip, CheckSquare, Clock, MapPin, User as UserIcon, Calendar, Camera, XCircle, CheckCircle, AlertTriangle, Star, X, Pencil, Trash, Save, Clipboard, ChevronLeft, ChevronRight, ChevronDown, Plus, MinusCircle, BarChart3, Lock, UserCheck, Sparkles, MessageCircle, PackageCheck, Loader2 } from 'lucide-react';
import { format, isValid, addMonths, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';

interface WorkOrderDetailsProps {
  order: WorkOrder;
  currentUser: User;
  onBack: () => void;
  onUpdateOrder: (updatedOrder: WorkOrder) => void;
  onDeleteOrder: (id: string) => void;
  allTechnicians: User[];
}

// --- Custom Date Picker Component ---
const DatePicker = ({ label, value, onChange }: { label: string, value: string, onChange: (date: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value + 'T00:00:00') : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => setIsOpen(!isOpen);

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
  const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));

  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
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
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
            <span className="font-bold text-gray-800 capitalize">{monthName}</span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400">{d}</div>
            ))}
          </div>
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
             <button type="button" onClick={() => { setCurrentMonth(new Date()); }} className="text-xs text-blue-600 font-bold hover:underline">
               Ir para Hoje
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Progress Bar Component ---
const ProgressBar = ({ items }: { items: ChecklistItem[] }) => {
  if (!items || items.length === 0) return null;
  const checkedCount = items.filter(i => i.checked).length;
  const progress = Math.round((checkedCount / items.length) * 100);

  let colorClass = 'bg-blue-600';
  if (progress === 100) colorClass = 'bg-green-500';
  else if (progress > 0) colorClass = 'bg-blue-500';
  else colorClass = 'bg-gray-300';

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
          <BarChart3 size={12} /> Progresso
        </span>
        <span className={`text-xs font-bold ${progress === 100 ? 'text-green-600' : 'text-gray-600'}`}>
          {progress}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-200">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${colorClass}`} 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export const WorkOrderDetails: React.FC<WorkOrderDetailsProps> = ({ order, currentUser, onBack, onUpdateOrder, onDeleteOrder, allTechnicians }) => {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'CHAT' | 'ENVIRONMENTS'>('DETAILS');
  const [newMessage, setNewMessage] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  // Signature Modal
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signaturePassword, setSignaturePassword] = useState('');
  const [signatureError, setSignatureError] = useState('');
  
  // Rating Prompt Modal
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const ratingRef = useRef<HTMLDivElement>(null);

  // Admin Editing State
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    clientName: order.clientName,
    clientPhone: order.clientPhone,
    address: order.address,
    cep: order.cep,
    referencePoint: order.referencePoint,
    description: order.description,
    suggestedDate: order.suggestedDate || '',
    suggestedTime: order.suggestedTime || '',
    assistanceChecklist: order.assistanceChecklist || [],
    environments: order.environments || []
  });

  const [envNewItemTexts, setEnvNewItemTexts] = useState<{[key: number]: string}>({});
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    if (isEditing) {
       setEditForm({
        clientName: order.clientName,
        clientPhone: order.clientPhone,
        address: order.address,
        cep: order.cep,
        referencePoint: order.referencePoint,
        description: order.description,
        suggestedDate: order.suggestedDate || '',
        suggestedTime: order.suggestedTime || '',
        assistanceChecklist: order.assistanceChecklist || [],
        environments: order.environments || []
       });
    }
  }, [isEditing, order]);

  const timeSlots = [];
  for (let i = 7; i <= 20; i++) {
    const hour = i.toString().padStart(2, '0');
    timeSlots.push(`${hour}:00`);
    if (i < 20) {
      timeSlots.push(`${hour}:30`);
    }
  }

  const [attachment, setAttachment] = useState<{ preview: string; type: 'image' | 'video' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [ratingCriteria, setRatingCriteria] = useState({
    punctuality: 0,
    care: 0,
    cleanliness: 0,
    communication: 0
  });
  const [ratingComment, setRatingComment] = useState('');
  
  const calculatedStars = Math.round(
    (ratingCriteria.punctuality + ratingCriteria.care + ratingCriteria.cleanliness + ratingCriteria.communication) / 4
  ) || 0;

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'CHAT') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, order.comments]);
  
  const safeFormat = (dateInput: string | Date | undefined, fmt: string = 'dd/MM/yyyy') => {
    if (!dateInput) return '';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (typeof dateInput === 'string' && dateInput.length === 10 && !dateInput.includes('T')) {
       const localD = new Date(dateInput + 'T00:00:00');
       return isValid(localD) ? format(localD, fmt) : 'Data Inválida';
    }
    return isValid(d) ? format(d, fmt) : 'Data Inválida';
  };

  const handleAssignTechnician = (techId: string) => {
    const tech = allTechnicians.find(t => t.id === techId);
    if (!tech) return;
    const newStatus = order.status === 'OPEN' ? 'ASSIGNED' : order.status;
    const updated: WorkOrder = {
      ...order,
      status: newStatus,
      technicianId: tech.id,
      technicianName: tech.name,
      updatedAt: new Date().toISOString(),
      history: [...order.history, { action: `Técnico alterado para ${tech.name}`, timestamp: new Date().toISOString(), user: currentUser.name }]
    };
    onUpdateOrder(updated);
  };

  const handleStatusChange = (newStatus: Status) => {
     const updated: WorkOrder = {
      ...order,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      history: [...order.history, { action: `Status alterado para ${getStatusLabel(newStatus)}`, timestamp: new Date().toISOString(), user: currentUser.name }]
    };
    onUpdateOrder(updated);
  };

  const handleRequestReview = () => {
    const updated: WorkOrder = {
      ...order,
      status: 'PENDING_REVIEW',
      updatedAt: new Date().toISOString(),
      history: [...order.history, { action: `Serviço finalizado. Aguardando aprovação do cliente.`, timestamp: new Date().toISOString(), user: currentUser.name }]
    };
    onUpdateOrder(updated);
  };

  const handleSignatureSubmit = () => {
     if (signaturePassword !== currentUser.password) {
        setSignatureError('Senha incorreta.');
        return;
     }

     const updated: WorkOrder = {
       ...order,
       status: 'COMPLETED',
       updatedAt: new Date().toISOString(),
       clientConfirmation: {
          confirmedAt: new Date().toISOString(),
          method: 'PASSWORD'
       },
       history: [...order.history, { action: `Conclusão confirmada via Assinatura Digital`, timestamp: new Date().toISOString(), user: currentUser.name }]
     };
     onUpdateOrder(updated);
     setShowSignatureModal(false);
     setSignaturePassword('');
     if (currentUser.role === 'CLIENT') {
       setShowRatingPrompt(true);
     }
  };

  const handleGoToRating = () => {
    setShowRatingPrompt(false);
    setActiveTab('DETAILS');
    setTimeout(() => {
      ratingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleCancel = () => {
    if (!cancelReason) return;
    const updated: WorkOrder = {
      ...order,
      status: 'CANCELLED',
      cancellationReason: cancelReason,
      updatedAt: new Date().toISOString(),
      history: [...order.history, { action: `Cancelada. Motivo: ${cancelReason}`, timestamp: new Date().toISOString(), user: currentUser.name }]
    };
    onUpdateOrder(updated);
    setShowCancelModal(false);
  };

  const handleDelete = () => {
    onDeleteOrder(order.id);
  };

  const handleSaveEdit = () => {
    const updated: WorkOrder = {
      ...order,
      ...editForm,
      updatedAt: new Date().toISOString(),
      history: [...order.history, { action: 'Dados da O.S. editados pelo Admin', timestamp: new Date().toISOString(), user: currentUser.name }]
    };
    onUpdateOrder(updated);
    setIsEditing(false);
  };

  const handleAddAssistanceItem = () => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = { id: Math.random().toString(36), label: newItemText, checked: false };
    setEditForm(prev => ({ ...prev, assistanceChecklist: [...prev.assistanceChecklist, newItem] }));
    setNewItemText('');
  };

  const handleRemoveAssistanceItem = (id: string) => {
    setEditForm(prev => ({ ...prev, assistanceChecklist: prev.assistanceChecklist.filter(item => item.id !== id) }));
  };

  const handleAddEnvItem = (envIndex: number) => {
    const text = envNewItemTexts[envIndex];
    if (!text?.trim()) return;
    const newEnvs = [...editForm.environments];
    const newItem: ChecklistItem = { id: Math.random().toString(36), label: text, checked: false };
    newEnvs[envIndex] = { ...newEnvs[envIndex], checklist: [...newEnvs[envIndex].checklist, newItem] };
    setEditForm(prev => ({ ...prev, environments: newEnvs }));
    setEnvNewItemTexts(prev => ({ ...prev, [envIndex]: '' }));
  };

  const handleRemoveEnvItem = (envIndex: number, itemId: string) => {
    const newEnvs = [...editForm.environments];
    newEnvs[envIndex] = { ...newEnvs[envIndex], checklist: newEnvs[envIndex].checklist.filter(i => i.id !== itemId) };
    setEditForm(prev => ({ ...prev, environments: newEnvs }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const reader = new FileReader();
    
    reader.onloadend = () => {
      if (reader.result) {
        setAttachment({ preview: reader.result as string, type });
      }
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      alert('Erro ao carregar arquivo.');
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() && !attachment) return;

    const comment: Comment = {
      id: Math.random().toString(36),
      userId: currentUser.id,
      userName: currentUser.name,
      text: newMessage,
      timestamp: new Date(),
      ...(attachment ? {
        attachmentUrl: attachment.preview,
        attachmentType: attachment.type
      } : {})
    };

    const updated: WorkOrder = {
      ...order,
      comments: [...order.comments, comment],
      updatedAt: new Date().toISOString()
    };
    onUpdateOrder(updated);
    
    setNewMessage('');
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEnvironmentCheck = (envIndex: number, checkId: string) => {
    if (!order.environments) return;
    const newEnvs = [...order.environments];
    const item = newEnvs[envIndex].checklist.find(c => c.id === checkId);
    if (item) item.checked = !item.checked;
    const updated: WorkOrder = { ...order, environments: newEnvs };
    onUpdateOrder(updated);
  };

  const handleAssistanceCheck = (itemId: string) => {
    if (!order.assistanceChecklist) return;
    const newChecklist = order.assistanceChecklist.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    const updated: WorkOrder = { ...order, assistanceChecklist: newChecklist };
    onUpdateOrder(updated);
  };

  const handleEnvironmentFinish = (envIndex: number) => {
    if (!order.environments) return;
     const newEnvs = [...order.environments];
     const env = newEnvs[envIndex];
     env.status = 'COMPLETED';
     env.completedDate = new Date().toISOString();
     const updated: WorkOrder = {
       ...order,
       environments: newEnvs,
       history: [...order.history, { action: `Ambiente ${env.name} finalizado`, timestamp: new Date().toISOString(), user: currentUser.name }]
     };
     onUpdateOrder(updated);
  };
  
  const handleSubmitRating = () => {
    if (Object.values(ratingCriteria).some(val => val === 0)) {
        alert("Por favor, avalie todos os critérios.");
        return;
    }
    const rating: Rating = {
      stars: calculatedStars,
      ...ratingCriteria,
      comment: ratingComment,
      createdAt: new Date().toISOString()
    };
    const updated: WorkOrder = {
      ...order,
      rating: rating,
      history: [...order.history, { action: `Avaliação registrada (${calculatedStars} estrelas)`, timestamp: new Date().toISOString(), user: currentUser.name }]
    };
    onUpdateOrder(updated);
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 text-sm font-medium border-b-2 flex justify-center items-center gap-2
        ${activeTab === id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
  
  const StarRating = ({ value, readOnly = false, onChange, size = 20 }: { value: number, readOnly?: boolean, onChange?: (val: number) => void, size?: number }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} disabled={readOnly} onClick={() => onChange && onChange(star)} className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}>
          <Star size={size} className={`${star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-white min-h-[calc(100vh-100px)] flex flex-col">
      <div className="p-3 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-white z-20 shadow-sm gap-3 sm:gap-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ArrowLeft size={24} /></button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{order.id}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.type === 'ASSEMBLY' ? 'bg-orange-100 text-orange-800' : 'bg-cyan-100 text-cyan-800'}`}>
                {order.type === 'ASSEMBLY' ? 'MONTAGEM' : 'ASSISTÊNCIA'}
              </span>
            </div>
            <p className="text-sm text-gray-500 line-clamp-1">{order.clientName}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 w-full sm:w-auto border-t sm:border-none pt-2 sm:pt-0 border-gray-100">
           {currentUser.role === 'ADMIN' && (
             <div className="flex items-center gap-2 mr-2">
                {isEditing ? (
                  <button onClick={handleSaveEdit} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-full" title="Salvar Edição"><Save size={20} /></button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" title="Editar Ordem"><Pencil size={20} /></button>
                )}
                <button onClick={() => setShowDeleteModal(true)} className="p-2 text-red-600 hover:bg-red-50 rounded-full" title="Excluir Ordem"><Trash size={20} /></button>
             </div>
           )}
           <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</div>
        </div>
      </div>

      <div className="flex border-b bg-gray-50">
        <TabButton id="DETAILS" label="Detalhes" icon={Clipboard} />
        {order.type === 'ASSEMBLY' && <TabButton id="ENVIRONMENTS" label="Ambientes" icon={CheckSquare} />}
        <TabButton id="CHAT" label="Chat / Fotos" icon={Send} />
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
        {activeTab === 'DETAILS' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800 border-b pb-2 mb-2">Ações Rápidas</h3>
              {currentUser.role === 'ADMIN' && (order.status === 'OPEN' || order.status === 'ASSIGNED') && (
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">{order.technicianId ? 'Alterar Técnico Responsável' : 'Atribuir Técnico'}</label>
                   <select className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900" onChange={(e) => handleAssignTechnician(e.target.value)} value={order.technicianId || ""}>
                     <option value="" disabled>Selecione um técnico...</option>
                     {allTechnicians.map(t => ( <option key={t.id} value={t.id}>{t.name}</option> ))}
                   </select>
                </div>
              )}
              {((currentUser.role === 'TECHNICIAN' && (order.technicianId === currentUser.id || order.environments?.some(e => e.technicianId === currentUser.id))) || currentUser.role === 'ADMIN') && (
                <div className="flex flex-wrap gap-2">
                   {order.status === 'ASSIGNED' && ( <button onClick={() => handleStatusChange('IN_PROGRESS')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 w-full sm:w-auto">Iniciar Serviço</button> )}
                   {order.status === 'IN_PROGRESS' && ( <button onClick={handleRequestReview} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 w-full sm:w-auto flex items-center justify-center gap-2"><UserCheck size={16} /> Solicitar Aprovação</button> )}
                   {currentUser.role === 'ADMIN' && order.status === 'PENDING_REVIEW' && ( <button onClick={() => handleStatusChange('COMPLETED')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 w-full sm:w-auto">Forçar Conclusão (Admin)</button> )}
                </div>
              )}
              {currentUser.role === 'CLIENT' && order.status === 'PENDING_REVIEW' && (
                 <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><AlertTriangle size={20} /> Aprovação Necessária</h4>
                    <p className="text-sm text-gray-700 mb-3">O técnico informou que o serviço foi concluído. Por favor, verifique e confirme a execução.</p>
                    <button onClick={() => setShowSignatureModal(true)} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"><CheckCircle size={20} /> Aprovar e Concluir Serviço</button>
                 </div>
              )}
              {order.status === 'COMPLETED' && order.clientConfirmation && ( <div className="bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-2 text-sm text-green-800"><Lock size={16} /> <span>Assinado digitalmente em {safeFormat(order.clientConfirmation.confirmedAt, 'dd/MM/yyyy HH:mm')}</span></div> )}
              {currentUser.role === 'ADMIN' && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && ( <button onClick={() => setShowCancelModal(true)} className="w-full mt-2 text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium">Cancelar Ordem</button> )}
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><MapPin size={20} className="text-blue-500"/> Endereço</h3>
              <div className="text-sm text-gray-800 ml-6 space-y-2">
                {isEditing ? (
                  <>
                     <div className="grid grid-cols-3 gap-2">
                       <input className="col-span-1 p-2 border rounded bg-gray-50 text-gray-900" placeholder="CEP" value={editForm.cep} onChange={e => setEditForm({...editForm, cep: e.target.value})} />
                       <input className="col-span-2 p-2 border rounded bg-gray-50 text-gray-900" placeholder="Endereço Completo" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                     </div>
                     <input className="w-full p-2 border rounded bg-gray-50 text-gray-900" placeholder="Ponto de Referência" value={editForm.referencePoint} onChange={e => setEditForm({...editForm, referencePoint: e.target.value})} />
                  </>
                ) : ( <> <p className="font-medium text-gray-900">{order.address}</p> <p className="text-gray-600">CEP: {order.cep}</p> {order.referencePoint && <p className="text-gray-500 text-xs mt-1 bg-gray-50 p-1 rounded w-fit">Ref: {order.referencePoint}</p>} </> )}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><AlertTriangle size={20} className="text-orange-500"/> Descrição</h3>
              {isEditing ? ( <textarea className="w-full p-3 border rounded bg-gray-50 text-gray-900 text-sm h-32" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} /> ) : ( <p className="text-sm text-gray-800 ml-6 leading-relaxed bg-orange-50/50 p-3 rounded-lg border border-orange-100 font-medium">{order.description}</p> )}
              {order.type === 'ASSISTANCE' && (
                <div className="ml-6 mt-2">
                   {(order.suggestedDate || order.suggestedTime || isEditing) && (
                      <div className="mb-3">
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-4 mt-2">
                             <DatePicker label="Data Sugerida" value={editForm.suggestedDate} onChange={d => setEditForm({...editForm, suggestedDate: d})} />
                             <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1"><Clock size={12} /> Horário</label>
                                <div className="relative">
                                  <select value={editForm.suggestedTime} onChange={e => setEditForm({...editForm, suggestedTime: e.target.value})} className="w-full p-3 pr-10 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 appearance-none cursor-pointer">
                                    <option value="">Selecione...</option> {timeSlots.map(time => ( <option key={time} value={time}>{time}</option> ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                                </div>
                             </div>
                          </div>
                        ) : ( (order.suggestedDate || order.suggestedTime) && ( <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100 w-fit shadow-sm"><Calendar size={16} className="text-blue-600"/><span className="text-sm font-bold text-blue-900"> Agendamento: {safeFormat(order.suggestedDate)} {order.suggestedTime && ` às ${order.suggestedTime}`} </span></div> ) ) }
                      </div>
                   )}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 mt-3 border border-gray-200">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 mb-2 flex items-center gap-2"><CheckSquare size={14}/> Checklist de Execução</p>
                    {!isEditing && order.assistanceChecklist && ( <ProgressBar items={order.assistanceChecklist} /> )}
                    {isEditing ? (
                      <div className="space-y-2">
                         {editForm.assistanceChecklist.map(item => ( <div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200 shadow-sm group"> <span className="flex-1 text-sm font-medium text-gray-900">{item.label}</span> <button type="button" onClick={() => handleRemoveAssistanceItem(item.id)} className="text-red-400 hover:text-red-600 p-1"> <Trash size={14} /> </button> </div> ))}
                         <div className="flex gap-2 pt-2 border-t border-gray-200 mt-2">
                            <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="Novo serviço..." className="flex-1 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white" />
                            <button type="button" onClick={handleAddAssistanceItem} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"> <Plus size={16}/> </button>
                         </div>
                      </div>
                    ) : ( (order.assistanceChecklist && order.assistanceChecklist.length > 0) ? ( order.assistanceChecklist.map(item => ( <div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-100 shadow-sm"> <button disabled={currentUser.role !== 'TECHNICIAN' && currentUser.role !== 'ADMIN'} onClick={() => handleAssistanceCheck(item.id)} className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${item.checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-400 hover:border-blue-500'}`}> {item.checked && <CheckSquare size={14} />} </button> <span className={`text-sm font-medium ${item.checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.label}</span> </div> )) ) : ( <p className="text-sm text-gray-400 italic">Nenhum item no checklist.</p> ) )}
                  </div>
                </div>
              )}
            </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Clock size={20} className="text-purple-500"/> Histórico</h3>
              <div className="ml-2 border-l-2 border-gray-200 pl-4 space-y-4">
                {order.history.filter(h => { if (currentUser.role === 'TECHNICIAN' && h.action.includes('Avaliação')) { return false; } return true; }).map((h, idx) => ( <div key={idx} className="relative"> <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow-sm"></div> <p className="text-sm font-medium text-gray-900">{h.action}</p> <p className="text-xs text-gray-500">{safeFormat(h.timestamp, 'dd/MM/yyyy HH:mm')} por {h.user}</p> </div> ))}
              </div>
            </div>
            {order.status === 'COMPLETED' && (currentUser.role === 'ADMIN' || (currentUser.role === 'CLIENT' && !order.rating)) && (
              <div ref={ratingRef} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in mt-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3"><Star className="text-yellow-500" size={20} /> Avaliação do Atendimento</h3>
                {order.rating ? (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                    <div className="flex justify-between items-start mb-2"> <div className="flex flex-col"> <StarRating value={order.rating.stars} readOnly /> <span className="text-xs text-yellow-800 mt-1 font-bold">Média Geral</span> </div> <span className="text-xs text-gray-500">{safeFormat(order.rating.createdAt)}</span> </div>
                    <div className="grid grid-cols-2 gap-3 mb-3 mt-2 border-t border-yellow-200 pt-3">
                      <div className="text-xs text-gray-700"><span className="font-semibold block mb-0.5">Pontualidade</span><StarRating value={order.rating.punctuality || 0} readOnly size={12} /></div>
                      <div className="text-xs text-gray-700"><span className="font-semibold block mb-0.5">Cuidado (Casa/Móveis)</span><StarRating value={order.rating.care || 0} readOnly size={12} /></div>
                      <div className="text-xs text-gray-700"><span className="font-semibold block mb-0.5">Limpeza e Organização</span><StarRating value={order.rating.cleanliness || 0} readOnly size={12} /></div>
                      <div className="text-xs text-gray-700"><span className="font-semibold block mb-0.5">Comunicação</span><StarRating value={order.rating.communication || 0} readOnly size={12} /></div>
                    </div>
                    {order.rating.comment && ( <p className="text-gray-900 text-sm italic border-t border-yellow-200 pt-2">"{order.rating.comment}"</p> )}
                    <p className="text-xs text-gray-400 mt-2">Avaliado por: {order.clientName}</p>
                  </div>
                ) : ( currentUser.role === 'CLIENT' ? (
                    <div className="space-y-6">
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">Como você avalia o serviço prestado? Sua opinião é muito importante.</p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-700 flex items-center gap-2"><Clock size={16}/> Pontualidade</span><StarRating value={ratingCriteria.punctuality} onChange={(val) => setRatingCriteria({...ratingCriteria, punctuality: val})} /></div>
                        <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-700 flex items-center gap-2"><PackageCheck size={16}/> Cuidado com Móveis</span><StarRating value={ratingCriteria.care} onChange={(val) => setRatingCriteria({...ratingCriteria, care: val})} /></div>
                        <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-700 flex items-center gap-2"><Sparkles size={16}/> Limpeza e Organização</span><StarRating value={ratingCriteria.cleanliness} onChange={(val) => setRatingCriteria({...ratingCriteria, cleanliness: val})} /></div>
                        <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-700 flex items-center gap-2"><MessageCircle size={16}/> Comunicação</span><StarRating value={ratingCriteria.communication} onChange={(val) => setRatingCriteria({...ratingCriteria, communication: val})} /></div>
                        <div className="flex justify-between items-center pt-2 border-t mt-2"><span className="text-sm font-bold text-gray-900">Média Geral:</span><div className="flex items-center gap-2"><span className="text-lg font-bold text-yellow-600">{calculatedStars}</span><Star size={20} className="fill-yellow-500 text-yellow-500" /></div></div>
                      </div>
                      <textarea className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-400 outline-none text-gray-900 bg-white" rows={3} placeholder="Deixe um comentário adicional (opcional)..." value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} />
                      <button onClick={handleSubmitRating} disabled={Object.values(ratingCriteria).some(v => v === 0)} className="w-full py-2 bg-yellow-400 text-yellow-900 font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Enviar Avaliação Completa</button>
                    </div>
                  ) : ( <p className="text-sm text-gray-500 italic">Cliente ainda não avaliou este serviço.</p> ) )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'ENVIRONMENTS' && order.type === 'ASSEMBLY' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            {(isEditing ? editForm.environments : order.environments)?.map((env, idx) => {
              if (!isEditing && currentUser.role === 'TECHNICIAN' && order.technicianId !== currentUser.id) {
                 if (env.technicianId !== currentUser.id) return null;
              }
              return (
              <div key={env.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{env.name}</h3>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2"> <Calendar size={14} className="text-gray-500" /> <span className="text-xs text-gray-500">Previsão:</span> <input type="number" min="1" className="w-16 p-1 text-sm border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500 outline-none text-gray-900" value={env.estimatedDays} onChange={(e) => { const val = parseInt(e.target.value) || 1; const newEnvs = [...editForm.environments]; newEnvs[idx].estimatedDays = val; const start = newEnvs[idx].startDate || new Date().toISOString(); newEnvs[idx].deadlineDate = calculateEndDate(start, val); setEditForm({...editForm, environments: newEnvs}); }} /> <span className="text-xs text-gray-500">dias úteis</span> </div>
                          <div className="flex items-center gap-2"> <UserIcon size={14} className="text-gray-500" /> <span className="text-xs text-gray-500">Técnico:</span> <select className="p-1 text-sm border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500 outline-none text-gray-900 w-40" value={env.technicianId || ''} onChange={(e) => { const newTechId = e.target.value; const newTech = allTechnicians.find(t => t.id === newTechId); const newEnvs = [...editForm.environments]; newEnvs[idx].technicianId = newTechId; newEnvs[idx].technicianName = newTech?.name; setEditForm({...editForm, environments: newEnvs}); }} > <option value="">Não atribuído</option> {allTechnicians.map(t => ( <option key={t.id} value={t.id}>{t.name}</option> ))} </select> </div>
                      </div>
                    ) : ( <div className="mt-1 space-y-1"> <div className="flex items-center gap-2 text-xs text-gray-500"> <Calendar size={12} /> Previsão: {env.estimatedDays} dias úteis </div> {env.technicianName && ( <div className="flex items-center gap-2 text-xs text-blue-600 font-medium"> <UserIcon size={12} /> Responsável: {env.technicianName} </div> )} </div> )}
                    {env.deadlineDate && ( <div className="text-xs text-blue-600 font-medium mt-1">Prazo: {safeFormat(env.deadlineDate)}</div> )}
                  </div>
                  {env.status === 'COMPLETED' ? ( <span className="flex items-center gap-1 text-green-700 text-sm font-bold bg-green-50 px-2 py-1 rounded"> <CheckCircle size={14} /> Finalizado </span> ) : ( <span className="text-yellow-700 text-sm font-bold bg-yellow-50 px-2 py-1 rounded">Pendente</span> )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-3 border border-gray-200">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 mb-2">Checklist</p>
                  {!isEditing && env.checklist && ( <ProgressBar items={env.checklist} /> )}
                  {isEditing ? (
                    <div className="space-y-2">
                       {env.checklist.map(item => ( <div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200 shadow-sm group"> <span className="flex-1 text-sm font-medium text-gray-900">{item.label}</span> <button type="button" onClick={() => handleRemoveEnvItem(idx, item.id)} className="text-red-400 hover:text-red-600 p-1"> <Trash size={14} /> </button> </div> ))}
                       <div className="flex gap-2 pt-2 border-t border-gray-200 mt-2">
                          <input type="text" value={envNewItemTexts[idx] || ''} onChange={(e) => setEnvNewItemTexts({...envNewItemTexts, [idx]: e.target.value})} placeholder="Nova tarefa..." className="flex-1 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white" />
                          <button type="button" onClick={() => handleAddEnvItem(idx)} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"> <Plus size={16}/> </button>
                       </div>
                    </div>
                  ) : ( env.checklist.map(item => ( <div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-100 shadow-sm"> <button disabled={currentUser.role !== 'TECHNICIAN' && currentUser.role !== 'ADMIN'} onClick={() => handleEnvironmentCheck(idx, item.id)} className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${item.checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-400 hover:border-blue-500'}`}> {item.checked && <CheckSquare size={14} />} </button> <span className={`text-sm font-medium ${item.checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.label}</span> </div> )) )}
                </div>
                {!isEditing && env.status !== 'COMPLETED' && (currentUser.role === 'TECHNICIAN' || currentUser.role === 'ADMIN') && ( <button onClick={() => handleEnvironmentFinish(idx)} className="w-full py-2 border-2 border-green-600 text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors"> Marcar Ambiente como Finalizado </button> )}
                 {!isEditing && (currentUser.role === 'ADMIN' || currentUser.role === 'TECHNICIAN') && env.status === 'COMPLETED' && env.completedDate && env.deadlineDate && ( <div className={`text-center text-sm font-bold p-2 rounded mt-2 ${new Date(env.completedDate) <= new Date(env.deadlineDate) ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}> {new Date(env.completedDate) <= new Date(env.deadlineDate) ? 'ENTREGUE NO PRAZO' : 'ENTREGUE COM ATRASO'} </div> )}
              </div>
            ); })}
          </div>
        )}
        {activeTab === 'CHAT' && (
           <div className="h-full flex flex-col max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {order.comments.length === 0 && ( <p className="text-center text-gray-400 text-sm mt-10">Nenhuma mensagem ainda.</p> )}
                {order.comments.map(comment => {
                  const isMe = comment.userId === currentUser.id;
                  return (
                    <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-3 ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'}`}>
                        <p className={`text-xs font-bold mb-1 opacity-80 ${isMe ? 'text-white' : 'text-gray-600'}`}>{comment.userName}</p>
                        <p className="text-sm">{comment.text}</p>
                        {comment.attachmentUrl && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-white/20">
                             {comment.attachmentType === 'video' ? ( <video src={comment.attachmentUrl} controls className="w-full h-auto rounded" /> ) : ( <img src={comment.attachmentUrl} alt="anexo" className="w-full h-auto object-cover rounded" /> )}
                          </div>
                        )}
                        <p className="text-[10px] text-right mt-1 opacity-70">{safeFormat(comment.timestamp, 'HH:mm')}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
             </div>
             <div className="p-3 bg-gray-50 border-t">
               {isProcessingFile && ( <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 border border-blue-100 rounded-lg"> <Loader2 size={16} className="animate-spin text-blue-600"/> <span className="text-xs font-bold text-blue-800 uppercase">Processando Arquivo...</span> </div> )}
               {attachment && (
                 <div className="flex gap-2 mb-2 p-2 bg-white rounded-lg border w-fit relative">
                   {attachment.type === 'image' ? ( <img src={attachment.preview} alt="preview" className="h-20 w-auto rounded object-cover" /> ) : ( <video src={attachment.preview} className="h-20 w-auto rounded bg-black" /> )}
                   <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md"><X size={12} /></button>
                 </div>
               )}
               <div className="flex gap-2 items-center">
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                 <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><Paperclip size={20} /></button>
                 <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><Camera size={20} /></button>
                 <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Digite sua mensagem..." className="flex-1 p-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900" onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                 <button onClick={handleSendMessage} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"><Send size={20} /></button>
               </div>
             </div>
           </div>
        )}
      </div>
      {showSignatureModal && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
             <div className="bg-white rounded-xl p-6 w-full max-sm shadow-2xl">
                 <div className="flex justify-center mb-4"><div className="bg-blue-100 p-3 rounded-full"><Lock size={32} className="text-blue-600" /></div></div>
                 <h3 className="font-bold text-lg text-center text-gray-800 mb-2">Assinatura Digital</h3>
                 <p className="text-sm text-gray-500 text-center mb-6">Para confirmar a conclusão do serviço com segurança, digite sua senha de acesso abaixo.</p>
                 <div className="space-y-4">
                     <div> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sua Senha</label> <input type="password" autoFocus className={`w-full p-3 border rounded-lg outline-none text-gray-900 bg-white ${signatureError ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}`} placeholder="••••••" value={signaturePassword} onChange={(e) => { setSignaturePassword(e.target.value); setSignatureError(''); }} /> {signatureError && <p className="text-xs text-red-500 mt-1">{signatureError}</p>} </div>
                     <div className="flex gap-3"> <button onClick={() => { setShowSignatureModal(false); setSignaturePassword(''); setSignatureError(''); }} className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button> <button onClick={handleSignatureSubmit} disabled={!signaturePassword} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">Confirmar</button> </div>
                 </div>
             </div>
         </div>
      )}
      {showRatingPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl text-center">
             <div className="flex justify-center mb-4"><div className="bg-green-100 p-3 rounded-full"><CheckCircle size={32} className="text-green-600" /></div></div>
             <h3 className="font-bold text-lg text-gray-800 mb-2">Serviço Concluído!</h3>
             <p className="text-sm text-gray-500 mb-6">Gostaria de avaliar o atendimento do técnico agora? Sua opinião é muito importante para nós.</p>
             <div className="flex gap-3"> <button onClick={() => setShowRatingPrompt(false)} className="flex-1 py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg font-medium">Mais tarde</button> <button onClick={handleGoToRating} className="flex-1 py-2.5 bg-yellow-400 text-yellow-900 rounded-lg font-bold hover:bg-yellow-500 shadow-sm transition-colors">Avaliar Agora</button> </div>
          </div>
        </div>
      )}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-2 text-red-600">Cancelar Ordem</h3>
            <p className="text-sm text-gray-600 mb-4">Por favor, informe o motivo do cancelamento:</p>
            <textarea className="w-full p-2 border border-gray-300 rounded mb-4 text-sm bg-white text-gray-900" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motivo..." />
            <div className="flex gap-3"> <button onClick={() => setShowCancelModal(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Voltar</button> <button onClick={handleCancel} disabled={!cancelReason.trim()} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50">Confirmar</button> </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-2 text-red-600">Excluir Permanentemente</h3>
            <p className="text-sm text-gray-600 mb-6">Tem certeza? Esta ação removerá a ordem <strong>{order.id}</strong> do sistema e não poderá ser desfeita. Considere usar "Cancelar" se quiser manter o histórico.</p>
            <div className="flex gap-3"> <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button> <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Excluir</button> </div>
          </div>
        </div>
      )}
    </div>
  );
};