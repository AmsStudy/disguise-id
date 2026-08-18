export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'operator' | 'investigator';
  organizationId: string;
  avatar?: string;
  createdAt: string;
}

export interface WatchlistPerson {
  id: string;
  name: string;
  fullName?: string;
  alias?: string;
  aliases?: string[];
  dangerLevel: 'critical' | 'high' | 'medium' | 'low';
  isActive: boolean;
  caseNumber?: string;
  notes?: string;
  photos: WatchlistPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistPhoto {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface Camera {
  id: string;
  name: string;
  location?: string;
  locationName?: string;
  status: 'online' | 'offline' | 'error' | 'credentials_required' | 'maintenance';
  streamUrl?: string;
  ipAddress?: string;
  username?: string;
  lastFrame?: string;
  alertCount?: number;
  alerts_today?: number;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
}

export interface Alert {
  id: string;
  status: 'pending' | 'confirmed' | 'dismissed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  similarity: number;
  similarityScore?: number;
  faceCropUrl?: string;
  camera: Camera;
  person: WatchlistPerson;
  detectedAt: string;
  createdAt?: string;
  assignedTo?: User;
  confirmedAt?: string;
  notes?: string;
  detectionEvent?: {
    id: string;
    faceCropUrl?: string;
    frameUrl?: string;
    detectedAt: string;
    processingMs?: number;
    source?: {
      id: string;
      name: string;
      locationName?: string;
    };
  };
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  status: 'open' | 'investigating' | 'closed';
  description?: string;
  alerts: Alert[];
  notes: CaseNote[];
  assignedTo?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CaseNote {
  id: string;
  content: string;
  attachments: string[];
  author: User;
  createdAt: string;
}

export interface DashboardStats {
  detectionsToday: number;
  detectionsChange: number;
  pendingAlerts: number;
  camerasOnline: number;
  camerasTotal: number;
  watchlistActive: number;
}

export interface AnalyticsData {
  detectionsByHour: { hour: string; count: number }[];
  similarityDistribution: { range: string; count: number }[];
  alertsByStatus: { status: string; count: number; fill?: string }[];
  topCameras: { camera: string; count: number }[];
  modelPerformance: {
    rocAuc: number;
    tpr: number;
    threshold: number;
    fpr: number;
  };
}

export interface LiveDetection {
  cameraId: string;
  faceCropUrl?: string;
  similarity?: number;
  personName?: string;
  timestamp: string;
  bboxes?: number[][];
  frameWidth?: number;
  frameHeight?: number;
}
