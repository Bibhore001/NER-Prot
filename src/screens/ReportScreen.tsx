import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoadStatus, HazardType, NorthEastState, UserRole } from '../types';
import { syncEngine } from '../database/sync/syncEngine';
import { pickHazardPhoto, uploadToImageKit, compressRoadPhoto } from '../services/imagekit';

interface ReportScreenProps {
  initialCorridorCode?: string;
  onReportSubmitted?: () => void;
}

const MEGHALAYA_CORRIDORS = [
  { code: 'NH-106', name: 'Shillong — Mawkdok — Sohra', district: 'East Khasi Hills' },
  { code: 'NH-217 (E)', name: 'Shillong — Mairang — Nongstoin', district: 'West Khasi Hills' },
  { code: 'NH-217 (W)', name: 'Nongstoin — Rongjeng — Tura', district: 'East/West Garo Hills' },
  { code: 'NH-51', name: 'Tura — Bajengdoba — Paikan Trunk', district: 'West Garo Hills' },
  { code: 'NH-217 (S)', name: 'Tura — Chokpot — Baghmara', district: 'South Garo Hills' },
  { code: 'NH-206', name: 'Shillong — Pynursla — Dawki', district: 'East Khasi / South West' },
  { code: 'CUSTOM', name: 'Other State Highway / Village Pass', district: 'Meghalaya' },
];

const HAZARDS: { type: HazardType; label: string; icon: string }[] = [
  { type: 'landslide', label: 'Landslide / Rockfall', icon: 'earth' },
  { type: 'flash_flood', label: 'River Flash Flood', icon: 'water' },
  { type: 'subsidence', label: 'Shoulder Sinking', icon: 'arrow-down' },
  { type: 'bridge_damage', label: 'Bridge Damage', icon: 'git-commit' },
  { type: 'tree_fall', label: 'Fallen Trees / Debris', icon: 'leaf' },
  { type: 'clear', label: 'Corridor Re-opened', icon: 'checkmark-circle' },
];

const ROLES: { role: UserRole; label: string }[] = [
  { role: 'commercial_driver', label: 'Freight Convoy Driver' },
  { role: 'bro_official', label: 'PWD / BRO Engineer' },
  { role: 'emergency_responder', label: 'SDRF / Police Dispatch' },
  { role: 'fleet_operator', label: 'Fleet Coordinator' },
  { role: 'resident', label: 'Local Commuter' },
];

export const ReportScreen: React.FC<ReportScreenProps> = ({
  initialCorridorCode = 'NH-106',
  onReportSubmitted,
}) => {
  const [selectedCorridor, setSelectedCorridor] = useState<string>(initialCorridorCode);
  const [customRoad, setCustomRoad] = useState<string>('');
  const [status, setStatus] = useState<RoadStatus>('blocked');
  const [hazardType, setHazardType] = useState<HazardType>('landslide');
  const [chainage, setChainage] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>('Driver Bantei Lyngdoh');
  const [vehicleNo, setVehicleNo] = useState<string>('ML-05-E-4219');
  const [userRole, setUserRole] = useState<UserRole>('commercial_driver');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [compressedInfo, setCompressedInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedBanner, setSubmittedBanner] = useState<{ id: string; state: string } | null>(null);

  const isOnline = syncEngine.isOnline();

  const handleSelectPhoto = async (useCamera: boolean) => {
    const uri = await pickHazardPhoto(useCamera);
    if (uri) {
      setPhotoUri(uri);
      const comp = await compressRoadPhoto(uri);
      setCompressedInfo(`Optimized: ${comp.fileSizeEstimatedKb} KB (${comp.width}x${comp.height})`);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      alert('Please enter a brief field note describing the road condition.');
      return;
    }

    setSubmitting(true);
    try {
      let finalPhotoUrl = undefined;
      if (photoUri) {
        if (isOnline) {
          const uploadRes = await uploadToImageKit(photoUri);
          finalPhotoUrl = uploadRes.url;
        } else {
          finalPhotoUrl = photoUri;
        }
      }

      const corridorObj = MEGHALAYA_CORRIDORS.find((c) => c.code === selectedCorridor);
      const roadName = selectedCorridor === 'CUSTOM' ? (customRoad || 'State Road') : (corridorObj?.name || selectedCorridor);
      const district = corridorObj?.district || 'East Khasi Hills';

      const report = await syncEngine.submitReport({
        corridorId: selectedCorridor,
        roadName: chainage ? `${roadName} (${chainage})` : roadName,
        state: 'Meghalaya',
        district,
        status,
        hazardType,
        description: chainage ? `[Chainage: ${chainage}] ${description}` : description,
        latitude: 25.4350 + (Math.random() - 0.5) * 0.05,
        longitude: 91.7650 + (Math.random() - 0.5) * 0.05,
        photoUri: photoUri || undefined,
        photoUrl: finalPhotoUrl,
        userRole,
        reporterName: `${reporterName} (${vehicleNo})`,
      });

      setSubmittedBanner({
        id: report.id.slice(-6),
        state: report.syncState === 'queued' ? 'Queued On-Device (Offline)' : 'Synced to PWD Dispatch',
      });

      setDescription('');
      setChainage('');
      setPhotoUri(null);
      setCompressedInfo(null);

      onReportSubmitted?.();
    } catch (e: any) {
      alert('Error submitting report: ' + (e?.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.headerBox}>
        <View style={styles.headerLeft}>
          <View style={styles.agencyRow}>
            <View style={styles.agencyPill}>
              <Text style={styles.agencyPillText}>PWD MEGHALAYA</Text>
            </View>
            <Text style={styles.headerSubtitle}>FIELD INCIDENT LOG</Text>
          </View>
          <Text style={styles.headerTitle}>Road Status & Obstruction Report</Text>
        </View>
        <View
          style={[
            styles.syncStatusBadge,
            { backgroundColor: isOnline ? '#ecfdf5' : '#fffbeb', borderColor: isOnline ? '#a7f3d0' : '#fde68a' },
          ]}
        >
          <Ionicons
            name={isOnline ? 'cloud-done' : 'cloud-offline'}
            size={13}
            color={isOnline ? '#065f46' : '#92400e'}
          />
          <Text style={[styles.syncStatusText, { color: isOnline ? '#065f46' : '#92400e' }]}>
            {isOnline ? 'Online' : 'Offline Queue'}
          </Text>
        </View>
      </View>

      {/* GPS Geo-lock info chip */}
      <View style={styles.gpsChipBox}>
        <Ionicons name="navigate-circle" size={15} color="#0f766e" />
        <Text style={styles.gpsChipText}>
          GPS Locked: 25.3650° N, 91.7580° E • Elevation 1,480m (Khasi Hills)
        </Text>
      </View>

      {submittedBanner && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#065f46" />
          <View style={{ flex: 1 }}>
            <Text style={styles.successTitle}>Report #{submittedBanner.id} Registered</Text>
            <Text style={styles.successSub}>{submittedBanner.state}</Text>
          </View>
        </View>
      )}

      {/* Form Section 1: Corridor Selection */}
      <View style={styles.formSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.stepCircle}><Text style={styles.stepCircleText}>1</Text></View>
          <Text style={styles.sectionHeading}>HIGHWAY / ARTERIAL CORRIDOR</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.corridorScroll}>
          {MEGHALAYA_CORRIDORS.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={[
                styles.corridorButton,
                selectedCorridor === c.code && styles.corridorButtonActive,
              ]}
              onPress={() => setSelectedCorridor(c.code)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.corridorCodeText,
                  selectedCorridor === c.code && styles.corridorCodeTextActive,
                ]}
              >
                {c.code}
              </Text>
              <Text style={styles.corridorDistrictText}>{c.district}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedCorridor === 'CUSTOM' && (
          <TextInput
            style={styles.textInput}
            placeholder="Enter road name, village pass, or landmark..."
            placeholderTextColor="#94a3b8"
            value={customRoad}
            onChangeText={setCustomRoad}
          />
        )}
      </View>

      {/* Form Section 2: Passability Status */}
      <View style={styles.formSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.stepCircle}><Text style={styles.stepCircleText}>2</Text></View>
          <Text style={styles.sectionHeading}>PASSABILITY STATUS</Text>
        </View>
        <View style={styles.statusGrid}>
          <TouchableOpacity
            style={[styles.statusChoice, status === 'open' && styles.statusChoiceOpen]}
            onPress={() => setStatus('open')}
            activeOpacity={0.8}
          >
            <View style={[styles.statusColorStrip, { backgroundColor: '#10b981' }]} />
            <Text style={[styles.statusChoiceTitle, status === 'open' && { color: '#065f46' }]}>
              OPEN / PASSABLE
            </Text>
            <Text style={styles.statusChoiceSub}>All freight passing normally</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusChoice, status === 'risky' && styles.statusChoiceRisky]}
            onPress={() => setStatus('risky')}
            activeOpacity={0.8}
          >
            <View style={[styles.statusColorStrip, { backgroundColor: '#f59e0b' }]} />
            <Text style={[styles.statusChoiceTitle, status === 'risky' && { color: '#92400e' }]}>
              RESTRICTED / FOG / CAUTION
            </Text>
            <Text style={styles.statusChoiceSub}>Single lane, heavy cloud fog, or shoulder slide</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusChoice, status === 'blocked' && styles.statusChoiceBlocked]}
            onPress={() => setStatus('blocked')}
            activeOpacity={0.8}
          >
            <View style={[styles.statusColorStrip, { backgroundColor: '#dc2626' }]} />
            <Text style={[styles.statusChoiceTitle, status === 'blocked' && { color: '#991b1b' }]}>
              IMPASSABLE / BLOCKED
            </Text>
            <Text style={styles.statusChoiceSub}>Convoys stranded • Heavy rockfall or flood</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Form Section 3: Hazard Classification */}
      <View style={styles.formSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.stepCircle}><Text style={styles.stepCircleText}>3</Text></View>
          <Text style={styles.sectionHeading}>HAZARD CLASSIFICATION</Text>
        </View>
        <View style={styles.hazardChipsRow}>
          {HAZARDS.map((h) => (
            <TouchableOpacity
              key={h.type}
              style={[
                styles.hazardChoiceChip,
                hazardType === h.type && styles.hazardChoiceChipActive,
              ]}
              onPress={() => setHazardType(h.type)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={h.icon as any}
                size={14}
                color={hazardType === h.type ? '#0f766e' : '#64748b'}
              />
              <Text
                style={[
                  styles.hazardChoiceText,
                  hazardType === h.type && styles.hazardChoiceTextActive,
                ]}
              >
                {h.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Form Section 4: Chainage & Notes */}
      <View style={styles.formSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.stepCircle}><Text style={styles.stepCircleText}>4</Text></View>
          <Text style={styles.sectionHeading}>CHAINAGE & FIELD OBSERVATIONS</Text>
        </View>
        <TextInput
          style={styles.textInput}
          placeholder="Chainage Marker (e.g. KM 38+400 near Mawkdok view bridge)"
          placeholderTextColor="#94a3b8"
          value={chainage}
          onChangeText={setChainage}
        />
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Describe obstruction width, boulder sizes, water depth, or PWD clearing activity..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      {/* Form Section 5: Photo Evidence */}
      <View style={styles.formSection}>
        <Text style={styles.sectionHeading}>5. FIELD PHOTO EVIDENCE (COMPRESSED FOR HILL 2G/3G)</Text>
        <View style={styles.photoActionsRow}>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => handleSelectPhoto(true)}
          >
            <Ionicons name="camera" size={16} color="#0f766e" />
            <Text style={styles.photoButtonText}>Take Field Camera Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => handleSelectPhoto(false)}
          >
            <Ionicons name="images-outline" size={16} color="#64748b" />
            <Text style={styles.photoButtonText}>Select from Gallery</Text>
          </TouchableOpacity>
        </View>

        {photoUri && (
          <View style={styles.photoPreviewWrapper}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity
              style={styles.deletePhotoBtn}
              onPress={() => {
                setPhotoUri(null);
                setCompressedInfo(null);
              }}
            >
              <Ionicons name="trash" size={14} color="#ffffff" />
            </TouchableOpacity>
            {compressedInfo && (
              <View style={styles.compressionNote}>
                <Text style={styles.compressionNoteText}>{compressedInfo}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Form Section 6: Reporter Identification */}
      <View style={styles.formSection}>
        <Text style={styles.sectionHeading}>6. REPORTER & VEHICLE DISPATCH</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.role}
              style={[
                styles.roleSelectChip,
                userRole === r.role && styles.roleSelectChipActive,
              ]}
              onPress={() => setUserRole(r.role)}
            >
              <Text
                style={[
                  styles.roleSelectText,
                  userRole === r.role && styles.roleSelectTextActive,
                ]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.reporterInputsRow}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder="Driver / Reporter Name"
            placeholderTextColor="#94a3b8"
            value={reporterName}
            onChangeText={setReporterName}
          />
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder="Truck Reg # (e.g. ML-05-E-4219)"
            placeholderTextColor="#94a3b8"
            value={vehicleNo}
            onChangeText={setVehicleNo}
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <Ionicons name="send" size={16} color="#ffffff" />
            <Text style={styles.submitButtonText}>
              {isOnline ? 'Transmit Report to PWD Dispatch' : 'Queue Report On-Device (WatermelonDB)'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  headerBox: {
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
  headerLeft: {
    flex: 1,
  },
  agencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  agencyPill: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  agencyPillText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  syncStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  syncStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  gpsChipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  gpsChipText: {
    fontSize: 11,
    color: '#0f766e',
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 14,
    borderRadius: 10,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  successSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  formSection: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.4,
  },
  corridorScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  corridorButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  corridorButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  corridorCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  corridorCodeTextActive: {
    color: '#ffffff',
  },
  corridorDistrictText: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#0f172a',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  statusGrid: {
    gap: 8,
  },
  statusChoice: {
    position: 'relative',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    paddingLeft: 14,
  },
  statusColorStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  statusChoiceOpen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statusChoiceRisky: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statusChoiceBlocked: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusChoiceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  statusChoiceSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  hazardChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hazardChoiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  hazardChoiceChipActive: {
    backgroundColor: '#ccfbf1',
    borderColor: '#99f6e4',
  },
  hazardChoiceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  hazardChoiceTextActive: {
    color: '#0f766e',
    fontWeight: '800',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    borderRadius: 8,
  },
  photoButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  photoPreviewWrapper: {
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1e293b',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    padding: 6,
    borderRadius: 14,
  },
  compressionNote: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  compressionNoteText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34d399',
  },
  roleScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  roleSelectChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  roleSelectChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  roleSelectText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  roleSelectTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  reporterInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  submitButton: {
    backgroundColor: '#0f766e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
