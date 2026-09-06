import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { database, reportsCollection, syncQueueCollection } from '../index';
import { RoadReportData, SyncState, NetworkMode } from '../../types';
import { resolveLWWConflict, LWWConflictResolutionResult } from './crdtRoadmap';
import { SEED_REPORTS } from '../../services/mockCorridorData';
import { RoadReportModel } from '../models/RoadReport';

type SyncListener = () => void;

class SyncEngine {
  private networkMode: NetworkMode = 'auto';
  private actualOnline: boolean = true;
  private syncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private conflictLog: Array<{ time: number; note: string }> = [];

  constructor() {
    this.initNetworkListener();
    this.seedDatabaseIfNeeded();
  }

  private initNetworkListener() {
    try {
      NetInfo.addEventListener((state: NetInfoState) => {
        const isConnected = !!(state.isConnected && state.isInternetReachable !== false);
        this.actualOnline = isConnected;
        this.notifyListeners();
        if (this.isOnline()) {
          this.flushQueue();
        }
      });
    } catch (e) {
      console.warn('[SyncEngine] NetInfo not available, defaulting to online', e);
      this.actualOnline = true;
    }
  }

  public getNetworkMode(): NetworkMode {
    return this.networkMode;
  }

  public setNetworkMode(mode: NetworkMode) {
    this.networkMode = mode;
    this.notifyListeners();
    if (this.isOnline()) {
      this.flushQueue();
    }
  }

  public isOnline(): boolean {
    if (this.networkMode === 'force_online') return true;
    if (this.networkMode === 'force_offline') return false;
    return this.actualOnline;
  }

  public isSyncing(): boolean {
    return this.syncing;
  }

  public getConflictLog() {
    return this.conflictLog;
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[SyncEngine] Listener error:', err);
      }
    });
  }

  /**
   * Populate local WatermelonDB with pre-loaded corridors and reports if empty
   */
  public async seedDatabaseIfNeeded() {
    try {
      const count = await reportsCollection.query().fetchCount();
      if (count === 0) {
        await database.write(async () => {
          for (const rep of SEED_REPORTS) {
            await reportsCollection.create((record: RoadReportModel) => {
              record._raw.id = rep.id;
              record.corridorId = rep.corridorId;
              record.roadName = rep.roadName;
              record.state = rep.state;
              record.district = rep.district;
              record.status = rep.status;
              record.hazardType = rep.hazardType;
              record.description = rep.description;
              record.latitude = rep.latitude;
              record.longitude = rep.longitude;
              record.photoUrl = rep.photoUrl;
              record.userRole = rep.userRole;
              record.reporterName = rep.reporterName;
              record.timestamp = rep.timestamp;
              record.version = rep.version;
              record.syncState = 'synced';
              record.confirmations = rep.confirmations;
              record.syncAttempts = 1;
              record.lastSyncedAt = rep.timestamp;
            });
          }
        });
        this.notifyListeners();
      }
    } catch (e) {
      console.warn('[SyncEngine] Seed skipped or already completed', e);
    }
  }

  /**
   * Fetch all reports from local database ordered by timestamp descending
   */
  public async getLocalReports(): Promise<RoadReportData[]> {
    try {
      const records = await reportsCollection.query().fetch();
      const list = records.map((r: RoadReportModel) => r.toData());
      return list.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('[SyncEngine] Failed to read reports:', e);
      return [];
    }
  }

  /**
   * Get total count of queued (pending) reports
   */
  public async getQueuedCount(): Promise<number> {
    try {
      const reports = await reportsCollection.query().fetch();
      return reports.filter((r: RoadReportModel) => r.syncState === 'queued').length;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Core Reporting Flow:
   * Saves to local WatermelonDB first.
   * If online -> sync immediately to cloud mock and mark 'synced'.
   * If offline -> queue on-device with state 'queued' and schedule sync.
   */
  public async submitReport(reportData: Omit<RoadReportData, 'id' | 'timestamp' | 'version' | 'syncState' | 'confirmations'>): Promise<RoadReportData> {
    const reportId = `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = Date.now();
    const online = this.isOnline();
    const initialSyncState: SyncState = online ? 'syncing' : 'queued';

    const newReport: RoadReportData = {
      ...reportData,
      id: reportId,
      timestamp: now,
      version: 1,
      syncState: initialSyncState,
      confirmations: 1,
      syncAttempts: 0,
    };

    // 1. Write to local WatermelonDB
    await database.write(async () => {
      await reportsCollection.create((record: RoadReportModel) => {
        record._raw.id = newReport.id;
        record.corridorId = newReport.corridorId;
        record.roadName = newReport.roadName;
        record.state = newReport.state;
        record.district = newReport.district;
        record.status = newReport.status;
        record.hazardType = newReport.hazardType;
        record.description = newReport.description;
        record.latitude = newReport.latitude;
        record.longitude = newReport.longitude;
        record.photoUri = newReport.photoUri;
        record.photoUrl = newReport.photoUrl;
        record.userRole = newReport.userRole;
        record.reporterName = newReport.reporterName;
        record.timestamp = newReport.timestamp;
        record.version = newReport.version;
        record.syncState = newReport.syncState;
        record.confirmations = newReport.confirmations;
        record.syncAttempts = 0;
      });

      // 2. If offline, enqueue into sync_queue
      if (!online) {
        await syncQueueCollection.create((item: any) => {
          item.reportId = newReport.id;
          item.action = 'create';
          item.payload = JSON.stringify(newReport);
          item.createdAt = now;
          item.attempts = 0;
          item.status = 'pending';
        });
      }
    });

    this.notifyListeners();

    // 3. If online, attempt instant sync
    if (online) {
      this.syncSingleReport(newReport.id);
    }

    return newReport;
  }

  /**
   * Instant sync worker for a single report
   */
  private async syncSingleReport(reportId: string) {
    try {
      // Simulate remote network latency over 4G/satellite
      await new Promise((r) => setTimeout(r, 600));

      await database.write(async () => {
        const record = await reportsCollection.find(reportId);
        if (record) {
          await record.update((r: RoadReportModel) => {
            r.syncState = 'synced';
            r.lastSyncedAt = Date.now();
            r.syncAttempts = (r.syncAttempts || 0) + 1;
          });
        }
      });
      this.notifyListeners();
    } catch (err: any) {
      console.warn(`[SyncEngine] Immediate sync failed for ${reportId}, falling back to queued:`, err);
      await database.write(async () => {
        const record = await reportsCollection.find(reportId);
        if (record) {
          await record.update((r: RoadReportModel) => {
            r.syncState = 'queued';
          });
        }
        await syncQueueCollection.create((item: any) => {
          item.reportId = reportId;
          item.action = 'create';
          item.payload = JSON.stringify({ id: reportId });
          item.createdAt = Date.now();
          item.attempts = 1;
          item.lastError = err?.message || 'Network timeout';
          item.status = 'pending';
        });
      });
      this.notifyListeners();
    }
  }

  /**
   * Flush all queued reports once connectivity returns
   */
  public async flushQueue(): Promise<{ syncedCount: number; errors: number }> {
    if (this.syncing || !this.isOnline()) {
      return { syncedCount: 0, errors: 0 };
    }

    this.syncing = true;
    this.notifyListeners();

    let syncedCount = 0;
    let errors = 0;

    try {
      const queuedRecords = await reportsCollection.query().fetch();
      const pendingReports = queuedRecords.filter((r: RoadReportModel) => r.syncState === 'queued');

      for (const record of pendingReports) {
        try {
          // Simulate transmission
          await new Promise((r) => setTimeout(r, 450));

          await database.write(async () => {
            await record.update((r: RoadReportModel) => {
              r.syncState = 'synced';
              r.lastSyncedAt = Date.now();
              r.syncAttempts = (r.syncAttempts || 0) + 1;
            });
          });
          syncedCount++;
        } catch (e: any) {
          errors++;
          console.error(`[SyncEngine] Error syncing record ${record.id}:`, e);
        }
      }

      // Clear processed sync_queue rows
      await database.write(async () => {
        const queueItems = await syncQueueCollection.query().fetch();
        for (const item of queueItems) {
          await item.destroyPermanently();
        }
      });
    } finally {
      this.syncing = false;
      this.notifyListeners();
    }

    return { syncedCount, errors };
  }

  /**
   * Confirm/upvote a report (crowdsourced verification)
   */
  public async confirmReport(reportId: string) {
    try {
      await database.write(async () => {
        const record = await reportsCollection.find(reportId);
        if (record) {
          await record.update((r: RoadReportModel) => {
            r.confirmations = (r.confirmations || 0) + 1;
          });
        }
      });
      this.notifyListeners();
    } catch (e) {
      console.error('[SyncEngine] Error confirming report:', e);
    }
  }

  /**
   * Test/Demonstrate Conflict Resolution:
   * Simulates a remote update arriving for an existing report,
   * running the Last-Write-Wins (LWW) resolver with timestamp versioning.
   */
  public async simulateConflict(reportId: string, remoteTimestampOffsetMs: number, remoteStatus: 'open' | 'risky' | 'blocked'): Promise<LWWConflictResolutionResult | null> {
    try {
      const record = await reportsCollection.find(reportId);
      if (!record) return null;

      const localData = record.toData();
      const simulatedRemote: RoadReportData = {
        ...localData,
        status: remoteStatus,
        timestamp: localData.timestamp + remoteTimestampOffsetMs,
        version: localData.version + 1,
        description: `[Remote Update from Convoy Dispatch]: Status marked ${remoteStatus.toUpperCase()}`,
      };

      const result = resolveLWWConflict(localData, simulatedRemote);

      // Apply the winning result
      await database.write(async () => {
        await record.update((r: RoadReportModel) => {
          r.status = result.resolvedReport.status;
          r.timestamp = result.resolvedReport.timestamp;
          r.version = result.resolvedReport.version;
          r.description = result.resolvedReport.description;
          r.confirmations = result.resolvedReport.confirmations;
          r.syncState = 'synced';
        });
      });

      this.conflictLog.unshift({
        time: Date.now(),
        note: `Conflict on ${localData.roadName}: ${result.winner.toUpperCase()} won. ${result.reason}`,
      });

      this.notifyListeners();
      return result;
    } catch (e) {
      console.error('[SyncEngine] Conflict simulation error:', e);
      return null;
    }
  }
}

export const syncEngine = new SyncEngine();
