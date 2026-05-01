import React, { useMemo, useState } from 'react';
import { WorkOrder, WorkOrderType, User } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ClipboardList, CheckCircle, AlertCircle, Clock, XCircle, UserCheck, Star, LayoutDashboard, Shield } from 'lucide-react';
import { RatingsDashboard } from './RatingsDashboard';
import { PageHeader } from './ui/PageHeader';
import { MetricCard } from './ui/MetricCard';
import { Button } from './ui/Button';

interface DashboardProps {
  orders: WorkOrder[];
  currentUser: User;
  allUsers: User[];
  onNavigateFilter?: (status: string, type: WorkOrderType) => void;
  currentCompany?: any;
  onUpgradeRequest?: () => void;
}

const COLORS = ['#00d4ff', '#f59e0b', '#8b5cf6', '#fb923c', '#10b981', '#8892a4'];

export const Dashboard: React.FC<DashboardProps> = ({ orders, currentUser, allUsers, onNavigateFilter, currentCompany, onUpgradeRequest }) => {
  const [activeTab, setActiveTab] = useState<WorkOrderType>('ASSEMBLY');
  const [viewMode, setViewMode] = useState<'GENERAL' | 'RATINGS'>('GENERAL');

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.type !== activeTab) return false;
      if (currentUser.role === 'CLIENT') return o.clientEmail === currentUser.email;
      if (currentUser.role === 'TECHNICIAN') {
        return o.technicianId === currentUser.id ||
          (o.environments?.some(env => env.technicianId === currentUser.id) ?? false);
      }
      return true;
    });
  }, [orders, activeTab, currentUser]);

  const stats = useMemo(() => ({
    total:         filteredOrders.length,
    open:          filteredOrders.filter(o => o.status === 'OPEN').length,
    assigned:      filteredOrders.filter(o => o.status === 'ASSIGNED').length,
    inProgress:    filteredOrders.filter(o => o.status === 'IN_PROGRESS').length,
    pendingReview: filteredOrders.filter(o => o.status === 'PENDING_REVIEW').length,
    completed:     filteredOrders.filter(o => o.status === 'COMPLETED').length,
    cancelled:     filteredOrders.filter(o => o.status === 'CANCELLED').length,
  }), [filteredOrders]);

  const chartData = [
    { name: 'Abertas',    value: stats.open },
    { name: 'Atribuídas', value: stats.assigned },
    { name: 'Andamento',  value: stats.inProgress },
    { name: 'Aprovação',  value: stats.pendingReview },
    { name: 'Concluídas', value: stats.completed },
    { name: 'Canceladas', value: stats.cancelled },
  ].filter(d => d.value > 0);

  const technicians = useMemo(() => allUsers.filter(u => u.role === 'TECHNICIAN'), [allUsers]);

  const handleCardClick = (status: string) => {
    if (onNavigateFilter) onNavigateFilter(status, activeTab);
  };

  const cardStyle = {
    background: 'rgba(255,255,255,.03)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 14,
    padding: '18px 20px',
  };

  const tooltipStyle = {
    borderRadius: 10,
    border: 'none',
    background: '#141d35',
    color: '#f0f4ff',
    boxShadow: '0 8px 32px rgba(0,0,0,.5)',
  };

  return (
    <div className="space-y-6">

      {/* ── View Mode Toggle ── */}
      {(currentUser.role === 'ADMIN' || currentUser.role === 'TECHNICIAN') && (
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', width: 'fit-content' }}>
          <button
            onClick={() => setViewMode('GENERAL')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={viewMode === 'GENERAL'
              ? { background: 'linear-gradient(135deg,#1a6bff,#2979ff)', color: '#fff', boxShadow: '0 4px 14px rgba(26,107,255,.35)' }
              : { color: 'var(--muted)' }}
          >
            <LayoutDashboard size={16} /> Visão Geral
          </button>
          <button
            onClick={() => setViewMode('RATINGS')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={viewMode === 'RATINGS'
              ? { background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', color: '#1a1100', boxShadow: '0 4px 14px rgba(245,158,11,.35)' }
              : { color: 'var(--muted)' }}
          >
            <Star size={16} />
            {currentUser.role === 'TECHNICIAN' ? 'Minhas Avaliações' : 'Avaliações Técnicas'}
          </button>
        </div>
      )}

      {/* ── Plan Banner ── */}
      {currentUser.role === 'ADMIN' && currentCompany && (
        <div style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, var(--navy3) 0%, var(--navy4) 100%)',
          border: '1px solid rgba(255,255,255,.1)',
          position: 'relative', overflow: 'hidden',
        }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          {/* decorative glow */}
          <div style={{
            position: 'absolute', right: -40, top: -40, width: 160, height: 160,
            background: 'radial-gradient(circle, rgba(26,107,255,.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div className="flex items-center gap-4 relative z-10">
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(26,107,255,.2)', border: '1px solid rgba(26,107,255,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Shield size={22} style={{ color: 'var(--blue)' }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
                Seu plano atual
              </p>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--sf-white)', letterSpacing: '-.02em' }}>
                {currentCompany.plano.toUpperCase()}
              </h3>
            </div>
          </div>

          <div className="flex gap-5 items-center relative z-10 flex-wrap">
            <div className="text-center">
              <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Uso (Técnicos)</p>
              <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--cyan)' }}>
                {allUsers.filter(u => u.role === 'TECHNICIAN').length}
              </p>
            </div>

            {currentCompany.plano_expira_em && (
              <>
                <div style={{ width: 1, background: 'rgba(255,255,255,.1)', alignSelf: 'stretch' }} />
                <div className="text-center">
                  <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>
                    {currentCompany.plano === 'trial' ? 'Dias Restantes' : 'Renovação'}
                  </p>
                  <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 700, color: currentCompany.plano === 'trial' ? 'var(--sf-amber)' : 'var(--sf-white)' }}>
                    {currentCompany.plano === 'trial'
                      ? `${Math.max(0, Math.ceil((new Date(currentCompany.plano_expira_em).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}`
                      : new Date(currentCompany.plano_expira_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </>
            )}

            {currentCompany.plano !== 'business' && (
              <button
                onClick={onUpgradeRequest}
                style={{
                  background: 'linear-gradient(135deg, var(--blue), var(--blue2))',
                  border: 'none', borderRadius: 10, padding: '8px 18px',
                  color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,107,255,.4)',
                }}
              >
                Fazer Upgrade
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Trial Expiry Alert ── */}
      {currentUser.role === 'ADMIN' && currentCompany?.plano === 'trial' && currentCompany?.plano_expira_em &&
        Math.ceil((new Date(currentCompany.plano_expira_em).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 4 && (
          <div style={{
            background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)',
            borderRadius: 12, padding: '14px 20px',
          }} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} style={{ color: 'var(--sf-amber)', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, color: 'var(--sf-white)', marginBottom: 2 }}>Seu período de teste está terminando!</p>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Restam menos de 4 dias de acesso grátis. Não perca seus recursos avançados.</p>
              </div>
            </div>
            <button
              onClick={onUpgradeRequest}
              style={{
                background: 'var(--sf-amber)', border: 'none', borderRadius: 8,
                padding: '8px 16px', color: '#1a0a00', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Assinar Agora
            </button>
          </div>
        )}

      {/* ── Content: Ratings or General ── */}
      {viewMode === 'RATINGS' && (currentUser.role === 'ADMIN' || currentUser.role === 'TECHNICIAN') ? (
        <RatingsDashboard orders={orders} technicians={technicians} currentUser={currentUser} />
      ) : (
        <div className="animate-fade-in space-y-6">

          {/* Section Header */}
          <PageHeader
            title="Panorama de Operações"
            description="Visão macro de todas as Ordens de Serviço"
            icon={<LayoutDashboard size={22} style={{ color: 'var(--cyan)' }} />}
            actionSecondary={
              <div className="flex p-1 rounded-xl" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)' }}>
                <button
                  onClick={() => setActiveTab('ASSEMBLY')}
                  className="px-5 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
                  style={activeTab === 'ASSEMBLY'
                    ? { background: 'rgba(255,255,255,.1)', color: 'var(--sf-white)' }
                    : { color: 'var(--muted)' }}
                >
                  Montagens
                </button>
                <button
                  onClick={() => setActiveTab('ASSISTANCE')}
                  className="px-5 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
                  style={activeTab === 'ASSISTANCE'
                    ? { background: 'rgba(255,255,255,.1)', color: 'var(--sf-white)' }
                    : { color: 'var(--muted)' }}
                >
                  Assistências
                </button>
              </div>
            }
          />

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <MetricCard label="Total"      value={stats.total}         icon={<ClipboardList size={20} />} onClick={() => handleCardClick('ALL')} />
            <MetricCard label="Abertas"    value={stats.open}          icon={<AlertCircle size={20} />}   onClick={() => handleCardClick('OPEN')} />
            <MetricCard label="Atribuídas" value={stats.assigned}      icon={<Clock size={20} />}         onClick={() => handleCardClick('ASSIGNED')} />
            <MetricCard label="Andamento"  value={stats.inProgress}    icon={<Clock size={20} />}         onClick={() => handleCardClick('IN_PROGRESS')} />
            <MetricCard label="Aprovação"  value={stats.pendingReview} icon={<UserCheck size={20} />}     onClick={() => handleCardClick('PENDING_REVIEW')} />
            <MetricCard label="Concluídas" value={stats.completed}     icon={<CheckCircle size={20} />}   onClick={() => handleCardClick('COMPLETED')} />
            <MetricCard label="Canceladas" value={stats.cancelled}     icon={<XCircle size={20} />}       onClick={() => handleCardClick('CANCELLED')} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div style={cardStyle} className="h-80">
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--sf-white)', marginBottom: 4 }}>
                Distribuição por Status
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Volume de OS por estado atual</p>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    paddingAngle={4} dataKey="value">
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#f0f4ff' }} />
                  <Legend iconType="circle" formatter={(v) => <span style={{ color: 'var(--muted)', fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={cardStyle} className="h-80">
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--sf-white)', marginBottom: 4 }}>
                Volume por Status
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Proporção de ordens por estado</p>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,.04)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
