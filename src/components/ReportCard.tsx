import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoadReportData, RoadStatus, HazardType } from '../types';
import { StatusBadge } from './StatusBadge';

interface ReportCardProps {
  report: RoadReportData;
  onConfirm?: (id: string) => void;
  onSelect?: (report: RoadReportData) => void;
}

const STATUS_THEME: Record<RoadStatus, { label: string; bg: string; text: string; border: string }> = {
  open: {
    label: 'PASSABLE',
    bg: '#ecfdf5',
    text: '#065f46',
    border: '#a7f3d0',
  },
  risky: {
    label: 'RESTRICTED',
    bg: '#fffbeb',
    text: '#92400e',
    border: '#fde68a',
  },
  blocked: {
    label: 'IMPASSABLE',
    bg: '#fef2f2',
    text: '#991b1b',
    border: '#fecaca',
  },
};

const HAZARD_NAMES: Record<HazardType, string> = {
  landslide: 'Landslide / Rockfall',
  flash_flood: 'Flash Flood Overflow',
  mudslide: 'Hill Mudslide',
  bridge_damage: 'Bridge Structure Damage',
  rockfall: 'Rockfall Corridor',
  waterlogging: 'Waterlogging',
  subsidence: 'Shoulder Subsidence',
  tree_fall: 'Fallen Trees',
  fog: 'Dense Valley Fog',
  clear: 'Clear Route',
};

export const ReportCard: React.FC<ReportCardProps> = ({ report, onConfirm, onSelect }) => {
  const theme = STATUS_THEME[report.status];
  const timeAgo = formatTimeAgo(report.timestamp);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => onSelect?.(report)}
    >
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.roadName}>{report.roadName}</Text>
          <Text style={styles.locationText}>
            {report.district} • Meghalaya PWD Circle
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Text style={[styles.statusPillText, { color: theme.text }]}>{theme.label}</Text>
        </View>
      </View>

      {/* Meta Tags Row */}
      <View style={styles.metaRow}>
        <View style={styles.hazardTag}>
          <Text style={styles.hazardTagText}>{HAZARD_NAMES[report.hazardType] || report.hazardType}</Text>
        </View>

        <View style={styles.reporterTag}>
          <Text style={styles.reporterTagText}>{formatRole(report.userRole)}</Text>
        </View>

        <StatusBadge state={report.syncState} compact />
      </View>

      {/* Description */}
      <Text style={styles.description}>{report.description}</Text>

      {/* Photo evidence if attached */}
      {(report.photoUrl || report.photoUri) && (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: report.photoUrl || report.photoUri }}
            style={styles.photo}
            resizeMode="cover"
          />
          <View style={styles.photoCaption}>
            <Text style={styles.photoCaptionText}>Field Verified Photo</Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footerRow}>
        <View>
          <Text style={styles.reporterText}>By {report.reporterName}</Text>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => onConfirm?.(report.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark-outline" size={13} color="#0f766e" />
          <Text style={styles.confirmBtnText}>
            {report.confirmations} Verified
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

function formatRole(role: string): string {
  switch (role) {
    case 'commercial_driver':
      return 'Freight Convoy';
    case 'bro_official':
      return 'PWD / BRO Engineer';
    case 'emergency_responder':
      return 'SDRF Officer';
    case 'fleet_operator':
      return 'Logistics Dispatch';
    default:
      return 'Field Resident';
  }
}

function formatTimeAgo(timestamp: number): string {
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginVertical: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  roadName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  locationText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  hazardTag: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hazardTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  reporterTag: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reporterTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  description: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  photoContainer: {
    height: 130,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoCaption: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  photoCaptionText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reporterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  confirmBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f766e',
  },
});
