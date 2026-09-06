import { Model } from '@nozbe/watermelondb';
import { text, field } from '@nozbe/watermelondb/decorators';
import { RoadStatus, HazardType, NorthEastState } from '../../types';

export class RoadCorridorModel extends Model {
  static table = 'road_corridors';

  @text('code') code!: string;
  @text('name') name!: string;
  @text('state') state!: NorthEastState;
  @text('current_status') currentStatus!: RoadStatus;
  @text('primary_hazard') primaryHazard?: HazardType;
  @field('last_reported_at') lastReportedAt!: number;
  @field('active_reports_count') activeReportsCount!: number;
  @field('length_km') lengthKm!: number;
}
