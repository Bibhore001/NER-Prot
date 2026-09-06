import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SyncState } from '../types';

interface StatusBadgeProps {
  state: SyncState;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state, compact = false }) => {
  switch (state) {
    case 'queued':
      return (
        <View style={[styles.badge, styles.queuedBadge]}>
          <Ionicons name="time-outline" size={compact ? 12 : 14} color="#f59e0b" />
          <Text style={[styles.text, styles.queuedText]}>
            {compact ? 'Queued' : 'Queued (Offline)'}
          </Text>
        </View>
      );
    case 'syncing':
      return (
        <View style={[styles.badge, styles.syncingBadge]}>
          <Ionicons name="sync-outline" size={compact ? 12 : 14} color="#38bdf8" />
          <Text style={[styles.text, styles.syncingText]}>
            {compact ? 'Syncing' : 'Syncing...'}
          </Text>
        </View>
      );
    case 'synced':
      return (
        <View style={[styles.badge, styles.syncedBadge]}>
          <Ionicons name="checkmark-circle-outline" size={compact ? 12 : 14} color="#10b981" />
          <Text style={[styles.text, styles.syncedText]}>
            {compact ? 'Synced' : 'Synced Cloud'}
          </Text>
        </View>
      );
    case 'failed':
      return (
        <View style={[styles.badge, styles.failedBadge]}>
          <Ionicons name="alert-circle-outline" size={compact ? 12 : 14} color="#ef4444" />
          <Text style={[styles.text, styles.failedText]}>Sync Failed</Text>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  queuedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  queuedText: {
    color: '#fbbf24',
  },
  syncingBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  syncingText: {
    color: '#38bdf8',
  },
  syncedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  syncedText: {
    color: '#34d399',
  },
  failedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  failedText: {
    color: '#f87171',
  },
});
