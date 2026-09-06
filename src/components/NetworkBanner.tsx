import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { syncEngine } from '../database/sync/syncEngine';

interface NetworkBannerProps {
  isOnline: boolean;
  queuedCount: number;
  isSyncing: boolean;
  onSyncPress: () => void;
}

export const NetworkBanner: React.FC<NetworkBannerProps> = ({
  isOnline,
  queuedCount,
  isSyncing,
  onSyncPress,
}) => {
  if (isOnline && queuedCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        !isOnline ? styles.offlineContainer : styles.syncingContainer,
      ]}
    >
      <View style={styles.leftRow}>
        <Ionicons
          name={!isOnline ? 'cloud-offline-outline' : 'sync-circle-outline'}
          size={18}
          color={!isOnline ? '#fbbf24' : '#38bdf8'}
        />
        <View style={styles.textColumn}>
          <Text style={styles.title}>
            {!isOnline ? 'Offline Mode (Local WatermelonDB)' : 'Syncing Data'}
          </Text>
          <Text style={styles.subtitle}>
            {!isOnline
              ? `${queuedCount} report${queuedCount === 1 ? '' : 's'} queued on-device. Auto-sync on reconnect.`
              : 'Uploading queued incidents to cloud...'}
          </Text>
        </View>
      </View>

      {isOnline && queuedCount > 0 && (
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={onSyncPress}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.syncBtnText}>Sync Now</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  offlineContainer: {
    backgroundColor: '#27200e',
    borderBottomColor: '#784d08',
  },
  syncingContainer: {
    backgroundColor: '#0c2738',
    borderBottomColor: '#19557a',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  syncBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
