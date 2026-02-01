import React, { useMemo, useState } from 'react';
import { WorkOrder, User } from '../types';
import { Star, MessageSquare, User as UserIcon, TrendingUp, Award, ThumbsUp, Calendar, Medal, Clock, PackageCheck, Sparkles, MessageCircle, AlertCircle, MousePointerClick, X, CalendarCheck, CalendarX, BarChart2, CheckCircle, Timer, Layers } from 'lucide-react';
import { format, differenceInBusinessDays, startOfDay, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface RatingsDashboardProps {
  orders: WorkOrder[];
  technicians: User[];
  currentUser: User;
}

interface Review {
  id: string;
  clientName: string;
  stars: number;
  comment: string;
  date: string;
  orderId: string;
  punctuality?: number;
  care?: number;
  cleanliness?: number;
  communication?: number;
}

interface TechnicianStats {
  id: string;
  name: string;
  avatarUrl?: string;
  totalStars: number;
  reviewCount: number;
  average: number;
  reviews: Review[];
  punctualityTotal: number; punctualityCount: number;
  careTotal: number; careCount: number;
  cleanlinessTotal: number; cleanlinessCount: number;
  communicationTotal: number; communicationCount: number;
  avgPunctuality: number; avgCare: number; avgCleanliness: number; avgCommunication: number;
}

interface DeadlineItem {
  orderId: string;
  envName: string;
  clientName: string;
  deadlineDate: string;
  completedDate: string;
  isLate: boolean;
  daysDiff: number;
}

interface DeadlineStats {
  id: string;
  name: string;
  avatarUrl?: string;
  totalCompleted: number;
  totalOnTime: number;
  totalLate: number;
  complianceRate: number;
  items: DeadlineItem[];
}

export const RatingsDashboard: React.FC<RatingsDashboardProps> = ({ orders, technicians, currentUser }) => {
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [dashboardMode, setDashboardMode] = useState<'RATINGS' | 'DEADLINES'>('RATINGS');
  
  const isTechnician = currentUser.role === 'TECHNICIAN';

  const getEffectiveTechnician = (order: WorkOrder) => {
    if (order.technicianId) return { id: order.technicianId, name: order.technicianName };
    if (order.environments && order.environments.length > 0) {
      const envWithTech = order.environments.find(e => e.technicianId);
      if (envWithTech) {
        return { id: envWithTech.technicianId, name: envWithTech.technicianName };
      }
    }
    return { id: undefined, name: undefined };
  };

  const ratingStats = useMemo(() => {
    const techMap: Record<string, TechnicianStats> = {};
    technicians.forEach(t => {
      if (isTechnician && t.id !== currentUser.id) return;
      techMap[t.id] = {
        id: t.id, name: t.name, avatarUrl: t.avatarUrl,
        totalStars: 0, reviewCount: 0, average: 0, reviews: [],
        punctualityTotal: 0, punctualityCount: 0, careTotal: 0, careCount: 0,
        cleanlinessTotal: 0, cleanlinessCount: 0, communicationTotal: 0, communicationCount: 0,
        avgPunctuality: 0, avgCare: 0, avgCleanliness: 0, avgCommunication: 0
      };
    });

    orders.forEach(order => {
      const { id: techId, name: techName } = getEffectiveTechnician(order);
      if (order.status === 'COMPLETED' && order.rating && techId) {
        if (isTechnician && techId !== currentUser.id) return;
        if (!techMap[techId]) {
           if (!isTechnician) {
             techMap[techId] = {
               id: techId, name: techName || 'Técnico Desconhecido',
               totalStars: 0, reviewCount: 0, average: 0, reviews: [],
               punctualityTotal: 0, punctualityCount: 0, careTotal: 0, careCount: 0,
               cleanlinessTotal: 0, cleanlinessCount: 0, communicationTotal: 0, communicationCount: 0,
               avgPunctuality: 0, avgCare: 0, avgCleanliness: 0, avgCommunication: 0
             };
           } else { return; }
        }
        const s = techMap[techId];
        s.totalStars += order.rating.stars;
        s.reviewCount += 1;
        if (order.rating.punctuality) { s.punctualityTotal += order.rating.punctuality; s.punctualityCount++; }
        if (order.rating.care) { s.careTotal += order.rating.care; s.careCount++; }
        if (order.rating.cleanliness) { s.cleanlinessTotal += order.rating.cleanliness; s.cleanlinessCount++; }
        if (order.rating.communication) { s.communicationTotal += order.rating.communication; s.communicationCount++; }
        const displayClientName = isTechnician ? 'Cliente ******' : order.clientName;
        s.reviews.push({
          id: order.id, clientName: displayClientName, stars: order.rating.stars, comment: order.rating.comment || '',
          date: order.rating.createdAt, orderId: order.id,
          punctuality: order.rating.punctuality, care: order.rating.care,
          cleanliness: order.rating.cleanliness, communication: order.rating.communication
        });
      }
    });

    Object.values(techMap).forEach(s => {
      s.average = s.reviewCount > 0 ? (s.totalStars / s.reviewCount) : 0;
      s.avgPunctuality = s.punctualityCount > 0 ? s.punctualityTotal / s.punctualityCount : 0;
      s.avgCare = s.careCount > 0 ? s.careTotal / s.careCount : 0;
      s.avgCleanliness = s.cleanlinessCount > 0 ? s.cleanlinessTotal / s.cleanlinessCount : 0;
      s.avgCommunication = s.communicationCount > 0 ? s.communicationTotal / s.communicationCount : 0;
      s.reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    return Object.values(techMap).sort((a, b) => b.average - a.average);
  }, [orders, technicians, currentUser, isTechnician]);

  const deadlineStats = useMemo(() => {
    const techMap: Record<string, DeadlineStats> = {};
    technicians.forEach(t => {
      if (isTechnician && t.id !== currentUser.id) return;
      techMap[t.id] = {
        id: t.id, name: t.name, avatarUrl: t.avatarUrl,
        totalCompleted: 0, totalOnTime: 0, totalLate: 0, complianceRate: 0, items: []
      };
    });

    orders.forEach(order => {
       if (order.type !== 'ASSEMBLY' || !order.environments) return;
       order.environments.forEach(env => {
          if (env.status === 'COMPLETED' && env.completedDate && env.deadlineDate && env.technicianId) {
             if (isTechnician && env.technicianId !== currentUser.id) return;
             if (!techMap[env.technicianId]) {
                if(!isTechnician) {
                   techMap[env.technicianId] = { 
                      id: env.technicianId, name: env.technicianName || 'Desc.', 
                      totalCompleted: 0, totalOnTime: 0, totalLate: 0, complianceRate: 0, items: [] 
                   };
                } else { return; }
             }
             const stat = techMap[env.technicianId];
             stat.totalCompleted++;
             const complete = startOfDay(new Date(env.completedDate)); 
             const deadline = startOfDay(new Date(env.deadlineDate + 'T00:00:00'));
             const isLate = complete > deadline;
             const daysDiff = Math.floor((deadline.getTime() - complete.getTime()) / (1000 * 3600 * 24));
             if (isLate) stat.totalLate++; else stat.totalOnTime++;
             stat.items.push({
                orderId: order.id, envName: env.name, clientName: isTechnician ? 'Cliente ******' : order.clientName,
                deadlineDate: env.deadlineDate, completedDate: env.completedDate, isLate, daysDiff
             });
          }
       });
    });

    Object.values(techMap).forEach(s => {
       s.complianceRate = s.totalCompleted > 0 ? (s.totalOnTime / s.totalCompleted) * 100 : 0;
       s.items.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());
    });
    return Object.values(techMap).sort((a, b) => b.complianceRate - a.complianceRate);
  }, [orders, technicians, currentUser, isTechnician]);

  const timelineData = useMemo(() => {
     const timeMap: Record<string, { total: number, onTime: number, display: string }> = {};
     orders.forEach(order => {
        if (order.type !== 'ASSEMBLY' || !order.environments) return;
        order.environments.forEach(env => {
           if (env.status === 'COMPLETED' && env.completedDate && env.deadlineDate && env.technicianId) {
              if (isTechnician && env.technicianId !== currentUser.id) return;
              if (!isTechnician && selectedTechId && env.technicianId !== selectedTechId) return;
              const completeDate = new Date(env.completedDate);
              const key = format(completeDate, 'yyyy-MM');
              const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              const display = `${monthNames[completeDate.getMonth()]} ${completeDate.getFullYear().toString().slice(2)}`;
              if (!timeMap[key]) timeMap[key] = { total: 0, onTime: 0, display };
              timeMap[key].total++;
              const complete = startOfDay(completeDate);
              const deadline = startOfDay(new Date(env.deadlineDate + 'T00:00:00'));
              if (complete <= deadline) timeMap[key].onTime++;
           }
        });
     });
     return Object.keys(timeMap).sort().map(key => ({
        name: timeMap[key].display,
        rate: Math.round((timeMap[key].onTime / timeMap[key].total) * 100),
        total: timeMap[key].total
     }));
  }, [orders, selectedTechId, isTechnician, currentUser]);

  const ratingsTimelineData = useMemo(() => {
     const timeMap: Record<string, { totalStars: number, count: number, display: string }> = {};
     orders.forEach(order => {
        const { id: techId } = getEffectiveTechnician(order);
        if (order.status === 'COMPLETED' && order.rating && techId) {
           if (isTechnician && techId !== currentUser.id) return;
           if (!isTechnician && selectedTechId && techId !== selectedTechId) return;
           const date = new Date(order.rating.createdAt);
           const key = format(date, 'yyyy-MM');
           const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
           const display = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
           if (!timeMap[key]) timeMap[key] = { totalStars: 0, count: 0, display };
           timeMap[key].count++;
           timeMap[key].totalStars += order.rating.stars;
        }
     });
     return Object.keys(timeMap).sort().map(key => ({
        name: timeMap[key].display,
        avg: Number((timeMap[key].totalStars / timeMap[key].count).toFixed(1)),
        count: timeMap[key].count
     }));
  }, [orders, selectedTechId, isTechnician, currentUser]);

  const volumeTimelineData = useMemo(() => {
     const timeMap: Record<string, { count: number, display: string }> = {};
     if (dashboardMode === 'RATINGS') {
        orders.forEach(order => {
            const { id: techId } = getEffectiveTechnician(order);
            if (order.status === 'COMPLETED' && order.rating && techId) {
                if (isTechnician && techId !== currentUser.id) return;
                if (!isTechnician && selectedTechId && techId !== selectedTechId) return;
                const date = new Date(order.rating.createdAt);
                const key = format(date, 'yyyy-MM');
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const display = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
                if (!timeMap[key]) timeMap[key] = { count: 0, display };
                timeMap[key].count++;
            }
        });
     } else {
        orders.forEach(order => {
            if (order.type !== 'ASSEMBLY' || !order.environments) return;
            order.environments.forEach(env => {
                if (env.status === 'COMPLETED' && env.completedDate && env.technicianId) {
                    if (isTechnician && env.technicianId !== currentUser.id) return;
                    if (!isTechnician && selectedTechId && env.technicianId !== selectedTechId) return;
                    const date = new Date(env.completedDate);
                    const key = format(date, 'yyyy-MM');
                    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    const display = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
                    if (!timeMap[key]) timeMap[key] = { count: 0, display };
                    timeMap[key].count++;
                }
            });
        });
     }
     return Object.keys(timeMap).sort().map(key => ({
        name: timeMap[key].display,
        value: timeMap[key].count
     }));
  }, [orders, dashboardMode, selectedTechId, isTechnician, currentUser]);

  const renderStars = (rating: number, size: number = 16) => (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={size} className={`${star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
        ))}
      </div>
  );

  const PerformanceBar = ({ label, value, icon: Icon, isPercentage = false }: { label: string, value: number, icon: any, isPercentage?: boolean }) => {
     let color = 'bg-green-500';
     let textColor = 'text-green-700';
     let bgSoft = 'bg-green-50';
     let status = 'Excelente';
     const score = isPercentage ? (value / 20) : value;
     if (score < 3) { color = 'bg-red-500'; textColor = 'text-red-700'; bgSoft = 'bg-red-50'; status = 'Crítico'; }
     else if (score < 4.5) { color = 'bg-yellow-500'; textColor = 'text-yellow-700'; bgSoft = 'bg-yellow-50'; status = 'Atenção'; }
     return (
        <div className="mb-3">
           <div className="flex justify-between items-end mb-1">
              <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5 uppercase">
                 <Icon size={14} className="text-gray-400"/> {label}
              </span>
              <div className="text-right">
                 <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${bgSoft} ${textColor} mr-2`}>
                    {status}
                 </span>
                 <span className="text-sm font-bold text-gray-800">
                    {isPercentage ? `${value.toFixed(0)}%` : value.toFixed(1)}
                 </span>
              </div>
           </div>
           <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{width: `${isPercentage ? value : (value / 5) * 100}%`}}></div>
           </div>
        </div>
     );
  };

  const currentData = dashboardMode === 'RATINGS' ? ratingStats : deadlineStats;
  const techToDisplay = isTechnician ? (dashboardMode === 'RATINGS' ? ratingStats[0] : deadlineStats[0]) : (dashboardMode === 'RATINGS' ? ratingStats.find(t => t.id === selectedTechId) : deadlineStats.find(t => t.id === selectedTechId));
  const overallAvg = dashboardMode === 'RATINGS' ? ratingStats.reduce((acc, curr) => acc + (curr.reviewCount > 0 ? curr.average : 0), 0) / (ratingStats.filter(s => s.reviewCount > 0).length || 1) : deadlineStats.reduce((acc, curr) => acc + (curr.totalCompleted > 0 ? curr.complianceRate : 0), 0) / (deadlineStats.filter(s => s.totalCompleted > 0).length || 1);
  const totalVolume = dashboardMode === 'RATINGS' ? ratingStats.reduce((acc, curr) => acc + curr.reviewCount, 0) : deadlineStats.reduce((acc, curr) => acc + curr.totalCompleted, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 p-1.5 rounded-xl inline-flex items-center shadow-inner">
           <button 
             onClick={() => { setDashboardMode('RATINGS'); setSelectedTechId(null); }}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all
               ${dashboardMode === 'RATINGS' ? 'bg-white text-yellow-600 shadow-md ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-800'}`}
           >
             <Star size={16} className={dashboardMode === 'RATINGS' ? 'fill-yellow-500 text-yellow-500' : ''} />
             Avaliação Cliente
           </button>
           <button 
             onClick={() => { setDashboardMode('DEADLINES'); setSelectedTechId(null); }}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all
               ${dashboardMode === 'DEADLINES' ? 'bg-white text-blue-600 shadow-md ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-800'}`}
           >
             <CalendarCheck size={16} />
             Prazos & Metas
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-6 rounded-xl border shadow-sm flex items-center justify-between
          ${dashboardMode === 'RATINGS' ? 'bg-white border-yellow-100' : 'bg-white border-blue-100'}`}>
           <div>
             <p className={`font-bold text-sm uppercase mb-1 ${dashboardMode === 'RATINGS' ? 'text-yellow-800' : 'text-blue-800'}`}>
               {isTechnician ? (dashboardMode === 'RATINGS' ? 'Minha Nota' : 'Minha Pontualidade') : (dashboardMode === 'RATINGS' ? 'Média Equipe' : 'Pontualidade Global')}
             </p>
             <h3 className="text-3xl font-extrabold text-gray-800 flex items-center gap-2">
               {dashboardMode === 'RATINGS' ? overallAvg.toFixed(1) : `${overallAvg.toFixed(0)}%`} 
               {dashboardMode === 'RATINGS' ? <Star className="text-yellow-400 fill-yellow-400" size={24}/> : <CheckCircle className="text-blue-500" size={24}/>}
             </h3>
           </div>
           <div className={`p-3 rounded-full shadow-sm bg-gray-50 ${dashboardMode === 'RATINGS' ? 'text-yellow-500' : 'text-blue-500'}`}>
             <TrendingUp size={24} />
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-gray-600 font-bold text-sm uppercase mb-1">{isTechnician ? 'Total Realizado' : 'Volume Total'}</p>
             <h3 className="text-3xl font-extrabold text-gray-800">{totalVolume}</h3>
             <span className="text-xs text-gray-400">{dashboardMode === 'RATINGS' ? 'Avaliações recebidas' : 'Ambientes entregues'}</span>
           </div>
           <div className="bg-gray-50 p-3 rounded-full shadow-sm text-gray-500">
             {dashboardMode === 'RATINGS' ? <MessageSquare size={24} /> : <PackageCheck size={24} />}
           </div>
        </div>
        {!isTechnician ? (
          <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm flex items-center justify-between">
             <div>
               <p className="text-green-800 font-bold text-sm uppercase mb-1">Top Performance</p>
               <h3 className="text-lg font-bold text-gray-800 truncate max-w-[150px]">
                 {currentData.length > 0 && (dashboardMode === 'RATINGS' ? (currentData[0] as TechnicianStats).reviewCount > 0 : (currentData[0] as DeadlineStats).totalCompleted > 0) ? currentData[0].name : 'N/A'}
               </h3>
               {currentData.length > 0 && (dashboardMode === 'RATINGS' ? renderStars((currentData[0] as TechnicianStats).average, 14) : <span className="text-sm font-bold text-green-700">{(currentData[0] as DeadlineStats).complianceRate.toFixed(0)}% no prazo</span>)}
             </div>
             <div className="bg-gray-50 p-3 rounded-full shadow-sm text-green-500">
               <Award size={24} />
             </div>
          </div>
        ) : (
             <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-green-800 font-bold text-sm uppercase mb-1">Meu Status</p>
                  <h3 className="text-lg font-bold text-gray-800">
                    {dashboardMode === 'RATINGS' ? (overallAvg >= 4.5 ? 'Excelente!' : overallAvg >= 4 ? 'Muito Bom' : 'Em Evolução') : (overallAvg >= 90 ? 'Pontualidade Alta' : overallAvg >= 75 ? 'Dentro da Média' : 'Atenção aos Prazos')}
                  </h3>
                </div>
                <div className="bg-gray-50 p-3 rounded-full shadow-sm text-green-500"><ThumbsUp size={24} /></div>
             </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
         <div className="flex items-center gap-2 mb-4">
            <BarChart2 className={dashboardMode === 'RATINGS' ? "text-yellow-600" : "text-blue-600"} size={20} />
            <h3 className="text-lg font-bold text-gray-800">{isTechnician ? 'Minha Evolução' : (selectedTechId ? `Evolução: ${techToDisplay?.name}` : 'Evolução da Equipe')}</h3>
         </div>
         <div className="h-64 w-full">
            {(dashboardMode === 'RATINGS' ? ratingsTimelineData : timelineData).length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardMode === 'RATINGS' ? ratingsTimelineData : timelineData}>
                     <defs>
                        <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor={dashboardMode === 'RATINGS' ? "#eab308" : "#3b82f6"} stopOpacity={0.8}/>
                           <stop offset="95%" stopColor={dashboardMode === 'RATINGS' ? "#eab308" : "#3b82f6"} stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} dy={10} />
                     <YAxis domain={dashboardMode === 'RATINGS' ? [0, 5] : [0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                     <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                     <Area type="monotone" dataKey={dashboardMode === 'RATINGS' ? "avg" : "rate"} stroke={dashboardMode === 'RATINGS' ? "#eab308" : "#3b82f6"} strokeWidth={3} fillOpacity={1} fill="url(#colorMain)" />
                  </AreaChart>
               </ResponsiveContainer>
            ) : <div className="h-full flex flex-col items-center justify-center text-gray-400"><CalendarX size={48} className="mb-2 opacity-30"/><p>Sem dados para o gráfico.</p></div>}
         </div>
      </div>

      {!isTechnician && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
               <Medal className={dashboardMode === 'RATINGS' ? "text-yellow-500" : "text-blue-500"} size={20} /> 
               {dashboardMode === 'RATINGS' ? 'Ranking de Qualidade' : 'Ranking de Pontualidade'}
             </h3>
          </div>
          <div className="space-y-3">
            {currentData.map((tech, index) => (
               <div key={tech.id} onClick={() => setSelectedTechId(selectedTechId === tech.id ? null : tech.id)} className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${selectedTechId === tech.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                 <div className="flex items-center gap-4">
                   <div className="w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm border bg-gray-50">{index + 1}º</div>
                   <div className="flex items-center gap-3">
                       <img src={tech.avatarUrl || `https://ui-avatars.com/api/?name=${tech.name}&background=random`} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt={tech.name}/>
                       <div><p className="font-bold text-gray-900">{tech.name}</p></div>
                   </div>
                 </div>
                 <div className="text-right min-w-[60px]"><div className="flex items-center justify-end gap-1"><span className="font-bold text-gray-800 text-lg">{dashboardMode === 'RATINGS' ? (tech as TechnicianStats).average.toFixed(1) : (tech as DeadlineStats).complianceRate.toFixed(0)}</span>{dashboardMode === 'RATINGS' ? <Star size={16} className="text-yellow-400 fill-yellow-400" /> : <span className="text-xs font-bold text-gray-500">%</span>}</div></div>
               </div>
            ))}
          </div>
        </div>
      )}

      {techToDisplay && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-fade-in">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex items-center gap-4 relative">
              {!isTechnician && <button onClick={() => setSelectedTechId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>}
              <img src={techToDisplay.avatarUrl || `https://ui-avatars.com/api/?name=${techToDisplay.name}&background=random`} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm" alt={techToDisplay.name}/>
              <div>
                <h4 className="font-bold text-xl text-gray-900">{techToDisplay.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                   <span className="font-bold text-blue-700">{dashboardMode === 'RATINGS' ? (techToDisplay as TechnicianStats).average.toFixed(1) : (techToDisplay as DeadlineStats).complianceRate.toFixed(0) + '%'}</span>
                   <span className="text-xs text-gray-500">({dashboardMode === 'RATINGS' ? (techToDisplay as TechnicianStats).reviewCount : (techToDisplay as DeadlineStats).totalCompleted} registros)</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2">
               {dashboardMode === 'RATINGS' ? (
                 <>
                   <div className="p-6 border-r border-gray-100"><PerformanceBar label="Pontualidade" value={(techToDisplay as TechnicianStats).avgPunctuality} icon={Clock} /><PerformanceBar label="Cuidado" value={(techToDisplay as TechnicianStats).avgCare} icon={PackageCheck} /><PerformanceBar label="Limpeza" value={(techToDisplay as TechnicianStats).avgCleanliness} icon={Sparkles} /><PerformanceBar label="Comunicação" value={(techToDisplay as TechnicianStats).avgCommunication} icon={MessageCircle} /></div>
                   <div className="p-4 bg-gray-50/30 overflow-y-auto max-h-60">{(techToDisplay as TechnicianStats).reviews.map((r, i) => (<div key={i} className="mb-3 p-3 bg-white rounded border border-gray-100 shadow-sm"><div className="flex justify-between items-center mb-1"><span className="text-xs font-bold">{r.clientName}</span>{renderStars(r.stars, 10)}</div><p className="text-xs text-gray-600 italic">"{r.comment || 'Sem comentário'}"</p></div>))}</div>
                 </>
               ) : (
                 <>
                   <div className="p-6 border-r border-gray-100 text-center"><h4 className="text-3xl font-bold text-blue-600">{(techToDisplay as DeadlineStats).complianceRate.toFixed(1)}%</h4><p className="text-xs font-bold text-gray-500 uppercase">No Prazo</p></div>
                   <div className="p-4 bg-gray-50/30 overflow-y-auto max-h-60">{(techToDisplay as DeadlineStats).items.map((it, i) => (<div key={i} className="mb-2 p-3 bg-white rounded border border-gray-100 shadow-sm"><div className="flex justify-between items-center"><span className="text-xs font-bold">{it.envName}</span><span className={`text-[10px] font-bold ${it.isLate ? 'text-red-600' : 'text-green-600'}`}>{it.isLate ? 'ATRASADO' : 'NO PRAZO'}</span></div></div>))}</div>
                 </>
               )}
            </div>
        </div>
      )}
    </div>
  );
};