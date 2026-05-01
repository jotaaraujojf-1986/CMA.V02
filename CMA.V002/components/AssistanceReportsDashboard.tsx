import React, { useState, useMemo, useEffect } from 'react';
import { WorkOrder, User } from '../types';
import { BarChart3, Wrench, ArrowLeft, Filter, Calendar as CalendarIcon, User as UserIcon, AlertTriangle, Settings, ChevronDown, Activity, Clock, CheckCircle, HelpCircle, Download, Layers, Grid, Tag } from 'lucide-react';
import { format, isWithinInterval, startOfMonth, endOfMonth, isValid, differenceInDays } from 'date-fns';
import { getStatusColor, getStatusLabel } from '../services/mockData';

import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { FilterBar } from './ui/FilterBar';
import { MetricCard } from './ui/MetricCard';
import { DataTable } from './ui/DataTable';
import { StatusBadge } from './ui/StatusBadge';
import { DateInput } from './ui/DateInput';

interface AssistanceReportsDashboardProps {
  orders: WorkOrder[];
  currentUser: User;
  allUsers: User[];
  onBack?: () => void;
  onSelectOrder?: (order: WorkOrder) => void;
}

export const AssistanceReportsDashboard: React.FC<AssistanceReportsDashboardProps> = ({ orders, currentUser, allUsers, onBack, onSelectOrder }) => {
  const [activeTab, setActiveTab] = useState<'EXECUTION' | 'POST_ASSEMBLY'>('POST_ASSEMBLY');
  
  // Filtros Gerais
  const [filterMode, setFilterMode] = useState<'MONTH' | 'PERIOD'>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('ALL');

  const technicians = allUsers.filter(u => u.role === 'TECHNICIAN');

  // --- NOVOS ESTADOS (Pós-Montagem) ---
  const [deadlineFilter, setDeadlineFilter] = useState<'ALL' | '30' | '60' | '90' | 'CUSTOM'>('ALL');
  const [customMinDays, setCustomMinDays] = useState('0');
  const [customMaxDays, setCustomMaxDays] = useState('30');
  const [includeMissingDates, setIncludeMissingDates] = useState(false);
  
  const [competenceMode, setCompetenceMode] = useState<'ASSISTANCE_DATE' | 'ASSEMBLY_DATE'>('ASSISTANCE_DATE');
  const [showSettings, setShowSettings] = useState(false);

  // NOVO: Filtros de Ambiente, Categoria e Origem da Falha
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedOriginReason, setSelectedOriginReason] = useState<string>('ALL');

  // Configurações Salvas Localmente
  const [alertLimitRate, setAlertLimitRate] = useState(10); // % limite return_rate
  const [alertLimitCount30d, setAlertLimitCount30d] = useState(3); // Qtd max em 30d
  const [alertLimitCategorySpike, setAlertLimitCategorySpike] = useState(5); // Qtd max / categoria

  useEffect(() => {
    const savedRate = localStorage.getItem('cma_alertLimitRate');
    const savedCount = localStorage.getItem('cma_alertLimitCount30d');
    const savedSpike = localStorage.getItem('cma_alertLimitCategorySpike');
    if (savedRate) setAlertLimitRate(Number(savedRate));
    if (savedCount) setAlertLimitCount30d(Number(savedCount));
    if (savedSpike) setAlertLimitCategorySpike(Number(savedSpike));
  }, []);

  const saveSettings = (rate: number, count: number, spike: number) => {
    setAlertLimitRate(rate);
    setAlertLimitCount30d(count);
    setAlertLimitCategorySpike(spike);
    localStorage.setItem('cma_alertLimitRate', rate.toString());
    localStorage.setItem('cma_alertLimitCount30d', count.toString());
    localStorage.setItem('cma_alertLimitCategorySpike', spike.toString());
    setShowSettings(false);
  };

  // --- Helpers de Data ---
  const isDateInRange = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (!isValid(date)) return false;

    if (filterMode === 'MONTH') {
      const [year, month] = selectedMonth.split('-');
      return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1;
    } else {
      const sDate = new Date(startDate + 'T00:00:00');
      const eDate = new Date(endDate + 'T23:59:59');
      if (!isValid(sDate) || !isValid(eDate)) return true;
      return isWithinInterval(date, { start: sDate, end: eDate });
    }
  };

  const safeFormat = (dateInput: string | undefined, fmt: string = 'dd/MM/yyyy') => {
    if (!dateInput) return '-';
    const localD = dateInput.length === 10 ? new Date(dateInput + 'T00:00:00') : new Date(dateInput);
    return isValid(localD) ? format(localD, fmt) : '-';
  };

  const getUserName = (id?: string) => {
    if (!id) return 'Não atribuído';
    return allUsers.find(u => u.id === id)?.name || 'Desconhecido';
  };

  // --- DATAS E CRIAÇÃO DERIVADA (days_after_assembly) ---
  const enhancedPostAssemblies = useMemo(() => {
    let filtered = orders.filter(o => o.type === 'ASSISTANCE' && o.isPostAssembly && o.relatedAssemblyWorkOrderId);

    // Calcular dias após montagem
    return filtered.map(assistance => {
      let assembFinishDateStr = assistance.relatedAssemblyFinishedAt;
      
      // Fallback pra buscar a OS de origem caso a data falhe ali
      if (!assembFinishDateStr) {
        const originOS = orders.find(o => o.id === assistance.relatedAssemblyWorkOrderId);
        // Pega data final de conclusão do status ou do update
        if (originOS) {
           assembFinishDateStr = originOS.status === 'COMPLETED' ? originOS.updatedAt : '';
        }
      }

      let daysAfter: number | null = null;
      if (assembFinishDateStr && assistance.createdAt) {
         const assDate = new Date(assistance.createdAt);
         const finishDate = new Date(assembFinishDateStr);
         if (isValid(assDate) && isValid(finishDate)) {
            daysAfter = Math.abs(differenceInDays(assDate, finishDate));
         }
      }

      return {
        ...assistance,
        _daysAfter: daysAfter,
        _assemblyFinishDateParsed: assembFinishDateStr
      };
    });
  }, [orders]);

  // --- EXTRAÇÃO DE AMBIENTES E CATEGORIAS ÚNICOS ---
  const { availableEnvironments, availableCategories } = useMemo(() => {
     const envs = new Set<string>();
     const cats = new Set<string>();
     enhancedPostAssemblies.forEach(o => {
        if (o.relatedEnvironmentName && o.relatedEnvironmentName !== 'Não informado') envs.add(o.relatedEnvironmentName);
        if (o.assistanceCategory && o.assistanceCategory !== 'Outros') cats.add(o.assistanceCategory);
     });
     return { 
       availableEnvironments: Array.from(envs).sort(), 
       availableCategories: Array.from(cats).sort() 
     };
  }, [enhancedPostAssemblies]);

  // --- TAB A: Execução (Gerais) ---
  const viewableExecutionAssistances = useMemo(() => {
    let filtered = orders.filter(o => o.type === 'ASSISTANCE' && isDateInRange(o.createdAt || o.updatedAt));
    if (currentUser.role === 'TECHNICIAN') filtered = filtered.filter(o => o.technicianId === currentUser.id);
    else if (selectedTechnicianId !== 'ALL') filtered = filtered.filter(o => o.technicianId === selectedTechnicianId);
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, currentUser, selectedTechnicianId, filterMode, selectedMonth, startDate, endDate]);

  const executionStats = {
    total: viewableExecutionAssistances.length,
    completed: viewableExecutionAssistances.filter(o => o.status === 'COMPLETED').length,
    cancelled: viewableExecutionAssistances.filter(o => o.status === 'CANCELLED').length,
    inProgress: viewableExecutionAssistances.filter(o => o.status === 'IN_PROGRESS' || o.status === 'ASSIGNED').length,
  };


  // --- TAB B: Pós-Montagem Avançada ---
  
  // 1. Filtragem de Competência e Prazo
  const filteredPostAssemblies = useMemo(() => {
    let list = enhancedPostAssemblies;

    // Filtro RBAC
    if (currentUser.role === 'TECHNICIAN') {
      list = list.filter(o => o.relatedAssemblyTechnicianId === currentUser.id);
    } else if (selectedTechnicianId !== 'ALL') {
      list = list.filter(o => o.relatedAssemblyTechnicianId === selectedTechnicianId);
    }

    // Filtro de Competência de Datas (Data da Assistência ou Data de Conclusão da Montagem)
    list = list.filter(o => {
      const dateTarget = competenceMode === 'ASSISTANCE_DATE' ? o.createdAt : o._assemblyFinishDateParsed;
      return isDateInRange(dateTarget || '');
    });

    // Filtro de Prazos (Dias)
    list = list.filter(o => {
      if (o._daysAfter === null) return includeMissingDates;

      const d = o._daysAfter;
      if (deadlineFilter === '30') return d <= 30;
      if (deadlineFilter === '60') return d <= 60;
      if (deadlineFilter === '90') return d <= 90;
      if (deadlineFilter === 'CUSTOM') {
         const min = parseInt(customMinDays) || 0;
         const max = parseInt(customMaxDays) || 0;
         return d >= min && d <= max;
      }
      return true; // ALL
    });

    // Filtros de Categoria, Ambiente e Origem da Falha
    if (selectedEnvironment !== 'ALL') {
       list = list.filter(o => o.relatedEnvironmentName === selectedEnvironment);
    }
    if (selectedCategory !== 'ALL') {
       list = list.filter(o => o.assistanceCategory === selectedCategory);
    }
    if (selectedOriginReason !== 'ALL') {
       list = list.filter(o => o.assistanceOriginReason === selectedOriginReason);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [enhancedPostAssemblies, currentUser, selectedTechnicianId, competenceMode, isDateInRange, deadlineFilter, customMinDays, customMaxDays, includeMissingDates, selectedEnvironment, selectedCategory, selectedOriginReason]);

  // 2. Metrics e Cards Globais
  const globalCards = useMemo(() => {
    const total = filteredPostAssemblies.length;
    let upTo30 = 0, upTo60 = 0, upTo90 = 0, over90 = 0, noDate = 0;
    let sumDays = 0, countAvg = 0;

    filteredPostAssemblies.forEach(o => {
       if (o._daysAfter === null) {
         noDate++;
       } else {
         const d = o._daysAfter;
         if (d <= 30) upTo30++;
         else if (d <= 60) upTo60++;
         else if (d <= 90) upTo90++;
         else over90++;

         sumDays += d;
         countAvg++;
       }
    });

    const avgTime = countAvg > 0 ? Math.round(sumDays / countAvg) : 0;

    return { 
      total, upTo30, upTo60, upTo90, over90, noDate, avgTime,
      pct30: total > 0 ? ((upTo30 / total) * 100).toFixed(1) : '0',
      pct60: total > 0 ? ((upTo60 / total) * 100).toFixed(1) : '0',
      pct90: total > 0 ? ((upTo90 / total) * 100).toFixed(1) : '0',
      pctOver: total > 0 ? ((over90 / total) * 100).toFixed(1) : '0',
    };
  }, [filteredPostAssemblies]);

  // 3. Ranking e Taxa de Retorno por Montador
  const techRanking = useMemo(() => {
    const ranking: Record<string, any> = {};

    filteredPostAssemblies.forEach(o => {
      const tid = o.relatedAssemblyTechnicianId;
      if (!tid) return;

      if (!ranking[tid]) {
        ranking[tid] = { 
          id: tid, name: getUserName(tid), 
          totalAssists: 0, upTo30: 0, upTo60: 0, upTo90: 0, over90: 0, 
          sumDays: 0, countAvg: 0, totalAssembliesDone: 0 
        };
      }
      
      ranking[tid].totalAssists++;
      if (o._daysAfter !== null) {
         const d = o._daysAfter;
         if (d <= 30) ranking[tid].upTo30++;
         else if (d <= 60) ranking[tid].upTo60++;
         else if (d <= 90) ranking[tid].upTo90++;
         else ranking[tid].over90++;
         
         ranking[tid].sumDays += d;
         ranking[tid].countAvg++;
      }
    });

    // Achar volume de montagens para o denominador da Taxa de Retorno (de acordo com a competência)
    orders.forEach(o => {
        if (o.type !== 'ASSEMBLY' || o.status !== 'COMPLETED') return;
        
        // Em Assembly Date: verificamos se a OS foi concluída no período.
        // Em Assistance Date: ainda usamos a conclusão da OS no período (isso gera distorções matemáticas clássicas, mas permite cruzar a "produção do mês" vs "defeitos do mês").
        if (!isDateInRange(o.updatedAt)) return;

        o.environments?.forEach(env => {
            const tid = env.technicianId;
            if (tid && ranking[tid]) {
               ranking[tid].totalAssembliesDone++;
            }
        });
    });

    return Object.values(ranking).map(r => {
       // Calcular top env e top cat
       const envsCount: Record<string, number> = {};
       const catsCount: Record<string, number> = {};
       
       filteredPostAssemblies.filter(o => o.relatedAssemblyTechnicianId === r.id).forEach(o => {
          if (o.relatedEnvironmentName) envsCount[o.relatedEnvironmentName] = (envsCount[o.relatedEnvironmentName] || 0) + 1;
          if (o.assistanceCategory) catsCount[o.assistanceCategory] = (catsCount[o.assistanceCategory] || 0) + 1;
       });
       
       const topEnv = Object.entries(envsCount).sort((a:any, b:any) => b[1] - a[1])[0];
       const topCat = Object.entries(catsCount).sort((a:any, b:any) => b[1] - a[1])[0];

       return {
         ...r as any,
         avgTime: r.countAvg > 0 ? Math.round(r.sumDays / r.countAvg) : 0,
         returnRatePercent: r.totalAssembliesDone > 0 ? ((r.totalAssists / r.totalAssembliesDone) * 100) : 0,
         topEnvironment: topEnv ? `${topEnv[0]} (${topEnv[1]})` : '-',
         topCategory: topCat ? `${topCat[0]} (${topCat[1]})` : '-'
       };
    }).sort((a, b) => b.totalAssists - a.totalAssists);

  }, [filteredPostAssemblies, orders, isDateInRange]);


  // 4. Insights (Avisos Automáticos)
  const insights = useMemo(() => {
    const alerts = [];
    if (currentUser.role !== 'ADMIN') return alerts; // Admin only

    techRanking.forEach(t => {
       if (t.returnRatePercent > alertLimitRate) {
           alerts.push({
               type: 'DANGER',
               title: 'Taxa de Retorno Alta',
               message: `O técnico ${t.name} possui uma taxa de retorno de ${t.returnRatePercent.toFixed(1)}%, ultrapassando o limite configurado de ${alertLimitRate}%. (${t.totalAssists} assists / ${t.totalAssembliesDone} montagens).`
           });
       }
       if (t.upTo30 >= alertLimitCount30d) {
           alerts.push({
               type: 'WARNING',
               title: 'Quebras em Curto Prazo',
               message: `O técnico ${t.name} acumulou ${t.upTo30} assistências precoces (até 30 dias após montagem), sugerindo possível falha na execução.`
           });
       }
    });

    // Detectar Picos de Falha por Categoria Globalmente
    const globalCatsCount: Record<string, number> = {};
    filteredPostAssemblies.forEach(o => {
        if (o.assistanceCategory) {
           globalCatsCount[o.assistanceCategory] = (globalCatsCount[o.assistanceCategory] || 0) + 1;
        }
    });

    Object.entries(globalCatsCount).forEach(([cat, count]) => {
        if (count > alertLimitCategorySpike) {
             alerts.push({
               type: 'WARNING',
               title: 'Pico de Falha Específica',
               message: `Anotação Identificada: A categoria "${cat}" teve ${count} ocorrências no período, ultrapassando o limite de alerta (${alertLimitCategorySpike}). Sugerimos revisar o material/ferragens com sua fábrica/fornecedor.`
             });
        }
    });

    return alerts;
  }, [techRanking, filteredPostAssemblies, currentUser.role, alertLimitRate, alertLimitCount30d, alertLimitCategorySpike]);

  // --- RANKINGS ADICIONAIS: AMBIENTE E CATEGORIA ---
  const envRanking = useMemo(() => {
     const counts: Record<string, number> = {};
     filteredPostAssemblies.forEach(o => {
        const env = o.relatedEnvironmentName || 'Não informado';
        counts[env] = (counts[env] || 0) + 1;
     });
     const total = filteredPostAssemblies.length;
     return Object.entries(counts).map(([name, count]) => ({
         name, 
         count, 
         percent: total > 0 ? ((count / total) * 100).toFixed(1) : '0'
     })).sort((a, b) => b.count - a.count);
  }, [filteredPostAssemblies]);

  const catRanking = useMemo(() => {
     const counts: Record<string, number> = {};
     filteredPostAssemblies.forEach(o => {
        const cat = o.assistanceCategory || 'Outros / Nenhuma';
        counts[cat] = (counts[cat] || 0) + 1;
     });
     const total = filteredPostAssemblies.length;
     return Object.entries(counts).map(([name, count]) => ({
         name, 
         count, 
         percent: total > 0 ? ((count / total) * 100).toFixed(1) : '0'
     })).sort((a, b) => b.count - a.count);
  }, [filteredPostAssemblies]);

  // RANKING DE ORIGEM DA FALHA
  const ORIGIN_REASON_LABELS: Record<string, string> = {
    OPERATIONAL: 'Operacional',
    FACTORY: 'Fábrica',
    TRANSPORT: 'Transporte',
    PROJECT: 'Projeto',
  };

  const originRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPostAssemblies.forEach(o => {
      const key = o.assistanceOriginReason || 'NAO_CLASSIFICADO';
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = filteredPostAssemblies.length;
    return Object.entries(counts).map(([key, count]) => ({
      key,
      name: ORIGIN_REASON_LABELS[key] || 'Não classificado',
      count,
      percent: total > 0 ? ((count / total) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.count - a.count);
  }, [filteredPostAssemblies]);

  // MATRIZ AMBIENTE X CATEGORIA
  const buildMatrix = () => {
      const topEnvsMatrix = envRanking.slice(0, 5).map(r => r.name);
      const topCatsMatrix = catRanking.slice(0, 5).map(r => r.name);

      const computedMatrixRows = topEnvsMatrix.map(env => {
          const row: Record<string, any> = { env };
          let totalEnv = 0;
          topCatsMatrix.forEach(cat => {
              const count = filteredPostAssemblies.filter(o => 
                 (o.relatedEnvironmentName || 'Não informado') === env && 
                 (o.assistanceCategory || 'Outros / Nenhuma') === cat
              ).length;
              row[cat] = count;
              totalEnv += count;
          });
          row['TotalRow'] = totalEnv;
          return row;
      });

      return { topCatsMatrix, matrixRows: computedMatrixRows };
  };

  const { topCatsMatrix, matrixRows } = useMemo(() => buildMatrix(), [envRanking, catRanking, filteredPostAssemblies]);

  // Exportar Tabela Principal Filtrada
  const exportToCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === 'EXECUTION') {
      headers = ['Data Abertura', 'OS', 'Cliente', 'Tecnico Executor', 'Status Final'];
      rows = viewableExecutionAssistances.map(item => [
        item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A',
        item.id,
        `"${item.clientName}"`,
        `"${getUserName(item.technicianId)}"`,
        item.status === 'COMPLETED' ? 'Finalizado' : item.status === 'CANCELLED' ? 'Cancelado' : 'Em Andamento'
      ]);
    } else {
      headers = ['Data Assistencia', 'OS Assistencia', 'OS Origem (Montagem)', 'Tecnico Montador Origem', 'Data Montagem Origem', 'Dias Corridos de Vida Util', 'Origem da Falha', 'Categoria'];
      rows = filteredPostAssemblies.map(item => [
        item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy') : 'N/A',
        item.id,
        item.relatedAssemblyWorkOrderId || 'N/A',
        `"${getUserName(item.relatedAssemblyTechnicianId)}"`,
        item._assemblyFinishDateParsed ? format(new Date(item._assemblyFinishDateParsed), 'dd/MM/yyyy') : 'Sem Data',
        item._daysAfter !== null ? String(item._daysAfter) : 'Sem Data',
        item.assistanceOriginReason ? (ORIGIN_REASON_LABELS[item.assistanceOriginReason] || item.assistanceOriginReason) : 'Nao classificado',
        item.assistanceCategory || 'Nao classificada'
      ]);
    }

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const dateStr = filterMode === 'MONTH' ? selectedMonth : `${startDate}_a_${endDate}`;
    link.setAttribute('download', `relatorio_${activeTab.toLowerCase()}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        {onBack && (
          <button onClick={onBack} className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
        )}
      </div>

      <PageHeader 
        title="Rastreio de Reincidência"
        description="Desempenho e Vida Útil das Montagens"
        icon={<Activity className="text-brand-600" size={24} />}
        actionSecondary={
          <Button 
            variant="secondary" 
            onClick={exportToCSV}
            icon={<Download size={18} />}
          >
            Exportar (CSV)
          </Button>
        }
        actionPrimary={
          <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto h-11 border border-transparent">
            <button 
              onClick={() => setActiveTab('EXECUTION')} 
              className={`flex-1 px-4 flex items-center justify-center gap-2 rounded-lg text-[14px] font-medium whitespace-nowrap transition-all ${activeTab === 'EXECUTION' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Executadas
            </button>
            <button 
              onClick={() => setActiveTab('POST_ASSEMBLY')} 
              className={`flex-1 px-4 flex items-center justify-center gap-2 rounded-lg text-[14px] font-medium whitespace-nowrap transition-all ${activeTab === 'POST_ASSEMBLY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Pós-Montagem Analytics
            </button>
          </div>
        }
      />

      {/* FILTROS GERAIS UNIFICADOS */}
      <FilterBar>
        {/* Grupo Calendário — empilha em mobile */}
        <div className="w-full md:contents flex flex-col gap-3">
          <div className="w-full md:flex-1 md:min-w-[200px] md:max-w-[240px]">
            <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Filter size={14} /> Visão de Calendário
            </label>
            <div className="flex bg-gray-100 rounded-xl p-1 h-11 border border-transparent">
              <button 
                onClick={() => setFilterMode('MONTH')} 
                className={`flex-1 flex items-center justify-center text-[14px] font-medium rounded-lg transition-shadow h-full ${filterMode === 'MONTH' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Mensal
              </button>
              <button 
                onClick={() => setFilterMode('PERIOD')} 
                className={`flex-1 flex items-center justify-center text-[14px] font-medium rounded-lg transition-shadow h-full ${filterMode === 'PERIOD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Período
              </button>
            </div>
          </div>

          {filterMode === 'MONTH' ? (
            <div className="w-full md:flex-1 md:min-w-[150px]">
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <CalendarIcon size={14} /> Mês Base
              </label>
              <DateInput 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="input-field" 
              />
            </div>
          ) : (
            <div className="w-full md:flex-1 md:min-w-[300px] grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <CalendarIcon size={14} /> De
                </label>
                <DateInput 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="input-field w-full" 
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <CalendarIcon size={14} /> Até
                </label>
                <DateInput 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="input-field w-full" 
                />
              </div>
            </div>
          )}
        </div>

        {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
              <UserIcon size={14} /> Técnico (Tabela)
            </label>
            <select 
              value={selectedTechnicianId} 
              onChange={(e) => setSelectedTechnicianId(e.target.value)} 
              className="input-field cursor-pointer"
            >
              <option value="ALL">Todos os Técnicos</option>
              {technicians.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
        )}
      </FilterBar>

      {/* ----------- ABA EXECUÇÃO ----------- */}
      {activeTab === 'EXECUTION' && (
        <div className="animate-fade-in space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <MetricCard label="Total" value={executionStats.total} icon={<Activity size={20} />} />
             <MetricCard label="Concluídas" value={executionStats.completed} icon={<CheckCircle size={20} />} />
             <MetricCard label="Em Andamento" value={executionStats.inProgress} icon={<Clock size={20} />} />
             <MetricCard label="Canceladas" value={executionStats.cancelled} icon={<AlertTriangle size={20} />} />
          </div>

          <div className="space-y-4">
            <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
              <Wrench className="text-brand-500" /> Ordens de Assistência
            </h3>
            <DataTable 
              data={viewableExecutionAssistances}
              columns={[
                { key: 'date', header: 'Abertura', render: (os: any) => <span className="text-gray-600">{safeFormat(os.createdAt)}</span> },
                { key: 'id', header: 'OS Nº', render: (os: any) => (
                  <button 
                    onClick={() => {
                      const order = orders.find(o => o.id === os.id);
                      if (order && onSelectOrder) onSelectOrder(order);
                    }}
                    className="hover:underline text-brand-600 font-medium text-left outline-none cursor-pointer"
                    title="Ver detalhes da O.S."
                  >
                    {os.id}
                  </button>
                )},
                { key: 'client', header: 'Cliente', render: (os: any) => <span className="text-gray-900">{os.clientName}</span> },
                { key: 'tech', header: 'Técnico Executor', render: (os: any) => <span className="font-medium text-gray-900">{getUserName(os.technicianId)}</span> },
                { key: 'status', header: 'Status', render: (os: any) => <StatusBadge status={os.status} /> }
              ]}
              emptyMessage="Nenhuma assistência encontrada"
            />
          </div>
        </div>
      )}

      {/* ----------- ABA PÓS-MONTAGEM (Vida Útil) ----------- */}
      {activeTab === 'POST_ASSEMBLY' && (
        <div className="animate-fade-in space-y-6">
          
          {/* Sub-Filtros do Pós-Montagem */}
          <FilterBar>
             <div className="flex flex-col gap-2 w-full xl:w-auto">
               <span className="block text-[12px] font-semibold text-gray-500 uppercase flex items-center gap-1"><Clock size={14}/> Vida Útil (Prazo Após Montagem)</span>
               <div className="flex flex-wrap gap-2">
                 {['ALL', '30', '60', '90', 'CUSTOM'].map(opt => {
                    const labels: Record<string, string> = { 'ALL': 'Todas', '30': 'Até 30d', '60': 'Até 60d', '90': 'Até 90d', 'CUSTOM': 'Pers...' };
                    return (
                     <button 
                      key={opt} 
                      onClick={() => setDeadlineFilter(opt as any)} 
                      className={`px-4 h-11 flex items-center justify-center rounded-xl text-[14px] font-medium border transition-colors ${deadlineFilter === opt ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                     >
                       {labels[opt]}
                     </button>
                    )
                 })}
                 {deadlineFilter === 'CUSTOM' && (
                   <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 h-11">
                     <input type="number" value={customMinDays} onChange={e=>setCustomMinDays(e.target.value)} className="w-12 h-6 text-[14px] text-center border-b border-gray-200 bg-transparent outline-none" min="0" placeholder="Min" />
                     <span className="text-[14px] text-gray-400">à</span>
                     <input type="number" value={customMaxDays} onChange={e=>setCustomMaxDays(e.target.value)} className="w-12 h-6 text-[14px] text-center border-b border-gray-200 bg-transparent outline-none" min="0" placeholder="Max" />
                     <span className="text-[14px] text-gray-800 font-medium ml-1">dias</span>
                   </div>
                 )}
               </div>
             </div>

             <div className="flex flex-col gap-2 w-full xl:w-auto xl:pl-6">
               <span className="block text-[12px] font-semibold text-gray-500 uppercase flex items-center gap-1"><HelpCircle size={14}/> Regra da Taxa de Retorno</span>
               <select value={competenceMode} onChange={(e)=>setCompetenceMode(e.target.value as any)} className="input-field h-11 px-3 cursor-pointer">
                 <option value="ASSISTANCE_DATE">Base: Data da Assistência vs Volume Comum</option>
                 <option value="ASSEMBLY_DATE">Base: Data de Fim da Montagem</option>
               </select>
               <label className="flex items-center gap-2 cursor-pointer mt-1">
                 <input type="checkbox" checked={includeMissingDates} onChange={e=>setIncludeMissingDates(e.target.checked)} className="rounded text-brand-600" />
                 <span className="text-[12px] text-gray-500 font-medium">Incluir falhas Sem Data Mestra</span>
               </label>
             </div>

             <div className="flex flex-col gap-2 w-full xl:w-auto xl:pl-6">
                <span className="block text-[12px] font-semibold text-gray-500 uppercase flex items-center gap-1"><Layers size={14}/> Ambiente e Categoria</span>
                <div className="flex flex-row gap-2">
                   <select value={selectedEnvironment} onChange={e=>setSelectedEnvironment(e.target.value)} className="input-field h-11 px-3 w-40 cursor-pointer">
                     <option value="ALL">Todo Ambiente</option>
                     {availableEnvironments.map(env => <option key={env} value={env}>{env}</option>)}
                   </select>
                   <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} className="input-field h-11 px-3 w-40 cursor-pointer">
                     <option value="ALL">Toda Categoria</option>
                     {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                   </select>
                </div>
             </div>

             <div className="flex flex-col gap-2 w-full xl:w-auto xl:pl-6">
                <span className="block text-[12px] font-semibold text-gray-500 uppercase flex items-center gap-1"><Tag size={14}/> Origem da Falha</span>
                <select value={selectedOriginReason} onChange={e=>setSelectedOriginReason(e.target.value)} className="input-field h-11 px-3 w-44 cursor-pointer">
                  <option value="ALL">Todas as Origens</option>
                  <option value="OPERATIONAL">Operacional</option>
                  <option value="FACTORY">Fábrica</option>
                  <option value="TRANSPORT">Transporte</option>
                  <option value="PROJECT">Projeto</option>
                </select>
             </div>

             {currentUser.role === 'ADMIN' && (
               <div className="w-full xl:w-auto flex justify-end ml-auto">
                 <Button variant="secondary" icon={<Settings size={18} />} onClick={() => setShowSettings(!showSettings)}>
                   Ajustes
                 </Button>
               </div>
             )}
          </FilterBar>

          {/* Painel Configuração de Limites Admin */}
          {showSettings && (
             <div className="p-6 rounded-xl animate-fade-in z-10 mb-6" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
               <h4 className="font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2"><Settings size={18}/> Calibração de Inteligência (Insights)</h4>
               <div className="space-y-4">
                 <div>
                   <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">Taxa de Retorno Crítica (%)</label>
                   <p className="text-[12px] text-gray-400 mb-2 leading-tight">Média aceitável de erros sobre montagens limpas. Acima disso, enviará avisos no painel.</p>
                   <input type="number" value={alertLimitRate} onChange={e => setAlertLimitRate(Number(e.target.value))} className="input-field" min="1" max="100"/>
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">Limite Máximo Quebras Precoces (Até 30 dias)</label>
                   <p className="text-[12px] text-gray-400 mb-2 leading-tight">Qtd máxima de serviços que o técnico pode voltar a visitar na garantia do primeiro mês.</p>
                   <input type="number" value={alertLimitCount30d} onChange={e => setAlertLimitCount30d(Number(e.target.value))} className="input-field" min="1"/>
                 </div>
                 <div>
                   <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">Pico Categoria (Ocorrências)</label>
                   <p className="text-[12px] text-gray-400 mb-2 leading-tight">Qtd máxima para gerar alerta de problema na categoria material/produto.</p>
                   <input type="number" value={alertLimitCategorySpike} onChange={e => setAlertLimitCategorySpike(Number(e.target.value))} className="input-field" min="1"/>
                 </div>
                 <Button fullWidth onClick={() => saveSettings(alertLimitRate, alertLimitCount30d, alertLimitCategorySpike)}>Gravar Limites Locais</Button>
               </div>
             </div>
          )}

          {/* Avisos Insights */}
          {insights.length > 0 && currentUser.role === 'ADMIN' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {insights.map((ins, i) => (
                <div key={i} className={`p-4 rounded-xl border-l-[4px] shadow-sm flex gap-3 ${ins.type === 'DANGER' ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'}`}>
                  <AlertTriangle className={ins.type === 'DANGER' ? 'text-red-500' : 'text-orange-500'} />
                  <div>
                     <h4 className={`font-semibold text-[14px] ${ins.type === 'DANGER' ? 'text-red-800' : 'text-orange-800'}`}>{ins.title}</h4>
                     <p className={`text-[12px] mt-1 leading-normal ${ins.type === 'DANGER' ? 'text-red-700' : 'text-orange-700'}`}>{ins.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cards Categoria Dias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard label="Total Assistências" value={globalCards.total} subValue={`Média de vida: ${globalCards.avgTime} dias`} icon={<Activity size={20} />} />
            <MetricCard label="Precoces (Até 30d)" value={globalCards.upTo30} subValue={`Equivale a ${globalCards.pct30}%`} icon={<AlertTriangle size={20} />} />
            <MetricCard label="Médio (31 a 60d)" value={globalCards.upTo60} subValue={`Equivale a ${globalCards.pct60}%`} icon={<Clock size={20} />} />
            <MetricCard label="Aceitável (61 a 90d)" value={globalCards.upTo90} subValue={`Equivale a ${globalCards.pct90}%`} icon={<CheckCircle size={20} />} />
            <MetricCard label="Desgaste (> 90d)" value={globalCards.over90} subValue={`Equivale a ${globalCards.pctOver}%`} icon={<CheckCircle size={20} />} />
          </div>

          {/* Tabela de Ranking Detalhado */}
          <div className="space-y-4">
             <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
               <UserIcon className="text-brand-500" /> Ranking: Culpabilidade por Origem
             </h3>
             <DataTable 
               data={techRanking}
               columns={[
                 { key: 'rank', header: '#', render: (_: any, idx: number) => <span className="font-bold text-gray-400">{idx+1}</span> },
                 { key: 'name', header: 'Montador (Origem)', render: (item: any) => <span className="font-medium text-gray-900">{item.name}</span> },
                 { key: 'upTo30', header: 'Até 30d', align: 'center', render: (item: any) => <span className="font-semibold text-gray-900">{item.upTo30}</span> },
                 { key: 'upTo60', header: '31 a 60d', align: 'center', render: (item: any) => <span className="text-gray-600">{item.upTo60}</span> },
                 { key: 'upTo90', header: '61 a 90d', align: 'center', render: (item: any) => <span className="text-gray-600">{item.upTo90}</span> },
                 { key: 'over90', header: '> 90d', align: 'center', render: (item: any) => <span className="text-gray-600">{item.over90}</span> },
                 { key: 'totalAssembliesDone', header: 'Montagens Mês', align: 'center', render: (item: any) => <span className="font-medium bg-gray-100 px-2 py-1 rounded">{item.totalAssembliesDone}</span> },
                 { key: 'topEnv', header: 'Principal Ambiente (Qtd)', align: 'left', render: (item: any) => <span className="text-gray-600 font-medium whitespace-nowrap text-xs">{item.topEnvironment}</span> },
                 { key: 'topCat', header: 'Principal Defeito (Qtd)', align: 'left', render: (item: any) => <span className="text-gray-600 font-medium whitespace-nowrap text-xs">{item.topCategory}</span> },
                 { key: 'rate', header: 'Tx. Retorno Total', align: 'center', render: (item: any) => (
                    <div className="flex flex-col items-center">
                      <span className={`font-semibold ${item.returnRatePercent > alertLimitRate ? 'text-red-600' : 'text-brand-600'}`}>
                        {item.returnRatePercent.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-gray-400">({item.totalAssists}/{item.totalAssembliesDone})</span>
                    </div>
                 )}
               ]}
               emptyMessage="Nenhum dado na amostra atual."
             />
          </div>

           {/* Matriz e Rankings Menores */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                 <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                   <Layers className="text-brand-500" /> Top Ambientes Problemáticos
                 </h3>
                 <DataTable 
                   data={envRanking.slice(0, 5)}
                   columns={[
                     { key: 'name', header: 'Ambiente', render: (item) => <span className="font-semibold text-gray-900">{item.name}</span> },
                     { key: 'count', header: 'Ocorrências', align: 'center', render: (item) => <span className="font-medium text-gray-900">{item.count}</span> },
                     { key: 'pct', header: 'Representatividade', align: 'right', render: (item: any) => <span className="text-brand-600 font-bold">{item.percent}%</span> }
                   ]}
                   emptyMessage="Nenhum ambiente analisado."
                 />
              </div>
              <div className="space-y-4">
                 <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                   <Wrench className="text-brand-500" /> Top Categorias de Falhas
                 </h3>
                 <DataTable 
                   data={catRanking.slice(0, 5)}
                   columns={[
                     { key: 'name', header: 'Categoria / Defeito', render: (item) => <span className="font-semibold text-gray-900">{item.name}</span> },
                     { key: 'count', header: 'Ocorrências', align: 'center', render: (item) => <span className="font-medium text-gray-900">{item.count}</span> },
                     { key: 'pct', header: 'Representatividade', align: 'right', render: (item: any) => <span className="text-brand-600 font-bold">{item.percent}%</span> }
                   ]}
                   emptyMessage="Nenhuma categoria analisada."
                 />
              </div>
           </div>

           {/* Análise por Origem da Falha */}
           <div className="space-y-4">
              <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Tag className="text-brand-500" /> Análise por Origem da Falha
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(['OPERATIONAL', 'FACTORY', 'TRANSPORT', 'PROJECT'] as const).map(key => {
                  const found = originRanking.find(r => r.key === key);
                  const count = found?.count ?? 0;
                  const percent = found?.percent ?? '0';
                  const total = filteredPostAssemblies.length;
                  const barWidth = total > 0 ? (count / total) * 100 : 0;
                  const colors: Record<string, string> = {
                    OPERATIONAL: 'bg-orange-500',
                    FACTORY: 'bg-red-500',
                    TRANSPORT: 'bg-blue-500',
                    PROJECT: 'bg-purple-500',
                  };
                  const bgColors: Record<string, string> = {
                    OPERATIONAL: 'bg-orange-50 border-orange-200',
                    FACTORY: 'bg-red-50 border-red-200',
                    TRANSPORT: 'bg-blue-50 border-blue-200',
                    PROJECT: 'bg-purple-50 border-purple-200',
                  };
                  const textColors: Record<string, string> = {
                    OPERATIONAL: 'text-orange-800',
                    FACTORY: 'text-red-800',
                    TRANSPORT: 'text-blue-800',
                    PROJECT: 'text-purple-800',
                  };
                  return (
                    <div key={key} className={`p-4 rounded-xl border ${bgColors[key]} space-y-2`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[13px] font-bold ${textColors[key]}`}>{ORIGIN_REASON_LABELS[key]}</span>
                        <span className={`text-[22px] font-extrabold ${textColors[key]}`}>{count}</span>
                      </div>
                      <div className="w-full bg-white/60 rounded-full h-2">
                        <div className={`h-2 rounded-full ${colors[key]} transition-all`} style={{ width: `${barWidth}%` }} />
                      </div>
                      <p className={`text-[11px] font-semibold ${textColors[key]}`}>{percent}% do total</p>
                    </div>
                  );
                })}
              </div>
              {originRanking.find(r => r.key === 'NAO_CLASSIFICADO') && (
                <p className="text-[11px] text-gray-400 italic">
                  {originRanking.find(r => r.key === 'NAO_CLASSIFICADO')?.count} assistência(s) sem origem classificada (não computadas acima).
                </p>
              )}
           </div>

           <div className="space-y-4">
              <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Grid className="text-brand-500" /> Matriz Crítica: Top Ambientes x Top Categorias
              </h3>
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left align-middle whitespace-nowrap">
                    <thead className="text-xs uppercase" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                       <tr>
                          <th className="px-4 py-3 font-semibold bg-gray-100 border-r border-gray-200">Ambiente / Categoria</th>
                          {topCatsMatrix.map(c => <th key={c} className="px-4 py-3 text-center">{c}</th>)}
                          <th className="px-4 py-3 text-center bg-gray-100 border-l border-gray-200">Total (Linha)</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                      {matrixRows.length === 0 ? (
                        <tr><td colSpan={topCatsMatrix.length + 2} className="px-4 py-6 text-center text-gray-500">Dados insuficientes para montagem da matriz.</td></tr>
                      ) : matrixRows.map((row) => (
                        <tr key={row.env} className="hover:bg-gray-50 transition-colors">
                           <td className="px-4 py-3 font-semibold bg-gray-50/50 border-r border-gray-200 truncate max-w-[150px]" title={row.env}>{row.env}</td>
                           {topCatsMatrix.map(c => (
                             <td key={c} className={`px-4 py-3 text-center ${row[c] > 0 ? 'font-bold text-red-600 bg-red-50/30' : 'text-gray-400'}`}>
                               {row[c] || '-'}
                             </td>
                           ))}
                           <td className="px-4 py-3 text-center font-bold bg-gray-50/50 border-l border-gray-200">{row['TotalRow']}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>

          <div className="space-y-4 pt-4">
             <h3 className="text-[16px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
               <Activity className="text-brand-500" /> Extrato de O.S Pós-Montagem Detectadas
             </h3>
             <DataTable 
               data={filteredPostAssemblies}
               columns={[
                 { key: 'id', header: 'Assistência OS', render: (os) => (
                   <button onClick={() => { const order = orders.find(o => o.id === os.id); if (order && onSelectOrder) onSelectOrder(order); }} className="hover:underline text-brand-600 font-medium text-left outline-none cursor-pointer">
                     {os.id}
                   </button>
                 )},
                 { key: 'related', header: 'Montagem OS Origem', render: (os) => (
                    os.relatedAssemblyWorkOrderId ? (
                       <button onClick={() => { const order = orders.find(o => o.id === os.relatedAssemblyWorkOrderId); if (order && onSelectOrder) onSelectOrder(order); }} className="hover:underline text-gray-600 font-medium text-left outline-none cursor-pointer">
                         {os.relatedAssemblyWorkOrderId}
                       </button>
                    ) : 'N/A'
                 )},
                 { key: 'tech', header: 'Técnico Origem', render: (os: any) => <span className="font-medium text-gray-900">{getUserName(os.relatedAssemblyTechnicianId)}</span> },
                 { key: 'dateA', header: 'Data Montagem', render: (os: any) => <span className="text-gray-600">{safeFormat(os._assemblyFinishDateParsed)}</span> },
                 { key: 'dateB', header: 'Data Assistência', render: (os: any) => <span className="text-gray-600 font-medium">{safeFormat(os.createdAt)}</span> },
                 { key: 'days', header: 'Dias Corridos', align: 'center', render: (os: any) => (
                    os._daysAfter !== null ? <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded font-semibold text-[12px]">{os._daysAfter} dias</span> : <span className="text-gray-400 text-[12px] line-through">S/Data</span>
                 )},
                 { key: 'origin', header: 'Origem da Falha', render: (os: any) => {
                    if (!os.assistanceOriginReason) return <span className="text-gray-400 text-[11px]">—</span>;
                    const colorMap: Record<string, string> = {
                      OPERATIONAL: 'bg-orange-100 text-orange-800',
                      FACTORY: 'bg-red-100 text-red-800',
                      TRANSPORT: 'bg-blue-100 text-blue-800',
                      PROJECT: 'bg-purple-100 text-purple-800',
                    };
                    return (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${colorMap[os.assistanceOriginReason] || 'bg-gray-100 text-gray-700'}`}>
                        {ORIGIN_REASON_LABELS[os.assistanceOriginReason] || os.assistanceOriginReason}
                      </span>
                    );
                 }}
               ]}
               emptyMessage="Tabela vazia para os filtros aplicados."
             />
          </div>

        </div>
      )}

    </div>
  );
};
