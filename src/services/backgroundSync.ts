import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { syncEngine } from '../database/sync/syncEngine';

export const BACKGROUND_SYNC_TASK_NAME = 'NIRVANA_BACKGROUND_SYNC_TASK';

/**
 * Background Sync Task Definition:
 * Maps to Android WorkManager (PeriodicWorkRequest) and iOS BackgroundTasks (BGAppRefreshTask).
 * Periodically wakes up the application to check for pending queued road reports
 * and flush them when network is reachable.
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK_NAME, async () => {
  const now = new Date().toISOString();
  console.log(`[BackgroundSync] Executing sync task at ${now}`);

  try {
    const queuedCount = await syncEngine.getQueuedCount();
    if (queuedCount > 0 && syncEngine.isOnline()) {
      const { syncedCount, errors } = await syncEngine.flushQueue();
      console.log(`[BackgroundSync] Synced ${syncedCount} queued reports, ${errors} errors.`);
      return syncedCount > 0
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[BackgroundSync] Execution error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background sync task with the OS scheduler
 */
export async function registerBackgroundSync() {
  if (Platform.OS === 'web') {
    // Web fallback: standard periodic interval
    setInterval(() => {
      if (syncEngine.isOnline()) {
        syncEngine.flushQueue();
      }
    }, 15000); // Check every 15s
    return;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes (standard Android WorkManager / iOS interval)
        stopOnTerminate: false, // Continue after app closes
        startOnBoot: true, // Auto-start on device reboot
      });
      console.log('[BackgroundSync] Task registered successfully with WorkManager/BackgroundTasks');
    }
  } catch (err) {
    console.warn('[BackgroundSync] Registration error:', err);
  }
}
