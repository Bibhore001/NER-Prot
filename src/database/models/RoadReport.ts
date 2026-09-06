import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';
import { RoadStatus, HazardType, SyncState, UserRole, NorthEastState, RoadReportData } from '../../types';

export class RoadReportModel extends Model {
  static table = 'road_reports';

  @text('corridor_id') corridorId!: string;
  @text('road_name') roadName!: string;
  @text('state') state!: NorthEastState;
  @text('district') district!: string;
  @text('status') status!: RoadStatus;
  @text('hazard_type') hazardType!: HazardType;
  @text('description') description!: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @text('photo_uri') photoUri?: string;
  @text('photo_url') photoUrl?: string;
  @text('user_role') userRole!: UserRole;
  @text('reporter_name') reporterName!: string;
  @field('timestamp') timestamp!: number;
  @field('version') version!: number;
  @text('sync_state') syncState!: SyncState;
  @field('confirmations') confirmations!: number;
  @field('sync_attempts') syncAttempts!: number;
  @field('last_synced_at') lastSyncedAt?: number;

  toData(): RoadReportData {
    return {
      id: this.id,
      corridorId: this.corridorId,
      roadName: this.roadName,
      state: this.state,
      district: this.district,
      status: this.status,
      hazardType: this.hazardType,
      description: this.description,
      latitude: this.latitude,
      longitude: this.longitude,
      photoUri: this.photoUri,
      photoUrl: this.photoUrl,
      userRole: this.userRole,
      reporterName: this.reporterName,
      timestamp: this.timestamp,
      version: this.version,
      syncState: this.syncState,
      confirmations: this.confirmations,
      syncAttempts: this.syncAttempts,
      lastSyncedAt: this.lastSyncedAt,
    };
  }
}
