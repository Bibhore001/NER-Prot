import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, TouchableOpacity, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Header } from './src/components/Header';
import { NetworkBanner } from './src/components/NetworkBanner';
import { MapScreen } from './src/screens/MapScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { syncEngine } from './src/database/sync/syncEngine';
import { registerBackgroundSync } from './src/services/backgroundSync';
import { registerForPushNotificationsAsync } from './src/services/notifications';
import { NetworkMode } from './src/types';

type TabType = 'map' | 'routes' | 'reports';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [reportInitialCorridor, setReportInitialCorridor] = useState<string>('NH-106');
  const [isOnline, setIsOnline] = useState<boolean>(syncEngine.isOnline());
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(syncEngine.isSyncing());
  const [networkMode, setNetworkMode] = useState<NetworkMode>(syncEngine.getNetworkMode());

  // Subscribe to sync engine state changes
  const updateSyncStats = async () => {
    setIsOnline(syncEngine.isOnline());
    setIsSyncing(syncEngine.isSyncing());
    setNetworkMode(syncEngine.getNetworkMode());
    const count = await syncEngine.getQueuedCount();
    setQueuedCount(count);
  };

  useEffect(() => {
    // 1. Initialize background sync (WorkManager on Android / BackgroundTasks on iOS)
    registerBackgroundSync();

    // 2. Register for Push Notifications (FCM)
    registerForPushNotificationsAsync();

    // 3. Seed initial WatermelonDB data
    syncEngine.seedDatabaseIfNeeded();

    // 4. Listen to network & queue changes
    updateSyncStats();
    const unsub = syncEngine.subscribe(() => {
      updateSyncStats();
    });

    return unsub;
  }, []);

  const handleManualSync = async () => {
    await syncEngine.flushQueue();
    await updateSyncStats();
  };

  const handleNavigateToReport = (corridorCode?: string) => {
    if (corridorCode) {
      setReportInitialCorridor(corridorCode);
    }
    setActiveTab('reports');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Offline / Syncing Warning Banner if items queued */}
        {queuedCount > 0 && (
          <NetworkBanner
            isOnline={isOnline}
            queuedCount={queuedCount}
            isSyncing={isSyncing}
            onSyncPress={handleManualSync}
          />
        )}

        {/* Screen Switcher */}
        <View style={styles.screenContainer}>
          {activeTab === 'map' && (
            <MapScreen
              onNavigateToReport={handleNavigateToReport}
              onNavigateToRoutes={() => setActiveTab('routes')}
            />
          )}

          {activeTab === 'routes' && (
            <DashboardScreen
              onSelectReport={() => {}}
              onNavigateToMap={() => setActiveTab('map')}
            />
          )}

          {activeTab === 'reports' && (
            <ReportScreen
              initialCorridorCode={reportInitialCorridor}
              onReportSubmitted={() => {
                updateSyncStats();
                setActiveTab('routes');
              }}
            />
          )}
        </View>

        {/* Modern 3-Tab Bottom Navigation Bar */}
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'map' && styles.tabItemActive]}
              onPress={() => setActiveTab('map')}
              activeOpacity={0.75}
            >
              <View style={[styles.tabIconWrapper, activeTab === 'map' && styles.tabIconWrapperActive]}>
                <Ionicons
                  name={activeTab === 'map' ? 'navigate' : 'navigate-outline'}
                  size={20}
                  color={activeTab === 'map' ? '#0f766e' : '#64748b'}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'map' && styles.tabLabelActive,
                ]}
              >
                Live Radar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'routes' && styles.tabItemActive]}
              onPress={() => setActiveTab('routes')}
              activeOpacity={0.75}
            >
              <View style={[styles.tabIconWrapper, activeTab === 'routes' && styles.tabIconWrapperActive]}>
                <Ionicons
                  name={activeTab === 'routes' ? 'git-network' : 'git-network-outline'}
                  size={20}
                  color={activeTab === 'routes' ? '#0f766e' : '#64748b'}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'routes' && styles.tabLabelActive,
                ]}
              >
                Corridors & Fleet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'reports' && styles.tabItemActive]}
              onPress={() => setActiveTab('reports')}
              activeOpacity={0.75}
            >
              <View style={[styles.tabIconWrapper, activeTab === 'reports' && styles.tabIconWrapperActive]}>
                <View style={{ position: 'relative' }}>
                  <Ionicons
                    name={activeTab === 'reports' ? 'warning' : 'warning-outline'}
                    size={20}
                    color={activeTab === 'reports' ? '#b45309' : '#64748b'}
                  />
                  {queuedCount > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{queuedCount}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'reports' && styles.tabLabelActiveReports,
                ]}
              >
                Report Hazard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  screenContainer: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: 'transparent',
  },
  tabIconWrapper: {
    width: 38,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginBottom: 2,
  },
  tabIconWrapperActive: {
    backgroundColor: '#f0fdfa',
  },
  tabLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: '#0f766e',
    fontWeight: '800',
  },
  tabLabelActiveReports: {
    color: '#b45309',
    fontWeight: '800',
  },
  tabBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#dc2626',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});
