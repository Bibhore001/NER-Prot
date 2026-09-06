import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetworkMode } from '../types';

interface HeaderProps {
  isOnline: boolean;
  queuedCount: number;
  networkMode: NetworkMode;
  onOpenSyncDetails?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isOnline,
  queuedCount,
  networkMode,
  onOpenSyncDetails,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.branding}>
        <View style={styles.logoIconContainer}>
          <Ionicons name="navigate" size={18} color="#10b981" />
        </View>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>NIRVANA</Text>
            <View style={styles.tacticalTag}>
              <Text style={styles.tacticalTagText}>NE-INTEL</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Northeast Logistics & Road Access</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.networkIndicator,
          isOnline ? styles.networkOnline : styles.networkOffline,
        ]}
        onPress={onOpenSyncDetails}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: isOnline ? '#10b981' : '#ef4444' },
          ]}
        />
        <Text style={styles.networkText}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
        {queuedCount > 0 && (
          <View style={styles.queueCountBadge}>
            <Text style={styles.queueCountText}>{queuedCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#090f1d',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  tacticalTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#38bdf8',
  },
  tacticalTagText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
  },
  networkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  networkOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
  },
  networkOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  queueCountBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  queueCountText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
});
