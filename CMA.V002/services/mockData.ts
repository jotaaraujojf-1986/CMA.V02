import { WorkOrder, User, WorkOrderType, Status, Environment, Comment, Notification, TechnicianTargets } from '../types';
import { addBusinessDays, format } from 'date-fns';

export const DEFAULT_TARGETS: TechnicianTargets = {
  JUNIOR: 85000,
  PLENO: 100000,
  SENIOR: 120000
};

// --- Mock Users ---
export const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Administrador Principal', 
    email: 'admin@cma.com', 
    password: '123',
    role: 'ADMIN', 
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin+CMA&background=2563eb&color=fff' 
  },
  { 
    id: 'u2', 
    name: 'João Técnico', 
    email: 'tec@cma.com', 
    password: '123',
    role: 'TECHNICIAN', 
    phone: '11999999999', 
    avatarUrl: 'https://ui-avatars.com/api/?name=Joao+Tecnico&background=8b5cf6&color=fff' 
  },
  { 
    id: 'u3', 
    name: 'Maria Cliente', 
    email: 'maria@gmail.com', 
    password: '123',
    role: 'CLIENT', 
    phone: '11988888888', 
    secondaryPhone: '1133334444',
    address: 'Rua das Flores, 123, São Paulo - SP', 
    cep: '01000-000',
    street: 'Rua das Flores',
    addressNumber: '123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    avatarUrl: 'https://ui-avatars.com/api/?name=Maria+Cliente&background=10b981&color=fff' 
  },
];

// --- Mock Notifications ---
export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'u1',
    title: 'Bem-vindo ao C.M.A',
    message: 'Sistema de controle de montagens e assistências iniciado com sucesso.',
    read: false,
    timestamp: new Date().toISOString(),
    type: 'SUCCESS'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    userId: 'u2',
    title: 'Nova O.S. Atribuída',
    message: 'Você recebeu uma nova ordem de montagem em Av. Paulista.',
    read: false,
    timestamp: new Date().toISOString(),
    relatedOrderId: 'OS-1002',
    type: 'INFO'
  }
];

// --- Mock Orders ---
export const INITIAL_ORDERS: WorkOrder[] = [
  {
    id: 'OS-1001',
    type: 'ASSISTANCE',
    clientName: 'Maria Cliente',
    clientEmail: 'maria@gmail.com',
    clientPhone: '11988888888',
    address: 'Rua das Flores, 123, São Paulo',
    cep: '01000-000',
    referencePoint: 'Próximo ao mercado',
    description: 'Porta do armário da cozinha desalinhada e fazendo barulho.',
    priority: 'MEDIUM',
    status: 'OPEN',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    assistanceReason: 'Porta desalinhada',
    suggestedDate: '2023-11-20',
    images: ['https://picsum.photos/300/200?random=10'],
    comments: [],
    history: [{ action: 'O.S. Criada', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), user: 'Maria Cliente' }]
  },
  {
    id: 'OS-1002',
    type: 'ASSEMBLY',
    clientName: 'Roberto Silva',
    clientEmail: 'roberto@email.com',
    clientPhone: '11977777777',
    address: 'Av. Paulista, 500, Apt 101',
    cep: '01310-000',
    referencePoint: 'Prédio Azul',
    description: 'Montagem de apartamento completo.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    technicianId: 'u2',
    technicianName: 'João Técnico',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    images: [],
    environments: [
      {
        id: 'env1',
        name: 'Cozinha',
        estimatedDays: 2,
        status: 'COMPLETED',
        startDate: '2023-10-25',
        completedDate: '2023-10-27',
        deadlineDate: '2023-10-27',
        checklist: [{id: 'c1', label: 'Armários Superiores', checked: true}, {id: 'c2', label: 'Balcão', checked: true}]
      },
      {
        id: 'env2',
        name: 'Quarto Casal',
        estimatedDays: 3,
        status: 'PENDING',
        checklist: [{id: 'c3', label: 'Guarda Roupas', checked: false}, {id: 'c4', label: 'Cabeceira', checked: false}]
      }
    ],
    comments: [
      { id: 'cm1', userId: 'u2', userName: 'João Técnico', text: 'Iniciei a montagem da cozinha.', timestamp: new Date(Date.now() - 86400000) }
    ],
    history: [
      { action: 'O.S. Criada', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), user: 'Carlos Admin' },
      { action: 'Atribuída a João Técnico', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), user: 'Carlos Admin' }
    ]
  }
];

// --- Mock Service Methods ---

const getEaster = (year: number): Date => {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
};

const getHolidaysCache: Record<number, string[]> = {};

export const getHolidaysBR = (year: number): string[] => {
  if (getHolidaysCache[year]) return getHolidaysCache[year];

  const easter = getEaster(year);
  const addDays = (date: Date, days: number) => {
    const r = new Date(date);
    r.setDate(r.getDate() + days);
    return r;
  };
  
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  
  const holidays = [
    `${year}-01-01`, // Ano novo
    `${year}-04-21`, // Tiradentes
    `${year}-05-01`, // Trabalhador
    `${year}-09-07`, // Independência
    `${year}-10-12`, // Nossa Senhora
    `${year}-11-02`, // Finados
    `${year}-11-15`, // Proc. da República
    `${year}-12-25`, // Natal
    fmt(addDays(easter, -47)), // Carnaval
    fmt(addDays(easter, -2)),  // Paixão de Cristo
    fmt(addDays(easter, 60))   // Corpus Christi
  ];
  getHolidaysCache[year] = holidays;
  return holidays;
};

export const isBusinessDay = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  const formattedDate = format(date, 'yyyy-MM-dd');
  const holidays = getHolidaysBR(date.getFullYear());
  if (holidays.includes(formattedDate)) return false;

  return true;
};

export const calculateEndDate = (startDate: string, days: number): string => {
  if (!startDate) return '';
  let start = new Date(startDate);
  
  if (isNaN(start.getTime()) || (startDate.length === 10 && !startDate.includes('T'))) {
     start = new Date(startDate + 'T00:00:00');
  }

  if (isNaN(start.getTime())) return '';

  let current = new Date(start.getTime());
  let daysToAdd = Math.max(0, days - 1);
  
  while (daysToAdd > 0) {
    current.setDate(current.getDate() + 1);
    if (isBusinessDay(current)) {
      daysToAdd--;
    }
  }

  return format(current, 'yyyy-MM-dd');
};

export const calculateBusinessDays = (startDate: string | undefined, endDate: string | undefined): number => {
  if (!startDate || !endDate) return 0;
  let start = new Date(startDate);
  let end = new Date(endDate);

  if (isNaN(start.getTime()) || (startDate.length === 10 && !startDate.includes('T'))) {
     start = new Date(startDate + 'T00:00:00');
  }
  if (isNaN(end.getTime()) || (endDate.length === 10 && !endDate.includes('T'))) {
     end = new Date(endDate + 'T00:00:00');
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start > end) return 0;

  let count = 0;
  const cur = new Date(start.getTime());

  while (cur <= end) {
    if(isBusinessDay(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }

  return count;
};

export const getStatusColor = (status: Status) => {
  switch (status) {
    case 'OPEN': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ASSIGNED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'PENDING_REVIEW': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
    case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusLabel = (status: Status) => {
  switch (status) {
    case 'OPEN': return 'Aberta';
    case 'ASSIGNED': return 'Atribuída';
    case 'IN_PROGRESS': return 'Em Andamento';
    case 'PENDING_REVIEW': return 'Aguardando Aprovação';
    case 'COMPLETED': return 'Concluída';
    case 'CANCELLED': return 'Cancelada';
    default: return status;
  }
};

export const getPriorityLabel = (p: string) => {
  if (p === 'HIGH') return 'Alta';
  if (p === 'MEDIUM') return 'Média';
  return 'Baixa';
};