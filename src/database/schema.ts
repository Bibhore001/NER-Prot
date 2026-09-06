import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const nirvanaSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'road_reports',
      columns: [
        { name: 'corridor_id', type: 'string' },
        { name: 'road_name', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'district', type: 'string' },
        { name: 'status', type: 'string' }, // 'open' | 'risky' | 'blocked'
        { name: 'hazard_type', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'photo_uri', type: 'string', isOptional: true },
        { name: 'photo_url', type: 'string', isOptional: true },
        { name: 'user_role', type: 'string' },
        { name: 'reporter_name', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'version', type: 'number' },
        { name: 'sync_state', type: 'string' }, // 'queued' | 'syncing' | 'synced' | 'failed'
        { name: 'confirmations', type: 'number' },
        { name: 'sync_attempts', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'report_id', type: 'string' },
        { name: 'action', type: 'string' }, // 'create' | 'update' | 'confirm'
        { name: 'payload', type: 'string' }, // JSON stringified report data
        { name: 'created_at', type: 'number' },
        { name: 'attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // 'pending' | 'processing' | 'synced' | 'failed'
      ],
    }),
    tableSchema({
      name: 'road_corridors',
      columns: [
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'current_status', type: 'string' },
        { name: 'primary_hazard', type: 'string', isOptional: true },
        { name: 'last_reported_at', type: 'number' },
        { name: 'active_reports_count', type: 'number' },
        { name: 'length_km', type: 'number' },
      ],
    }),
  ],
});
