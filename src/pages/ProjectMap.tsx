import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getProjects } from '../services/firestore';
import { Project, UserProfile } from '../types';
import { 
  MapPin, 
  Building2, 
  TrendingUp, 
  Info, 
  Navigation, 
  LocateFixed, 
  Radio, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  Pause,
  Play
} from 'lucide-react';
import PopupVideoPlayer from '../components/PopupVideoPlayer';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// User GPS Location Interface
interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

// Controller component to handle smooth map flying / recentering
const MapController = ({ 
  selectedProjectCoords, 
  userLocation, 
  recenterTrigger 
}: { 
  selectedProjectCoords: [number, number] | null; 
  userLocation: UserLocation | null; 
  recenterTrigger: number;
}) => {
  const map = useMap();

  // Recenter to selected project
  useEffect(() => {
    if (selectedProjectCoords) {
      map.setView(selectedProjectCoords, 14, { animate: true });
    }
  }, [selectedProjectCoords, map]);

  // Recenter to user's live GPS position when triggered
  useEffect(() => {
    if (userLocation && recenterTrigger > 0) {
      map.flyTo([userLocation.lat, userLocation.lng], 15, { 
        animate: true, 
        duration: 1.2 
      });
    }
  }, [recenterTrigger, userLocation, map]);

  return null;
};

// Custom project marker icon generator based on progress
const getMarkerIcon = (progress: number) => {
  let color = '#ef4444'; // Red (0-25%)
  if (progress > 75) {
    color = '#10b981'; // Green (76-100%)
  } else if (progress > 50) {
    color = '#f59e0b'; // Amber (51-75%)
  } else if (progress > 25) {
    color = '#f97316'; // Orange (26-50%)
  }

  const svgIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2C10.477 2 6 6.477 6 12C6 19.5 16 30 16 30C16 30 26 19.5 26 12C26 6.477 21.523 2 16 2Z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="12" r="4" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Distinctive Live GPS User Location Marker with radar ping animation
const getUserLocationIcon = () => {
  const html = `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <!-- Outer Pulsing Radar Ring -->
      <div style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background-color: rgba(59, 130, 246, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <!-- Middle Glow Disc -->
      <div style="position: absolute; width: 22px; height: 22px; border-radius: 9999px; background-color: rgba(37, 99, 235, 0.45); border: 2px solid rgba(255, 255, 255, 0.8);"></div>
      <!-- Center Electric Blue Core -->
      <div style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); border: 2.5px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 0 10px rgba(59, 130, 246, 0.8);"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'user-live-gps-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};

// Calculate distance in kilometers between two GPS coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format distance nicely for field inspectors
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} meter`;
  }
  return `${km.toFixed(2)} km`;
}

export default function ProjectMap({ user }: { user: UserProfile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // Live GPS Tracking States
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isGpsTracking, setIsGpsTracking] = useState<boolean>(true);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'searching' | 'active' | 'error' | 'unsupported'>('searching');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastGpsUpdate, setLastGpsUpdate] = useState<Date | null>(null);
  const [gpsUpdateCount, setGpsUpdateCount] = useState<number>(0);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const hasAutoCentered = useRef<boolean>(false);

  // Load projects from Firestore
  useEffect(() => {
    const unsubscribe = getProjects((data) => {
      if (user?.role === 'pengawas') {
        const currentSupervisorName = user.name || user.username || user.email;
        const filtered = data.filter(p => {
          if (!p.supervisorName) return false;
          return p.supervisorName === currentSupervisorName ||
                 p.supervisorName === user.name ||
                 p.supervisorName === user.username ||
                 p.supervisorName === user.email;
        });
        setProjects(filtered);
      } else {
        setProjects(data);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Handler for successful geolocation acquisition
  const handleLocationSuccess = useCallback((pos: GeolocationPosition) => {
    const newLocation: UserLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    };
    setUserLocation(newLocation);
    setGpsStatus('active');
    setGpsError(null);
    setLastGpsUpdate(new Date(pos.timestamp));
    setGpsUpdateCount(prev => prev + 1);

    // Auto-center map on first GPS fix if no project selected
    if (!hasAutoCentered.current && !selectedProject) {
      hasAutoCentered.current = true;
      setRecenterTrigger(prev => prev + 1);
    }
  }, [selectedProject]);

  // Handler for geolocation error
  const handleLocationError = useCallback((err: GeolocationPositionError) => {
    let message = 'Gagal mengakses GPS perangkat.';
    if (err.code === 1) {
      message = 'Izin akses lokasi GPS ditolak oleh pengguna/browser.';
    } else if (err.code === 2) {
      message = 'Sinyal GPS perangkat tidak dapat ditentukan.';
    } else if (err.code === 3) {
      message = 'Waktu permintaan GPS habis (timeout).';
    }
    setGpsError(message);
    setGpsStatus('error');
  }, []);

  // Periodic and Event-Driven Live GPS Tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      setGpsError('Browser atau perangkat ini tidak mendukung sensor GPS.');
      return;
    }

    if (!isGpsTracking) {
      setGpsStatus('idle');
      return;
    }

    setGpsStatus(prev => prev === 'active' ? 'active' : 'searching');

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 4000,
    };

    // 1. Initial immediate lookup
    navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, geoOptions);

    // 2. Hardware watchPosition for real-time movement updates
    const watchId = navigator.geolocation.watchPosition(
      handleLocationSuccess,
      handleLocationError,
      geoOptions
    );

    // 3. Periodic interval backup (every 10 seconds) to guarantee fresh updates even if stationary
    const intervalId = setInterval(() => {
      if (isGpsTracking) {
        navigator.geolocation.getCurrentPosition(
          handleLocationSuccess,
          (err) => {
            // Keep previous location if active, only log background error
            console.warn('Periodic GPS update warning:', err.message);
          },
          geoOptions
        );
      }
    }, 10000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, [isGpsTracking, handleLocationSuccess, handleLocationError]);

  // Compute Nearest Project to User's live GPS location
  const nearestProjectInfo = useMemo(() => {
    if (!userLocation || projects.length === 0) return null;

    let closest: { project: Project; distance: number } | null = null;
    projects.forEach(p => {
      if (typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)) {
        const dist = calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng);
        if (!closest || dist < closest.distance) {
          closest = { project: p, distance: dist };
        }
      }
    });

    return closest;
  }, [userLocation, projects]);

  const defaultCenter = { lat: -6.2088, lng: 106.8456 }; // Jakarta default

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] flex flex-col">
      {/* Header section with Live GPS Status & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Peta Lokasi Proyek</h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Radio size={12} className={isGpsTracking && gpsStatus === 'active' ? 'text-blue-600 animate-pulse' : 'text-slate-400'} />
              GPS Otomatis
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemetaan spasial proyek &amp; pelacakan penanda lokasi GPS perangkat secara berkala.
          </p>
        </div>

        {/* Live GPS Controls & Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tracking Status Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            gpsStatus === 'active' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-xs' 
              : gpsStatus === 'searching' 
                ? 'bg-amber-50 text-amber-800 border-amber-200/80 animate-pulse'
                : gpsStatus === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <span className="relative flex h-2.5 w-2.5">
              {gpsStatus === 'active' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                gpsStatus === 'active' 
                  ? 'bg-emerald-500' 
                  : gpsStatus === 'searching' 
                    ? 'bg-amber-500' 
                    : gpsStatus === 'error'
                      ? 'bg-red-500'
                      : 'bg-slate-400'
              }`}></span>
            </span>

            <span>
              {gpsStatus === 'active' && userLocation 
                ? `GPS Aktif (±${Math.round(userLocation.accuracy)}m)` 
                : gpsStatus === 'searching' 
                  ? 'Mencari Sinyal GPS...' 
                  : gpsStatus === 'error'
                    ? 'GPS Error'
                    : 'GPS Jeda'}
            </span>

            {userLocation && (
              <span className="text-[10px] text-slate-400 border-l border-slate-200 pl-2 font-mono">
                #{gpsUpdateCount} update
              </span>
            )}
          </div>

          {/* Toggle Live GPS Tracking Button */}
          <button
            type="button"
            onClick={() => setIsGpsTracking(!isGpsTracking)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
              isGpsTracking
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80'
            }`}
            title={isGpsTracking ? 'Jeda pelacakan otomatis GPS' : 'Aktifkan pembaruan GPS otomatis berkala'}
          >
            {isGpsTracking ? <Pause size={13} /> : <Play size={13} />}
            <span>{isGpsTracking ? 'Pelacakan Aktif' : 'Mulai Pelacakan'}</span>
          </button>

          {/* Center to My Location Button */}
          {userLocation && (
            <button
              type="button"
              onClick={() => setRecenterTrigger(prev => prev + 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Pusatkan peta ke koordinat lokasi GPS terkini"
            >
              <LocateFixed size={14} className="text-blue-600" />
              <span>Lokasi Saya</span>
            </button>
          )}
        </div>
      </div>

      {/* GPS Error Alert Notification Banner if needed */}
      {gpsError && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Peringatan Sensor GPS:</p>
              <p className="text-amber-700">{gpsError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setGpsError(null);
              setIsGpsTracking(true);
            }}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Main Map Canvas Area */}
      <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative min-h-[350px]">
        <MapContainer 
          center={[defaultCenter.lat, defaultCenter.lng]} 
          zoom={11} 
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Controller to handle recentering without breaking user map dragging */}
          <MapController 
            selectedProjectCoords={selectedProject ? [selectedProject.lat, selectedProject.lng] : null}
            userLocation={userLocation}
            recenterTrigger={recenterTrigger}
          />

          {/* ============================================================== */}
          {/* USER LIVE GPS MARKER & ACCURACY RADIUS CIRCLE (AUTO-UPDATED)   */}
          {/* ============================================================== */}
          {userLocation && (
            <>
              {/* Accuracy halo circle */}
              <Circle 
                center={[userLocation.lat, userLocation.lng]}
                radius={Math.max(userLocation.accuracy, 15)}
                pathOptions={{
                  color: '#2563eb',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: '4, 4'
                }}
              />

              {/* Dynamic GPS Beacon Marker */}
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={getUserLocationIcon()}
                zIndexOffset={1000} // Keep on top of project pins
              >
                <Popup className="custom-popup">
                  <div className="p-1 min-w-[240px] max-w-[300px] space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Radio size={14} className="animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-xs sm:text-sm">Lokasi GPS Terkini</h4>
                          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Perangkat Anda</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Live
                      </span>
                    </div>

                    {/* Coordinates & Accuracy Info */}
                    <div className="bg-slate-50 p-2.5 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="text-slate-400 font-medium">Latitude:</span>
                        <span className="font-mono font-bold text-slate-800">{userLocation.lat.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="text-slate-400 font-medium">Longitude:</span>
                        <span className="font-mono font-bold text-slate-800">{userLocation.lng.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="text-slate-400 font-medium">Akurasi GPS:</span>
                        <span className="font-bold text-emerald-600">±{Math.round(userLocation.accuracy)} meter</span>
                      </div>
                      {lastGpsUpdate && (
                        <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                          <span>Diperbarui:</span>
                          <span className="font-mono">{lastGpsUpdate.toLocaleTimeString('id-ID')}</span>
                        </div>
                      )}
                    </div>

                    {/* Nearest Project Shortcut */}
                    {nearestProjectInfo && (
                      <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900">
                          <Navigation size={12} className="text-blue-600 shrink-0" />
                          <span>Proyek Terdekat:</span>
                        </div>
                        <p className="font-bold text-slate-900 truncate">{nearestProjectInfo.project.name}</p>
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-blue-700 font-bold">
                            Jarak: {formatDistance(nearestProjectInfo.distance)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedProject(nearestProjectInfo.project)}
                            className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                          >
                            Lihat Rincian
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* ============================================================== */}
          {/* PROJECT MARKERS (COLOR-CODED BY PHYSICAL PROGRESS)             */}
          {/* ============================================================== */}
          {projects.map((project) => {
            const distanceToUser = userLocation 
              ? calculateDistance(userLocation.lat, userLocation.lng, project.lat, project.lng) 
              : null;

            return (
              <Marker 
                key={project.id} 
                position={[project.lat, project.lng]}
                icon={getMarkerIcon(project.progress)}
                eventHandlers={{
                  click: () => setSelectedProject(project),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-1 min-w-[220px] max-w-[280px] sm:min-w-[280px] sm:max-w-[320px] space-y-3">
                    <PopupVideoPlayer 
                      projectId={project.id} 
                      projectName={project.name}
                      progress={project.progress} 
                    />
                    
                    <div className="space-y-1.5 border-t border-slate-100 pt-2">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">{project.name}</h4>
                      
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-600">
                        <Building2 size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{project.ptCv}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={12} className="text-slate-400 shrink-0" />
                          <span 
                            className="font-bold"
                            style={{ color: project.progress > 75 ? '#10b981' : project.progress > 50 ? '#f59e0b' : project.progress > 25 ? '#f97316' : '#ef4444' }}
                          >
                            {project.progress}% Progress
                          </span>
                        </div>

                        {/* Distance from current GPS position */}
                        {distanceToUser !== null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                            <Navigation size={10} />
                            {formatDistance(distanceToUser)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${project.progress}%`,
                          backgroundColor: project.progress > 75 ? '#10b981' : project.progress > 50 ? '#f59e0b' : project.progress > 25 ? '#f97316' : '#ef4444'
                        }}
                      ></div>
                    </div>

                    {/* External Navigation Link if user location available */}
                    {userLocation && (
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 text-[10px]">Navigasi Lapangan:</span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${project.lat},${project.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <span>Buka Rute Navigasi</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Floating Quick Action: Center to User GPS Button on Map */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          {userLocation ? (
            <button
              type="button"
              onClick={() => setRecenterTrigger(prev => prev + 1)}
              className="bg-white/95 hover:bg-white text-slate-800 hover:text-blue-600 p-2.5 rounded-2xl shadow-lg border border-slate-200/80 backdrop-blur-md transition-all cursor-pointer active:scale-95 group flex items-center gap-1.5"
              title="Pusatkan peta ke lokasi GPS Anda saat ini"
            >
              <LocateFixed size={18} className="text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-xs font-bold pr-1">Lokasi Saya</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsGpsTracking(true)}
              className="bg-white/95 hover:bg-white text-slate-600 p-2.5 rounded-2xl shadow-lg border border-slate-200/80 backdrop-blur-md transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              title="Mencari sinyal GPS..."
            >
              <RefreshCw size={18} className="text-slate-400 animate-spin" />
              <span className="hidden sm:inline text-xs font-bold text-slate-500 pr-1">Cari GPS</span>
            </button>
          )}
        </div>

        {/* Map Legend - Collapsible on Mobile */}
        <div className="absolute bottom-3 left-3 z-10 space-y-2">
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className="sm:hidden bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 shadow-md border border-slate-200/50 flex items-center gap-1.5"
          >
            <Info size={14} className="text-emerald-600" />
            <span>Keterangan Peta</span>
          </button>
          
          <div className={`${showLegend ? 'block' : 'hidden'} sm:block bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-100 p-2.5 sm:p-3 space-y-2.5 max-w-[210px]`}>
            {/* User GPS Legend */}
            <div className="pb-2 border-b border-slate-100">
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Penanda Pengguna</p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-blue-500/40 animate-ping"></div>
                  <div className="relative w-2.5 h-2.5 rounded-full bg-blue-600 border border-white"></div>
                </div>
                <span>Lokasi GPS Live Anda</span>
              </div>
            </div>

            {/* Project Progress Legend */}
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Keterangan Progres</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
                  <span>Selesai (76-100%)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div>
                  <span>Lanjut (51-75%)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></div>
                  <span>Awal (26-50%)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
                  <span>Persiapan (0-25%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Project Info Overlay Drawer */}
        {selectedProject && (
          <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:top-14 sm:right-3 z-10 sm:w-80 max-h-[50vh] sm:max-h-[calc(100%-80px)] overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 p-3.5 sm:p-4 space-y-3 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="flex items-center justify-between text-slate-900 font-bold border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-emerald-600" />
                <span className="text-xs sm:text-sm font-black">Rincian Paket Proyek</span>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="text-xs text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <PopupVideoPlayer 
                projectId={selectedProject.id} 
                projectName={selectedProject.name}
                progress={selectedProject.progress} 
              />
              
              <div className="space-y-0.5">
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Nama Proyek</p>
                <p className="font-bold text-slate-900 leading-tight">{selectedProject.name}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Lokasi Lapangan</p>
                <div className="flex items-center gap-1 text-slate-600">
                  <MapPin size={12} className="shrink-0 text-slate-400" />
                  <span className="truncate">{selectedProject.location}</span>
                </div>
              </div>

              {/* Real-time Distance from User GPS */}
              {userLocation && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation size={14} className="text-blue-600 shrink-0" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-blue-700 font-bold">Jarak dari Posisi Anda</p>
                      <p className="font-black text-blue-950 text-sm">
                        {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, selectedProject.lat, selectedProject.lng))}
                      </p>
                    </div>
                  </div>
                  
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${selectedProject.lat},${selectedProject.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
                    title="Petunjuk Arah & Rute di Google Maps"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <p className="text-[9px] uppercase text-slate-400 font-bold">Progress Fisik</p>
                  <p 
                    className="font-black text-xs sm:text-sm"
                    style={{ color: selectedProject.progress > 75 ? '#10b981' : selectedProject.progress > 50 ? '#f59e0b' : selectedProject.progress > 25 ? '#f97316' : '#ef4444' }}
                  >
                    {selectedProject.progress}%
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <p className="text-[9px] uppercase text-slate-400 font-bold">Nilai Anggaran</p>
                  <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    Rp {Number(selectedProject.anggaran || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="p-2 bg-slate-50 rounded-xl space-y-0.5">
                <p className="text-[9px] uppercase text-slate-400 font-bold">Pelaksana (PT/CV)</p>
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                  <Building2 size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">{selectedProject.ptCv}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
