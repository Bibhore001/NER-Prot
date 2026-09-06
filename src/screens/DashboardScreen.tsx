import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoadReportData } from '../types';
import { syncEngine } from '../database/sync/syncEngine';
import { ReportCard } from '../components/ReportCard';
import { FLEET_TRUCKS } from '../components/OpenStreetMap';

interface DashboardScreenProps {
  onSelectReport?: (report: RoadReportData) => void;
  onNavigateToMap?: () => void;
}

const DISTRICT_DATA = [
  { name: 'East Khasi Hills', hq: 'Shillong', open: 4, risky: 1, blocked: 1, rainMm: 124 },
  { name: 'West Khasi Hills', hq: 'Nongstoin', open: 3, risky: 1, blocked: 0, rainMm: 86 },
  { name: 'West Garo Hills', hq: 'Tura', open: 4, risky: 0, blocked: 0, rainMm: 42 },
  { name: 'East Garo Hills', hq: 'Williamnagar', open: 2, risky: 1, blocked: 0, rainMm: 58 },
  { name: 'South Garo Hills', hq: 'Baghmara', open: 1, risky: 0, blocked: 1, rainMm: 142 },
  { name: 'South West Khasi', hq: 'Mawkyrwat', open: 2, risky: 1, blocked: 0, rainMm: 94 },
];

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onSelectReport,
  onNavigateToMap,
}) => {
  const [reports, setReports] = useState<RoadReportData[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');

  const loadData = async () => {
    const list = await syncEngine.getLocalReports();
    setReports(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = syncEngine.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConfirm = async (id: string) => {
    await syncEngine.confirmReport(id);
    await loadData();
  };

  const activeBlockages = reports.filter((r) => r.status === 'blocked').length;
  const filteredReports = reports.filter((r) => {
    if (selectedDistrict === 'All') return true;
    return r.district.toLowerCase().includes(selectedDistrict.toLowerCase());
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
    >
      {/* Title & Organization Subheader */}
      <View style={styles.topBanner}>
        <View style={{ flex: 1 }}>
          <View style={styles.bannerAgencyRow}>
            <View style={styles.agencyBadge}>
              <Text style={styles.agencyBadgeText}>PWD & BRO LOGISTICS</Text>
            </View>
            <Text style={styles.bannerSubtitle}>OPERATIONAL COMMAND</Text>
          </View>
          <Text style={styles.bannerTitle}>Corridor Passability & Freight Radar</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.livePulseDot} />
          <Text style={styles.liveBadgeText}>LIVE TELEMETRY</Text>
        </View>
      </View>

      {/* 4 Clean Modern Metric Cards */}
      <View style={styles.metricGrid}>
        <View style={[styles.metricCard, styles.metricCardAlert]}>
          <View style={styles.metricTopRow}>
            <Text style={[styles.metricLabel, { color: '#991b1b' }]}>ROAD CLOSURES</Text>
            <Ionicons name="warning-outline" size={14} color="#dc2626" />
          </View>
          <View style={styles.metricValueRow}>
            <Text style={[styles.metricValue, { color: '#991b1b' }]}>{activeBlockages || 2}</Text>
            <Text style={styles.metricUnit}>Segments</Text>
          </View>
          <Text style={styles.metricCaption}>Mawkdok & Simsang gorge points</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricTopRow}>
            <Text style={styles.metricLabel}>FLEET CONVOYS</Text>
            <Ionicons name="car-outline" size={14} color="#0f766e" />
          </View>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>{FLEET_TRUCKS.length}</Text>
            <Text style={styles.metricUnit}>Trucks</Text>
          </View>
          <Text style={styles.metricCaption}>3 moving • 1 delayed by detour</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricTopRow}>
            <Text style={styles.metricLabel}>MONITORED LIFELINES</Text>
            <Ionicons name="git-network-outline" size={14} color="#0284c7" />
          </View>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>5</Text>
            <Text style={styles.metricUnit}>Highways</Text>
          </View>
          <Text style={styles.metricCaption}>NH-106, NH-217, NH-51, NH-206</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricTopRow}>
            <Text style={styles.metricLabel}>EST. CLEARANCE</Text>
            <Ionicons name="time-outline" size={14} color="#d97706" />
          </View>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>3.8</Text>
            <Text style={styles.metricUnit}>Hours</Text>
          </View>
          <Text style={styles.metricCaption}>Meghalaya PWD Heavy Machinery</Text>
        </View>
      </View>

      {/* District Vulnerability Index Table */}
      <View style={styles.sectionPanel}>
        <View style={styles.panelHeaderRow}>
          <View>
            <Text style={styles.panelTitle}>DISTRICT PASSABILITY BREAKDOWN</Text>
            <Text style={styles.panelSubtitle}>Khasi & Garo Hills rainfall & clearance status</Text>
          </View>
          {selectedDistrict !== 'All' && (
            <TouchableOpacity onPress={() => setSelectedDistrict('All')}>
              <Text style={styles.resetFilterText}>Show All</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.districtTable}>
          <View style={styles.tableHead}>
            <Text style={[styles.thText, { flex: 2 }]}>DISTRICT</Text>
            <Text style={[styles.thText, { textAlign: 'center' }]}>OPEN</Text>
            <Text style={[styles.thText, { textAlign: 'center' }]}>CAUTION</Text>
            <Text style={[styles.thText, { textAlign: 'center' }]}>BLOCKED</Text>
            <Text style={[styles.thText, { textAlign: 'right' }]}>24H RAIN</Text>
          </View>

          {DISTRICT_DATA.map((dist) => (
            <TouchableOpacity
              key={dist.name}
              style={[
                styles.tableRow,
                selectedDistrict === dist.name && styles.tableRowSelected,
              ]}
              onPress={() => setSelectedDistrict(selectedDistrict === dist.name ? 'All' : dist.name)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 2 }}>
                <Text style={styles.distNameText}>{dist.name}</Text>
                <Text style={styles.distHqText}>HQ: {dist.hq}</Text>
              </View>

              <View style={styles.statCell}>
                <View style={[styles.miniStatusBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                  <Text style={[styles.miniStatusText, { color: '#065f46' }]}>{dist.open}</Text>
                </View>
              </View>

              <View style={styles.statCell}>
                <View style={[styles.miniStatusBadge, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                  <Text style={[styles.miniStatusText, { color: '#92400e' }]}>{dist.risky}</Text>
                </View>
              </View>

              <View style={styles.statCell}>
                <View
                  style={[
                    styles.miniStatusBadge,
                    {
                      backgroundColor: dist.blocked > 0 ? '#fef2f2' : '#f1f5f9',
                      borderColor: dist.blocked > 0 ? '#fecaca' : '#e2e8f0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniStatusText,
                      { color: dist.blocked > 0 ? '#991b1b' : '#64748b' },
                    ]}
                  >
                    {dist.blocked}
                  </Text>
                </View>
              </View>

              <View style={[styles.statCell, { alignItems: 'flex-end' }]}>
                <Text style={[styles.rainText, dist.rainMm > 100 && { color: '#dc2626' }]}>
                  {dist.rainMm} mm
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Active Fleet Convoy Telemetry Snapshot */}
      <View style={styles.sectionPanel}>
        <View style={styles.panelHeaderRow}>
          <View>
            <Text style={styles.panelTitle}>ACTIVE FREIGHT CONVOYS (GARO & KHASI TRUNKS)</Text>
            <Text style={styles.panelSubtitle}>Essential supplies, fuel tankers, and construction materials</Text>
          </View>
          <TouchableOpacity onPress={onNavigateToMap} activeOpacity={0.7}>
            <Text style={styles.viewOnMapText}>View on Map →</Text>
          </TouchableOpacity>
        </View>

        {FLEET_TRUCKS.map((truck) => (
          <View key={truck.id} style={styles.fleetRow}>
            <View style={styles.truckIconCircle}>
              <Ionicons name="car" size={17} color="#0f766e" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.truckNumber}>{truck.truckNumber}</Text>
                <View
                  style={[
                    styles.convoyStatusPill,
                    {
                      backgroundColor:
                        truck.status === 'moving'
                          ? '#ecfdf5'
                          : truck.status === 'delayed'
                          ? '#fffbeb'
                          : '#f1f5f9',
                      borderColor:
                        truck.status === 'moving'
                          ? '#a7f3d0'
                          : truck.status === 'delayed'
                          ? '#fde68a'
                          : '#e2e8f0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.convoyStatusPillText,
                      {
                        color:
                          truck.status === 'moving'
                            ? '#065f46'
                            : truck.status === 'delayed'
                            ? '#92400e'
                            : '#475569',
                      },
                    ]}
                  >
                    {truck.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.cargoText}>
                {truck.cargoType} • {truck.loadTons}T Load
              </Text>
              <Text style={styles.routeLegText}>
                Route: {truck.corridor} → {truck.destination}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.speedText}>{truck.speedKmh} km/h</Text>
              <Text style={styles.etaText}>ETA: {truck.eta}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Field Reports Feed */}
      <View style={styles.feedHeaderRow}>
        <Text style={styles.feedTitle}>
          VERIFIED FIELD INCIDENT STREAM {selectedDistrict !== 'All' ? `(${selectedDistrict})` : ''}
        </Text>
      </View>

      {filteredReports.map((rep) => (
        <ReportCard
          key={rep.id}
          report={rep}
          onConfirm={handleConfirm}
          onSelect={onSelectReport}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  topBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  bannerAgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  agencyBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  agencyBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  metricCardAlert: {
    borderColor: '#fee2e2',
    backgroundColor: '#fffbfb',
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  metricCaption: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 14,
  },
  sectionPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.4,
  },
  panelSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  resetFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  viewOnMapText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  districtTable: {
    marginTop: 2,
  },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  thText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    flex: 1,
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    borderRadius: 8,
  },
  tableRowSelected: {
    backgroundColor: '#f0fdfa',
  },
  distNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  distHqText: {
    fontSize: 10,
    color: '#64748b',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  miniStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  rainText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  fleetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  truckIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  truckNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  convoyStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  convoyStatusPillText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cargoText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  routeLegText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f766e',
  },
  etaText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  feedHeaderRow: {
    paddingHorizontal: 4,
    marginTop: 8,
  },
  feedTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
  },
});
