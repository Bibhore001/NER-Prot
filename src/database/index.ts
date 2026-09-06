import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { nirvanaSchema } from './schema';
import { RoadReportModel } from './models/RoadReport';
import { SyncQueueItemModel } from './models/SyncQueueItem';
import { RoadCorridorModel } from './models/RoadCorridorModel';

// Cross-platform WatermelonDB Adapter
// Uses LokiJS indexed storage for resilient cross-platform (Web, Expo Go, iOS, Android) execution
const adapter = new LokiJSAdapter({
  schema: nirvanaSchema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  onSetUpError: (error) => {
    console.error('[WatermelonDB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [RoadReportModel, SyncQueueItemModel, RoadCorridorModel],
});

export const reportsCollection = database.get<RoadReportModel>('road_reports');
export const syncQueueCollection = database.get<SyncQueueItemModel>('sync_queue');
export const corridorsCollection = database.get<RoadCorridorModel>('road_corridors');
