import React, { useState, useMemo, useEffect } from 'react';
import { WorkOrder, WorkOrderType, User, ChecklistItem } from '../types';

import { MapPin, Calendar, User as UserIcon, Mail, Phone, Clock, FileText, CheckSquare, Hammer, Wrench, AlertCircle, Package, ChevronDown, ChevronUp, Filter, X, Layers, ArrowRight, Search } from 'lucide-react';
import { format, isValid, endOfDay } from 'date-fns';
import { PageHeader } from './ui/PageHeader';
import { FilterBar } from './ui/FilterBar';
import { Button } from './ui/Button';
import { MetricCard } from './ui/MetricCard';
import { StatusBadge } from './ui/StatusBadge';
import { DateInput } from './ui/DateInput';

interface GeneratedOrdersProps {
  orders: WorkOrder[];
  currentUser: User;
  onSelectOrder?: (order: WorkOrder) => void;
  initialFilters?: { status: string; type: WorkOrderType } | null;
}

const ProgressBar = ({ items }: { items: ChecklistItem[] }) => {
  if (!items || items.length === 0) return null;
  const checked = items.filter(i => i.checked).length;
  const pct = Math.round((checked / items.length) * 100);
  const color = pct === 100 ? 'var(--sf-green)' : pct > 0 ? 'var(--blue)' : 'rgba(255,255,255,.15)';
  return (
    <div style={{ width: '100%', background: 'rgba(255,255,255,.08)', borderRadius: 999, height: 4, marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: 4, borderRadius: 999, background: color, transition: 'width .4s ease' }} />
    </div>
  );
};

export const GeneratedOrders: React.FC<GeneratedOrdersProps> = ({ orders, currentUser, onSelectOrder, initialFilters }) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [filterType,   setFilterType]   = useState<'ALL' | WorkOrderType>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [dateStart,    setDateStart]    = useState('');
  const [dateEnd,      setDateEnd]      = useState('');
  const [searchTerm,   setSearchTerm]   = useState('');

  useEffect(() => {
    if (initialFilters) {
      setFilterStatus(initialFilters.status);
      setFilterType(initialFilters.type);
    }
  }, [initialFilters]);

  const toggleOrder = (id: string) => setExpandedOrderId(prev => prev === id ? null : id);

  const safeFormat = (dateInput: string | Date | undefined, fmt = 'dd/MM/yyyy') => {
    if (!dateInput) return 'Não informado';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return isValid(d) ? format(d, fmt) : 'Data Inválida';
  };

  const formatDate = (ds?: string) => {
    if (!ds) return 'Não informado';
    let d = new Date(ds);
    if (isNaN(d.getTime()) || (ds.length === 10 && !ds.includes('T'))) d = new Date(ds + 'T00:00:00');
    return isValid(d) ? format(d, 'dd/MM/yyyy') : ds;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (currentUser.role === 'CLIENT' && order.clientEmail !== currentUser.email) return false;
      if (currentUser.role === 'TECHNICIAN') {
        const isMain = order.technicianId === currentUser.id;
        const isEnv  = order.environments?.some(env => env.technicianId === currentUser.id);
        if (!isMain && !isEnv) return false;
      }
      if (filterType   !== 'ALL' && order.type   !== filterType)   return false;
      if (filterStatus !== 'ALL' && order.status !== filterStatus)  return false;
      if (dateStart || dateEnd) {
        const od = new Date(order.createdAt);
        if (dateStart) { const s = new Date(dateStart + 'T00:00:00'); if (isValid(s) && od < s) return false; }
        if (dateEnd)   { const e = endOfDay(new Date(dateEnd + 'T00:00:00')); if (isValid(e) && od > e) return false; }
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const ok = order.id.toLowerCase().includes(q)
          || order.clientName?.toLowerCase().includes(q)
          || order.technicianName?.toLowerCase().includes(q)
          || order.environments?.some(e => e.technicianName?.toLowerCase().includes(q));
        if (!ok) return false;
      }
      return true;
    });
  }, [orders, currentUser, filterType, filterStatus, dateStart, dateEnd, searchTerm]);

  const clearFilters = () => { setFilterType('ALL'); setFilterStatus('ALL'); setDateStart(''); setDateEnd(''); setSearchTerm(''); };
  const hasActiveFilters = filterType !== 'ALL' || filterStatus !== 'ALL' || dateStart !== '' || dateEnd !== '' || searchTerm !== '';

  const totalOrders    = filteredOrders.length;
  const assemblyOrders  = filteredOrders.filter(o => o.type === 'ASSEMBLY').length;
  const assistanceOrders = filteredOrders.filter(o => o.type === 'ASSISTANCE').length;
  const pendingOrders   = filteredOrders.filter(o => !['COMPLETED','CANCELLED'].includes(o.status)).length;

  /* shared dark input style for non-input-field inputs */
  const darkInput: React.CSSProperties = {
    width: '100%', padding: '8px 12px 8px 36px', height: 44,
    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
    borderRadius: 10, color: 'var(--sf-white)', fontSize: 14, outline: 'none',
  };

  const darkSelect: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 12px',
    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
    borderRadius: 10, color: 'var(--sf-white)', fontSize: 14, outline: 'none',
    cursor: 'pointer',
  };

  const toggleGroup: React.CSSProperties = {
    display: 'flex', background: 'rgba(255,255,255,.06)',
    borderRadius: 10, padding: 4, height: 44,
    border: '1px solid rgba(255,255,255,.08)',
  };

  const tabActive: React.CSSProperties   = { background: 'rgba(255,255,255,.1)', color: 'var(--sf-white)', borderRadius: 8 };
  const tabInactive: React.CSSProperties = { color: 'var(--muted)', borderRadius: 8 };

  const labelStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 600, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Ordens Geradas"
        description="Histórico detalhado de solicitações."
        icon={<FileText size={20} style={{ color: 'var(--cyan)' }} />}
      />

      {/* ── Filter Bar ── */}
      <FilterBar>

        {/* Search */}
        {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTANT') && (
          <div style={{ flex: 1, minWidth: 260 }}>
            <label style={labelStyle}><Search size={13} /> Buscar O.S, Cliente ou Técnico</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--hint)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Digite o número, nome..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={darkInput}
              />
            </div>
          </div>
        )}

        {/* Type Toggle */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <label style={labelStyle}><Layers size={13} /> Tipo de Ordem</label>
          <div style={toggleGroup}>
            {(['ALL','ASSEMBLY','ASSISTANCE'] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                style={{ flex: 1, ...( filterType === t ? tabActive : tabInactive), fontSize: 13, fontWeight: 600, transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {t === 'ALL' ? <><Layers size={13}/> Todas</> : t === 'ASSEMBLY' ? <><Hammer size={13}/> Montagens</> : <><Wrench size={13}/> Assistências</>}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div style={{ flex: 1, minWidth: 380, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <div>
            <label style={labelStyle}><Calendar size={13}/> De</label>
            <DateInput type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="input-field w-full" />
          </div>
          <div>
            <label style={labelStyle}><Calendar size={13}/> Até</label>
            <DateInput type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="input-field w-full" />
          </div>
        </div>

        {/* Status */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}><Filter size={13}/> Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={darkSelect}>
            <option value="ALL">Todos os Status</option>
            <option value="OPEN">Aberta</option>
            <option value="ASSIGNED">Atribuída</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="PENDING_REVIEW">Aguard. Avaliação</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button variant="danger" onClick={clearFilters} className="h-11 px-4 text-[14px]" icon={<X size={16}/>}>
              <span className="hidden sm:inline">Limpar</span>
            </Button>
          </div>
        )}
      </FilterBar>

      {/* ── Metric Counters ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total de Ordens"  value={totalOrders}     icon={<FileText size={20}/>} />
        <MetricCard label="Montagens"        value={assemblyOrders}  icon={<Hammer size={20}/>} />
        <MetricCard label="Assistências"     value={assistanceOrders} icon={<Wrench size={20}/>} />
        <MetricCard label="Ordens Pendentes" value={pendingOrders}   icon={<Clock size={20}/>} />
      </div>

      {/* ── Orders List ── */}
      <div className="flex flex-col gap-3">
        {filteredOrders.map(order => {
          const isExpanded  = expandedOrderId === order.id;
          const isAssembly  = order.type === 'ASSEMBLY';
          let visibleEnvs   = order.environments || [];
          if (currentUser.role === 'TECHNICIAN' && isAssembly && order.technicianId !== currentUser.id)
            visibleEnvs = visibleEnvs.filter(e => e.technicianId === currentUser.id);

          const accentColor = isAssembly ? '#fb923c' : '#00d4ff';

          return (
            <div key={order.id} style={{
              background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 14, overflow: 'hidden',
              transition: 'border-color .18s, box-shadow .18s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.12)';
                (e.currentTarget as HTMLDivElement).style.boxShadow   = '0 4px 24px rgba(0,0,0,.4)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.07)';
                (e.currentTarget as HTMLDivElement).style.boxShadow   = 'none';
              }}
            >
              {/* Summary Row */}
              <div onClick={() => toggleOrder(order.id)} className="p-5 cursor-pointer relative">
                {/* Colored left stripe */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                  background: accentColor, borderRadius: '2px 0 0 2px',
                }} />

                <div style={{ paddingLeft: 12 }}>
                  {/* Header row */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-wrap items-center gap-2 pr-2">
                      <span style={{ fontWeight: 700, color: 'var(--sf-white)', fontSize: 16 }}>{order.id}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        background: isAssembly ? 'rgba(251,146,60,.12)' : 'rgba(0,212,255,.12)',
                        color: accentColor,
                        border: `1px solid ${isAssembly ? 'rgba(251,146,60,.3)' : 'rgba(0,212,255,.3)'}`,
                        borderRadius: 6, padding: '2px 8px',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {isAssembly ? <Hammer size={11}/> : <Wrench size={11}/>}
                        {isAssembly ? 'Montagem' : 'Assistência'}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div style={{ color: 'var(--hint)', flexShrink: 0, marginTop: 2 }}>
                      {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                    </div>
                  </div>

                  <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--sf-white)', marginBottom: 4 }}>{order.clientName}</h3>

                  <div className="flex items-start gap-2 mb-3" style={{ fontSize: 13, color: 'var(--muted)' }}>
                    <MapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                      {order.address}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4" style={{ fontSize: 13, color: 'var(--muted)' }}>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14}/>
                      <span>Criado: {safeFormat(order.createdAt)}</span>
                    </div>
                    {order.technicianName && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(26,107,255,.1)', border: '1px solid rgba(26,107,255,.2)' }}>
                        <UserIcon size={12} style={{ color: 'var(--blue)' }}/>
                        <span style={{ color: 'var(--sf-white)', fontWeight: 600, fontSize: 12 }}>Téc: {order.technicianName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="animate-fade-in" style={{
                  borderTop: '1px solid rgba(255,255,255,.07)',
                  background: 'rgba(255,255,255,.02)',
                  padding: '20px 24px 20px 32px',
                }}>
                  {onSelectOrder && (
                    <div className="flex justify-end mb-4">
                      <Button variant="primary" onClick={e => { e.stopPropagation(); onSelectOrder(order); }}
                        className="flex items-center gap-2">
                        Gerenciar Ordem <ArrowRight size={15}/>
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left */}
                    <div className="space-y-5">
                      <div>
                        <h4 style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <UserIcon size={12}/> Dados de Contato
                        </h4>
                        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px' }} className="space-y-2 text-sm">
                          <p className="flex items-center gap-2" style={{ color: 'var(--sf-white)' }}>
                            <Mail size={14} style={{ color: 'var(--blue)' }}/> {order.clientEmail}
                          </p>
                          <p className="flex items-center gap-2" style={{ color: 'var(--sf-white)' }}>
                            <Phone size={14} style={{ color: 'var(--blue)' }}/> {order.clientPhone}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <MapPin size={12}/> Endereço
                        </h4>
                        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px' }}>
                          <p style={{ fontWeight: 700, color: 'var(--sf-white)', fontSize: 13 }}>{order.address}</p>
                          <div className="flex gap-4 mt-1" style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                            <span>CEP: {order.cep}</span>
                            {order.referencePoint && <span>Ref: {order.referencePoint}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="space-y-5">
                      <div>
                        <h4 style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <AlertCircle size={12}/> Descrição
                        </h4>
                        <div style={{ background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--sf-white)', fontStyle: 'italic' }}>
                          "{order.description}"
                        </div>
                      </div>

                      {(order.suggestedDate || order.suggestedTime) && (
                        <div className="flex gap-3">
                          {order.suggestedDate && (
                            <div className="flex-1 flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(26,107,255,.1)', border: '1px solid rgba(26,107,255,.2)', fontSize: 13, color: 'var(--sf-white)' }}>
                              <Calendar size={14} style={{ color: 'var(--cyan)' }}/> Data: <strong>{formatDate(order.suggestedDate)}</strong>
                            </div>
                          )}
                          {order.suggestedTime && (
                            <div className="flex-1 flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(26,107,255,.1)', border: '1px solid rgba(26,107,255,.2)', fontSize: 13, color: 'var(--sf-white)' }}>
                              <Clock size={14} style={{ color: 'var(--cyan)' }}/> Hora: <strong>{order.suggestedTime}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Assistance Checklist */}
                      {order.type === 'ASSISTANCE' && order.assistanceChecklist && order.assistanceChecklist.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 10, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <CheckSquare size={12}/> Checklist
                          </h4>
                          <ProgressBar items={order.assistanceChecklist} />
                          <ul className="space-y-1 mt-2">
                            {order.assistanceChecklist.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm p-2 rounded" style={{ background: 'rgba(0,212,255,.04)', color: 'var(--sf-white)' }}>
                                <div style={{ marginTop: 4, width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: item.checked ? 'var(--sf-green)' : 'rgba(255,255,255,.2)' }}/>
                                {item.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Assembly Environments */}
                      {isAssembly && visibleEnvs.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 10, fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Package size={12}/> Ambientes & Tarefas
                          </h4>
                          <div className="space-y-3">
                            {visibleEnvs.map((env, idx) => (
                              <div key={idx} style={{ background: 'rgba(251,146,60,.05)', border: '1px solid rgba(251,146,60,.18)', borderRadius: 10, padding: '12px 14px' }}>
                                <div className="flex justify-between items-center mb-1">
                                  <span style={{ fontWeight: 700, color: 'var(--sf-white)', fontSize: 13 }}>{env.name}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(251,146,60,.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,.3)', borderRadius: 100, padding: '1px 8px' }}>
                                    Est. {env.estimatedDays} dias
                                  </span>
                                </div>
                                {env.technicianName && (
                                  <div className="mb-2 inline-flex items-center gap-1" style={{ fontSize: 10, fontWeight: 700, background: 'rgba(139,92,246,.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.3)', borderRadius: 100, padding: '1px 8px' }}>
                                    <UserIcon size={9}/> {env.technicianName}
                                  </div>
                                )}
                                {env.checklist && <ProgressBar items={env.checklist} />}
                                {env.checklist?.length > 0 ? (
                                  <ul className="space-y-1 mt-2 pl-1">
                                    {env.checklist.map((item, ci) => (
                                      <li key={ci} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)', fontWeight: 500 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: item.checked ? 'var(--sf-green)' : '#fb923c' }}/>
                                        {item.label}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p style={{ fontSize: 12, color: 'var(--hint)', fontStyle: 'italic', marginTop: 4 }}>Sem tarefas especificadas.</p>
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
        <div className="text-center py-20 rounded-xl" style={{ background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.1)' }}>
          <Filter size={36} style={{ margin: '0 auto 12px', color: 'var(--hint)' }} />
          <p style={{ color: 'var(--muted)', fontWeight: 600 }}>Nenhum resultado encontrado.</p>
          <p style={{ fontSize: 13, color: 'var(--hint)', marginTop: 4, marginBottom: 16 }}>Tente ajustar os filtros selecionados.</p>
          <button onClick={clearFilters} style={{ color: 'var(--cyan)', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Limpar Filtros
          </button>
        </div>
      )}
    </div>
  );
};
