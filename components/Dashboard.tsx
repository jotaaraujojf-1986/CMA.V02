import React, { useMemo, useState } from 'react';
import { WorkOrder, WorkOrderType, User } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ClipboardList, CheckCircle, AlertCircle, Clock, XCircle, UserCheck, Star, LayoutDashboard } from 'lucide-react';
import { RatingsDashboard } from './RatingsDashboard';

interface DashboardProps {
  orders: WorkOrder[];
  currentUser: User;
  allUsers: User[];
  onNavigateFilter?: (status: string, type: WorkOrderType) => void;
}

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#f97316', '#10b981', '#64748b'];

const StatCard = ({ title, value, icon: Icon, colorClass, onClick }: { title: string, value: number, icon: any, colorClass: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition-all duration-200 
      ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95' : ''}`}
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-500 font-medium mb-1 truncate">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
    <div className={`p-2 rounded-full flex-shrink-0 ml-2 ${colorClass}`}>
      <Icon size={20} />
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ orders, currentUser, allUsers, onNavigateFilter }) => {
  const [activeTab, setActiveTab] = useState<WorkOrderType>('ASSEMBLY');
  const [viewMode, setViewMode] = useState<'GENERAL' | 'RATINGS'>('GENERAL');

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.type !== activeTab) return false;
      if (currentUser.role === 'CLIENT') {
        return o.clientEmail === currentUser.email;
      }
      if (currentUser.role === 'TECHNICIAN') {
        const isMainTech = o.technicianId === currentUser.id;
        const isEnvTech = o.environments?.some(env => env.technicianId === currentUser.id);
        return isMainTech || isEnvTech;
      }
      return true;
    });
  }, [orders, activeTab, currentUser]);

  const stats = useMemo(() => {
    return {
      total: filteredOrders.length,
      open: filteredOrders.filter(o => o.status === 'OPEN').length,
      assigned: filteredOrders.filter(o => o.status === 'ASSIGNED').length,
      inProgress: filteredOrders.filter(o => o.status === 'IN_PROGRESS').length,
      pendingReview: filteredOrders.filter(o => o.status === 'PENDING_REVIEW').length,
      completed: filteredOrders.filter(o => o.status === 'COMPLETED').length,
      cancelled: filteredOrders.filter(o => o.status === 'CANCELLED').length,
    };
  }, [filteredOrders]);

  const chartData = [
    { name: 'Abertas', value: stats.open },
    { name: 'Atribuídas', value: stats.assigned },
    { name: 'Andamento', value: stats.inProgress },
    { name: 'Aprovação', value: stats.pendingReview },
    { name: 'Concluídas', value: stats.completed },
    { name: 'Canceladas', value: stats.cancelled },
  ].filter(d => d.value > 0);

  const technicians = useMemo(() => allUsers.filter(u => u.role === 'TECHNICIAN'), [allUsers]);

  const handleCardClick = (status: string) => {
    if (onNavigateFilter) {
      onNavigateFilter(status, activeTab);
    }
  };

  return (
    <div className="space-y-6">
      
      {(currentUser.role === 'ADMIN' || currentUser.role === 'TECHNICIAN') && (
         <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex gap-2">
               <button
                  onClick={() => setViewMode('GENERAL')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                  ${viewMode === 'GENERAL' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
               >
                  <LayoutDashboard size={18} /> Visão Geral
               </button>
               <button
                  onClick={() => setViewMode('RATINGS')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                  ${viewMode === 'RATINGS' ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
               >
                  <Star size={18} /> {currentUser.role === 'TECHNICIAN' ? 'Minhas Avaliações' : 'Avaliações Técnicas'}
               </button>
            </div>
         </div>
      )}

      {viewMode === 'RATINGS' && (currentUser.role === 'ADMIN' || currentUser.role === 'TECHNICIAN') ? (
         <RatingsDashboard orders={orders} technicians={technicians} currentUser={currentUser} />
      ) : (
        <div className="animate-fade-in space-y-6">
          <div className="flex space-x-2 bg-gray-200 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('ASSEMBLY')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'ASSEMBLY' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Montagens
            </button>
            <button
              onClick={() => setActiveTab('ASSISTANCE')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'ASSISTANCE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Assistências
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard 
              title="Total" 
              value={stats.total} 
              icon={ClipboardList} 
              colorClass="bg-blue-50 text-blue-600" 
              onClick={() => handleCardClick('ALL')}
            />
            <StatCard 
              title="Abertas" 
              value={stats.open} 
              icon={AlertCircle} 
              colorClass="bg-red-50 text-red-600" 
              onClick={() => handleCardClick('OPEN')}
            />
            <StatCard 
              title="Atribuídas" 
              value={stats.assigned} 
              icon={Clock} 
              colorClass="bg-yellow-50 text-yellow-600" 
              onClick={() => handleCardClick('ASSIGNED')}
            />
            <StatCard 
              title="Andamento" 
              value={stats.inProgress} 
              icon={Clock} 
              colorClass="bg-purple-50 text-purple-600" 
              onClick={() => handleCardClick('IN_PROGRESS')}
            />
            <StatCard 
              title="Aprovação" 
              value={stats.pendingReview} 
              icon={UserCheck} 
              colorClass="bg-orange-50 text-orange-600" 
              onClick={() => handleCardClick('PENDING_REVIEW')}
            />
            <StatCard 
              title="Concluídas" 
              value={stats.completed} 
              icon={CheckCircle} 
              colorClass="bg-green-50 text-green-600" 
              onClick={() => handleCardClick('COMPLETED')}
            />
            <StatCard 
              title="Canceladas" 
              value={stats.cancelled} 
              icon={XCircle} 
              colorClass="bg-gray-100 text-gray-600" 
              onClick={() => handleCardClick('CANCELLED')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#ffffff', color: '#1f2937', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1f2937' }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Volume por Status</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{fontSize: 11, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#ffffff', color: '#1f2937', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};