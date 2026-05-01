import React, { useState, useMemo } from 'react';
import { WorkOrder, User, Environment } from '../types';
import { format, isSameMonth, parseISO, parse, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trophy, Download, Calendar, Filter, UserIcon, BarChart3, TrendingUp, CheckCircle, Package, Settings, X, Save, Shield } from 'lucide-react';
import { db } from '../services/db';
import { TechnicianTargets } from '../types';

import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { FilterBar } from './ui/FilterBar';
import { MetricCard } from './ui/MetricCard';
import { DataTable } from './ui/DataTable';
import { StatusBadge } from './ui/StatusBadge';
import { DateInput } from './ui/DateInput';

interface ProductivityDashboardProps {
  orders: WorkOrder[];
  allUsers: User[];
  currentUser: User;
  onSelectOrder?: (order: WorkOrder) => void;
}

interface ProductivityItem {
  orderId: string;
  clientName: string;
  envName: string;
  technicianId: string;
  technicianName: string;
  technicianClassification: 'JUNIOR' | 'PLENO' | 'SENIOR';
  valueBrl: number;
  status: 'COMPLETED' | 'PENDING';
  finishedDate: string | null;
  timestampForFilter: Date | null;
}

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({ orders, allUsers, currentUser, onSelectOrder }) => {
  // Defaults
  const [filterMode, setFilterMode] = useState<'MONTH' | 'PERIOD'>('MONTH');
  const currentMonthYear = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [selectedTech, setSelectedTech] = useState<string>(
    currentUser.role === 'TECHNICIAN' ? currentUser.id : 'ALL'
  );
  const [selectedClassification, setSelectedClassification] = useState<'ALL' | 'JUNIOR' | 'PLENO' | 'SENIOR'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'COMPLETED' | 'ALL'>('COMPLETED');

  const [targets, setTargets] = useState<TechnicianTargets>({ JUNIOR: 85000, PLENO: 100000, SENIOR: 120000 });
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [editingTargets, setEditingTargets] = useState<TechnicianTargets>({ JUNIOR: 85000, PLENO: 100000, SENIOR: 120000 });

  React.useEffect(() => {
    db.getTechnicianTargets().then(data => {
      setTargets(data);
      setEditingTargets(data);
    });
  }, []);

  const handleSaveTargets = async () => {
    await db.saveTechnicianTargets(editingTargets);
    setTargets(editingTargets);
    setShowTargetModal(false);
  };

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT';
  const technicians = allUsers.filter(u => u.role === 'TECHNICIAN');

  // Parse all environments into a flat list
  const allEnvItems = useMemo(() => {
    let items: ProductivityItem[] = [];

    orders.forEach(order => {
      if (order.type === 'ASSEMBLY' && order.environments && order.environments.length > 0) {
        order.environments.forEach(env => {
          // If env has no tech assigned, maybe it was finished by order tech?
          // Using env.technicianId, fallback to order.technicianId
          const techId = env.technicianId || order.technicianId;
          const techUser = allUsers.find(u => u.id === techId);
          const techName = techUser?.name || env.technicianName || order.technicianName || 'Não Atribuído';
          const techClass = techUser?.classification || 'JUNIOR';

          // Determine the competence date: 1. finished_at, 2. completedDate, 3. order.updatedAt (if order is completed)
          let dateStr = env.finished_at || env.completedDate;
          if (!dateStr && order.status === 'COMPLETED') {
            dateStr = order.updatedAt;
          }

          let dateObj = null;
          if (dateStr) {
            // handle both YYYY-MM-DD or full ISO
            if (dateStr.length === 10) dateObj = new Date(dateStr + 'T00:00:00');
            else dateObj = new Date(dateStr);
          }

          items.push({
            orderId: order.id,
            clientName: order.clientName,
            envName: env.name,
            technicianId: techId || '',
            technicianName: techName,
            technicianClassification: techClass,
            valueBrl: env.value_brl || 0,
            status: env.status,
            finishedDate: dateStr || null,
            timestampForFilter: dateObj
          });
        });
      }
    });

    return items;
  }, [orders, allUsers]);

  // Apply Filters
  const filteredItems = useMemo(() => {
    let result = allEnvItems;

    // Filter by Technician
    if (selectedTech !== 'ALL') {
      result = result.filter(item => item.technicianId === selectedTech);
    }

    // Filter by Classification
    if (selectedClassification !== 'ALL') {
      result = result.filter(item => item.technicianClassification === selectedClassification);
    }

    // Filter by Status
    if (selectedStatus === 'COMPLETED') {
      result = result.filter(item => item.status === 'COMPLETED');
    }

    // Filter by Date Mode
    if (filterMode === 'MONTH') {
      if (selectedMonth) {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const filterDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
        
        result = result.filter(item => {
          if (!item.timestampForFilter) return false;
          return isSameMonth(item.timestampForFilter, filterDate);
        });
      }
    } else if (filterMode === 'PERIOD') {
      if (startDate && endDate) {
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        result = result.filter(item => {
          if (!item.timestampForFilter) return false;
          return item.timestampForFilter >= start && item.timestampForFilter <= end;
        });
      }
    }

    return result.sort((a, b) => {
      if (!a.timestampForFilter) return 1;
      if (!b.timestampForFilter) return -1;
      return b.timestampForFilter.getTime() - a.timestampForFilter.getTime();
    });
  }, [allEnvItems, selectedTech, selectedClassification, selectedStatus, selectedMonth, filterMode, startDate, endDate]);

  // Calculate KPIs
  const totalProduced = filteredItems.reduce((acc, curr) => acc + curr.valueBrl, 0);
  const totalEnvironments = filteredItems.length;
  const uniqueOrders = new Set(filteredItems.map(item => item.orderId)).size;
  const averageTicket = totalEnvironments > 0 ? totalProduced / totalEnvironments : 0;
  
  // Basic 22 work days logic for daily average
  const dailyAverage = totalProduced / 22;

  // Calculate Target Metric
  const currentTarget = useMemo(() => {
    if (!isAdmin) return targets[currentUser.classification || 'JUNIOR'];

    let activeTechs = technicians;
    if (selectedTech !== 'ALL') {
      activeTechs = activeTechs.filter(t => t.id === selectedTech);
    }
    if (selectedClassification !== 'ALL') {
      activeTechs = activeTechs.filter(t => (t.classification || 'JUNIOR') === selectedClassification);
    }

    return activeTechs.reduce((acc, t) => acc + (targets[t.classification || 'JUNIOR'] || 0), 0);
  }, [isAdmin, currentUser, selectedTech, selectedClassification, technicians, targets]);

  const targetPercentage = currentTarget > 0 ? (totalProduced / currentTarget) * 100 : 0;

  // Calculate Ranking (Admin Only)
  const ranking = useMemo(() => {
    if (!isAdmin) return [];
    
    // Group by technician
    const map = new Map<string, { name: string, classification: string, total: number, count: number }>();
    
    // We only rank based on the globally filtered list (so it respects Month and Status)
    // To show accurate ranks, we must temporarily ignore the 'selectedTech' filter for the ranking list.
    const baseItems = allEnvItems.filter(item => {
      if (selectedStatus === 'COMPLETED' && item.status !== 'COMPLETED') return false;
      if (filterMode === 'MONTH') {
        if (selectedMonth) {
          const [yearStr, monthStr] = selectedMonth.split('-');
          const filterDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
          if (!item.timestampForFilter || !isSameMonth(item.timestampForFilter, filterDate)) return false;
        }
      } else if (filterMode === 'PERIOD') {
        if (startDate && endDate) {
          const start = startOfDay(parseISO(startDate));
          const end = endOfDay(parseISO(endDate));
          if (!item.timestampForFilter || item.timestampForFilter < start || item.timestampForFilter > end) return false;
        }
      }
      return true;
    });

    baseItems.forEach(item => {
      if (!item.technicianId) return;
      const current = map.get(item.technicianId) || { name: item.technicianName, classification: item.technicianClassification, total: 0, count: 0 };
      current.total += item.valueBrl;
      current.count += 1;
      map.set(item.technicianId, current);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [isAdmin, allEnvItems, selectedMonth, selectedStatus, filterMode, startDate, endDate]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Data de Finalizacao', 'Ordem', 'Cliente', 'Ambiente', 'Montador', 'Status'];
    if (currentUser.role === 'ADMIN') {
      headers.splice(4, 0, 'Valor (R$)');
    }

    const rows = filteredItems.map(item => {
      const row = [
        item.timestampForFilter ? format(item.timestampForFilter, 'dd/MM/yyyy HH:mm') : 'N/A',
        item.orderId,
        `"${item.clientName}"`, // Escape quotes for CSV
        `"${item.envName}"`,
        `"${item.technicianName}"`,
        item.status === 'COMPLETED' ? 'Finalizado' : 'Pendente'
      ];
      if (currentUser.role === 'ADMIN') {
        row.splice(4, 0, item.valueBrl.toFixed(2).replace('.', ','));
      }
      return row;
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n');

    // Add BOM for Excel UTF-8
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const dateStr = filterMode === 'MONTH' ? selectedMonth : `${startDate}_a_${endDate}`;
    link.setAttribute('download', `produtividade_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={isAdmin ? 'Produtividade Geral' : 'Minha Produtividade'}
        description="Resumo financeiro e acompanhamento de ambientes concluídos."
        icon={<TrendingUp className="text-brand-600" size={24} />}
        actionSecondary={
          <div className="flex gap-2">
            {isAdmin && (
              <Button 
                variant="secondary" 
                onClick={() => setShowTargetModal(true)} 
                icon={<Settings size={18} />}
              >
                Metas
              </Button>
            )}
            <Button 
              variant="secondary" 
              onClick={exportToCSV} 
              disabled={filteredItems.length === 0}
              icon={<Download size={18} />}
            >
              Exportar
            </Button>
          </div>
        }
      />

      <FilterBar>
        {/* Grupo Calendário — empilha em mobile, tamanhos fixos no desktop */}
        <div className="w-full md:contents flex flex-col gap-3">
          {/* Toggle: largura fixa — não precisa crescer */}
          <div className="w-full md:w-[200px] md:shrink-0">
            <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Filter size={14} /> Visão de Calendário
            </label>
            <div className="flex bg-gray-100 rounded-xl p-1 h-11 border border-transparent">
              <button
                className={`flex-1 flex items-center justify-center text-[14px] font-medium rounded-lg transition-shadow h-full ${filterMode === 'MONTH' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setFilterMode('MONTH')}
              >
                Mensal
              </button>
              <button
                className={`flex-1 flex items-center justify-center text-[14px] font-medium rounded-lg transition-shadow h-full ${filterMode === 'PERIOD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setFilterMode('PERIOD')}
              >
                Período
              </button>
            </div>
          </div>

          {filterMode === 'MONTH' ? (
            /* Mês: deixa crescer livremente */
            <div className="w-full md:flex-1 md:min-w-[150px]">
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} /> Mês de Referência
              </label>
              <DateInput 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)}
                className="input-field"
              />
            </div>
          ) : (
            /* Datas: largura fixa — garante espaço suficiente para dd/MM/yyyy + ícone */
            <div className="w-full md:w-[300px] md:shrink-0 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Calendar size={14} /> De
                </label>
                <DateInput 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Calendar size={14} /> Até
                </label>
                <DateInput 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </div>
          )}
        </div>
        
        {isAdmin && (
          <>
            {/* Classificação: opções curtas — largura fixa compacta */}
            <div className="shrink-0 w-full md:w-[120px]">
              <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
                <Shield size={14} /> Classificação
              </label>
              <select 
                value={selectedClassification} 
                onChange={e => setSelectedClassification(e.target.value as any)}
                className="input-field cursor-pointer"
              >
                <option value="ALL">Todas</option>
                <option value="JUNIOR">Júnior</option>
                <option value="PLENO">Pleno</option>
                <option value="SENIOR">Sênior</option>
              </select>
            </div>
            {/* Técnico: único que cresce para preencher espaço restante */}
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
                <UserIcon size={14} /> Técnico
              </label>
              <select 
                value={selectedTech} 
                onChange={e => setSelectedTech(e.target.value)}
                className="input-field cursor-pointer"
              >
                <option value="ALL">Todos os Técnicos</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Status: largura fixa — "Finalizados" + seta cabe em 140px */}
        <div className="shrink-0 w-full md:w-[140px]">
          <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
            <Filter size={14} /> Status
          </label>
          <select 
            value={selectedStatus} 
            onChange={e => setSelectedStatus(e.target.value as 'COMPLETED' | 'ALL')}
            className="input-field cursor-pointer"
          >
            <option value="COMPLETED">Finalizados</option>
            <option value="ALL">Todos (Inclui Pendentes)</option>
          </select>
        </div>
      </FilterBar>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentUser.role === 'ADMIN' && (
          <MetricCard 
            label="Total Produzido"
            value={totalProduced.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            subValue={
              <div className="flex flex-col gap-1 mt-2 w-full">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-500">
                  <span>Meta: {currentTarget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <span className={`${targetPercentage >= 100 ? 'text-green-600' : 'text-brand-600'}`}>{targetPercentage.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${targetPercentage >= 100 ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(targetPercentage, 100)}%` }} />
                </div>
              </div>
            }
            icon={<BarChart3 size={20} />}
          />
        )}
        <MetricCard 
          label="Ambientes Finalizados"
          value={totalEnvironments}
          icon={<Package size={20} />}
        />
        <MetricCard 
          label="O.S. Concluídas"
          value={uniqueOrders}
          icon={<CheckCircle size={20} />}
        />
        {currentUser.role === 'ADMIN' && (
          <MetricCard 
            label="Ticket Médio (Por Amb.)"
            value={averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            subValue={`Média ~ ${dailyAverage.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / dia`}
            icon={<TrendingUp size={20} />}
          />
        )}
      </div>

      {isAdmin && (
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
              <Trophy className="text-brand-500" /> Ranking Geral de Técnicos ({selectedMonth ? format(parseISO(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR }) : 'Geral'})
            </h3>
            <DataTable 
              data={ranking}
              columns={[
                { key: 'rank', header: '#', render: (_: any, idx: number) => <span className="font-bold text-gray-400">{idx + 1}º</span> },
                { key: 'name', header: 'Técnico', render: (item: any) => <span className="font-medium text-gray-900">{item.name}</span> },
                { key: 'classification', header: 'Classificação', align: 'center', render: (item: any) => <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-semibold">{item.classification}</span> },
                { key: 'count', header: 'Ambientes', align: 'center' },
                { key: 'average', header: 'Ticket Médio', align: 'right', render: (item: any) => <span className="text-gray-500">{(item.count > 0 ? (item.total / item.count) : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> },
                { key: 'total', header: 'Total Produzido', align: 'right', render: (item: any) => <span className="font-bold text-gray-900">{item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> }
              ]}
              emptyMessage="Nenhum dado produtivo encontrado para as datas filtradas."
            />
          </div>

          {(selectedClassification === 'ALL' || selectedClassification === 'SENIOR') && ranking.filter(t => t.classification === 'SENIOR').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
                Ranking: Sênior
              </h3>
              <DataTable 
                data={ranking.filter(t => t.classification === 'SENIOR')}
                columns={[
                  { key: 'rank', header: '#', render: (_: any, idx: number) => <span className="font-bold text-gray-400">{idx + 1}º</span> },
                  { key: 'name', header: 'Técnico', render: (item: any) => <span className="font-medium text-gray-900">{item.name}</span> },
                  { key: 'count', header: 'Ambientes', align: 'center' },
                  { key: 'total', header: 'Total Produzido', align: 'right', render: (item: any) => <span className="font-bold text-gray-900">{item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> }
                ]}
                emptyMessage=""
              />
            </div>
          )}

          {(selectedClassification === 'ALL' || selectedClassification === 'PLENO') && ranking.filter(t => t.classification === 'PLENO').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
                Ranking: Pleno
              </h3>
              <DataTable 
                data={ranking.filter(t => t.classification === 'PLENO')}
                columns={[
                  { key: 'rank', header: '#', render: (_: any, idx: number) => <span className="font-bold text-gray-400">{idx + 1}º</span> },
                  { key: 'name', header: 'Técnico', render: (item: any) => <span className="font-medium text-gray-900">{item.name}</span> },
                  { key: 'count', header: 'Ambientes', align: 'center' },
                  { key: 'total', header: 'Total Produzido', align: 'right', render: (item: any) => <span className="font-bold text-gray-900">{item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> }
                ]}
                emptyMessage=""
              />
            </div>
          )}

          {(selectedClassification === 'ALL' || selectedClassification === 'JUNIOR') && ranking.filter(t => t.classification === 'JUNIOR').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
                Ranking: Júnior
              </h3>
              <DataTable 
                data={ranking.filter(t => t.classification === 'JUNIOR')}
                columns={[
                  { key: 'rank', header: '#', render: (_: any, idx: number) => <span className="font-bold text-gray-400">{idx + 1}º</span> },
                  { key: 'name', header: 'Técnico', render: (item: any) => <span className="font-medium text-gray-900">{item.name}</span> },
                  { key: 'count', header: 'Ambientes', align: 'center' },
                  { key: 'total', header: 'Total Produzido', align: 'right', render: (item: any) => <span className="font-bold text-gray-900">{item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> }
                ]}
                emptyMessage=""
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
          <BarChart3 className="text-brand-500" /> Detalhamento de Serviços
        </h3>
        <DataTable 
          data={filteredItems}
          columns={[
            { key: 'date', header: 'Data Finalização', render: (item: any) => <span className="text-gray-600">{item.timestampForFilter ? format(item.timestampForFilter, 'dd/MM/yyyy') : '-'}</span> },
            { key: 'orderId', header: 'O.S.', render: (item: any) => (
              <button 
                onClick={() => {
                  const order = orders.find(o => o.id === item.orderId);
                  if (order && onSelectOrder) onSelectOrder(order);
                }}
                className="hover:underline text-brand-600 font-medium text-left outline-none cursor-pointer"
              >
                {item.orderId}
              </button>
            ) },
            { key: 'clientName', header: 'Cliente' },
            { key: 'envName', header: 'Ambiente', render: (item: any) => <span className="font-medium text-gray-900">{item.envName}</span> },
            { key: 'technicianName', header: 'Montador', render: (item: any) => <span className="text-gray-600">{item.technicianName}</span> },
            { key: 'status', header: 'Status', render: (item: any) => <StatusBadge status={item.status} /> },
            ...(currentUser.role === 'ADMIN' ? [{ key: 'value', header: 'Valor', align: 'right', render: (item: any) => <span className="font-medium text-gray-900">{item.valueBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> }] as any[] : [])
          ]}
          emptyMessage="Nenhum ambiente encontrado com os filtros selecionados."
        />
      </div>

      {/* Modal de Configuração de Metas */}
      {showTargetModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Settings size={18} className="text-brand-600"/>
                  Configurar Metas Mensais
                </h3>
                <button onClick={() => setShowTargetModal(false)} className="text-gray-400 hover:text-gray-600 outline-none">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Técnico Júnior</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                    <input type="number" className="input-field pl-9" value={editingTargets.JUNIOR} onChange={e => setEditingTargets({...editingTargets, JUNIOR: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Técnico Pleno</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                    <input type="number" className="input-field pl-9" value={editingTargets.PLENO} onChange={e => setEditingTargets({...editingTargets, PLENO: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Técnico Sênior</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                    <input type="number" className="input-field pl-9" value={editingTargets.SENIOR} onChange={e => setEditingTargets({...editingTargets, SENIOR: Number(e.target.value)})} />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                 <Button variant="secondary" onClick={() => setShowTargetModal(false)}>Cancelar</Button>
                 <Button onClick={handleSaveTargets} icon={<Save size={16}/>}>Salvar Metas</Button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
