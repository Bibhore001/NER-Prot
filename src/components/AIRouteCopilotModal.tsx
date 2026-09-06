import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AIRouteSafetyModel, AIRouteSafetyAnalysis } from '../services/aiRouteSafetyModel';
import { FLEET_TRUCKS, FleetTruck } from './OpenStreetMap';

interface AIRouteCopilotModalProps {
  visible: boolean;
  initialTruckId?: string;
  onClose: () => void;
  onApplyReroute?: (analysis: AIRouteSafetyAnalysis) => void;
}

export const AIRouteCopilotModal: React.FC<AIRouteCopilotModalProps> = ({
  visible,
  initialTruckId = 'truck-megh-02', // Default to Tanker delayed at Mawkdok
  onClose,
  onApplyReroute,
}) => {
  const [selectedTruckId, setSelectedTruckId] = useState<string>(initialTruckId);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AIRouteSafetyAnalysis>(
    AIRouteSafetyModel.evaluateRouteSafety(initialTruckId)
  );

  const handleSelectTruck = (id: string) => {
    setSelectedTruckId(id);
    setEvaluating(true);
    setTimeout(() => {
      const result = AIRouteSafetyModel.evaluateRouteSafety(id);
      setAnalysis(result);
      setEvaluating(false);
    }, 450); // Fast on-device inference simulation
  };

  const handleDeployRoute = () => {
    onApplyReroute?.(analysis);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.aiBadgeIcon}>
                <Ionicons name="sparkles" size={16} color="#ffffff" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.mainTitle}>NIRVANA CONVOY SAFETY AI</Text>
                  <View style={styles.onDevicePill}>
                    <Text style={styles.onDevicePillText}>ON-DEVICE INFERENCE</Text>
                  </View>
                </View>
                <Text style={styles.subTitle}>Real-time Hill Hazard Avoidance & Dynamic Rerouting</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Vehicle Selector Scroll */}
          <View style={styles.selectorSection}>
            <Text style={styles.selectorLabel}>SELECT FLEET VEHICLE TO EVALUATE:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.truckScroll}>
              {FLEET_TRUCKS.map((truck) => {
                const isSelected = selectedTruckId === truck.id;
                return (
                  <TouchableOpacity
                    key={truck.id}
                    style={[styles.truckCard, isSelected && styles.truckCardActive]}
                    onPress={() => handleSelectTruck(truck.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.truckCardTop}>
                      <Text style={[styles.truckNum, isSelected && styles.truckNumActive]}>
                        {truck.truckNumber}
                      </Text>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              truck.status === 'delayed'
                                ? '#dc2626'
                                : truck.status === 'moving'
                                ? '#16a34a'
                                : '#f59e0b',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.truckCargoText}>{truck.cargoType} ({truck.loadTons}T)</Text>
                    <Text style={styles.truckRouteText} numberOfLines={1}>
                      {truck.corridor}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {evaluating ? (
            <View style={styles.evaluatingBox}>
              <ActivityIndicator size="large" color="#0f766e" />
              <Text style={styles.evaluatingText}>
                Evaluating Geological Slope Stability, Rain Indices & Axle Weight Clearance...
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.analysisContent} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Primary Risk Alert Banner */}
              <View
                style={[
                  styles.alertBox,
                  analysis.avoidedRoute.riskLevel === 'CRITICAL_HAZARD'
                    ? styles.alertBoxCritical
                    : styles.alertBoxCaution,
                ]}
              >
                <Ionicons
                  name={analysis.avoidedRoute.riskLevel === 'CRITICAL_HAZARD' ? 'alert-circle' : 'warning'}
                  size={20}
                  color={analysis.avoidedRoute.riskLevel === 'CRITICAL_HAZARD' ? '#991b1b' : '#92400e'}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.alertTitle,
                      {
                        color:
                          analysis.avoidedRoute.riskLevel === 'CRITICAL_HAZARD'
                            ? '#991b1b'
                            : '#92400e',
                      },
                    ]}
                  >
                    {analysis.primaryRiskAlert}
                  </Text>
                  <Text style={styles.alertRationale}>{analysis.decisionRationale}</Text>
                </View>
              </View>

              {/* Safety Score Meter Comparison */}
              <View style={styles.scoreComparisonRow}>
                {/* Hazardous Avoided Path */}
                <View style={[styles.scoreCard, styles.scoreCardHazard]}>
                  <View style={styles.scoreCardHead}>
                    <Text style={[styles.scoreCardLabel, { color: '#991b1b' }]}>AVOIDED DIRECT ROUTE</Text>
                    <Text style={styles.scoreValueHazard}>{analysis.avoidedRoute.safetyScore}/100</Text>
                  </View>
                  <Text style={styles.scoreRouteName}>{analysis.avoidedRoute.name}</Text>
                  <Text style={styles.scoreDetails}>
                    {analysis.avoidedRoute.distanceKm} km • {analysis.avoidedRoute.estimatedMinutes} min
                  </Text>
                  <View style={styles.hazardTagList}>
                    {analysis.avoidedRoute.activeHazards.map((hz, idx) => (
                      <Text key={idx} style={styles.hazardTagItem}>
                        ⚠ {hz}
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.roadCondText}>{analysis.avoidedRoute.roadCondition}</Text>
                </View>

                {/* AI Recommended Safe Path */}
                <View style={[styles.scoreCard, styles.scoreCardSafe]}>
                  <View style={styles.scoreCardHead}>
                    <View style={styles.aiPickTag}>
                      <Ionicons name="checkmark-circle" size={12} color="#065f46" />
                      <Text style={styles.aiPickTagText}>AI RECOMMENDED BYPASS</Text>
                    </View>
                    <Text style={styles.scoreValueSafe}>{analysis.recommendedRoute.safetyScore}/100</Text>
                  </View>
                  <Text style={styles.scoreRouteName}>{analysis.recommendedRoute.name}</Text>
                  <Text style={styles.scoreDetails}>
                    {analysis.recommendedRoute.distanceKm} km • {analysis.recommendedRoute.estimatedMinutes} min
                  </Text>
                  <View style={styles.detourMetricsRow}>
                    <View style={styles.detourMetric}>
                      <Text style={styles.detourMetricVal}>+{analysis.detourTimeMinutes}m</Text>
                      <Text style={styles.detourMetricLbl}>Detour Time</Text>
                    </View>
                    <View style={styles.detourMetric}>
                      <Text style={styles.detourMetricVal}>+{analysis.fuelImpactLiters}L</Text>
                      <Text style={styles.detourMetricLbl}>Extra Diesel</Text>
                    </View>
                    <View style={styles.detourMetric}>
                      <Text style={styles.detourMetricVal}>{analysis.recommendedRoute.maxWeightTons}T</Text>
                      <Text style={styles.detourMetricLbl}>Bridge Limit</Text>
                    </View>
                  </View>
                  <Text style={[styles.roadCondText, { color: '#065f46' }]}>
                    {analysis.recommendedRoute.roadCondition}
                  </Text>
                </View>
              </View>

              {/* Waypoint Path Sequence */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>RECOMMENDED MOUNTAIN WAYPOINTS SEQUENCE</Text>
                <View style={styles.waypointsChain}>
                  {analysis.recommendedRoute.waypoints.map((wp, i) => (
                    <View key={i} style={styles.wpNode}>
                      <View style={styles.wpDot} />
                      <Text style={styles.wpText}>{wp}</Text>
                      {i < analysis.recommendedRoute.waypoints.length - 1 && (
                        <Text style={styles.wpArrow}>→</Text>
                      )}
                    </View>
                  ))}
                </View>
                <Text style={styles.gradientNote}>
                  Profile: {analysis.recommendedRoute.elevationProfile}
                </Text>
              </View>

              {/* Driver Safety Advisories & Checklist */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>HILL DESCENT CONVOY CHECKLIST</Text>
                {analysis.hillDescentChecklist.map((item, idx) => (
                  <View key={idx} style={styles.checkItem}>
                    <Ionicons name="checkbox" size={14} color="#0f766e" />
                    <Text style={styles.checkText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.clearanceBox}>
                <Ionicons name="time-outline" size={16} color="#64748b" />
                <Text style={styles.clearanceText}>{analysis.pwdClearanceEta}</Text>
              </View>

              {/* Deploy / Action Button */}
              <TouchableOpacity
                style={styles.deployRouteButton}
                onPress={handleDeployRoute}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate-circle" size={18} color="#ffffff" />
                <Text style={styles.deployRouteButtonText}>
                  Deploy AI Route to Truck {analysis.truckNumber} ({analysis.recommendedRoute.highwayCode})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    paddingTop: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mainTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  onDevicePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  onDevicePillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#475569',
  },
  subTitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '500',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  selectorSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectorLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  truckScroll: {
    flexDirection: 'row',
  },
  truckCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginRight: 8,
    width: 175,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  truckCardActive: {
    borderColor: '#0f766e',
    backgroundColor: '#f0fdfa',
    shadowColor: '#0f766e',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  truckCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  truckNum: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  truckNumActive: {
    color: '#0f766e',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  truckCargoText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
    marginTop: 2,
  },
  truckRouteText: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },
  evaluatingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evaluatingText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  analysisContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },
  alertBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  alertBoxCritical: {
    backgroundColor: '#fff5f5',
    borderColor: '#fee2e2',
  },
  alertBoxCaution: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 2,
  },
  alertRationale: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 17,
  },
  scoreComparisonRow: {
    gap: 10,
    marginBottom: 14,
  },
  scoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  scoreCardHazard: {
    borderColor: '#fee2e2',
    backgroundColor: '#fffbfb',
  },
  scoreCardSafe: {
    borderColor: '#ccfbf1',
    backgroundColor: '#f0fdfa',
  },
  scoreCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiPickTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiPickTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  scoreValueHazard: {
    fontSize: 18,
    fontWeight: '900',
    color: '#991b1b',
  },
  scoreValueSafe: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065f46',
  },
  scoreRouteName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  scoreDetails: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  hazardTagList: {
    marginVertical: 6,
    gap: 3,
  },
  hazardTagItem: {
    fontSize: 10,
    fontWeight: '600',
    color: '#991b1b',
  },
  roadCondText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 4,
  },
  detourMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#a7f3d0',
  },
  detourMetric: {
    flex: 1,
  },
  detourMetricVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#065f46',
  },
  detourMetricLbl: {
    fontSize: 9,
    color: '#047857',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  waypointsChain: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  wpNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wpDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0f766e',
  },
  wpText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  wpArrow: {
    fontSize: 11,
    color: '#94a3b8',
    marginHorizontal: 2,
  },
  gradientNote: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 3.5,
  },
  checkText: {
    fontSize: 11,
    color: '#334155',
  },
  clearanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 14,
  },
  clearanceText: {
    fontSize: 11,
    color: '#64748b',
  },
  deployRouteButton: {
    backgroundColor: '#0f766e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  deployRouteButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
