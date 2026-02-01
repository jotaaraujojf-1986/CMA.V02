
export type Role = 'ADMIN' | 'TECHNICIAN' | 'CLIENT';
export type WorkOrderType = 'ASSISTANCE' | 'ASSEMBLY';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type Status = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for mock purposes (security would be handled differently in prod)
  role: Role;
  phone?: string;
  secondaryPhone?: string;
  avatarUrl?: string;
  
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
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video';
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface Environment {
  id: string;
  name: string; // e.g., Cozinha, Quarto
  startDate?: string; // ISO Date
  estimatedDays: number;
  deadlineDate?: string; // ISO Date
  status: 'PENDING' | 'COMPLETED';
  completedDate?: string;
  checklist: ChecklistItem[];
  // Specific technician for this environment
  technicianId?: string;
  technicianName?: string;
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
  userId: string; // Recipient
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  relatedOrderId?: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface WorkOrder {
  id: string;
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