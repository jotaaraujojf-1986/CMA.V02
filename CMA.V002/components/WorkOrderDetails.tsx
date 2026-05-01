import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { WorkOrder, User, Comment, Environment, Status, Rating, ChecklistItem, WorkOrderEvent } from '../types';
import { getStatusColor, getStatusLabel, MOCK_USERS, calculateEndDate, calculateBusinessDays } from '../services/mockData';
import { ArrowLeft, Send, Paperclip, CheckSquare, Clock, MapPin, User as UserIcon, Calendar, Camera, XCircle, CheckCircle, AlertTriangle, Star, X, Pencil, Trash, Save, Clipboard, ChevronLeft, ChevronRight, ChevronDown, Plus, MinusCircle, BarChart3, Lock, UserCheck, Sparkles, MessageCircle, PackageCheck, Loader2, Mic, Square, FileText, File as FileIcon, Play, Pause, ListPlus, AlertCircle } from 'lucide-react';
import { format, isValid, addMonths, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { db } from '../services/db';
import { OccurrenceFormModal } from './OccurrenceFormModal';
import { EventMediaModal } from './EventMediaModal';

interface WorkOrderDetailsProps {
  order: WorkOrder;
  currentUser: User;
  onBack: () => void;
  onUpdateOrder: (updatedOrder: WorkOrder, alertType?: 'ORDER_UPDATE' | 'CHAT_MESSAGE', alertMsg?: string, alertTitle?: string) => void;
  onDeleteOrder: (id: string) => void;
  allTechnicians: User[];
  initialTab?: 'DETAILS' | 'CHAT' | 'ENVIRONMENTS';
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
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={prevMonth} className="p-1 rounded-full" style={{ color: 'var(--muted)' }}><ChevronLeft size={20} /></button>
            <span className="font-bold capitalize" style={{ color: 'var(--sf-white)' }}>{monthName}</span>
            <button type="button" onClick={nextMonth} className="p-1 rounded-full" style={{ color: 'var(--muted)' }}><ChevronRight size={20} /></button>
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
                  style={isSelected ? { background: 'var(--blue)', color: '#fff', fontWeight: 700 } : isTodayDate ? { border: '1px solid var(--blue)', color: 'var(--cyan)', fontWeight: 700 } : { color: isCurrentMonth ? 'var(--sf-white)' : 'var(--hint)' }}
                  className="h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors hover:opacity-80"
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-center">
            <button type="button" onClick={() => { setCurrentMonth(new Date()); }} className="text-xs text-brand-600 font-bold hover:underline">
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

  let colorClass = 'bg-brand-600';
  if (progress === 100) colorClass = 'bg-green-500';
  else if (progress > 0) colorClass = 'bg-brand-500';
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

export const WorkOrderDetails: React.FC<WorkOrderDetailsProps> = ({ order, currentUser, onBack, onUpdateOrder, onDeleteOrder, allTechnicians, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'CHAT' | 'ENVIRONMENTS' | 'OCCURRENCES'>(initialTab ?? 'DETAILS');
  
  // --- Events / Occurrences ---
  const [events, setEvents] = useState<any[]>([]);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventMediaModalData, setEventMediaModalData] = useState<{ attachments: any[], initialIndex?: number } | null>(null);
  const [editEventData, setEditEventData] = useState<any>(null);

  const loadEvents = async () => {
    setIsLoadingEvents(true);
    const data = await db.getWorkOrderEvents(order.id);
    setEvents(data);
    setIsLoadingEvents(false);
  };

  useEffect(() => {
    if (activeTab === 'OCCURRENCES') {
      loadEvents();
    }
  }, [activeTab, order.id]);

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
    assistanceOriginReason: order.assistanceOriginReason || '' as WorkOrder['assistanceOriginReason'] | '',
    environments: order.environments || []
  });

  const [envNewItemTexts, setEnvNewItemTexts] = useState<{ [key: number]: string }>({});
  const [newItemText, setNewItemText] = useState('');

  // --- New Environment Builder State (for Admins/Assistants) ---
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvDays, setNewEnvDays] = useState(1);
  const [newEnvValueBrl, setNewEnvValueBrl] = useState<string>(''); 
  const [newEnvStartDate, setNewEnvStartDate] = useState('');
  const [newEnvTechnicianId, setNewEnvTechnicianId] = useState('');
  const [newEnvSubItems, setNewEnvSubItems] = useState<string[]>([]);
  const [newEnvSubItemInput, setNewEnvSubItemInput] = useState('');
  const [newEnvProjectFile, setNewEnvProjectFile] = useState<{ url: string; name: string } | null>(null);
  const newEnvProjectFileInputRef = useRef<HTMLInputElement>(null);

  const handleAddEnvSubItem = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!newEnvSubItemInput.trim()) return;
    setNewEnvSubItems([...newEnvSubItems, newEnvSubItemInput]);
    setNewEnvSubItemInput('');
  };

  const removeEnvSubItem = (index: number) => {
    setNewEnvSubItems(newEnvSubItems.filter((_, i) => i !== index));
  };

  const handleAddEnvironment = (e: React.MouseEvent) => {
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

    const start = newEnvStartDate || order.suggestedDate || new Date().toISOString();
    const envTech = allTechnicians.find(t => t.id === newEnvTechnicianId);

    const checklist: ChecklistItem[] = newEnvSubItems.length > 0
      ? newEnvSubItems.map((label) => ({ id: Math.random().toString(36), label, checked: false }))
      : [
        { id: Math.random().toString(36), label: 'Conferir peças', checked: false },
        { id: Math.random().toString(36), label: 'Limpeza do local', checked: false },
        { id: Math.random().toString(36), label: 'Montagem completa', checked: false }
      ];

    const newEnv: Environment = {
      id: Math.random().toString(36),
      name: newEnvName,
      estimatedDays: newEnvDays,
      status: 'PENDING',
      checklist: checklist,
      startDate: start,
      deadlineDate: calculateEndDate(start, newEnvDays),
      value_brl: numericValue,
      technicianId: envTech?.id,
      technicianName: envTech?.name,
      ...(newEnvProjectFile ? { projectFileUrl: newEnvProjectFile.url, projectFileName: newEnvProjectFile.name } : {})
    };

    let updatedEnvs = [];
    if (isEditing) {
       updatedEnvs = [...editForm.environments, newEnv];
       setEditForm(prev => ({ ...prev, environments: updatedEnvs }));
    } else {
       updatedEnvs = [...(order.environments || []), newEnv];
       onUpdateOrder({
          ...order,
          environments: updatedEnvs,
          updatedAt: new Date().toISOString(),
          history: [...order.history, { action: `Ambiente adicionado: ${newEnvName}`, timestamp: new Date().toISOString(), user: currentUser.name }]
       });
    }

    // Reset Form
    setNewEnvName('');
    setNewEnvDays(1);
    setNewEnvValueBrl('');
    setNewEnvStartDate('');
    setNewEnvTechnicianId('');
    setNewEnvSubItems([]);
    setNewEnvSubItemInput('');
    setNewEnvProjectFile(null);
    if (newEnvProjectFileInputRef.current) newEnvProjectFileInputRef.current.value = '';
  };

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
        assistanceOriginReason: order.assistanceOriginReason || '' as WorkOrder['assistanceOriginReason'] | '',
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

  const [attachment, setAttachment] = useState<{ preview: string; type: 'image' | 'video' | 'audio' | 'document'; name?: string; mimeType?: string; duration?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  // Per-environment project file inputs
  const projectFileInputRefs = useRef<{ [idx: number]: HTMLInputElement | null }>({});

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleSaveEvent = async (eventData: any, files: File[]) => {
    try {
      if(editEventData) {
         await db.updateWorkOrderEvent(editEventData.id, eventData, files);
      } else {
         await db.createWorkOrderEvent(eventData, files);
      }
      await loadEvents();
      onUpdateOrder(
        { ...order, updatedAt: new Date().toISOString() }, 
        'ORDER_UPDATE', 
        editEventData ? `A ocorrência '${eventData.title}' foi atualizada.` : `A ocorrência '${eventData.title}' foi registrada com sucesso.`, 
        editEventData ? 'Ocorrência Atualizada' : 'Ocorrência Registrada'
      );
    } catch(e) {
      console.error(e);
      alert('Erro ao salvar no banco. Verifique logs.');
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
     if(!window.confirm(`Tem certeza que deseja excluir a ocorrência '${title}'?`)) return;
     try {
       await db.deleteWorkOrderEvent(id, order.id, title);
       await loadEvents();
     } catch(e) {
       console.error(e);
       alert('Erro ao excluir ocorrência.');
     }
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
    setShowDeleteModal(false);
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

    // Determine attachment type
    let type: 'image' | 'video' | 'audio' | 'document';
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
    } else {
      type = 'document';
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      if (reader.result) {
        setAttachment({
          preview: reader.result as string,
          type,
          name: file.name,
          mimeType: file.type
        });
      }
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      alert('Erro ao carregar arquivo.');
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  // --- Document icon helper ---
  const getDocIcon = (fileName?: string, mimeType?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    const mime = mimeType?.toLowerCase() || '';
    if (ext === 'pdf' || mime.includes('pdf')) return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50', label: 'PDF' };
    if (['doc', 'docx'].includes(ext) || mime.includes('word')) return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', label: 'DOC' };
    if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) return { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50', label: 'PPT' };
    if (['xls', 'xlsx'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) return { icon: FileText, color: 'text-green-500', bg: 'bg-green-50', label: 'XLS' };
    if (['txt', 'csv', 'log'].includes(ext) || mime.includes('text/plain')) return { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50', label: 'TXT' };
    return { icon: FileIcon, color: 'text-gray-400', bg: 'bg-gray-50', label: ext.toUpperCase() || 'FILE' };
  };

  // --- Audio recording functions ---
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setAttachment({
              preview: reader.result as string,
              type: 'audio',
              name: `audio_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`,
              mimeType: 'audio/webm',
              duration: recordingTime
            });
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    // Stop all tracks
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
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
        attachmentType: attachment.type,
        attachmentName: attachment.name,
        attachmentMimeType: attachment.mimeType,
        ...(attachment.type === 'audio' && attachment.duration ? { audioDuration: attachment.duration } : {})
      } : {})
    };

    const updated: WorkOrder = {
      ...order,
      comments: [...order.comments, comment],
      updatedAt: new Date().toISOString()
    };

    // Build alert title and message with O.S. identity
    const alertTitle = `${order.id} · ${order.clientName}`;
    const msgPreview = newMessage.trim()
      ? `${currentUser.name}: "${newMessage.trim().substring(0, 70)}${newMessage.trim().length > 70 ? '...' : ''}"`
      : `${currentUser.name} enviou ${attachment?.type === 'audio' ? 'um áudio' : attachment?.type === 'image' ? 'uma imagem' : 'um arquivo'}`;

    onUpdateOrder(updated, 'CHAT_MESSAGE', msgPreview, alertTitle);

    setNewMessage('');
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (mediaFileInputRef.current) {
      mediaFileInputRef.current.value = '';
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
      style={activeTab === id ? {
        borderBottom: '2px solid #1a6bff',
        color: '#00d4ff',
        background: 'rgba(26,107,255,.1)',
      } : {
        borderBottom: '2px solid transparent',
        color: 'var(--muted)',
      }}
      className="flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 transition-all"
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

  const isSigned = !!order.clientConfirmation || order.status === 'COMPLETED';
  const isLockedForTech = isSigned && currentUser.role === 'TECHNICIAN';
  const canRequestApproval = order.type === 'ASSEMBLY' 
    ? (order.environments?.every(env => env.status === 'COMPLETED') ?? true)
    : (!order.assistanceChecklist || order.assistanceChecklist.length === 0 || order.assistanceChecklist.every(item => item.checked));

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col" style={{ background: 'transparent' }}>
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 z-20 gap-3 sm:gap-0" style={{ background: 'rgba(10,15,30,.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ArrowLeft size={24} /></button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{order.id}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.type === 'ASSEMBLY' ? 'bg-orange-100 text-orange-800' : 'bg-cyan-100 text-cyan-800'}`}>
                {order.type === 'ASSEMBLY' ? 'MONTAGEM' : 'ASSISTÊNCIA'}
              </span>
              {order.type === 'ASSEMBLY' && (currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                  Total: {order.environments?.reduce((sum, e) => sum + (e.value_brl || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                </span>
              )}
            </div>
            {isEditing ? (
              <div className="flex flex-col gap-2 mt-2 w-full max-w-sm">
                <input 
                  type="text" 
                  value={editForm.clientName} 
                  onChange={e => setEditForm({ ...editForm, clientName: e.target.value })} 
                  className="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white" 
                  placeholder="Nome do Cliente"
                />
                <input 
                  type="text" 
                  value={editForm.clientPhone} 
                  onChange={e => setEditForm({ ...editForm, clientPhone: e.target.value })} 
                  className="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white" 
                  placeholder="Telefone do Cliente"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-gray-500 line-clamp-1">{order.clientName}</p>
                {order.clientPhone && <p className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{order.clientPhone}</p>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 w-full sm:w-auto border-t sm:border-none pt-2 sm:pt-0 border-gray-100">
          {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
            <div className="flex items-center gap-2 mr-2">
              {isEditing ? (
                <button onClick={handleSaveEdit} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-full" title="Salvar Edição"><Save size={20} /></button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" title="Editar Ordem"><Pencil size={20} /></button>
              )}
              <button onClick={() => setShowDeleteModal(true)} className="p-2 text-red-600 hover:bg-red-50 rounded-full" title="Excluir Ordem"><Trash size={20} /></button>
            </div>
          )}
          <div style={{
            padding: '2px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', display: 'inline-block',
            ...(order.status === 'COMPLETED' ? { background: 'rgba(16,185,129,.15)', color: '#34d399', border: '1px solid rgba(16,185,129,.3)' }
             : order.status === 'IN_PROGRESS' ? { background: 'rgba(26,107,255,.15)', color: '#60a5fa', border: '1px solid rgba(26,107,255,.35)' }
             : order.status === 'CANCELLED'   ? { background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }
             : order.status === 'PENDING_REVIEW' ? { background: 'rgba(139,92,246,.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.35)' }
             : order.status === 'ASSIGNED'    ? { background: 'rgba(245,158,11,.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,.3)' }
             : { background: 'rgba(0,212,255,.12)', color: '#00d4ff', border: '1px solid rgba(0,212,255,.3)' })
          }}>{getStatusLabel(order.status)}</div>
        </div>
      </div>

      <div className="flex" style={{ background: 'rgba(255,255,255,.03)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <TabButton id="DETAILS" label="Detalhes" icon={Clipboard} />
        {order.type === 'ASSEMBLY' && <TabButton id="ENVIRONMENTS" label="Ambientes" icon={CheckSquare} />}
        <TabButton id="OCCURRENCES" label="Ocorrências" icon={AlertCircle} />
        <TabButton id="CHAT" label="Chat / Mídia" icon={MessageCircle} />
      </div>

      <div className="flex-1 p-4 overflow-y-auto" style={{ background: 'transparent' }}>
        {activeTab === 'DETAILS' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800 border-b pb-2 mb-2">Ações Rápidas</h3>
              {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (order.status === 'OPEN' || order.status === 'ASSIGNED') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{order.technicianId ? 'Alterar Técnico Responsável' : 'Atribuir Técnico'}</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900" onChange={(e) => handleAssignTechnician(e.target.value)} value={order.technicianId || ""}>
                    <option value="" disabled>Selecione um técnico...</option>
                    {allTechnicians.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                  </select>
                </div>
              )}
              {((currentUser.role === 'TECHNICIAN' && (order.technicianId === currentUser.id || order.environments?.some(e => e.technicianId === currentUser.id))) || currentUser.role === 'ADMIN') && (
                <div className="flex flex-wrap gap-2">
                  {order.status === 'ASSIGNED' && (<Button onClick={() => handleStatusChange('IN_PROGRESS')} fullWidth className="sm:w-auto">Iniciar Serviço</Button>)}
                  {order.status === 'IN_PROGRESS' && (
                    <button 
                      onClick={handleRequestReview} 
                      disabled={!canRequestApproval}
                      className={`px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto flex items-center justify-center gap-2 transition-all ${canRequestApproval ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-70'}`}
                      title={!canRequestApproval ? (order.type === 'ASSEMBLY' ? 'Finalize todos os ambientes primeiro.' : 'Conclua o checklist primeiro.') : ''}
                    >
                      <UserCheck size={16} /> Solicitar Aprovação
                    </button>
                  )}
                  {currentUser.role === 'ADMIN' && order.status === 'PENDING_REVIEW' && (<button onClick={() => handleStatusChange('COMPLETED')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 w-full sm:w-auto">Forçar Conclusão (Admin)</button>)}
                </div>
              )}
              {currentUser.role === 'CLIENT' && order.status === 'PENDING_REVIEW' && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><AlertTriangle size={20} /> Aprovação Necessária</h4>
                  <p className="text-sm text-gray-700 mb-3">O técnico informou que o serviço foi concluído. Por favor, verifique e confirme a execução.</p>
                  <button onClick={() => setShowSignatureModal(true)} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"><CheckCircle size={20} /> Aprovar e Concluir Serviço</button>
                </div>
              )}
              {order.status === 'COMPLETED' && order.clientConfirmation && (<div className="bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-2 text-sm text-green-800"><Lock size={16} /> <span>Assinado digitalmente em {safeFormat(order.clientConfirmation.confirmedAt, 'dd/MM/yyyy HH:mm')}</span></div>)}
              {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (<Button variant="danger" fullWidth onClick={() => setShowCancelModal(true)} className="mt-2">Cancelar Ordem</Button>)}
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><MapPin size={20} className="text-brand-500" /> Endereço</h3>
              <div className="text-sm text-gray-800 ml-6 space-y-2">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input className="md:col-span-1 p-2 border rounded bg-gray-50 text-gray-900" placeholder="CEP" value={editForm.cep} onChange={e => setEditForm({ ...editForm, cep: e.target.value })} />
                      <input className="md:col-span-2 p-2 border rounded bg-gray-50 text-gray-900" placeholder="Endereço Completo" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                    </div>
                    <input className="w-full p-2 border rounded bg-gray-50 text-gray-900" placeholder="Ponto de Referência" value={editForm.referencePoint} onChange={e => setEditForm({ ...editForm, referencePoint: e.target.value })} />
                  </>
                ) : (<> <p className="font-medium text-gray-900">{order.address}</p> <p className="text-gray-600">CEP: {order.cep}</p> {order.referencePoint && <p className="text-gray-500 text-xs mt-1 bg-gray-50 p-1 rounded w-fit">Ref: {order.referencePoint}</p>} </>)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><AlertTriangle size={20} className="text-orange-500" /> Descrição</h3>
              {isEditing ? (<textarea className="w-full p-3 border rounded bg-gray-50 text-gray-900 text-sm h-32" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />) : (<p className="text-sm text-gray-800 ml-6 leading-relaxed bg-orange-50/50 p-3 rounded-lg border border-orange-100 font-medium">{order.description}</p>)}
              {order.type === 'ASSISTANCE' && (
                <div className="ml-6 mt-2">
                  <div className="mb-4 space-y-2">
                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                        <UserIcon size={16} className="text-gray-500" />
                        <span>Dados da Assistência</span>
                      </div>
                      <div className="ml-6 text-sm text-gray-700 space-y-1">
                         <span className="font-medium text-gray-900 block">Categoria: <span className="font-normal text-gray-600">{order.assistanceCategory || 'Não classificada'}</span></span>
                         {order.assistanceCategoryDetail && (
                           <span className="font-medium text-gray-900 block">Detalhe: <span className="font-normal text-gray-600">"{order.assistanceCategoryDetail}"</span></span>
                         )}
                         {isEditing ? (
                           <div className="mt-2 space-y-1">
                             <label className="text-xs font-semibold text-gray-500 uppercase">Origem da Falha</label>
                             <select
                               value={editForm.assistanceOriginReason || ''}
                               onChange={e => setEditForm({ ...editForm, assistanceOriginReason: e.target.value as WorkOrder['assistanceOriginReason'] | '' })}
                               className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                             >
                               <option value="">Não classificada</option>
                               <option value="OPERATIONAL">Operacional</option>
                               <option value="FACTORY">Fábrica</option>
                               <option value="TRANSPORT">Transporte</option>
                               <option value="PROJECT">Projeto</option>
                             </select>
                           </div>
                         ) : order.assistanceOriginReason ? (
                           <span className="font-medium text-gray-900 block">
                             Origem: <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                               order.assistanceOriginReason === 'OPERATIONAL' ? 'bg-orange-100 text-orange-800' :
                               order.assistanceOriginReason === 'FACTORY' ? 'bg-red-100 text-red-800' :
                               order.assistanceOriginReason === 'TRANSPORT' ? 'bg-blue-100 text-blue-800' :
                               'bg-purple-100 text-purple-800'
                             }`}>
                               {{ OPERATIONAL: 'Operacional', FACTORY: 'Fábrica', TRANSPORT: 'Transporte', PROJECT: 'Projeto' }[order.assistanceOriginReason]}
                             </span>
                           </span>
                         ) : null}
                      </div>
                    </div>
                  </div>

                  {order.isPostAssembly && order.relatedAssemblyWorkOrderId && (
                    <div className="mb-3 bg-brand-100 p-3 rounded-lg border border-brand-200 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-brand-800 font-bold">
                        <CheckCircle size={16} /> <span>Origem Pós-Montagem</span>
                      </div>
                      <div className="text-sm text-brand-900 ml-6 flex flex-col gap-1 mt-1">
                        <span>O.S de Origem: <span className="font-bold">{order.relatedAssemblyWorkOrderId}</span></span>
                        <span>Ambiente Afetado: <span className="font-bold">{order.relatedEnvironmentName || 'Não informado'}</span></span>
                        {order.relatedEnvironmentId && (
                          <span className="text-xs text-brand-700">Cód. Ambiente: {order.relatedEnvironmentId}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {(order.suggestedDate || order.suggestedTime || isEditing) && (
                    <div className="mb-3">
                      {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <DatePicker label="Data Sugerida" value={editForm.suggestedDate} onChange={d => setEditForm({ ...editForm, suggestedDate: d })} />
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1"><Clock size={12} /> Horário</label>
                            <div className="relative">
                              <select value={editForm.suggestedTime} onChange={e => setEditForm({ ...editForm, suggestedTime: e.target.value })} className="w-full p-3 pr-10 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 appearance-none cursor-pointer">
                                <option value="">Selecione...</option> {timeSlots.map(time => (<option key={time} value={time}>{time}</option>))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                            </div>
                          </div>
                        </div>
                      ) : ((order.suggestedDate || order.suggestedTime) && (<div className="flex items-center gap-2 bg-brand-50 p-2 rounded-lg border border-brand-100 w-fit shadow-sm"><Calendar size={16} className="text-brand-600" /><span className="text-sm font-bold text-brand-900"> Agendamento: {safeFormat(order.suggestedDate)} {order.suggestedTime && ` às ${order.suggestedTime}`} </span></div>))}
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 mt-3 border border-gray-200">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 mb-2 flex items-center gap-2"><CheckSquare size={14} /> Checklist de Execução</p>
                    {!isEditing && order.assistanceChecklist && (<ProgressBar items={order.assistanceChecklist} />)}
                    {isEditing ? (
                      <div className="space-y-2">
                        {editForm.assistanceChecklist.map(item => (<div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200 shadow-sm group"> <span className="flex-1 text-sm font-medium text-gray-900">{item.label}</span> <button type="button" onClick={() => handleRemoveAssistanceItem(item.id)} className="text-red-400 hover:text-red-600 p-1"> <Trash size={14} /> </button> </div>))}
                        <div className="flex gap-2 pt-2 border-t border-gray-200 mt-2">
                          <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="Novo serviço..." className="flex-1 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-900 bg-white" />
                          <button type="button" onClick={handleAddAssistanceItem} className="bg-brand-600 text-white p-2 rounded hover:bg-brand-700"> <Plus size={16} /> </button>
                        </div>
                      </div>
                    ) : ((order.assistanceChecklist && order.assistanceChecklist.length > 0) ? (order.assistanceChecklist.map(item => (<div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-100 shadow-sm"> <button disabled={isLockedForTech || (currentUser.role !== 'TECHNICIAN' && currentUser.role !== 'ADMIN')} onClick={() => handleAssistanceCheck(item.id)} className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${(isLockedForTech || (currentUser.role !== 'TECHNICIAN' && currentUser.role !== 'ADMIN')) ? 'cursor-not-allowed opacity-70' : ''} ${item.checked ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-400 hover:border-brand-500'}`}> {item.checked && <CheckSquare size={14} />} </button> <span className={`text-sm font-medium ${item.checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.label}</span> </div>))) : (<p className="text-sm text-gray-400 italic">Nenhum item no checklist.</p>))}
                  </div>
                </div>
              )}
            </div>
            {order.type === 'ASSEMBLY' && order.environments && order.environments.length > 0 && (currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><BarChart3 size={20} className="text-green-500" /> Resumo Financeiro</h3>
                <div className="ml-6 border border-gray-200 rounded-lg overflow-x-auto overflow-y-hidden">
                  <table className="w-full min-w-[400px] text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2">Ambiente</th>
                        <th className="px-4 py-2">Técnico</th>
                        <th className="px-4 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {order.environments.map(env => (
                        <tr key={env.id} className="bg-white">
                          <td className="px-4 py-2 font-medium text-gray-900">{env.name}</td>
                          <td className="px-4 py-2 text-gray-500">{env.technicianName || 'Não atribuído'}</td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900">
                            {(env.value_brl || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-green-50 border-t border-gray-200 font-bold text-gray-900">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right uppercase text-xs text-green-800">Total Geral da Montagem:</td>
                        <td className="px-4 py-3 text-right text-green-800 font-black">
                          {order.environments.reduce((sum, e) => sum + (e.value_brl || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Clock size={20} className="text-purple-500" /> Histórico</h3>
              <div className="ml-2 border-l-2 border-gray-200 pl-4 space-y-4">
                {order.history.filter(h => { if (currentUser.role === 'TECHNICIAN' && h.action.includes('Avaliação')) { return false; } return true; }).map((h, idx) => (<div key={idx} className="relative"> <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow-sm"></div> <p className="text-sm font-medium text-gray-900">{h.action}</p> <p className="text-xs text-gray-500">{safeFormat(h.timestamp, 'dd/MM/yyyy HH:mm')} por {h.user}</p> </div>))}
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
                    {order.rating.comment && (<p className="text-gray-900 text-sm italic border-t border-yellow-200 pt-2">"{order.rating.comment}"</p>)}
                    <p className="text-xs text-gray-400 mt-2">Avaliado por: {order.clientName}</p>
                  </div>
                ) : (currentUser.role === 'CLIENT' ? (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-600 bg-brand-50 p-3 rounded-lg border border-brand-100">Como você avalia o serviço prestado? Sua opinião é muito importante.</p>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-700 flex items-center gap-2"><Clock size={16} /> Pontualidade</span><StarRating value={ratingCriteria.punctuality} onChange={(val) => setRatingCriteria({ ...ratingCriteria, punctuality: val })} /></div>
                      <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-700 flex items-center gap-2"><PackageCheck size={16} /> Cuidado com Móveis</span><StarRating value={ratingCriteria.care} onChange={(val) => setRatingCriteria({ ...ratingCriteria, care: val })} /></div>
                      <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-700 flex items-center gap-2"><Sparkles size={16} /> Limpeza e Organização</span><StarRating value={ratingCriteria.cleanliness} onChange={(val) => setRatingCriteria({ ...ratingCriteria, cleanliness: val })} /></div>
                      <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-700 flex items-center gap-2"><MessageCircle size={16} /> Comunicação</span><StarRating value={ratingCriteria.communication} onChange={(val) => setRatingCriteria({ ...ratingCriteria, communication: val })} /></div>
                      <div className="flex justify-between items-center pt-2 border-t mt-2"><span className="text-sm font-bold text-gray-900">Média Geral:</span><div className="flex items-center gap-2"><span className="text-lg font-bold text-yellow-600">{calculatedStars}</span><Star size={20} className="fill-yellow-500 text-yellow-500" /></div></div>
                    </div>
                    <textarea className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-400 outline-none text-gray-900 bg-white" rows={3} placeholder="Deixe um comentário adicional (opcional)..." value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} />
                    <button onClick={handleSubmitRating} disabled={Object.values(ratingCriteria).some(v => v === 0)} className="w-full py-2 bg-yellow-400 text-yellow-900 font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Enviar Avaliação Completa</button>
                  </div>
                ) : (<p className="text-sm text-gray-500 italic">Cliente ainda não avaliou este serviço.</p>))}
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
                      {isEditing ? (
                        <input
                          type="text"
                          value={env.name}
                          onChange={(e) => {
                            const newEnvs = [...editForm.environments];
                            newEnvs[idx].name = e.target.value;
                            setEditForm({ ...editForm, environments: newEnvs });
                          }}
                          className="w-full text-lg font-bold p-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white mb-2"
                          placeholder="Nome do Ambiente"
                        />
                      ) : (
                        <h3 className="font-bold text-gray-900 text-lg">{env.name}</h3>
                      )}
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                             <Calendar size={14} className="text-brand-500" />
                             <span className="text-xs text-gray-500 font-bold">Iniciado em:</span>
                             <input 
                                type="date"
                                className="p-1 px-2 text-sm border border-gray-300 rounded bg-white focus:ring-1 focus:ring-brand-500 outline-none text-gray-900 shadow-sm"
                                value={env.startDate ? env.startDate.substring(0, 10) : ''}
                                onChange={(e) => {
                                  const newEnvs = [...editForm.environments];
                                  newEnvs[idx].startDate = e.target.value ? new Date(e.target.value + 'T12:00:00.000Z').toISOString() : undefined;
                                  if (newEnvs[idx].startDate && newEnvs[idx].estimatedDays) {
                                      newEnvs[idx].deadlineDate = calculateEndDate(newEnvs[idx].startDate!, newEnvs[idx].estimatedDays);
                                  }
                                  setEditForm({ ...editForm, environments: newEnvs });
                                }}
                             />
                          </div>
                          <div className="flex items-center gap-2"> <Calendar size={14} className="text-gray-500" /> <span className="text-xs text-gray-500">Previsão:</span> <input type="number" min="1" className="w-16 p-1 text-sm border border-gray-300 rounded bg-white focus:ring-1 focus:ring-brand-500 outline-none text-gray-900" value={env.estimatedDays} onChange={(e) => { const val = parseInt(e.target.value) || 1; const newEnvs = [...editForm.environments]; newEnvs[idx].estimatedDays = val; const start = newEnvs[idx].startDate || new Date().toISOString(); newEnvs[idx].deadlineDate = calculateEndDate(start, val); setEditForm({ ...editForm, environments: newEnvs }); }} /> <span className="text-xs text-gray-500">dias úteis</span> </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1"> <UserIcon size={14} className="text-gray-500" /> <span className="text-xs text-gray-500">Técnico:</span> <select className="p-1 text-sm border border-gray-300 rounded bg-white focus:ring-1 focus:ring-brand-500 outline-none text-gray-900 w-40" value={env.technicianId || ''} onChange={(e) => { const newTechId = e.target.value; const newTech = allTechnicians.find(t => t.id === newTechId); const newEnvs = [...editForm.environments]; newEnvs[idx].technicianId = newTechId; newEnvs[idx].technicianName = newTech?.name; setEditForm({ ...editForm, environments: newEnvs }); }} > <option value="">Não atribuído</option> {allTechnicians.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))} </select> </div>
                            {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Valor R$:</span>
                                <input type="number" step="0.01" min="0" className="w-24 p-1 text-sm border border-gray-300 rounded bg-white focus:ring-1 focus:ring-brand-500 outline-none text-gray-900" value={env.value_brl || ''} onChange={(e) => { const val = parseFloat(e.target.value) || 0; const newEnvs = [...editForm.environments]; newEnvs[idx].value_brl = val; setEditForm({ ...editForm, environments: newEnvs }); }} />
                              </div>
                            )}
                          </div>
                          {env.status === 'COMPLETED' && (
                             <div className="flex items-center gap-2 border-t border-gray-100 pt-2.5">
                               <CheckCircle size={14} className="text-green-500" />
                               <span className="text-xs text-gray-500 font-bold">Concluído em:</span>
                               <input 
                                  type="date"
                                  className="p-1 px-2 text-sm border border-gray-300 rounded bg-white focus:ring-1 focus:ring-brand-500 outline-none text-gray-900 shadow-sm"
                                  value={env.completedDate ? env.completedDate.substring(0, 10) : ''}
                                  onChange={(e) => {
                                    const newEnvs = [...editForm.environments];
                                    newEnvs[idx].completedDate = e.target.value ? new Date(e.target.value + 'T12:00:00.000Z').toISOString() : undefined;
                                    setEditForm({ ...editForm, environments: newEnvs });
                                  }}
                               />
                             </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 text-xs bg-gray-50 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-md shadow-sm">
                            <Calendar size={13} className="text-gray-500" />
                            <span className="font-medium">Previsão: {env.estimatedDays} dia(s)</span>
                          </div>
                          {env.technicianName && (
                            <div className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-md shadow-sm">
                              <UserIcon size={13} />
                              <span className="font-bold">Resp: {env.technicianName}</span>
                            </div>
                          )}
                          {!isEditing && env.startDate && (
                            <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md shadow-sm">
                              <Calendar size={13} />
                              <span>Início: <span className="font-bold">{safeFormat(env.startDate)}</span></span>
                            </div>
                          )}
                          {env.deadlineDate && (
                            <div className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-md shadow-sm">
                              <Clock size={13} />
                              <span>Prazo: <span className="font-bold">{safeFormat(env.deadlineDate)}</span></span>
                            </div>
                          )}
                          {!isEditing && env.status === 'COMPLETED' && env.completedDate && (
                            <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-md shadow-sm">
                              <CheckCircle size={13} />
                              <span>Concluído: <span className="font-bold">{safeFormat(env.completedDate)}</span></span>
                            </div>
                          )}
                          {!isEditing && env.startDate && env.status !== 'COMPLETED' && (
                            <div className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md shadow-sm">
                              <Clock size={13} />
                              <span className="font-bold">Em execução: {calculateBusinessDays(env.startDate, new Date().toISOString())} dia(s)</span>
                            </div>
                          )}
                          {!isEditing && env.startDate && env.status === 'COMPLETED' && env.completedDate && (
                            <div className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md shadow-sm">
                              <Clock size={13} />
                              <span className="font-bold">Duração: {calculateBusinessDays(env.startDate, env.completedDate)} dia(s)</span>
                            </div>
                          )}
                          {env.value_brl !== undefined && (currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
                            <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md shadow-sm">
                              <span className="font-black">{env.value_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {env.status === 'COMPLETED' ? (<span className="flex items-center gap-1 text-green-700 text-sm font-bold bg-green-50 px-2 py-1 rounded h-fit"> <CheckCircle size={14} /> Finalizado </span>) : (<span className="text-yellow-700 text-sm font-bold bg-yellow-50 px-2 py-1 rounded h-fit">Pendente</span>)}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-3 border border-gray-200">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 mb-2">Checklist</p>
                    {!isEditing && env.checklist && (<ProgressBar items={env.checklist} />)}
                    {isEditing ? (
                      <div className="space-y-2">
                        {env.checklist.map(item => (<div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200 shadow-sm group"> <span className="flex-1 text-sm font-medium text-gray-900">{item.label}</span> <button type="button" onClick={() => handleRemoveEnvItem(idx, item.id)} className="text-red-400 hover:text-red-600 p-1"> <Trash size={14} /> </button> </div>))}
                        <div className="flex gap-2 pt-2 border-t border-gray-200 mt-2">
                          <input type="text" value={envNewItemTexts[idx] || ''} onChange={(e) => setEnvNewItemTexts({ ...envNewItemTexts, [idx]: e.target.value })} placeholder="Nova tarefa..." className="flex-1 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-900 bg-white" />
                          <button type="button" onClick={() => handleAddEnvItem(idx)} className="bg-brand-600 text-white p-2 rounded hover:bg-brand-700"> <Plus size={16} /> </button>
                        </div>
                      </div>
                    ) : (env.checklist.map(item => (<div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-100 shadow-sm"> <button disabled={isLockedForTech || (currentUser.role !== 'TECHNICIAN' && currentUser.role !== 'ADMIN')} onClick={() => handleEnvironmentCheck(idx, item.id)} className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${(isLockedForTech || (currentUser.role !== 'TECHNICIAN' && currentUser.role !== 'ADMIN')) ? 'cursor-not-allowed opacity-70' : ''} ${item.checked ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-400 hover:border-brand-500'}`}> {item.checked && <CheckSquare size={14} />} </button> <span className={`text-sm font-medium ${item.checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.label}</span> </div>)))}
                  </div>
                  {/* Project File Section — hidden from CLIENT */}
                  {currentUser.role !== 'CLIENT' && !isEditing && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={13} className="text-rose-500" />
                          Projeto do Ambiente
                        </span>
                        <div className="flex items-center gap-2">
                          {/* Add / Replace Project — ADMIN and ASSISTANT only */}
                          {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
                            <>
                              <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                ref={(el) => { projectFileInputRefs.current[idx] = el; }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (reader.result) {
                                      const newEnvs = [...(order.environments || [])];
                                      newEnvs[idx] = {
                                        ...newEnvs[idx],
                                        projectFileUrl: reader.result as string,
                                        projectFileName: file.name
                                      };
                                      onUpdateOrder({
                                        ...order,
                                        environments: newEnvs,
                                        updatedAt: new Date().toISOString(),
                                        history: [...order.history, {
                                          action: `Projeto adicionado ao ambiente "${env.name}": ${file.name}`,
                                          timestamp: new Date().toISOString(),
                                          user: currentUser.name
                                        }]
                                      });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                  e.target.value = '';
                                }}
                              />
                              <button
                                onClick={() => projectFileInputRefs.current[idx]?.click()}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                              >
                                <Plus size={13} />
                                {env.projectFileUrl ? 'Substituir' : 'Add Projeto'}
                              </button>
                            </>
                          )}
                          {/* View Project — ADMIN, ASSISTANT, TECHNICIAN */}
                          {env.projectFileUrl && (
                            <a
                              href={env.projectFileUrl}
                              download={env.projectFileName || 'projeto.pdf'}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors"
                            >
                              <FileText size={13} />
                              Ver Projeto
                            </a>
                          )}
                        </div>
                      </div>
                      {env.projectFileUrl ? (
                        <div className="mt-2 flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                          <FileText size={16} className="text-rose-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-rose-900 truncate">{env.projectFileName || 'projeto.pdf'}</p>
                            <p className="text-[10px] text-rose-400">PDF • Clique em "Ver Projeto" para baixar</p>
                          </div>
                          {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
                            <button
                              onClick={() => {
                                const newEnvs = [...(order.environments || [])];
                                newEnvs[idx] = { ...newEnvs[idx], projectFileUrl: undefined, projectFileName: undefined };
                                onUpdateOrder({ ...order, environments: newEnvs, updatedAt: new Date().toISOString() });
                              }}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-full transition-colors flex-shrink-0"
                              title="Remover projeto"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-xs text-gray-400 italic">
                          {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT')
                            ? 'Nenhum projeto adicionado. Clique em "Add Projeto" para anexar o PDF.'
                            : 'Nenhum projeto disponível para este ambiente.'}
                        </p>
                      )}
                    </div>
                  )}

                  {!isEditing && env.status !== 'COMPLETED' && !isLockedForTech && (currentUser.role === 'TECHNICIAN' || currentUser.role === 'ADMIN') && (
                    <button 
                      onClick={() => handleEnvironmentFinish(idx)} 
                      disabled={!(env.checklist?.length === 0 || env.checklist?.every(item => item.checked))}
                      className={`w-full py-2 border-2 rounded-lg font-medium transition-colors mt-3 ${(!env.checklist || env.checklist.length === 0 || env.checklist.every(item => item.checked)) ? 'border-green-600 text-green-700 hover:bg-green-50' : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed opacity-70'}`}
                      title={(!env.checklist || env.checklist.length === 0 || env.checklist.every(item => item.checked)) ? '' : 'Conclua o checklist antes de finalizar o ambiente.'}
                    > 
                      Marcar Ambiente como Finalizado 
                    </button>
                  )}
                  {!isEditing && (currentUser.role === 'ADMIN' || currentUser.role === 'TECHNICIAN') && env.status === 'COMPLETED' && env.completedDate && env.deadlineDate && (
                    <div className={`text-center text-sm font-bold p-2.5 rounded shadow-sm border mt-2 ${
                        (env.startDate ? calculateBusinessDays(env.startDate, env.completedDate) <= (env.estimatedDays || 0) : new Date(env.completedDate.substring(0,10)) <= new Date(env.deadlineDate.substring(0,10)))
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                        : 'text-red-700 bg-red-50 border-red-200'
                    }`}> 
                      {(env.startDate ? calculateBusinessDays(env.startDate, env.completedDate) <= (env.estimatedDays || 0) : new Date(env.completedDate.substring(0,10)) <= new Date(env.deadlineDate.substring(0,10))) ? 'ENTREGUE NO PRAZO' : `ENTREGUE COM ATRASO (${calculateBusinessDays(env.deadlineDate, env.completedDate) - 1} dias úteis)`} 
                    </div>
                  )}
                </div>
              );
            })}

            {/* Adicionar Novo Ambiente Builder */}
            {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
              <div className="p-4 rounded-xl mt-6 max-w-2xl mx-auto" style={{ background: 'rgba(251,146,60,.07)', border: '1px solid rgba(251,146,60,.2)' }}>
                <h4 className="font-semibold mb-3 pb-2" style={{ color: '#fb923c', borderBottom: '1px solid rgba(251,146,60,.2)' }}>Adicionar Ambiente e Serviços</h4>

                <div className="space-y-3 mb-4">
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      placeholder="Nome do Ambiente (ex: Cozinha)"
                      value={newEnvName}
                      onChange={e => setNewEnvName(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
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
                          className="w-32 p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                        />
                      )}
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="1"
                          value={newEnvDays}
                          onChange={e => setNewEnvDays(parseInt(e.target.value) || 1)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          title="Dias Úteis"
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-gray-500">dias</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <DatePicker
                      label="Data de Início do Ambiente"
                      value={newEnvStartDate}
                      onChange={setNewEnvStartDate}
                    />

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                        <UserIcon size={12} /> Técnico (Opcional)
                      </label>
                      <div className="relative">
                        <select
                          value={newEnvTechnicianId}
                          onChange={e => setNewEnvTechnicianId(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 appearance-none cursor-pointer"
                        >
                          <option value="">Selecione um técnico...</option>
                          {allTechnicians.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                      </div>
                    </div>
                  </div>

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
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-900"
                      />
                      <Button
                        type="button"
                        onClick={handleAddEnvSubItem}
                        className="bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200 shadow-none h-10 px-4"
                      >
                        Add
                      </Button>
                    </div>

                    {newEnvSubItems.length > 0 && (
                      <ul className="space-y-1 mb-2">
                        {newEnvSubItems.map((item, idx) => (
                          <li key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-gray-100 shadow-sm">
                            <span className="text-xs text-gray-700">• {item}</span>
                            <button type="button" onClick={() => removeEnvSubItem(idx)} className="text-red-400 hover:text-red-600"><Trash size={12} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="p-3 rounded-lg" style={{ background: 'rgba(244,63,94,.06)', border: '1px solid rgba(244,63,94,.2)' }}>
                    <label className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#fb7185' }}>
                      <FileText size={14} /> Projeto do Ambiente (PDF)
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
                        <Plus size={14} /> Add Projeto
                      </button>
                    )}
                  </div>

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
              </div>
            )}

          </div>
        )}
        {activeTab === 'CHAT' && (
          <div className="h-[calc(100vh-260px)] min-h-[400px] flex flex-col max-w-2xl mx-auto rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {order.comments.length === 0 && (<p className="text-center text-gray-400 text-sm mt-10">Nenhuma mensagem ainda.</p>)}
              {order.comments.map(comment => {
                const isMe = comment.userId === currentUser.id;
                return (
                  <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3 ${isMe ? 'bg-brand-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'}`}>
                      <p className={`text-xs font-bold mb-1 opacity-80 ${isMe ? 'text-white' : 'text-gray-600'}`}>{comment.userName}</p>
                      <p className="text-sm">{comment.text}</p>
                      {comment.attachmentUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-white/20">
                          {comment.attachmentType === 'video' && (
                            <video src={comment.attachmentUrl} controls className="w-full h-auto rounded" />
                          )}
                          {comment.attachmentType === 'image' && (
                            <img src={comment.attachmentUrl} alt="anexo" className="w-full h-auto object-cover rounded" />
                          )}
                          {comment.attachmentType === 'audio' && (
                            <div className={`flex items-center gap-3 p-2.5 rounded-lg ${isMe ? 'bg-brand-700/40' : 'bg-white'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-brand-100'}`}>
                                <Mic size={14} className={isMe ? 'text-white' : 'text-brand-600'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <audio src={comment.attachmentUrl} controls className="w-full h-8" style={{ filter: isMe ? 'invert(1) brightness(2)' : 'none' }} />
                              </div>
                              {comment.audioDuration && (
                                <span className={`text-[10px] font-mono flex-shrink-0 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                  {formatRecordingTime(comment.audioDuration)}
                                </span>
                              )}
                            </div>
                          )}
                          {comment.attachmentType === 'document' && (() => {
                            const docInfo = getDocIcon(comment.attachmentName, comment.attachmentMimeType);
                            const DocIcon = docInfo.icon;
                            return (
                              <a
                                href={comment.attachmentUrl}
                                download={comment.attachmentName || 'arquivo'}
                                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isMe ? 'bg-brand-700/40 hover:bg-brand-700/60' : 'bg-white hover:bg-gray-50 border border-gray-200'}`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : docInfo.bg}`}>
                                  <DocIcon size={20} className={isMe ? 'text-white' : docInfo.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isMe ? 'text-white' : 'text-gray-900'}`}>
                                    {comment.attachmentName || 'Documento'}
                                  </p>
                                  <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                    {docInfo.label} • Clique para baixar
                                  </p>
                                </div>
                                <Paperclip size={14} className={isMe ? 'text-white/50' : 'text-gray-300'} />
                              </a>
                            );
                          })()}
                        </div>
                      )}
                      <p className="text-[10px] text-right mt-1 opacity-70">{safeFormat(comment.timestamp, 'HH:mm')}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3" style={{ background: 'rgba(255,255,255,.04)', borderTop: '1px solid rgba(255,255,255,.08)' }}>
              {isProcessingFile && (<div className="flex items-center gap-2 mb-2 p-2 bg-brand-50 border border-brand-100 rounded-lg"> <Loader2 size={16} className="animate-spin text-brand-600" /> <span className="text-xs font-bold text-brand-800 uppercase">Processando Arquivo...</span> </div>)}
              {attachment && (
                <div className="flex gap-2 mb-2 p-2 bg-white rounded-lg border w-fit relative">
                  {attachment.type === 'image' && (
                    <img src={attachment.preview} alt="preview" className="h-20 w-auto rounded object-cover" />
                  )}
                  {attachment.type === 'video' && (
                    <video src={attachment.preview} className="h-20 w-auto rounded bg-black" />
                  )}
                  {attachment.type === 'audio' && (
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <Mic size={14} className="text-brand-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700">Áudio gravado</span>
                        <span className="text-[10px] text-gray-400">{attachment.duration ? formatRecordingTime(attachment.duration) : '00:00'}</span>
                      </div>
                      <audio src={attachment.preview} controls className="h-8" />
                    </div>
                  )}
                  {attachment.type === 'document' && (() => {
                    const docInfo = getDocIcon(attachment.name, attachment.mimeType);
                    const DocIcon = docInfo.icon;
                    return (
                      <div className="flex items-center gap-2 px-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${docInfo.bg}`}>
                          <DocIcon size={20} className={docInfo.color} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700 max-w-[200px] truncate">{attachment.name || 'Documento'}</span>
                          <span className="text-[10px] text-gray-400">{docInfo.label}</span>
                        </div>
                      </div>
                    );
                  })()}
                  <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; if (mediaFileInputRef.current) mediaFileInputRef.current.value = ''; }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"><X size={12} /></button>
                </div>
              )}

              {/* Recording UI */}
              {isLockedForTech ? (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg text-orange-800 text-sm font-medium text-center">
                   A O.S. já foi assinada pelo cliente. O chat está bloqueado para novas interações.
                </div>
              ) : isRecording ? (
                <div className="flex gap-2 items-center bg-red-50 border border-red-200 rounded-full px-3 py-2 animate-pulse">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <span className="text-sm font-bold text-red-700 font-mono min-w-[48px]">{formatRecordingTime(recordingTime)}</span>
                  <div className="flex-1 flex items-center justify-center gap-[3px] mx-2">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[3px] bg-red-400 rounded-full"
                        style={{
                          height: `${Math.random() * 16 + 4}px`,
                          animation: `pulse ${0.3 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.05}s`
                        }}
                      />
                    ))}
                  </div>
                  <button onClick={cancelRecording} className="px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100 rounded-full transition-colors">Cancelar</button>
                  <button onClick={stopRecording} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center">
                    <Square size={16} fill="white" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  {/* Hidden file inputs */}
                  <input type="file" ref={fileInputRef} className="hidden" accept="*/*" onChange={handleFileSelect} />
                  <input type="file" ref={mediaFileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />

                  {/* Paperclip: all files */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                    title="Anexar arquivo (PDF, DOC, etc.)"
                  >
                    <Paperclip size={20} />
                  </button>

                  {/* Camera: media only */}
                  <button
                    onClick={() => mediaFileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                    title="Enviar foto ou vídeo"
                  >
                    <Camera size={20} />
                  </button>

                  {/* Mic: audio recording */}
                  <button
                    onClick={startRecording}
                    className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
                    title="Gravar áudio"
                  >
                    <Mic size={20} />
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 p-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white text-gray-900"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button onClick={handleSendMessage} className="p-2 bg-brand-600 text-white rounded-full hover:bg-brand-700 transition-colors shadow-sm">
                    <Send size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'OCCURRENCES' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h2 className="text-lg font-bold text-gray-900">Histórico de Ocorrências</h2>
                  <p className="text-sm text-gray-500">Acompanhamento e bloqueios da ordem de serviço.</p>
               </div>
               {!isLockedForTech && (
                 <Button onClick={() => setShowOccurrenceModal(true)} className="bg-brand-600 shadow-md shadow-brand-500/20" icon={<Plus size={18}/>}>
                    Nova Ocorrência
                 </Button>
               )}
            </div>

            {isLoadingEvents ? (
               <div className="flex items-center justify-center py-10 text-gray-500">
                  <Loader2 className="animate-spin mr-2" size={24} /> Carregando...
               </div>
            ) : events.length === 0 ? (
               <div className="rounded-xl p-8 text-center" style={{ border: '1px dashed rgba(255,255,255,.15)', background: 'rgba(255,255,255,.02)' }}>
                  <AlertCircle size={40} className="mx-auto mb-3" style={{ color: 'var(--hint)' }} />
                  <p style={{ color: 'var(--muted)' }} className="font-medium">Nenhuma ocorrência registrada.</p>
               </div>
            ) : (
               <div className="relative border-l-2 border-brand-100 ml-3 space-y-6 pb-4">
                  {events.map((evt) => (
                    <div key={evt.id} className="relative pl-6">
                      <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 flex items-center justify-center shadow-sm ${
                        evt.status === 'resolved' ? 'bg-green-500' :
                        ['Atualização de andamento', 'Cliente orientado/alinhamento', 'Mudança solicitada pelo cliente', 'Ajuste extra realizado', 'Evidência de entrega', 'Observação técnica', 'Elogio/boa prática', 'Outros'].includes(evt.category) || evt.category === 'INFO' ? 'bg-blue-500' :
                        ['Falta de material/peça', 'Peça errada', 'Peça avariada', 'Material insuficiente', 'Ferramenta essencial indisponível', 'Local não liberado pelo cliente', 'Cliente ausente/sem acesso', 'Impedimento físico no ambiente', 'Infraestrutura inadequada (parede/piso/estrutura)', 'Ponto de energia/água não disponível', 'Medidas divergentes/projeto inviável', 'Necessário retrabalho prévio', 'Aguardando aprovação', 'Aguardando orientação técnica', 'Aguardando entrega logística', 'Aguardando agendamento/reagendamento'].includes(evt.category) || evt.category === 'BLOCKER' ? 'bg-orange-500' : 'bg-red-500'
                      }`}></div>
                      
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all">
                         <div className="flex justify-between items-start mb-2">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider ${
                                     ['Atualização de andamento', 'Cliente orientado/alinhamento', 'Mudança solicitada pelo cliente', 'Ajuste extra realizado', 'Evidência de entrega', 'Observação técnica', 'Elogio/boa prática', 'Outros'].includes(evt.category) || evt.category === 'INFO' ? 'bg-blue-50 text-blue-700' :
                                     ['Falta de material/peça', 'Peça errada', 'Peça avariada', 'Material insuficiente', 'Ferramenta essencial indisponível', 'Local não liberado pelo cliente', 'Cliente ausente/sem acesso', 'Impedimento físico no ambiente', 'Infraestrutura inadequada (parede/piso/estrutura)', 'Ponto de energia/água não disponível', 'Medidas divergentes/projeto inviável', 'Necessário retrabalho prévio', 'Aguardando aprovação', 'Aguardando orientação técnica', 'Aguardando entrega logística', 'Aguardando agendamento/reagendamento'].includes(evt.category) || evt.category === 'BLOCKER' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'
                                  }`}>
                                     {evt.category}
                                  </span>
                                  <span className="text-xs text-gray-500 font-medium">
                                     {evt.createdAt && !isNaN(new Date(evt.createdAt).getTime()) 
                                        ? format(new Date(evt.createdAt), 'dd/MM HH:mm') 
                                        : 'Data não disponível'}
                                  </span>
                                  {evt.status === 'open' && <span className="text-[10px] border border-gray-300 text-gray-600 bg-gray-50 px-2 rounded font-bold uppercase">Em Aberto</span>}
                                  {evt.status === 'resolved' && <span className="text-[10px] border border-green-300 text-green-700 bg-green-50 px-2 rounded font-bold uppercase flex items-center gap-1"><CheckCircle size={10}/> Resolvido</span>}
                               </div>
                               <h3 className="font-bold text-gray-900">{evt.title}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                               {evt.visibility === 'client_shareable' ? (
                                  <span className="text-[10px] border border-green-200 text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1" title="Visível para o cliente"><UserCheck size={10}/> Compartilhado</span>
                               ) : (
                                  <span className="text-[10px] border border-gray-200 text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded flex items-center gap-1" title="Somente equipe interna"><Lock size={10}/> Interno</span>
                               )}
                               {evt.environmentName && (
                                  <span className="text-[10px] text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded font-medium border border-brand-100 flex items-center gap-1"><MapPin size={10}/> {evt.environmentName}</span>
                               )}
                               {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
                                 <div className="flex items-center gap-1 mt-1 bg-gray-100 p-0.5 rounded border border-gray-200">
                                    <button onClick={() => { setEditEventData(evt); setShowOccurrenceModal(true); }} className="p-1 hover:bg-blue-100 text-blue-600 rounded" title="Editar ocorrência">
                                       <Pencil size={12}/>
                                    </button>
                                    <button onClick={() => handleDeleteEvent(evt.id, evt.title)} className="p-1 hover:bg-red-100 text-red-600 rounded" title="Excluir ocorrência">
                                       <Trash size={12}/>
                                    </button>
                                 </div>
                               )}
                            </div>
                         </div>
                           
                           {evt.description && <p className="text-sm text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2">{evt.description}</p>}
                           
                           {(evt.impactDeadline || evt.impactCost) && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-dashed border-gray-200">
                                 {evt.impactDeadline && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1.5 rounded-md">
                                       <Clock size={14}/> +{evt.impactWorkdays} dia(s) útil(eis)
                                    </div>
                                 )}
                                 {evt.impactCost && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1.5 rounded-md">
                                       Gastos: {(evt.impactCostBrl || 0).toLocaleString('pt-BR', {style: 'currency', currency:'BRL'})}
                                    </div>
                                 )}
                              </div>
                           )}

                           {evt.attachments && evt.attachments.length > 0 && (
                              <div className="flex gap-2 mt-3 flex-wrap">
                                 {evt.attachments.map((att: any) => (
                                    <button 
                                      key={att.id} 
                                      type="button"
                                      onClick={() => setEventMediaModalData({ attachments: evt.attachments, initialIndex: evt.attachments.findIndex((a: any) => a.id === att.id) })} 
                                      className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 hover:border-brand-300 text-gray-700 px-2.5 py-1.5 rounded-md border border-gray-200 transition-colors cursor-pointer text-left"
                                    >
                                       {att.fileType?.startsWith('image/') ? <Camera size={14}/> : <Paperclip size={14}/>}
                                       <span className="max-w-[120px] truncate">{att.fileName}</span>
                                    </button>
                                 ))}
                              </div>
                           )}
                           
                           <div className="mt-3 text-xs text-gray-400 flex items-center justify-between">
                              <span>Registrado por: <strong>{evt.createdByName}</strong></span>
                              {evt.status === 'open' && (currentUser.id === evt.createdBy || currentUser.role === 'ADMIN') && (
                                 <button 
                                    onClick={async () => {
                                       if(window.confirm('Marcar ocorrência como resolvida?')) {
                                          await db.updateWorkOrderEventStatus(evt.id, 'resolved');
                                          loadEvents();
                                       }
                                    }} 
                                    className="text-brand-600 hover:text-brand-800 font-bold"
                                 >
                                    Marcar Resolvido
                                 </button>
                              )}
                           </div>
                        </div>
                      </div>
                    ))}
                 </div>
              )}

              {showOccurrenceModal && (
                 <OccurrenceFormModal 
                    currentUser={currentUser} 
                    workOrder={order} 
                    initialData={editEventData}
                    onClose={() => { setShowOccurrenceModal(false); setEditEventData(null); }}
                    onSave={async (payload, files) => {
                       await handleSaveEvent(payload, files);
                       setShowOccurrenceModal(false);
                       setEditEventData(null);
                    }}
                    onEnvironmentCreated={(newEnv) => {
                       const updatedEnvs = [...(order.environments || []), newEnv];
                       onUpdateOrder({
                          ...order,
                          environments: updatedEnvs,
                          updatedAt: new Date().toISOString()
                       });
                    }}
                 />
              )}
              
              {eventMediaModalData && (
                <EventMediaModal 
                  attachments={eventMediaModalData.attachments} 
                  initialIndex={eventMediaModalData.initialIndex}
                  onClose={() => setEventMediaModalData(null)}
                />
              )}
            </div>
          )}
      </div>
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="rounded-2xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden" style={{ background: 'var(--navy2)', border: '1px solid rgba(255,255,255,0.05)' }}>
            
            {/* Background glowing effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-brand-500/10 blur-[50px] rounded-full pointer-events-none" />

            <div className="relative z-10">
               <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full" style={{ background: 'rgba(26, 107, 255, 0.1)', border: '1px solid rgba(26, 107, 255, 0.2)' }}>
                     <Lock size={32} className="text-brand-500" />
                  </div>
               </div>
               
               <h3 className="font-bold text-xl text-center text-white mb-2 tracking-wide">Assinatura Digital</h3>
               <p className="text-sm text-center mb-8" style={{ color: 'var(--muted)' }}>
                  Para confirmar a conclusão do serviço com segurança, digite sua senha de acesso abaixo.
               </p>
               
               <div className="space-y-6">
                 <div> 
                    <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--hint)' }}>Sua Senha</label> 
                    <div className="relative">
                       <input 
                         type="password" 
                         autoFocus 
                         className={`w-full p-3.5 pl-4 pr-10 rounded-xl outline-none transition-all ${signatureError ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'}`} 
                         style={{ 
                            background: 'rgba(0,0,0,0.2)', 
                            border: `1px solid ${signatureError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, 
                            color: 'var(--sf-white)' 
                         }}
                         placeholder="••••••" 
                         value={signaturePassword} 
                         onChange={(e) => { setSignaturePassword(e.target.value); setSignatureError(''); }} 
                       /> 
                       {signatureError && <p className="text-xs text-red-400 mt-2 flex items-center gap-1"><AlertTriangle size={12}/> {signatureError}</p>}
                    </div>
                 </div>
                 
                 <div className="flex gap-3 pt-2"> 
                    <button onClick={() => { setShowSignatureModal(false); setSignaturePassword(''); setSignatureError(''); }} className="flex-1 py-3.5 rounded-xl font-bold transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--sf-white)', border: '1px solid rgba(255,255,255,0.1)' }}>Cancelar</button> 
                    <button onClick={handleSignatureSubmit} disabled={!signaturePassword} className="flex-1 py-3.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-500 disabled:opacity-50 transition-colors shadow-[0_0_20px_rgba(26,107,255,0.3)]">Aprovar e Concluir</button> 
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
      {showRatingPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="rounded-2xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden text-center" style={{ background: 'var(--navy2)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-green-500/10 blur-[50px] rounded-full pointer-events-none" />
            <div className="relative z-10">
               <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                     <CheckCircle size={32} className="text-green-500" />
                  </div>
               </div>
               <h3 className="font-bold text-xl text-white mb-2 tracking-wide">Serviço Concluído!</h3>
               <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Gostaria de avaliar o atendimento do técnico agora? Sua opinião é muito importante para nós.</p>
               <div className="flex gap-3"> 
                  <button onClick={() => setShowRatingPrompt(false)} className="flex-1 py-3.5 rounded-xl font-bold transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--sf-white)', border: '1px solid rgba(255,255,255,0.1)' }}>Mais tarde</button> 
                  <button onClick={handleGoToRating} className="flex-1 py-3.5 bg-yellow-500 text-yellow-950 rounded-xl font-bold hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)]">Avaliar Agora</button> 
               </div>
            </div>
          </div>
        </div>
      )}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="rounded-2xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden" style={{ background: 'var(--navy2)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-500/10 blur-[50px] rounded-full pointer-events-none" />
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                     <XCircle size={24} className="text-red-500" />
                  </div>
                  <h3 className="font-bold text-xl text-white tracking-wide">Cancelar Ordem</h3>
               </div>
               <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Por favor, informe o motivo do cancelamento:</p>
               <textarea 
                  className="w-full p-3.5 rounded-xl outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500/20 mb-6 resize-none" 
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--sf-white)' }} 
                  rows={4} 
                  value={cancelReason} 
                  onChange={(e) => setCancelReason(e.target.value)} 
                  placeholder="Descreva o motivo detalhadamente..." 
               />
               <div className="flex gap-3"> 
                  <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3.5 rounded-xl font-bold transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--sf-white)', border: '1px solid rgba(255,255,255,0.1)' }}>Voltar</button> 
                  <button onClick={handleCancel} disabled={!cancelReason.trim()} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 disabled:opacity-50 transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)]">Confirmar Cancelamento</button> 
               </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="rounded-2xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden" style={{ background: 'var(--navy2)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-500/10 blur-[50px] rounded-full pointer-events-none" />
            <div className="relative z-10 text-center">
               <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                     <Trash size={32} className="text-red-500" />
                  </div>
               </div>
               <h3 className="font-bold text-xl text-white mb-3 tracking-wide">Excluir Permanentemente</h3>
               <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
                  Tem certeza? Esta ação removerá a ordem <strong className="text-white">{order.id}</strong> do sistema e não poderá ser desfeita. Considere usar "Cancelar" se quiser manter o histórico.
               </p>
               <div className="flex gap-3"> 
                  <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3.5 rounded-xl font-bold transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--sf-white)', border: '1px solid rgba(255,255,255,0.1)' }}>Cancelar</button> 
                  <button onClick={handleDelete} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)]">Excluir Definitivo</button> 
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
