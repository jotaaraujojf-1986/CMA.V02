
export type Role = 'ADMIN' | 'TECHNICIAN' | 'CLIENT' | 'ASSISTANT' | 'SUPERADMIN';
export type WorkOrderType = 'ASSISTANCE' | 'ASSEMBLY';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type Status = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface Empresa {
  id: string;
  nome: string;
  email?: string;
  cidade?: string;
  numero_tecnicos?: number;
  plano: string;
  plano_expira_em?: string;
  status: string;
  plano_status?: string;
  criado_em: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for mock purposes (security would be handled differently in prod)
  role: Role;
  classification?: 'JUNIOR' | 'PLENO' | 'SENIOR'; // Specifically for TECHNICIAN
  phone?: string;
  secondaryPhone?: string;
  avatarUrl?: string;
  auth_id?: string;
  empresaId?: string;

  // Formatted address for simple display
  address?: string;

  // Detailed address fields
  cep?: string;
  street?: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Comment {
  id: string;
  empresaId?: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video' | 'audio' | 'document';
  attachmentName?: string;     // Original file name (e.g., "report.pdf")
  attachmentMimeType?: string; // MIME type for correct rendering
  audioDuration?: number;      // Audio duration in seconds (for voice messages)
}

export interface ChecklistItem {
  id: string;
  empresaId?: string;
  label: string;
  checked: boolean;
}

export interface Environment {
  id: string;
  empresaId?: string;
  name: string; // e.g., Cozinha, Quarto
  startDate?: string; // ISO Date
  estimatedDays: number;
  deadlineDate?: string; // ISO Date
  status: 'PENDING' | 'COMPLETED';
  completedDate?: string;
  finished_at?: string; // For productivity tracking
  value_brl?: number; // Value in BRL for this environment
  checklist: ChecklistItem[];
  // Specific technician for this environment
  technicianId?: string;
  technicianName?: string;
  // Project file (PDF) — only visible to ADMIN and ASSISTANT
  projectFileUrl?: string;
  projectFileName?: string;
}

export interface Rating {
  stars: number; // 1 to 5 (Calculated Average)
  comment?: string;
  createdAt: string;
  // Specific Criteria
  punctuality?: number;
  care?: number;         // Care for home/furniture
  cleanliness?: number;  // Organization and cleanliness
  communication?: number;
}

export interface Notification {
  id: string;
  empresaId?: string;
  userId: string; // Recipient
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  relatedOrderId?: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  // For toast/popup navigation
  navigateTo?: 'DETAILS' | 'CHAT';
  alertType?: 'NEW_ORDER' | 'ORDER_UPDATE' | 'CHAT_MESSAGE';
}

export interface WorkOrder {
  id: string;
  empresaId?: string;
  clientId?: string;
  type: WorkOrderType;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  address: string;
  cep: string;
  referencePoint: string;
  description: string;
  priority: Priority;
  status: Status;
  technicianId?: string;
  technicianName?: string;
  createdAt: string;
  updatedAt: string;

  // Assistance Specifics
  assistanceReason?: string; // Kept for backward compatibility/types, though hidden in UI per previous request
  assistanceChecklist?: ChecklistItem[];
  suggestedDate?: string;
  suggestedTime?: string;
  isPostAssembly?: boolean;
  relatedAssemblyWorkOrderId?: string;
  relatedAssemblyTechnicianId?: string;
  relatedAssemblyFinishedAt?: string;
  relatedEnvironmentId?: string;
  relatedEnvironmentName?: string;
  assistanceCategory?: string;
  assistanceCategoryDetail?: string;
  assistanceOriginReason?: 'OPERATIONAL' | 'FACTORY' | 'TRANSPORT' | 'PROJECT';

  // Assembly Specifics
  environments?: Environment[];

  // Common
  images: string[];
  comments: Comment[];
  history: { action: string; timestamp: string; user: string }[];
  completionNotes?: string;
  completionImages?: string[];
  cancellationReason?: string;

  // Rating and Confirmation
  rating?: Rating;
  clientConfirmation?: {
    confirmedAt: string;
    method: 'PASSWORD';
  };
}

export interface DashboardStats {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  pendingReview: number;
  completed: number;
  cancelled: number;
}

export type EventCategoryType = 'INFO' | 'BLOCKER' | 'SAFETY_ALERT';

export interface WorkOrderEventAttachment {
  id: string;
  empresaId?: string;
  eventId: string;
  workOrderId: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  createdAt: string;
}

export interface WorkOrderEvent {
  id: string;
  empresaId?: string;
  workOrderId: string;
  workOrderType: WorkOrderType;
  scope: 'work_order' | 'environment';
  environmentId?: string;
  category: string; 
  title: string;
  description?: string;
  impactDeadline: boolean;
  impactWorkdays?: number;
  impactCost: boolean;
  impactCostBrl?: number;
  visibility: 'internal' | 'client_shareable';
  status: 'open' | 'resolved';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Appended in UI:
  createdByName?: string;
  environmentName?: string;
  attachments?: WorkOrderEventAttachment[];
}

export interface TechnicianTargets {
  JUNIOR: number;
  PLENO: number;
  SENIOR: number;
}