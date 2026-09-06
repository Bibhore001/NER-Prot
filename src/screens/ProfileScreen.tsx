import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRole, NetworkMode } from '../types';
import { syncEngine } from '../database/sync/syncEngine';
import { registerForPushNotificationsAsync, sendCorridorAlert } from '../services/notifications';

interface ProfileScreenProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
}

const ROLES_LIST: { role: UserRole; title: string; desc: string; icon: string }[] = [
  {
    role: 'commercial_driver',
    title: 'Commercial Freight Driver',
    desc: 'Heavy cargo convoys, fuel tankers, and essential supplies traversing hill highways.',
    icon: 'car',
  },
  {
    role: 'resident',
    title: 'Local Hill Resident',
    desc: 'Daily commuters, village headmen, and local taxi operators.',
    icon: 'home',
  },
  {
    role: 'fleet_operator',
    title: 'Logistics Fleet Dispatcher',
    desc: 'Multi-vehicle dispatch monitoring supply chains into Meghalaya, Mizoram & Tripura.',
    icon: 'cube',
  },
  {
    role: 'emergency_responder',
    title: 'Emergency SDRF / Police',
    desc: 'Disaster response teams, ambulances, and hill district administration.',
    icon: 'medical',
  },
  {
    role: 'bro_official',
    title: 'Border Roads Organisation (BRO) / NHIDCL',
    desc: 'Highway engineers with earthmovers operating clearance operations.',
    icon: 'shield-checkmark',
  },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentRole, onChangeRole }) => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>(syncEngine.getNetworkMode());
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(syncEngine.isSyncing());
  const [conflictLogs, setConflictLogs] = useState<Array<{ time: number; note: string }>>([]);
  const [fcmToken, setFcmToken] = useState<string | null>('fcm_token_active_ne_corridors');
  const [fcmLoading, setFcmLoading] = useState<boolean>(false);

  const refreshState = async () => {
    const qCount = await syncEngine.getQueuedCount();
    setQueuedCount(qCount);
    setIsSyncing(syncEngine.isSyncing());
    setConflictLogs([...syncEngine.getConflictLog()]);
    setNetworkMode(syncEngine.getNetworkMode());
  };

  useEffect(() => {
    refreshState();
    const unsub = syncEngine.subscribe(() => {
      refreshState();
    });
    return unsub;
  }, []);

  const handleSetNetworkMode = (mode: NetworkMode) => {
    syncEngine.setNetworkMode(mode);
    setNetworkMode(mode);
  };

  const handleManualSync = async () => {
    const { syncedCount, errors } = await syncEngine.flushQueue();
    alert(`Sync finished: Synced ${syncedCount} item(s) to cloud. ${errors > 0 ? `${errors} error(s).` : ''}`);
    await refreshState();
  };

  const handleTestConflict = async () => {
    const reports = await syncEngine.getLocalReports();
    if (reports.length === 0) {
      alert('No reports available to simulate conflict. Submit a report first!');
      return;
    }

    const targetReport = reports[0];
    // Simulate remote device sending an update with newer timestamp
    const res = await syncEngine.simulateConflict(
      targetReport.id,
      1000 * 60 * 15, // 15 mins in future
      targetReport.status === 'blocked' ? 'risky' : 'blocked'
    );

    if (res) {
      alert(`Conflict Simulation Complete:\nWinner: ${res.winner.toUpperCase()}\n${res.reason}`);
    }
  };

  const handleTestPushNotification = async () => {
    setFcmLoading(true);
    await sendCorridorAlert(
      '🚨 BRO URGENT ALERT: NH-10 29th Mile Blocked',
      'Fresh rockfall detected. Traffic diverted via Teesta-Pakyong route. Clearance ETA: 4 hours.'
    );
    setFcmLoading(false);
    alert('FCM Corridor Emergency Broadcast simulated and dispatched!');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile / Role Selector */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-circle-outline" size={20} color="#10b981" />
          <Text style={styles.cardTitle}>USER ROLE & DISPATCH PRIVILEGES</Text>
        </View>

        {ROLES_LIST.map((r) => {
          const isSelected = currentRole === r.role;
          return (
            <TouchableOpacity
              key={r.role}
              style={[styles.roleOption, isSelected && styles.roleOptionActive]}
              onPress={() => onChangeRole(r.role)}
              activeOpacity={0.7}
            >
              <View style={[styles.roleIconBox, isSelected && styles.roleIconBoxActive]}>
                <Ionicons
                  name={r.icon as any}
                  size={18}
                  color={isSelected ? '#10b981' : '#94a3b8'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleTitle, isSelected && styles.roleTitleActive]}>
                  {r.title}
                </Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Network Simulator (For Testing Offline Queueing) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="cellular-outline" size={20} color="#38bdf8" />
          <Text style={styles.cardTitle}>FIELD CONNECTIVITY SIMULATOR</Text>
        </View>
        <Text style={styles.cardDesc}>
          Simulate zero-connectivity gorge passes or mountain tunnels to verify WatermelonDB offline queueing.
        </Text>

        <View style={styles.modeButtonGroup}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              networkMode === 'auto' && styles.modeBtnActive,
            ]}
            onPress={() => handleSetNetworkMode('auto')}
          >
            <Ionicons name="hardware-chip-outline" size={16} color={networkMode === 'auto' ? '#38bdf8' : '#94a3b8'} />
            <Text style={[styles.modeBtnText, networkMode === 'auto' && styles.modeBtnTextActive]}>
              Auto (Real NetInfo)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeBtn,
              networkMode === 'force_online' && styles.modeBtnActiveOnline,
            ]}
            onPress={() => handleSetNetworkMode('force_online')}
          >
            <Ionicons name="wifi" size={16} color={networkMode === 'force_online' ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.modeBtnText, networkMode === 'force_online' && { color: '#34d399' }]}>
              Force Online
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeBtn,
              networkMode === 'force_offline' && styles.modeBtnActiveOffline,
            ]}
            onPress={() => handleSetNetworkMode('force_offline')}
          >
            <Ionicons name="airplane" size={16} color={networkMode === 'force_offline' ? '#ef4444' : '#94a3b8'} />
            <Text style={[styles.modeBtnText, networkMode === 'force_offline' && { color: '#f87171' }]}>
              Force Offline
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.netStateRow}>
          <Text style={styles.netStateLabel}>Effective Status:</Text>
          <View
            style={[
              styles.statusPill,
              syncEngine.isOnline() ? styles.pillOnline : styles.pillOffline,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: syncEngine.isOnline() ? '#34d399' : '#f87171' },
              ]}
            >
              {syncEngine.isOnline() ? 'CONNECTED' : 'DISCONNECTED (LOCAL DB ONLY)'}
            </Text>
          </View>
        </View>
      </View>

      {/* WatermelonDB Sync Queue Controls */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="cloud-upload-outline" size={20} color="#f59e0b" />
          <Text style={styles.cardTitle}>WATERMELONDB OFFLINE QUEUE</Text>
        </View>

        <View style={styles.queueStatsRow}>
          <View>
            <Text style={styles.queueStatsNum}>{queuedCount}</Text>
            <Text style={styles.queueStatsLabel}>Pending Queued Reports</Text>
          </View>

          <TouchableOpacity
            style={[styles.flushBtn, (!syncEngine.isOnline() || queuedCount === 0 || isSyncing) && styles.flushBtnDisabled]}
            onPress={handleManualSync}
            disabled={!syncEngine.isOnline() || queuedCount === 0 || isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="sync" size={16} color="#ffffff" />
                <Text style={styles.flushBtnText}>Sync Queue Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync Conflict Resolution (LWW & CRDT Upgrade) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="git-branch-outline" size={20} color="#a855f7" />
          <Text style={styles.cardTitle}>SYNC CONFLICT HANDLING & CRDT ROADMAP</Text>
        </View>
        <Text style={styles.cardDesc}>
          Current conflict engine: <Text style={{ color: '#f8fafc', fontWeight: '800' }}>Last-Write-Wins (LWW) with Timestamp Versioning</Text>.
          Flagged for upgrade to State-based CRDTs (PN-Counters and LWW-Element-Sets) for multi-convoy offline partitioning.
        </Text>

        <TouchableOpacity style={styles.conflictTestBtn} onPress={handleTestConflict}>
          <Ionicons name="flask" size={16} color="#c084fc" />
          <Text style={styles.conflictTestBtnText}>Simulate Remote Convoy Conflict (LWW Test)</Text>
        </TouchableOpacity>

        {conflictLogs.length > 0 && (
          <View style={styles.conflictLogBox}>
            <Text style={styles.conflictLogTitle}>RECENT RESOLUTION EVENTS</Text>
            {conflictLogs.slice(0, 3).map((log, idx) => (
              <Text key={idx} style={styles.conflictLogItem}>
                • {log.note}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Push Notifications (FCM) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="notifications-outline" size={20} color="#f43f5e" />
          <Text style={styles.cardTitle}>FIREBASE CLOUD MESSAGING (FCM)</Text>
        </View>
        <Text style={styles.cardDesc}>
          Emergency broadcast push notification channels for landslides, bridge collapses, and BRO advisories.
        </Text>

        <TouchableOpacity
          style={styles.fcmBtn}
          onPress={handleTestPushNotification}
          disabled={fcmLoading}
        >
          {fcmLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons name="megaphone" size={16} color="#ffffff" />
              <Text style={styles.fcmBtnText}>Trigger Corridor Hazard Broadcast</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070c18',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#162035',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  roleOptionActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  roleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBoxActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  roleTitle: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  roleTitleActive: {
    color: '#f8fafc',
    fontWeight: '800',
  },
  roleDesc: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  modeButtonGroup: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#162035',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeBtnActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  modeBtnActiveOnline: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  modeBtnActiveOffline: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  modeBtnText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: '#38bdf8',
  },
  netStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  netStateLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  pillOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  queueStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#162035',
    padding: 12,
    borderRadius: 8,
  },
  queueStatsNum: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  queueStatsLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  flushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  flushBtnDisabled: {
    opacity: 0.4,
  },
  flushBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  conflictTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: '#a855f7',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  conflictTestBtnText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '700',
  },
  conflictLogBox: {
    backgroundColor: '#141424',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2e1065',
  },
  conflictLogTitle: {
    color: '#a855f7',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
  },
  conflictLogItem: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
    marginVertical: 2,
  },
  fcmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e11d48',
    paddingVertical: 12,
    borderRadius: 8,
  },
  fcmBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
