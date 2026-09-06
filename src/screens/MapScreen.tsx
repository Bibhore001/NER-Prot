import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  OpenStreetMap,
  MapRoadSegment,
  MapHazardMarker,
  FleetTruck,
  FLEET_TRUCKS,
  MEGHALAYA_ROAD_NETWORK,
} from '../components/OpenStreetMap';
import { AIRouteCopilotModal } from '../components/AIRouteCopilotModal';
import { AIRouteSafetyAnalysis } from '../services/aiRouteSafetyModel';
import { syncEngine } from '../database/sync/syncEngine';

export interface MapScreenProps {
  onNavigateToReport?: (corridorCode?: string) => void;
  onNavigateToRoutes?: () => void;
}

export const MapScreen: React.FC<MapScreenProps> = ({
  onNavigateToReport,
  onNavigateToRoutes,
}) => {
  const [regionFilter, setRegionFilter] = useState<'all' | 'khasi' | 'garo'>('all');
  const [showFleet, setShowFleet] = useState<boolean>(true);
  const [selectedTruck, setSelectedTruck] = useState<FleetTruck | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<MapHazardMarker | null>(null);
  const [isBypassModalOpen, setIsBypassModalOpen] = useState<boolean>(false);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState<boolean>(false);
  const [activeAIRouteNotice, setActiveAIRouteNotice] = useState<string | null>(null);

  // Default centered between East Khasi Hills (Shillong) and West Garo Hills (Tura)
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.4800, 91.0500]);
  const [mapZoom, setMapZoom] = useState<number>(9.5);

  const handleRegionSwitch = (region: 'all' | 'khasi' | 'garo') => {
    setRegionFilter(region);
    if (region === 'khasi') {
      setMapCenter([25.4300, 91.7500]);
      setMapZoom(11);
    } else if (region === 'garo') {
      setMapCenter([25.5140, 90.3500]);
      setMapZoom(10.5);
    } else {
      setMapCenter([25.4800, 91.0500]);
      setMapZoom(9.5);
    }
  };

  const handleSelectTruckOnMap = (truck: FleetTruck) => {
    setSelectedTruck(truck);
    setMapCenter([truck.lat, truck.lng]);
    setMapZoom(13);
  };

  const handleApplyAIReroute = (analysis: AIRouteSafetyAnalysis) => {
    setActiveAIRouteNotice(
      `AI Reroute Deployed for ${analysis.truckNumber}: Diverting via ${analysis.recommendedRoute.name} (${analysis.recommendedRoute.safetyScore}/100 Safety Score)`
    );
    // Center map on the safe bypass
    setMapCenter([25.4350, 91.7650]);
    setMapZoom(12.5);
  };

  return (
    <View style={styles.container}>
      {/* 1. Sleek Command Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.stateSeal}>
            <Text style={styles.stateSealText}>ML</Text>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>NIRVANA</Text>
              <View style={styles.livePulsePill}>
                <View style={styles.pulseDot} />
                <Text style={styles.livePulsePillText}>RADAR ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.subTitleText}>Meghalaya Hill Logistics & Safety GIS</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* AI Route Advisor Launch Button */}
          <TouchableOpacity
            style={styles.aiCopilotBtn}
            onPress={() => setIsAICopilotOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={13} color="#ffffff" />
            <Text style={styles.aiCopilotBtnText}>AI Copilot</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fleetToggleBtn, showFleet && styles.fleetToggleBtnActive]}
            onPress={() => setShowFleet(!showFleet)}
            activeOpacity={0.7}
          >
            <Ionicons name="bus" size={13} color={showFleet ? '#0f766e' : '#64748b'} />
            <Text style={[styles.fleetToggleText, showFleet && styles.fleetToggleTextActive]}>
              Fleet ({FLEET_TRUCKS.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active AI Reroute Alert Banner if deployed */}
      {activeAIRouteNotice && (
        <View style={styles.aiNoticeBanner}>
          <View style={styles.aiNoticeIconWrap}>
            <Ionicons name="shield-checkmark" size={14} color="#065f46" />
          </View>
          <Text style={styles.aiNoticeText}>{activeAIRouteNotice}</Text>
          <TouchableOpacity
            style={styles.aiNoticeDismiss}
            onPress={() => setActiveAIRouteNotice(null)}
          >
            <Ionicons name="close" size={14} color="#047857" />
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Sleek Segmented Region Switcher Capsule */}
      <View style={styles.regionFilterWrapper}>
        <View style={styles.regionFilterCapsule}>
          <TouchableOpacity
            style={[styles.regionChip, regionFilter === 'all' && styles.regionChipActive]}
            onPress={() => handleRegionSwitch('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.regionChipText, regionFilter === 'all' && styles.regionChipTextActive]}>
              All Meghalaya
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.regionChip, regionFilter === 'khasi' && styles.regionChipActive]}
            onPress={() => handleRegionSwitch('khasi')}
            activeOpacity={0.8}
          >
            <Text style={[styles.regionChipText, regionFilter === 'khasi' && styles.regionChipTextActive]}>
              Khasi Hills
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.regionChip, regionFilter === 'garo' && styles.regionChipActive]}
            onPress={() => handleRegionSwitch('garo')}
            activeOpacity={0.8}
          >
            <Text style={[styles.regionChipText, regionFilter === 'garo' && styles.regionChipTextActive]}>
              Garo Hills
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. OpenStreetMap Visualizer */}
      <View style={styles.mapContainer}>
        <OpenStreetMap
          center={mapCenter}
          zoom={mapZoom}
          regionFilter={regionFilter}
          showFleet={showFleet}
          selectedTruckId={selectedTruck?.id}
          onSelectTruck={(truck) => handleSelectTruckOnMap(truck)}
          onSelectHazard={(h) => {
            setSelectedHazard(h);
            setIsBypassModalOpen(true);
          }}
          onSelectSegment={(seg) => {
            setMapCenter(seg.coordinates[0]);
          }}
        />

        {/* Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.legendHeader}>PASSABILITY STATUS</Text>
          <View style={styles.legendRow}>
            <View style={[styles.statusLine, { backgroundColor: '#0d9488' }]} />
            <Text style={styles.legendLabel}>Open Route (NH-106 / NH-51)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.statusLine, { backgroundColor: '#ea580c' }]} />
            <Text style={styles.legendLabel}>Fog / Restricted (Gorges)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.statusLine, { backgroundColor: '#dc2626' }]} />
            <Text style={styles.legendLabel}>Impassable (Rockfall / Mudslide)</Text>
          </View>
          {showFleet && (
            <View style={styles.legendRow}>
              <Text style={{ fontSize: 11 }}>🚚</Text>
              <Text style={styles.legendLabel}>Active Convoy Truck</Text>
            </View>
          )}
        </View>

        {/* Map Tools */}
        <View style={styles.mapToolsRail}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => handleRegionSwitch(regionFilter)}
          >
            <Ionicons name="scan-outline" size={18} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => {
              const t2 = FLEET_TRUCKS[1]; // Tanker at Mawkdok
              handleSelectTruckOnMap(t2);
            }}
          >
            <Ionicons name="navigate-outline" size={18} color="#0f766e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Live Bottom Card: Fleet Truck Telemetry with AI Detour Option */}
      {selectedTruck ? (
        <View style={styles.truckDetailCard}>
          <View style={styles.truckDetailHeader}>
            <View style={styles.truckIconBadge}>
              <Ionicons name="car" size={20} color="#0f766e" />
              <View style={styles.onlineBadgeDot} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.truckRegText}>{selectedTruck.truckNumber}</Text>
                <View
                  style={[
                    styles.truckStatusPill,
                    {
                      backgroundColor:
                        selectedTruck.status === 'moving'
                          ? '#ecfdf5'
                          : selectedTruck.status === 'delayed'
                          ? '#fffbeb'
                          : '#f1f5f9',
                      borderColor:
                        selectedTruck.status === 'moving'
                          ? '#a7f3d0'
                          : selectedTruck.status === 'delayed'
                          ? '#fde68a'
                          : '#e2e8f0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.truckStatusPillText,
                      {
                        color:
                          selectedTruck.status === 'moving'
                            ? '#065f46'
                            : selectedTruck.status === 'delayed'
                            ? '#92400e'
                            : '#475569',
                      },
                    ]}
                  >
                    {selectedTruck.status.toUpperCase()} • {selectedTruck.speedKmh} KM/H
                  </Text>
                </View>
              </View>
              <Text style={styles.truckDriverText}>
                {selectedTruck.driverName} • {selectedTruck.operator}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeTruckBtn}
              onPress={() => setSelectedTruck(null)}
            >
              <Ionicons name="close" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.truckTelemetryGrid}>
            <View style={styles.telemetryItem}>
              <View style={styles.telemetryLabelRow}>
                <Ionicons name="cube-outline" size={11} color="#64748b" />
                <Text style={styles.telemetryLabel}>CARGO & LOAD</Text>
              </View>
              <Text style={styles.telemetryVal}>{selectedTruck.cargoType} ({selectedTruck.loadTons}T)</Text>
            </View>
            <View style={styles.telemetryItem}>
              <View style={styles.telemetryLabelRow}>
                <Ionicons name="pin-outline" size={11} color="#64748b" />
                <Text style={styles.telemetryLabel}>DESTINATION</Text>
              </View>
              <Text style={styles.telemetryVal}>{selectedTruck.destination}</Text>
            </View>
            <View style={styles.telemetryItem}>
              <View style={styles.telemetryLabelRow}>
                <Ionicons name="time-outline" size={11} color="#64748b" />
                <Text style={styles.telemetryLabel}>ETA</Text>
              </View>
              <Text style={styles.telemetryVal}>{selectedTruck.eta}</Text>
            </View>
            <View style={styles.telemetryItem}>
              <View style={styles.telemetryLabelRow}>
                <Ionicons name="speedometer-outline" size={11} color="#64748b" />
                <Text style={styles.telemetryLabel}>FUEL TANK</Text>
              </View>
              <Text style={styles.telemetryVal}>{selectedTruck.fuelPct}%</Text>
            </View>
          </View>

          {/* AI Reroute Trigger button for this specific truck */}
          <View style={styles.truckActionRow}>
            <TouchableOpacity
              style={styles.consultAIBtn}
              onPress={() => setIsAICopilotOpen(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={14} color="#ffffff" />
              <Text style={styles.consultAIBtnText}>Run AI Mountain Route Safety Analysis</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.bottomOverviewCard}>
          <View style={styles.overviewTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.overviewBadgeRow}>
                <View style={styles.corridorTagPill}>
                  <Text style={styles.corridorTagPillText}>NH-217 ARTERIAL</Text>
                </View>
                <Text style={styles.overviewDistText}>220 KM KHASI-GARO TRUNK</Text>
              </View>
              <Text style={styles.overviewTitle}>Shillong → Nongstoin → Rongjeng → Tura</Text>
              <Text style={styles.overviewSub}>
                Primary freight corridor with active geological monitoring stations
              </Text>
            </View>
            <TouchableOpacity
              style={styles.aiQuickLaunchPill}
              onPress={() => setIsAICopilotOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={12} color="#0f766e" />
              <Text style={styles.aiQuickLaunchText}>AI Safety Advisor</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.overviewActions}>
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => onNavigateToRoutes?.()}
              activeOpacity={0.8}
            >
              <Ionicons name="layers-outline" size={14} color="#ffffff" />
              <Text style={styles.actionButtonPrimaryText}>Corridors & Fleet Overview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => onNavigateToReport?.('NH-106')}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle-outline" size={14} color="#991b1b" />
              <Text style={styles.actionButtonSecondaryText}>Report Hazard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AI Route Copilot Modal */}
      <AIRouteCopilotModal
        visible={isAICopilotOpen}
        initialTruckId={selectedTruck?.id || 'truck-megh-02'}
        onClose={() => setIsAICopilotOpen(false)}
        onApplyReroute={handleApplyAIReroute}
      />

      {/* Bypass Detour Modal */}
      <Modal
        visible={isBypassModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBypassModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <View style={styles.hazardAlertPill}>
                <Ionicons name="warning" size={14} color="#b91c1c" />
                <Text style={styles.hazardAlertPillText}>
                  {selectedHazard?.title || 'CORRIDOR IMPASSABLE'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsBypassModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHeadline}>
              Mawkdok Bridge Gorge Rockfall (East Khasi Hills)
            </Text>
            <Text style={styles.modalBody}>
              {selectedHazard?.subtitle ||
                'Heavy limestone boulders have collapsed over 40m of road width. Meghalaya PWD Heavy Machinery deployed.'}
            </Text>

            <View style={styles.bypassGuideBox}>
              <Text style={styles.bypassGuideTitle}>RECOMMENDED PWD HILL BYPASS:</Text>
              <Text style={styles.bypassGuideRoute}>
                Shillong → Laitlyngkot Junction → Khatarshnong Valley Link → Sohra Ridge
              </Text>
              <Text style={styles.bypassGuideNote}>
                • Suitable for commercial vehicles up to 16-wheelers (Weight limit: 28 Tonnes).
                • Estimated extra travel time: +38 minutes.
              </Text>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalAIConsultBtn}
                onPress={() => {
                  setIsBypassModalOpen(false);
                  setIsAICopilotOpen(true);
                }}
              >
                <Ionicons name="sparkles" size={14} color="#ffffff" />
                <Text style={styles.modalAIConsultBtnText}>Ask AI Copilot</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsBypassModalOpen(false)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stateSeal: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  stateSealText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.4,
  },
  livePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  livePulsePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.4,
  },
  subTitleText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiCopilotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0f766e',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  aiCopilotBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  fleetToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fleetToggleBtnActive: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  fleetToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  fleetToggleTextActive: {
    color: '#0f766e',
    fontWeight: '700',
  },
  aiNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 1,
    borderBottomColor: '#a7f3d0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  aiNoticeIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#065f46',
    fontWeight: '700',
    lineHeight: 15,
  },
  aiNoticeDismiss: {
    padding: 4,
  },
  regionFilterWrapper: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  regionFilterCapsule: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  regionChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  regionChipActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  regionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  regionChipTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e2e8f0',
  },
  legendCard: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    zIndex: 999,
  },
  legendHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2.5,
  },
  statusLine: {
    width: 14,
    height: 4,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  mapToolsRail: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 6,
    zIndex: 999,
  },
  toolBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  truckDetailCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  truckDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  truckIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    position: 'relative',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  truckRegText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  truckStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  truckStatusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  truckDriverText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  closeTruckBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  truckTelemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  telemetryItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  telemetryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.4,
  },
  telemetryVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
  },
  truckActionRow: {
    marginTop: 12,
  },
  consultAIBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#0f766e',
    paddingVertical: 11,
    borderRadius: 10,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  consultAIBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  bottomOverviewCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  overviewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  corridorTagPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  corridorTagPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  overviewDistText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
  },
  overviewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  overviewSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  aiQuickLaunchPill: {
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
  aiQuickLaunchText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f766e',
  },
  overviewActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButtonPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonSecondaryText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hazardAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hazardAlertPillText: {
    color: '#991b1b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modalHeadline: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  bypassGuideBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  bypassGuideTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369a1',
    marginBottom: 4,
  },
  bypassGuideRoute: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  bypassGuideNote: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalAIConsultBtn: {
    flex: 2,
    backgroundColor: '#0f766e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
  },
  modalAIConsultBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  modalCloseBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
});
