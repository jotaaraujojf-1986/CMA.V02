import React, { useState, useRef } from 'react';
import { WorkOrder, User, Environment } from '../types';
import { Button } from './ui/Button';
import { AlertCircle, AlertTriangle, Info, X, Camera, Paperclip, MapPin, Search, Plus } from 'lucide-react';
import { db } from '../services/db';

interface OccurrenceFormModalProps {
  workOrder: WorkOrder;
  currentUser: User;
  onClose: () => void;
  onSave: (eventData: any, files: File[]) => Promise<void>;
  // Opcional: callback se um ambiente for criado diretamente daqui
  onEnvironmentCreated?: (env: Environment) => void;
  initialData?: any; // the WorkOrderEvent mapping
}

const CATEGORY_MAP = {
  INFO: [
    'Atualização de andamento', 'Cliente orientado/alinhamento', 'Mudança solicitada pelo cliente', 
    'Ajuste extra realizado', 'Evidência de entrega', 'Observação técnica', 'Elogio/boa prática', 'Outros'
  ],
  BLOCKER: [
    'Falta de material/peça', 'Peça errada', 'Peça avariada', 'Material insuficiente', 
    'Ferramenta essencial indisponível', 'Local não liberado pelo cliente', 'Cliente ausente/sem acesso', 
    'Impedimento físico no ambiente', 'Infraestrutura inadequada (parede/piso/estrutura)', 
    'Ponto de energia/água não disponível', 'Medidas divergentes/projeto inviável', 
    'Necessário retrabalho prévio', 'Aguardando aprovação', 'Aguardando orientação técnica', 
    'Aguardando entrega logística', 'Aguardando agendamento/reagendamento'
  ],
  SAFETY_ALERT: [
    'Risco elétrico', 'Risco de queda', 'Estrutura comprometida', 'Ferramenta perigosa sem EPI', 
    'Ambiente insalubre', 'Agressão/ameaça/conflito grave', 'Animais agressivos', 
    'Condições climáticas perigosas', 'Incêndio/fumaça/cheiro de gás', 'Outros'
  ]
};

export const OccurrenceFormModal: React.FC<OccurrenceFormModalProps> = ({ workOrder, currentUser, onClose, onSave, onEnvironmentCreated, initialData }) => {
  const [scope, setScope] = useState<'work_order' | 'environment'>(initialData?.scope || 'work_order');
  const [environmentId, setEnvironmentId] = useState<string>(initialData?.environmentId || '');
  
  const initialCatType = initialData?.category && CATEGORY_MAP.BLOCKER.includes(initialData.category) ? 'BLOCKER' : 
                         initialData?.category && CATEGORY_MAP.SAFETY_ALERT.includes(initialData.category) ? 'SAFETY_ALERT' : 'INFO';

  const [typeCategory, setTypeCategory] = useState<'INFO' | 'BLOCKER' | 'SAFETY_ALERT'>(initialCatType);
  const [category, setCategory] = useState<string>(initialData?.category || '');
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  
  const [impactDeadline, setImpactDeadline] = useState(initialData?.impactDeadline || false);
  const [impactWorkdays, setImpactWorkdays] = useState(initialData?.impactWorkdays || 1);
  const [impactCost, setImpactCost] = useState(initialData?.impactCost || false);
  
  const [impactCostBrlRaw, setImpactCostBrlRaw] = useState(
      initialData?.impactCostBrl 
      ? Number(initialData.impactCostBrl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
      : ''
  );
  
  const [visibility, setVisibility] = useState<'internal' | 'client_shareable'>(initialData?.visibility || 'internal');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Quick Env Creation State
  const [showNewEnvForm, setShowNewEnvForm] = useState(false);
  const [quickEnvName, setQuickEnvName] = useState('');
  const [quickEnvDays, setQuickEnvDays] = useState(1);

  const isOthers = category === 'Outros';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const handleCreateQuickEnv = async () => {
    if (!quickEnvName) return;
    const newEnv: Environment = {
      id: Math.random().toString(36),
      name: quickEnvName,
      estimatedDays: quickEnvDays,
      status: 'PENDING',
      checklist: []
    };
    if (onEnvironmentCreated) {
       onEnvironmentCreated(newEnv);
    }
    setEnvironmentId(newEnv.id);
    setShowNewEnvForm(false);
    setQuickEnvName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOthers && !description.trim()) {
      alert("Para a categoria 'Outros', a descrição é obrigatória.");
      return;
    }
    if (scope === 'environment' && !environmentId) {
      alert("Selecione um ambiente ou troque o escopo para 'Geral da Montagem'.");
      return;
    }
    if (!category) {
      alert("Selecione uma categoria.");
       return;
    }

    setIsSubmitting(true);
    
    // Parse currency
    let numericCost = 0;
    if (impactCost && impactCostBrlRaw) {
      numericCost = Number(impactCostBrlRaw.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    }

    const payload = {
      workOrderId: workOrder.id,
      workOrderType: workOrder.type,
      scope,
      environmentId: scope === 'environment' ? environmentId : null,
      category,
      title,
      description,
      impactDeadline,
      impactWorkdays: impactDeadline ? impactWorkdays : undefined,
      impactCost,
      impactCostBrl: impactCost ? numericCost : undefined,
      visibility,
      status: 'open'
    };

    try {
      await onSave(payload, attachments);
      onClose();
    } catch(err) {
      console.error(err);
      alert('Erro ao salvar ocorrência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="text-orange-500" /> Nova Ocorrência
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <form id="occurrence-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Scope (Only for Assembly) */}
            {workOrder.type === 'ASSEMBLY' && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="text-sm font-bold text-gray-800 mb-3 block">1. Escopo da Ocorrência</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="work_order" checked={scope === 'work_order'} onChange={() => setScope('work_order')} className="text-brand-600 focus:ring-brand-500 w-4 h-4" />
                    <span className="text-sm text-gray-700 font-medium cursor-pointer">Geral da Montagem</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="environment" checked={scope === 'environment'} onChange={() => setScope('environment')} className="text-brand-600 focus:ring-brand-500 w-4 h-4" />
                    <span className="text-sm text-gray-700 font-medium cursor-pointer">Vinculado a um Ambiente</span>
                  </label>
                </div>
                
                {scope === 'environment' && (
                  <div className="pl-6 border-l-2 border-brand-200 space-y-3 mt-2">
                    {!showNewEnvForm ? (
                       <div className="flex gap-2">
                         <select 
                           value={environmentId} 
                           onChange={e => setEnvironmentId(e.target.value)}
                           className="flex-1 p-2.5 text-sm border border-gray-300 rounded-lg bg-white"
                         >
                           <option value="">Selecione um ambiente existente...</option>
                           {workOrder.environments?.map(env => (
                             <option key={env.id} value={env.id}>{env.name}</option>
                           ))}
                         </select>
                         <Button type="button" onClick={() => setShowNewEnvForm(true)} variant="outline" className="border-brand-200 text-brand-700" icon={<Plus size={16}/>}>
                           Novo Ambiente
                         </Button>
                       </div>
                    ) : (
                       <div className="bg-white p-3 rounded-lg border border-brand-200 shadow-sm flex items-end gap-2 animate-fade-in">
                         <div className="flex-1">
                           <label className="text-xs text-gray-500 mb-1 block">Nome do Ambiente Rápido</label>
                           <input type="text" value={quickEnvName} onChange={e => setQuickEnvName(e.target.value)} placeholder="Ex: Sala de Estar" className="w-full text-sm p-2 border border-gray-300 rounded-md" />
                         </div>
                         <div className="w-24">
                            <label className="text-xs text-gray-500 mb-1 block">Dias Úteis</label>
                            <input type="number" min="1" value={quickEnvDays} onChange={e => setQuickEnvDays(parseInt(e.target.value)||1)} className="w-full text-sm p-2 border border-gray-300 rounded-md" />
                         </div>
                         <div className="flex gap-1">
                           <Button type="button" onClick={handleCreateQuickEnv} disabled={!quickEnvName} className="px-3 h-9 bg-brand-600 hover:bg-brand-700">Criar</Button>
                           <Button type="button" onClick={() => setShowNewEnvForm(false)} variant="ghost" className="px-2 h-9 text-gray-500"><X size={16}/></Button>
                         </div>
                       </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Classification */}
            <div className="space-y-4">
               <label className="text-sm font-bold text-gray-800 block">2. Classificação</label>
               <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => {setTypeCategory('INFO'); setCategory('');}} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${typeCategory === 'INFO' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Info size={16}/> Informativo</button>
                  <button type="button" onClick={() => {setTypeCategory('BLOCKER'); setCategory('');}} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${typeCategory === 'BLOCKER' ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><AlertTriangle size={16}/> Impeditivo</button>
                  <button type="button" onClick={() => {setTypeCategory('SAFETY_ALERT'); setCategory('');}} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${typeCategory === 'SAFETY_ALERT' ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><AlertCircle size={16}/> Risco/Segurança</button>
               </div>
               
               <select required value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 text-sm border border-gray-300 rounded-lg bg-white mt-2">
                 <option value="">Selecione a sub-categoria exata...</option>
                 {CATEGORY_MAP[typeCategory].map(cat => (
                   <option key={cat} value={cat}>{cat}</option>
                 ))}
               </select>

               <div className="space-y-3 pt-2">
                  <input required placeholder="Título resumido da ocorrência" value={title} onChange={e => setTitle(e.target.value)} className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-white font-medium" />
                  <textarea required={isOthers} placeholder={isOthers ? "Descreva detalhadamente (Obrigatório para 'Outros')..." : "Descreva os detalhes do evento (Opcional)..."} value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full text-sm p-3 border border-gray-300 rounded-lg bg-white resize-none" />
               </div>
            </div>

            {/* Impacts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className={`p-4 rounded-xl border transition-colors ${impactDeadline ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                 <label className="flex items-center gap-2 cursor-pointer mb-2">
                   <input type="checkbox" checked={impactDeadline} onChange={e => setImpactDeadline(e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-gray-300" />
                   <span className="text-sm font-bold text-gray-800">Causou atraso no Prazo?</span>
                 </label>
                 {impactDeadline && (
                    <div className="flex items-center gap-2 mt-3 animate-fade-in pl-6">
                      <span className="text-xs text-gray-600">Impactou em</span>
                      <input type="number" min="1" value={impactWorkdays} onChange={e => setImpactWorkdays(parseInt(e.target.value)||1)} className="w-16 p-1.5 text-sm border border-gray-300 rounded text-center" />
                      <span className="text-xs text-gray-600">dia(s) úteis.</span>
                    </div>
                 )}
               </div>

               <div className={`p-4 rounded-xl border transition-colors ${impactCost ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                 <label className="flex items-center gap-2 cursor-pointer mb-2">
                   <input type="checkbox" checked={impactCost} onChange={e => setImpactCost(e.target.checked)} className="w-4 h-4 text-red-600 rounded border-gray-300" />
                   <span className="text-sm font-bold text-gray-800">Gerou Custos Extras?</span>
                 </label>
                 {impactCost && (
                    <div className="mt-3 animate-fade-in pl-6">
                      <label className="text-xs text-gray-600 block mb-1">Custo Estimado (R$)</label>
                      <input type="tel" placeholder="0,00" value={impactCostBrlRaw} onChange={(e) => {
                         let val = e.target.value.replace(/\D/g, '');
                         if (!val) { setImpactCostBrlRaw(''); return; }
                         const num = Number(val) / 100;
                         setImpactCostBrlRaw(num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                       }} className="w-full p-2 text-sm border border-gray-300 rounded" />
                    </div>
                 )}
               </div>
            </div>

            {/* Media & Upload */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
               <label className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2"><Paperclip size={16}/> Evidências (Fotos/Vídeos)</label>
               <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.pdf" />
               <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="h-20 w-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-brand-600 hover:border-brand-300 transition-colors bg-white">
                    <Camera size={20} className="mb-1" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Upload</span>
                  </button>
                  {attachments.map((file, idx) => (
                    <div key={idx} className="h-20 w-24 rounded-lg bg-gray-200 relative overflow-hidden group border border-gray-300">
                      {file.type.startsWith('image/') ? (
                         <img src={URL.createObjectURL(file)} className="flex-1 w-full h-full object-cover" />
                      ) : (
                         <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-brand-50 text-brand-700">
                           <Paperclip size={20} />
                           <span className="text-[10px] uppercase font-bold mt-1 truncate w-full text-center px-1">.{file.name.split('.').pop()}</span>
                         </div>
                      )}
                      <button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <X size={20} />
                      </button>
                    </div>
                  ))}
               </div>
            </div>

            {/* Visibility Settings - Only Admin can change to shareable directly currently by prompt requirements, or Techs can't change to shareable */}
            {currentUser.role === 'ADMIN' && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white shadow-sm">
                <span className="text-sm font-bold text-gray-800">Visibilidade:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" value="internal" checked={visibility === 'internal'} onChange={() => setVisibility('internal')} className="text-brand-600 focus:ring-brand-500 w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-600">Somente Interno</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer ml-4">
                  <input type="radio" value="client_shareable" checked={visibility === 'client_shareable'} onChange={() => setVisibility('client_shareable')} className="text-brand-600 focus:ring-brand-500 w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-600">Compartilhar c/ Cliente</span>
                </label>
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="occurrence-form" disabled={isSubmitting || !category} className="shadow-lg shadow-brand-500/20 px-8">
            {isSubmitting ? 'Salvando...' : 'Salvar Ocorrência'}
          </Button>
        </div>
      </div>
    </div>
  );
};
