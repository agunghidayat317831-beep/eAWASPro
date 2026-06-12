export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  name?: string;
  role: 'admin' | 'pengawas' | 'ppk' | 'kepala_dinas' | 'user';
  password?: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  contractNumber?: string;
  contractDate?: string;
  spmkDate?: string;
  executionPeriod?: number;
  ptCv: string;
  providerId?: string;
  anggaran: number;
  progress: number;
  supervisorName?: string;
  lat: number;
  lng: number;
  createdAt: any;
  updatedAt: any;
}

export interface ProjectEvaluation {
  id: string;
  projectId: string;
  projectName: string;
  providerId: string;
  quality: number;
  cost: number;
  time: number;
  service: number;
  totalScore: number;
  createdAt: any;
  updatedAt: any;
}

export interface ProjectPhoto {
  id: string;
  projectId: string;
  url: string;
  category: '0%' | '50%' | '100%';
  description?: string;
  date: string;
  progress: number;
}

export interface WeeklyReportDetail {
  rabItemId: string;
  description: string;
  unit: string;
  targetVolume: number;
  volumeThisWeek: number;
  cumulativeVolume: number;
  weight: number;
  progressThisWeek: number;
  cumulativeProgress: number;
}

export interface WeeklyReport {
  id: string;
  projectId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  weeklyProgress: number;
  cumulativeProgress: number;
  notes?: string;
  details?: WeeklyReportDetail[];
}

export interface Provider {
  id: string;
  name: string;
  address: string;
  npwp: string;
  email: string;
  phone: string;
  createdAt: any;
  updatedAt: any;
}

export interface AHSPItem {
  id: string;
  description: string;
  code: string;
  unit: string;
  coefficient: number;
  unitPrice: number;
  totalPrice: number;
}

export interface AHSP {
  id: string;
  code: string;
  jobName: string;
  labor: AHSPItem[];
  materials: AHSPItem[];
  equipment: AHSPItem[];
  laborTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  subtotal: number;
  overheadPercentage: number;
  overheadValue: number;
  totalPrice: number;
  roundedPrice: number;
  createdAt: any;
  updatedAt: any;
}

export interface LaborMaster {
  id: string;
  description: string;
  code: string;
  unit: string;
  unitPrice: number;
}

export interface MaterialMaster {
  id: string;
  description: string;
  code: string;
  unit: string;
  unitPrice: number;
}

export interface EquipmentMaster {
  id: string;
  description: string;
  code: string;
  unit: string;
  unitPrice: number;
}

export interface RABItem {
  id: string;
  ahspId?: string;
  description: string;
  volume: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}
