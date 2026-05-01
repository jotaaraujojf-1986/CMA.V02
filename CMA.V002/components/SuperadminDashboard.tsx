import React, { useEffect, useState } from 'react';
import { db, supabase } from '../services/db';
import { PageHeader } from './ui/PageHeader';
import { Database, Loader2, Search, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { PLAN_DEFINITIONS, PlanKey } from '../utils/plans';

interface SuperadminDashboardProps {
  currentUser: any;
}

export const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({ currentUser }) => {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Busca direta na tabela empresas (política superadmin_acesso_total libera o acesso)
      const { data: empData, error: empErr } = await supabase
        .from('empresas')
        .select('id, nome, email, plano, plano_status, plano_expira_em, status, criado_em')
        .order('criado_em', { ascending: false });

      if (empErr) throw empErr;

      // Busca contagem de usuários por empresa
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('empresa_id, role');

      if (usersErr) throw usersErr;

      // Agrupa contagens por empresa no frontend
      const countMap: Record<string, any> = {};
      (usersData || []).forEach((u: any) => {
        if (!countMap[u.empresa_id]) {
          countMap[u.empresa_id] = { empresa_id: u.empresa_id, total_tecnicos: 0, total_admins: 0, total_assistentes: 0, total_clientes: 0 };
        }
        if (u.role === 'TECHNICIAN') countMap[u.empresa_id].total_tecnicos++;
        if (u.role === 'ADMIN') countMap[u.empresa_id].total_admins++;
        if (u.role === 'ASSISTANT') countMap[u.empresa_id].total_assistentes++;
        if (u.role === 'CLIENT') countMap[u.empresa_id].total_clientes++;
      });

      setEmpresas(empData || []);
      setCounts(Object.values(countMap));
    } catch (err: any) {
      console.error('Erro ao carregar dados do superadmin:', err?.message || err);
      alert(`Erro ao carregar dados do superadmin: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdatePlan = async (empresaId: string, currentPlan: string, currentStatus: string) => {
    const novoPlano = prompt('Digite o ID do novo plano (starter, pro, business, trial):', currentPlan);
    if (!novoPlano || !PLAN_DEFINITIONS[novoPlano as PlanKey]) {
      if (novoPlano) alert('Plano inválido.');
      return;
    }

    const novoStatus = prompt('Digite o novo status (ativo, inativo, cancelado):', currentStatus);
    if (!novoStatus) return;

    // Se for trial, adiciona 14 dias a partir de agora, senao deixa o que tiver ou renova +30
    const expiraEmDate = new Date();
    if (novoPlano === 'trial') {
      expiraEmDate.setDate(expiraEmDate.getDate() + 14);
    } else {
      expiraEmDate.setDate(expiraEmDate.getDate() + 30);
    }

    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          plano: novoPlano,
          plano_status: novoStatus,
          plano_expira_em: expiraEmDate.toISOString()
        })
        .eq('id', empresaId);

      if (error) throw error;
      alert('Plano atualizado com sucesso!');
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao atualizar plano: ${err?.message || ''}`);
    }
  };
  const handleToggleStatus = async (empresaId: string, currentStatus: string) => {
    const novoStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    if (!confirm(`Deseja realmente mudar o status para ${novoStatus.toUpperCase()}?`)) return;

    try {
      const { error } = await supabase
        .from('empresas')
        .update({ plano_status: novoStatus })
        .eq('id', empresaId);

      if (error) throw error;
      alert(`Empresa agora está ${novoStatus.toUpperCase()}!`);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao alterar status: ${err?.message || ''}`);
    }
  };
  if (currentUser?.role !== 'SUPERADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-20">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Acesso Negado</h2>
        <p className="text-gray-500">Apenas superadministradores podem ver esta página.</p>
      </div>
    );
  }

  const filtered = empresas.filter(e => e.nome?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Superadmin | Instâncias"
        description="Gestão global de empresas e assinaturas do ServiceFlow."
        icon={<Database className="text-red-600" size={24} />}
      />

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center">
        <Search className="text-gray-400 mr-3" size={20} />
        <input 
          type="text" 
          placeholder="Buscar empresa por nome ou email..." 
          className="flex-1 outline-none text-gray-700 bg-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-300 border-b border-white/10">
                <tr>
                  <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Empresa</th>
                  <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Plano</th>
                  <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Status</th>
                  <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Uso (Equipe)</th>
                  <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(empresa => {
                  const uso = counts.find(c => c.empresa_id === empresa.id);
                  const isTrial = empresa.plano === 'trial';
                  
                  return (
                    <tr key={empresa.id} className="hover:bg-blue-500/8 border-l-2 border-l-transparent hover:border-l-blue-500/50 transition-colors duration-150">
                      <td className="p-4">
                        <p className="font-bold text-slate-200">{empresa.nome}</p>
                        <p className="text-xs text-slate-400">{empresa.email}</p>
                        <p className="text-xs text-slate-500 mt-1">ID: <span className="font-mono text-[10px] text-slate-400">{empresa.id.split('-')[0]}...</span></p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide
                          ${empresa.plano === 'business' ? 'bg-orange-100 text-orange-800' : 
                            empresa.plano === 'pro' ? 'bg-purple-100 text-purple-800' : 
                            isTrial ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
                        `}>
                          {empresa.plano}
                        </span>
                        {empresa.plano_expira_em && (
                          <p className="text-[10px] text-slate-400 mt-2">
                            Expira: {new Date(empresa.plano_expira_em).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1.5 text-xs font-bold 
                          ${empresa.plano_status === 'ativo' ? 'text-green-600' : 'text-red-600'}`}>
                          {empresa.plano_status === 'ativo' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {empresa.plano_status?.toUpperCase() || 'ATIVO'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {uso ? (
                          <div className="space-y-1">
                            <p><strong>{uso.total_tecnicos}</strong> Técnicos</p>
                            <p><strong>{uso.total_admins}</strong> Admins</p>
                            <p><strong>{uso.total_assistentes}</strong> Assists</p>
                            <p><strong>{uso.total_clientes}</strong> Clientes</p>
                          </div>
                        ) : (
                          <span className="text-slate-500">Sem dados</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleUpdatePlan(empresa.id, empresa.plano, empresa.plano_status || 'ativo')}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Alterar Plano
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(empresa.id, empresa.plano_status || 'ativo')}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors
                              ${empresa.plano_status === 'ativo' 
                                ? 'text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800' 
                                : 'text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-800'
                              }`}
                          >
                            {empresa.plano_status === 'ativo' ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma empresa encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
