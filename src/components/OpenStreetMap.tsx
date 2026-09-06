import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import { RoadStatus, HazardType } from '../types';

export interface MapRoadSegment {
  id: string;
  name: string;
  code: string;
  region: 'Khasi Hills' | 'Garo Hills' | 'Inter-District Connector';
  status: RoadStatus;
  hazardType?: HazardType;
  coordinates: [number, number][]; // [lat, lng] pairs
  notes?: string;
  lengthKm: number;
}

export interface FleetTruck {
  id: string;
  truckNumber: string;
  operator: string;
  driverName: string;
  vehicleModel: string;
  cargoType: string;
  loadTons: number;
  speedKmh: number;
  headingDeg: number;
  lat: number;
  lng: number;
  corridor: string;
  destination: string;
  status: 'moving' | 'delayed' | 'stopped';
  delayReason?: string;
  eta: string;
  fuelPct: number;
}

export interface MapHazardMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  timeAgo: string;
  detourText?: string;
  status: RoadStatus;
  type: 'landslide' | 'fog' | 'flood' | 'rockfall';
  district: string;
}

interface OpenStreetMapProps {
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  regionFilter?: 'all' | 'khasi' | 'garo';
  showFleet?: boolean;
  selectedTruckId?: string | null;
  onSelectTruck?: (truck: FleetTruck) => void;
  onSelectHazard?: (hazard: MapHazardMarker) => void;
  onSelectSegment?: (segment: MapRoadSegment) => void;
  style?: any;
}

// Comprehensive real road network across Khasi and Garo Hills of Meghalaya
export const MEGHALAYA_ROAD_NETWORK: MapRoadSegment[] = [
  // 1. East Khasi Hills: Shillong to Cherrapunji / Sohra (NH-106)
  {
    id: 'khasi-nh106-open',
    code: 'NH-106',
    name: 'Shillong — Mylliem — Laitlyngkot Bypass',
    region: 'Khasi Hills',
    status: 'open',
    lengthKm: 34,
    coordinates: [
      [25.5788, 91.8933], // Shillong
      [25.5350, 91.8480], // Upper Shillong
      [25.4950, 91.8150], // Mylliem
      [25.4550, 91.7820], // Mawphlang junction approach
      [25.4350, 91.7650], // Laitlyngkot
      [25.3900, 91.7450], // Mawkdok gorge north
      [25.3200, 91.7300], // Sohrarim
      [25.2750, 91.7200], // Cherrapunji (Sohra)
    ],
    notes: 'NH-106 2-lane bitumen surfaced. Clear for standard heavy freight up to 28T.',
  },
  {
    id: 'khasi-mawkdok-risky',
    code: 'SH-5',
    name: 'Mawkdok Dympep Gorge Descent',
    region: 'Khasi Hills',
    status: 'risky',
    hazardType: 'fog',
    lengthKm: 16,
    coordinates: [
      [25.4350, 91.7650], // Laitlyngkot
      [25.4050, 91.7480], // Mawkdok viewpoint
      [25.3780, 91.7320], // Gorge bend
      [25.3500, 91.7250], // River crossover
    ],
    notes: 'Dense valley fog & rain seepage. Hairpin turns. Speed restricted to 25 km/h.',
  },
  {
    id: 'khasi-mawkdok-blocked',
    code: 'NH-106-CUT',
    name: 'Mawkdok Valley Rockfall Point',
    region: 'Khasi Hills',
    status: 'blocked',
    hazardType: 'landslide',
    lengthKm: 4,
    coordinates: [
      [25.3780, 91.7320],
      [25.3720, 91.7420],
      [25.3650, 91.7580],
      [25.3620, 91.7700],
    ],
    notes: 'Boulders fallen across both lanes. PWD Bulldozers clearing debris. Estimated clearance: 3 hrs.',
  },

  // 2. Inter-District Spine: Shillong -> Nongstoin -> Rongjeng -> Williamnagar -> Tura (NH-217 / NH-127B)
  {
    id: 'spine-shillong-nongstoin',
    code: 'NH-217 (East)',
    name: 'Shillong — Mairang — Nongstoin Highway',
    region: 'Inter-District Connector',
    status: 'open',
    lengthKm: 92,
    coordinates: [
      [25.5788, 91.8933], // Shillong
      [25.5647, 91.6367], // Mairang (West Khasi Hills)
      [25.5320, 91.4500], // Markasa
      [25.5186, 91.2678], // Nongstoin
    ],
    notes: 'Primary asphalt corridor connecting Khasi Hills westward. Fully open.',
  },
  {
    id: 'spine-nongstoin-rongjeng-tura',
    code: 'NH-217 (West)',
    name: 'Nongstoin — Shallang — Rongjeng — Tura Lifeline',
    region: 'Inter-District Connector',
    status: 'risky',
    hazardType: 'subsidence',
    lengthKm: 128,
    coordinates: [
      [25.5186, 91.2678], // Nongstoin
      [25.5800, 91.0300], // Shallang coal belt
      [25.6200, 90.8500], // Dainadubi turn
      [25.5700, 90.7200], // Rongjeng (East Garo Hills)
      [25.4950, 90.6180], // Williamnagar
      [25.5140, 90.3500], // Asanang
      [25.5140, 90.2030], // Tura (West Garo Hills)
    ],
    notes: 'Soft shoulder subsidence near Rongjeng. Heavy loaded trucks taking single-file passage.',
  },

  // 3. West Garo Hills Spine: Tura — Paikan (NH-51 / NH-217 North Connector)
  {
    id: 'garo-nh51-tura-paikan',
    code: 'NH-51',
    name: 'Tura — Bajengdoba — Paikan Inter-State Freight Corridor',
    region: 'Garo Hills',
    status: 'open',
    lengthKm: 86,
    coordinates: [
      [25.5140, 90.2030], // Tura
      [25.6800, 90.2900], // Garobadha junction
      [25.8500, 90.4100], // Bajengdoba (North Garo Hills)
      [25.9600, 90.5200], // Paikan (Assam-Meghalaya Border)
    ],
    notes: 'Strategic freight trunk route into Assam plains. Excellent surface condition.',
  },

  // 4. South Garo Hills Border Route: Tura — Chokpot — Baghmara (NH-217 South)
  {
    id: 'garo-south-baghmara',
    code: 'NH-217-S',
    name: 'Tura — Chokpot — Baghmara Hill Pass',
    region: 'Garo Hills',
    status: 'blocked',
    hazardType: 'mudslide',
    lengthKm: 64,
    coordinates: [
      [25.5140, 90.2030], // Tura
      [25.3200, 90.3800], // Chokpot
      [25.2400, 90.5200], // Karukol
      [25.1950, 90.6400], // Baghmara (South Garo Hills)
    ],
    notes: 'Simsang river flash-overflow and mudslide near Karukol. Bailey bridge inspection ongoing.',
  },

  // 5. South West Khasi / Border Trade: Shillong — Pynursla — Dawki — Tamabil
  {
    id: 'khasi-dawki-border',
    code: 'NH-206',
    name: 'Shillong — Pynursla — Dawki International Corridor',
    region: 'Khasi Hills',
    status: 'open',
    lengthKm: 82,
    coordinates: [
      [25.5788, 91.8933], // Shillong
      [25.4200, 91.9300], // Mawryngkneng junction
      [25.3100, 91.9050], // Pynursla
      [25.2100, 91.9500], // Wah Umngot canyon
      [25.1950, 92.0200], // Dawki / Tamabil Port
    ],
    notes: 'Active cross-border cargo transit route. Umngot suspension bridge operating normally.',
  },
];

// Real Fleet Tracking Trucks Operating Along the Corridors
export const FLEET_TRUCKS: FleetTruck[] = [
  {
    id: 'truck-megh-01',
    truckNumber: 'ML-05-E-4219',
    operator: 'Meghalaya Hill Haulers',
    driverName: 'Bantei Lyngdoh',
    vehicleModel: 'Tata Signa 2823.K (10-Wheeler)',
    cargoType: 'Cement & TMT Steel (Essential Supply)',
    loadTons: 22.4,
    speedKmh: 34,
    headingDeg: 285,
    lat: 25.5520,
    lng: 90.9200, // Near Shallang on NH-217
    corridor: 'NH-217 West (Nongstoin-Rongjeng-Tura)',
    destination: 'Tura PWD Depot, West Garo Hills',
    status: 'moving',
    eta: 'Today, 17:30',
    fuelPct: 74,
  },
  {
    id: 'truck-megh-02',
    truckNumber: 'AS-01-GC-8842',
    operator: 'Barak-Brahmaputra Petroleum Convoy',
    driverName: 'Bikram Gogoi',
    vehicleModel: 'BharatBenz 2828C Heavy Tanker',
    cargoType: 'High Speed Diesel (HSD Fuel)',
    loadTons: 24.0,
    speedKmh: 0,
    headingDeg: 190,
    lat: 25.4350,
    lng: 91.7650, // Stopped at Laitlyngkot
    corridor: 'NH-106 Shillong-Sohra Corridor',
    destination: 'Sohra Civil Sub-Division Fuel Pump',
    status: 'delayed',
    delayReason: 'Mawkdok Rockfall Detour (+38m via Laitlyngkot bypass)',
    eta: 'Today, 15:45 (Delayed)',
    fuelPct: 88,
  },
  {
    id: 'truck-megh-03',
    truckNumber: 'ML-08-B-3104',
    operator: 'Garo Hills Emergency Relief Dispatch',
    driverName: 'Sengrak Sangma',
    vehicleModel: 'Mahindra Blazo X 28 Heavy Hauler',
    cargoType: 'Emergency SDRF Food & Water Rations',
    loadTons: 14.5,
    speedKmh: 42,
    headingDeg: 35,
    lat: 25.7200,
    lng: 90.3200, // Near Bajengdoba on NH-51
    corridor: 'NH-51 Tura-Paikan Inter-State Trunk',
    destination: 'Williamnagar Food Civil Supplies Warehouse',
    status: 'moving',
    eta: 'Today, 14:15',
    fuelPct: 62,
  },
  {
    id: 'truck-megh-04',
    truckNumber: 'ML-04-A-1980',
    operator: 'Jaintia-Khasi Limestone Freight',
    driverName: 'Ksanbor Khongwir',
    vehicleModel: 'Eicher Pro 6028TM',
    cargoType: 'Clean Aggregate Stone for Bridge Repair',
    loadTons: 18.0,
    speedKmh: 28,
    headingDeg: 170,
    lat: 25.3200,
    lng: 91.9100, // Near Pynursla on NH-206
    corridor: 'NH-206 Shillong-Pynursla-Dawki',
    destination: 'Dawki Border Freight Staging Yard',
    status: 'moving',
    eta: 'Today, 16:00',
    fuelPct: 81,
  },
];

export const MEGHALAYA_HAZARD_MARKERS: MapHazardMarker[] = [
  {
    id: 'hazard-mawkdok-rockfall',
    lat: 25.3650,
    lng: 91.7580,
    title: 'ACTIVE ROCKFALL BLOCKAGE',
    subtitle: 'Mawkdok bridge gorge blocked by 40-tonne limestone boulder fall. PWD clearance underway.',
    timeAgo: '1h 45m ago',
    detourText: 'Bypass via Laitlyngkot (+38m) →',
    status: 'blocked',
    type: 'landslide',
    district: 'East Khasi Hills',
  },
  {
    id: 'hazard-mawkdok-fog',
    lat: 25.4050,
    lng: 91.7480,
    title: 'DENSE FOG & SLIPPERY CURVE',
    subtitle: 'Heavy monsoon cloud bank. Extreme gradient descent. Hazard warning active.',
    timeAgo: '22m ago',
    status: 'risky',
    type: 'fog',
    district: 'East Khasi Hills',
  },
  {
    id: 'hazard-baghmara-flood',
    lat: 25.2200,
    lng: 90.5600,
    title: 'SIMSANG FLASH FLOOD',
    subtitle: 'Simsang river rising over lower abutment. Bridge closed to all commercial vehicles.',
    timeAgo: '3h ago',
    detourText: 'Re-route via Tura-Garobadha →',
    status: 'blocked',
    type: 'flood',
    district: 'South Garo Hills',
  },
  {
    id: 'hazard-shallang-subsidence',
    lat: 25.5800,
    lng: 91.0300,
    title: 'ROAD SUBSIDENCE ZONE',
    subtitle: 'Hill shoulder sliding along 80m stretch. Single lane regulated traffic.',
    timeAgo: '45m ago',
    status: 'risky',
    type: 'rockfall',
    district: 'West Khasi Hills',
  },
];

export const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
  center = [25.4600, 91.1000], // Balanced central view between Khasi and Garo Hills
  zoom = 9.5,
  regionFilter = 'all',
  showFleet = true,
  selectedTruckId,
  onSelectTruck,
  onSelectHazard,
  onSelectSegment,
  style,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const roadsLayerRef = useRef<any>(null);
  const trucksLayerRef = useRef<any>(null);
  const hazardsLayerRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let isMounted = true;

    const initMap = () => {
      // Ensure Leaflet stylesheet is present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const L = (window as any).L || require('leaflet');
      if (!L || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
      }

      // Initialize Map with proper bounds over Meghalaya (90.0°E to 92.5°E, 25.0°N to 26.1°N)
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: false,
        attributionControl: false,
        minZoom: 8,
        maxZoom: 18,
      });
      mapInstanceRef.current = map;

      // Real OpenStreetMap Tile Layer with natural terrain / hillshading
      // Using CartoDB Voyager which gives authentic cartographic topographic coloring matching real mountain passes
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Attribution banner
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('Map data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>')
        .addTo(map);

      // Create dedicated Layer Groups
      roadsLayerRef.current = L.layerGroup().addTo(map);
      hazardsLayerRef.current = L.layerGroup().addTo(map);
      trucksLayerRef.current = L.layerGroup().addTo(map);

      renderAllLayers(L, map);
    };

    const renderAllLayers = (L: any, map: any) => {
      renderRoads(L);
      renderHazards(L);
      renderTrucks(L);
    };

    const renderRoads = (L: any) => {
      if (!roadsLayerRef.current) return;
      roadsLayerRef.current.clearLayers();

      const filteredSegments = MEGHALAYA_ROAD_NETWORK.filter((seg) => {
        if (regionFilter === 'khasi') return seg.region === 'Khasi Hills' || seg.region === 'Inter-District Connector';
        if (regionFilter === 'garo') return seg.region === 'Garo Hills' || seg.region === 'Inter-District Connector';
        return true;
      });

      filteredSegments.forEach((seg) => {
        const coords = seg.coordinates;

        if (seg.status === 'open') {
          // Open route: Solid dark spruce outline + emerald green fill + dashed white centerline
          L.polyline(coords, {
            color: '#134e4a',
            weight: 7,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(roadsLayerRef.current);

          const innerLine = L.polyline(coords, {
            color: '#0d9488',
            weight: 5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(roadsLayerRef.current);

          L.polyline(coords, {
            color: '#ffffff',
            weight: 2,
            opacity: 0.85,
            dashArray: '6, 8',
            lineCap: 'round',
          }).addTo(roadsLayerRef.current);

          innerLine.on('click', () => onSelectSegment?.(seg));
        } else if (seg.status === 'risky') {
          // Risky / Fog: Deep amber outline + vivid orange fill
          L.polyline(coords, {
            color: '#9a3412',
            weight: 7,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(roadsLayerRef.current);

          const innerLine = L.polyline(coords, {
            color: '#ea580c',
            weight: 5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(roadsLayerRef.current);

          innerLine.on('click', () => onSelectSegment?.(seg));
        } else if (seg.status === 'blocked') {
          // Blocked: Dark crimson outline + red fill + alert hazard stripe
          L.polyline(coords, {
            color: '#7f1d1d',
            weight: 8,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(roadsLayerRef.current);

          const innerLine = L.polyline(coords, {
            color: '#dc2626',
            weight: 5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(roadsLayerRef.current);

          L.polyline(coords, {
            color: '#fef2f2',
            weight: 2.5,
            opacity: 0.9,
            dashArray: '6, 6',
          }).addTo(roadsLayerRef.current);

          innerLine.on('click', () => onSelectSegment?.(seg));
        }
      });
    };

    const renderHazards = (L: any) => {
      if (!hazardsLayerRef.current) return;
      hazardsLayerRef.current.clearLayers();

      MEGHALAYA_HAZARD_MARKERS.forEach((h) => {
        if (h.status === 'blocked') {
          // Pulsing red rockfall hazard pin
          const pinHtml = `
            <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(220, 38, 38, 0.35); animation: pulse-ring 2s infinite;"></div>
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #b91c1c; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 900;">⚠</span>
              </div>
            </div>
          `;
          const icon = L.divIcon({ className: 'custom-hazard-pin', html: pinHtml, iconSize: [34, 34], iconAnchor: [17, 17] });
          const marker = L.marker([h.lat, h.lng], { icon }).addTo(hazardsLayerRef.current);

          // Rich PWD / BRO Incident Popup
          const popupContent = `
            <div style="background: #ffffff; border-radius: 12px; padding: 14px; min-width: 240px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <span style="background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: 800; padding: 3px 6px; border-radius: 4px; letter-spacing: 0.5px;">${h.title}</span>
                <span style="color: #6b7280; font-size: 10px; font-weight: 600;">${h.timeAgo}</span>
              </div>
              <div style="font-size: 12px; color: #1f2937; line-height: 16px; margin-bottom: 8px; font-weight: 600;">
                ${h.subtitle}
              </div>
              <div style="font-size: 10px; color: #4b5563; margin-bottom: 8px;">
                District: <strong>${h.district}</strong> • PWD Hill Division
              </div>
              ${h.detourText ? `
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; justify-content: space-between; color: #166534; font-size: 11px; font-weight: 700; cursor: pointer;">
                  <span>${h.detourText}</span>
                </div>
              ` : ''}
            </div>
          `;
          marker.bindPopup(popupContent, { offset: [0, -10], closeButton: true });
          if (h.id === 'hazard-mawkdok-rockfall') {
            marker.openPopup();
          }
          marker.on('click', () => onSelectHazard?.(h));
        } else {
          // Orange caution pin
          const pinHtml = `
            <div style="width: 26px; height: 26px; border-radius: 50%; background: #d97706; border: 2px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <span style="color: #ffffff; font-size: 11px; font-weight: 800;">☁</span>
            </div>
          `;
          const icon = L.divIcon({ className: 'custom-hazard-pin', html: pinHtml, iconSize: [26, 26], iconAnchor: [13, 13] });
          const marker = L.marker([h.lat, h.lng], { icon }).addTo(hazardsLayerRef.current);
          marker.bindPopup(`
            <div style="padding: 10px; font-family: sans-serif; font-size: 12px;">
              <strong style="color: #b45309;">${h.title}</strong>
              <p style="margin: 4px 0 0 0; color: #374151;">${h.subtitle}</p>
            </div>
          `);
        }
      });
    };

    const renderTrucks = (L: any) => {
      if (!trucksLayerRef.current) return;
      trucksLayerRef.current.clearLayers();
      if (!showFleet) return;

      FLEET_TRUCKS.forEach((truck) => {
        const isMoving = truck.status === 'moving';
        const isDelayed = truck.status === 'delayed';
        const badgeColor = isMoving ? '#059669' : isDelayed ? '#d97706' : '#64748b';
        const isSelected = selectedTruckId === truck.id;

        // Custom Truck Fleet Marker with vehicle reg, status indicator, and heading orientation
        const truckHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <!-- Truck Floating Tag -->
            <div style="background: #111827; color: #f9fafb; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 6px rgba(0,0,0,0.35); margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${badgeColor};"></span>
              <span>${truck.truckNumber}</span>
              <span style="color: #93c5fd; font-weight: 600;">${truck.speedKmh} km/h</span>
            </div>

            <!-- Commercial Truck Vehicle Icon -->
            <div style="width: 32px; height: 32px; border-radius: 8px; background: ${isSelected ? '#0284c7' : '#1e293b'}; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; transform: rotate(${truck.headingDeg - 90}deg);">
              <span style="font-size: 16px; line-height: 1;">🚚</span>
            </div>
          </div>
        `;

        const truckIcon = L.divIcon({
          className: 'custom-fleet-truck-marker',
          html: truckHtml,
          iconSize: [80, 52],
          iconAnchor: [40, 48],
        });

        const marker = L.marker([truck.lat, truck.lng], { icon: truckIcon }).addTo(trucksLayerRef.current);

        // Truck Fleet Telemetry Popup
        const truckPopup = `
          <div style="background: #ffffff; border-radius: 12px; padding: 12px; min-width: 230px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 8px;">
              <div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a;">${truck.truckNumber}</div>
                <div style="font-size: 10px; color: #64748b;">${truck.operator}</div>
              </div>
              <span style="background: ${badgeColor}20; color: ${badgeColor}; font-size: 10px; font-weight: 800; padding: 3px 6px; border-radius: 4px;">
                ${truck.status.toUpperCase()}
              </span>
            </div>
            
            <div style="font-size: 11px; color: #334155; line-height: 16px; margin-bottom: 6px;">
              <div>• <strong>Driver:</strong> ${truck.driverName}</div>
              <div>• <strong>Vehicle:</strong> ${truck.vehicleModel}</div>
              <div>• <strong>Cargo:</strong> ${truck.cargoType} (${truck.loadTons}T)</div>
              <div>• <strong>Corridor:</strong> ${truck.corridor}</div>
              <div>• <strong>Destination:</strong> ${truck.destination}</div>
              <div>• <strong>ETA:</strong> ${truck.eta}</div>
            </div>

            ${truck.delayReason ? `
              <div style="background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; font-size: 10px; padding: 6px; border-radius: 6px; margin-top: 4px;">
                ⚠ <strong>Delay Notice:</strong> ${truck.delayReason}
              </div>
            ` : ''}
          </div>
        `;

        marker.bindPopup(truckPopup, { offset: [0, -20] });
        marker.on('click', () => onSelectTruck?.(truck));
      });
    };

    if (typeof window !== 'undefined') {
      if ((window as any).L) {
        initMap();
      } else {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          if (isMounted) initMap();
        };
        document.body.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
      }
    };
  }, [regionFilter, showFleet, selectedTruckId]);

  // Handle center / zoom changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      try {
        mapInstanceRef.current.flyTo(center, zoom, { duration: 1.2 });
      } catch (e) {}
    }
  }, [center[0], center[1], zoom]);

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Text style={styles.fallbackText}>Meghalaya Road Network (Native Mode)</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <div
        ref={mapContainerRef as any}
        style={{ width: '100%', height: '100%', outline: 'none' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
