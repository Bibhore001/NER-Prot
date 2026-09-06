export type RoadStatus = 'open' | 'risky' | 'blocked';

export type HazardType = 
  | 'landslide'
  | 'flash_flood'
  | 'mudslide'
  | 'bridge_damage'
  | 'rockfall'
  | 'waterlogging'
  | 'subsidence'
  | 'tree_fall'
  | 'fog'
  | 'clear';

export type SyncState = 'queued' | 'syncing' | 'synced' | 'failed';

export type UserRole = 
  | 'resident'
  | 'commercial_driver'
  | 'fleet_operator'
  | 'emergency_responder'
  | 'bro_official';

export type NorthEastState = 
  | 'Assam'
  | 'Meghalaya'
  | 'Arunachal Pradesh'
  | 'Sikkim'
  | 'Nagaland'
  | 'Manipur'
  | 'Mizoram'
  | 'Tripura';

export interface RoadReportData {
  id: string;
  corridorId: string;
  roadName: string;
  state: NorthEastState;
  district: string;
  status: RoadStatus;
  hazardType: HazardType;
  description: string;
  latitude: number;
  longitude: number;
  photoUri?: string;
  photoUrl?: string; // ImageKit remote URL
  userRole: UserRole;
  reporterName: string;
  timestamp: number; // Unix epoch ms
  version: number; // Version sequence for conflict resolution
  syncState: SyncState;
  confirmations: number;
  syncAttempts?: number;
  lastSyncedAt?: number;
}

export interface RoadCorridor {
  id: string;
  code: string; // e.g., "NH-10"
  name: string; // "Siliguri - Gangtok Lifeline"
  state: NorthEastState;
  districts: string[];
  currentStatus: RoadStatus;
  primaryHazard?: HazardType;
  lastReportedAt: number;
  activeReportsCount: number;
  lengthKm: number;
  criticalPoints: {
    name: string;
    lat: number;
    lng: number;
    status: RoadStatus;
    hazard?: HazardType;
  }[];
}

export interface DashboardMetrics {
  reportsToday: number;
  activeBlockages: number;
  roadsMonitored: number;
  averageTimeToClearHours: number;
  districtBreakdown: {
    district: string;
    state: NorthEastState;
    open: number;
    risky: number;
    blocked: number;
    total: number;
  }[];
  statusCounts: {
    open: number;
    risky: number;
    blocked: number;
  };
}

export type NetworkMode = 'auto' | 'force_online' | 'force_offline';
