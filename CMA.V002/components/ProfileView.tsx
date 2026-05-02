import React, { useState, useEffect, useRef } from 'react';
import { User, Role } from '../types';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { User as UserIcon, Save, Camera, Mail, Phone, Shield, ArrowLeft, MapPin, Lock, Search, Loader2, Upload, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
  viewer: User; // Who is looking at this profile?
  onSave: (updatedUser: User) => Promise<void>;
  onBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, viewer, onSave, onBack }) => {
  const isAdmin = viewer.role === 'ADMIN';
  const fileInputId = `avatar-upload-${currentUser.id}`;
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Basic Info
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(currentUser.secondaryPhone || '');
  const [email, setEmail] = useState(currentUser.email);
  const [role, setRole] = useState<Role>(currentUser.role);
  const [classification, setClassification] = useState(currentUser.classification || 'JUNIOR');
  const [password, setPassword] = useState(''); 
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');

  // Address Fields
  const [cep, setCep] = useState(currentUser.cep || '');
  const [street, setStreet] = useState(currentUser.street || '');
  const [addressNumber, setAddressNumber] = useState(currentUser.addressNumber || '');
  const [complement, setComplement] = useState(currentUser.complement || '');
  const [neighborhood, setNeighborhood] = useState(currentUser.neighborhood || '');
  const [city, setCity] = useState(currentUser.city || '');
  const [state, setState] = useState(currentUser.state || '');

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Sync state if the user prop changes
  useEffect(() => {
    setName(currentUser.name);
    setPhone(currentUser.phone || '');
    setSecondaryPhone(currentUser.secondaryPhone || '');
    setEmail(currentUser.email);
    setRole(currentUser.role);
    setClassification(currentUser.classification || 'JUNIOR');
    setAvatarUrl(currentUser.avatarUrl || '');
    setPassword(''); 

    setCep(currentUser.cep || '');
    setStreet(currentUser.street || '');
    setAddressNumber(currentUser.addressNumber || '');
    setComplement(currentUser.complement || '');
    setNeighborhood(currentUser.neighborhood || '');
    setCity(currentUser.city || '');
    setState(currentUser.state || '');
  }, [currentUser]);

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setStreet(data.logradouro);
        setNeighborhood(data.bairro);
        setCity(data.localidade);
        setState(data.uf);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG).');
      return;
    }

    // Aumentado para 5MB para suportar fotos de celulares modernos
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito pesada (máx 5MB). Tente uma foto menor ou compactada.');
      return;
    }

    setIsProcessingImage(true);
    const reader = new FileReader();
    
    reader.onloadstart = () => setIsProcessingImage(true);
    
    reader.onloadend = () => {
      if (reader.result) {
        setAvatarUrl(reader.result as string);
      }
      setIsProcessingImage(false);
      // Limpa o valor do input para permitir selecionar a mesma imagem novamente se necessário
      e.target.value = '';
    };

    reader.onerror = () => {
      alert('Erro ao processar o arquivo de imagem.');
      setIsProcessingImage(false);
    };

    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (window.confirm('Deseja remover sua foto de perfil?')) {
      setAvatarUrl('');
    }
  };
  
  const showStatus = (type: 'success' | 'error', message: string) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setSaveStatus({ type, message });
    if (type === 'success') {
      statusTimerRef.current = setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    let formattedAddress = currentUser.address;
    if (street || city) {
      formattedAddress = `${street || ''}, ${addressNumber || ''} ${complement ? '- ' + complement : ''}, ${neighborhood || ''}, ${city || ''} - ${state || ''}`;
      if (cep) formattedAddress += `, CEP: ${cep}`;
    }

    try {
      await onSave({
        ...currentUser,
        name,
        phone,
        secondaryPhone,
        email,
        role,
        ...(role === 'TECHNICIAN' ? { classification } : {}),
        ...(password ? { password } : {}),
        avatarUrl,
        address: formattedAddress,
        cep,
        street,
        addressNumber,
        complement,
        neighborhood,
        city,
        state,
      });
      showStatus('success', 'Perfil atualizado com sucesso!');
      setPassword('');
    } catch (err: any) {
      showStatus('error', err?.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <Button variant="secondary" onClick={onBack} icon={<ArrowLeft size={18} />}>
            Voltar
          </Button>
        )}
        <div className="flex-1">
          <PageHeader 
            title={onBack ? `Editando: ${currentUser.name}` : 'Meu Perfil'}
            description={onBack ? 'Visualização e edição de dados do sistema.' : 'Gerencie suas informações pessoais e credenciais.'}
            icon={<UserIcon className="text-brand-600" size={24} />}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-brand-700 to-brand-500 relative">
           {onBack && (
             <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded text-white text-xs font-bold backdrop-blur-sm">
                ID: {currentUser.id}
             </div>
           )}
        </div>
        
        <div className="px-8 pb-8">
          {/* Avatar Section */}
          <div className="relative -mt-16 mb-6 flex flex-col items-center sm:items-start">
            <div className="relative group">
              <label 
                htmlFor={fileInputId}
                className="block relative w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-xl cursor-pointer"
              >
                {isProcessingImage ? (
                  <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
                    <Loader2 className="animate-spin mb-1" size={24} />
                    <span className="text-[10px] font-bold">Lendo...</span>
                  </div>
                ) : (
                  <>
                    <img 
                      src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`} 
                      alt="Profile" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                      <Camera size={24} />
                      <span className="text-[10px] font-bold mt-1 uppercase">Trocar Foto</span>
                    </div>
                  </>
                )}
              </label>

              {/* Botão flutuante de câmera para Mobile */}
              <label 
                htmlFor={fileInputId}
                className="absolute bottom-1 right-1 bg-brand-600 text-white p-2 rounded-full shadow-lg border-2 border-white sm:hidden cursor-pointer active:scale-90 transition-transform"
              >
                <Camera size={18} />
              </label>

              {/* Botão Remover (Apenas se houver foto) */}
              {avatarUrl && !isProcessingImage && (
                 <button 
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 bg-red-500 text-white p-1.5 rounded-full shadow-md border-2 border-white hover:bg-red-600 transition-colors"
                  title="Remover foto"
                 >
                   <Trash2 size={14} />
                 </button>
              )}
            </div>
            
            <p className="mt-2 text-[10px] text-gray-400 font-medium">JPG ou PNG, máx 5MB</p>
            
            {/* Input de Arquivo Real (Escondido mas referenciado pelo ID) */}
            <input 
              id={fileInputId}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-4 top-3 text-gray-400" />
                  <input 
                    type="text" 
                    required
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="input-field pl-12" 
                  />
                </div>
              </div>

               {/* Role (Editable by Admin) */}
               <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  Perfil de Acesso
                  {!isAdmin && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">Visualização</span>}
                </label>
                <div className="relative">
                  <Shield size={18} className="absolute left-4 top-3 text-gray-400" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    disabled={!isAdmin}
                    className={`w-full pl-12 p-2.5 border rounded-lg outline-none appearance-none shadow-sm font-medium
                      ${isAdmin 
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'}`}
                  >
                    <option value="CLIENT">Cliente</option>
                    <option value="TECHNICIAN">Técnico</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>

              {/* Classification (Only for Technician) */}
              {role === 'TECHNICIAN' && (
               <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  Classificação (Metas)
                  {!isAdmin && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">Apenas Leitura</span>}
                </label>
                <div className="relative">
                  <Shield size={18} className="absolute left-4 top-3 text-gray-400" />
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as any)}
                    disabled={!isAdmin}
                    className={`w-full pl-12 p-2.5 border rounded-lg outline-none appearance-none shadow-sm font-medium
                      ${isAdmin 
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'}`}
                  >
                    <option value="JUNIOR">Júnior</option>
                    <option value="PLENO">Pleno</option>
                    <option value="SENIOR">Sênior</option>
                  </select>
                </div>
              </div>
              )}

              {/* Email (Editable by Admin) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  E-mail (Login)
                  {!isAdmin && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">Admin Only</span>}
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-3 text-gray-400" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isAdmin}
                    className={`w-full pl-12 p-2.5 border rounded-lg outline-none shadow-sm
                      ${isAdmin 
                        ? 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'}`}
                  />
                </div>
              </div>

              {/* Password Change */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Alterar Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-3 text-gray-400" />
                  <input 
                    type="text" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Nova senha (vazio = manter)"
                    className="input-field pl-12" 
                  />
                </div>
              </div>

              {/* Phones */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone Principal</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-3 text-gray-400" />
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="(00) 00000-0000"
                    className="input-field pl-12" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone Secundário</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-3 text-gray-400" />
                  <input 
                    type="text" 
                    value={secondaryPhone} 
                    onChange={(e) => setSecondaryPhone(e.target.value)} 
                    placeholder="(00) 00000-0000"
                    className="input-field pl-12" 
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="col-span-1 md:col-span-2 bg-gray-50 p-5 rounded-xl border border-gray-200 mt-2">
                 <h4 className="font-bold text-gray-800 text-sm mb-5 flex items-center gap-2 border-b pb-3">
                     <MapPin size={18} className="text-brand-500"/>
                     Endereço de Atendimento
                 </h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">CEP</label>
                      <div className="relative">
                        <input 
                          className="input-field text-sm"
                          value={cep}
                          onChange={e => setCep(e.target.value)}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                        />
                        {isLoadingCep ? (
                          <div className="absolute right-3 top-3 animate-spin"><Loader2 size={16} className="text-brand-500"/></div>
                        ) : (
                          <div className="absolute right-3 top-3 text-gray-400"><Search size={16}/></div>
                        )}
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-3">
                       <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Rua / Avenida</label>
                       <input 
                         className="input-field text-sm"
                         value={street}
                         onChange={e => setStreet(e.target.value)}
                       />
                    </div>

                    <div className="col-span-1">
                       <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Número</label>
                       <input 
                         className="input-field text-sm"
                         value={addressNumber}
                         onChange={e => setAddressNumber(e.target.value)}
                       />
                    </div>

                    <div className="col-span-1 md:col-span-3">
                       <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Complemento / Apto</label>
                       <input 
                         className="input-field text-sm"
                         value={complement}
                         onChange={e => setComplement(e.target.value)}
                       />
                    </div>

                     <div className="col-span-1 md:col-span-2">
                       <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Bairro</label>
                       <input 
                         className="input-field text-sm"
                         value={neighborhood}
                         onChange={e => setNeighborhood(e.target.value)}
                       />
                    </div>

                    <div className="col-span-1 md:col-span-1">
                       <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Cidade</label>
                       <input 
                         className="input-field text-sm"
                         value={city}
                         onChange={e => setCity(e.target.value)}
                       />
                    </div>

                    <div className="col-span-1 md:col-span-1">
                       <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Estado (UF)</label>
                       <input 
                         className="input-field text-sm"
                         value={state}
                         onChange={e => setState(e.target.value)}
                         maxLength={2}
                       />
                    </div>
                 </div>
              </div>

              {/* Link Manual da Foto */}
              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                  Link da Foto (URL)
                  {avatarUrl.startsWith('data:') && <span className="text-brand-600">Arquivo local selecionado</span>}
                </label>
                <div className="relative">
                  <Upload size={18} className="absolute left-4 top-3 text-gray-400" />
                  <input 
                    type="text" 
                    value={avatarUrl.startsWith('data:') ? '' : avatarUrl} 
                    onChange={(e) => setAvatarUrl(e.target.value)} 
                    placeholder="https://sua-foto-online.com/foto.jpg"
                    className="input-field pl-12 text-sm" 
                  />
                </div>
              </div>

            </div>

            <div className="pt-6 border-t flex flex-col sm:flex-row justify-end gap-3">
               {onBack && (
                  <Button variant="secondary" onClick={onBack}>
                    Cancelar
                  </Button>
               )}
              <Button type="submit" disabled={isProcessingImage || isSaving} icon={isSaving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20} />}>
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>

            {saveStatus && (
              <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                saveStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {saveStatus.type === 'success'
                  ? <CheckCircle size={18} className="flex-shrink-0 text-emerald-500 mt-0.5" />
                  : <AlertCircle size={18} className="flex-shrink-0 text-red-500 mt-0.5" />}
                <span className="flex-1">{saveStatus.message}</span>
                <button onClick={() => setSaveStatus(null)} className="flex-shrink-0 opacity-60 hover:opacity-100">
                  <X size={16} />
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
