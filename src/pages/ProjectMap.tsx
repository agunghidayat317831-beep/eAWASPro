import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getProjects } from '../services/firestore';
import { Project, UserProfile } from '../types';
import { MapPin, Building2, TrendingUp, Info } from 'lucide-react';
import PopupVideoPlayer from '../components/PopupVideoPlayer';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
};

// Custom marker icon generator based on progress
const getMarkerIcon = (progress: number) => {
  let color = '#ef4444'; // Default red (0-25%)
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

export default function ProjectMap({ user }: { user: UserProfile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showLegend, setShowLegend] = useState(false);

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

  const center = { lat: -6.2088, lng: 106.8456 }; // Jakarta default

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Peta Lokasi Proyek</h2>
          <p className="text-xs sm:text-sm text-slate-500">Pemetaan geografis seluruh proyek pembangunan.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative min-h-[350px]">
        <MapContainer 
          center={[center.lat, center.lng]} 
          zoom={10} 
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {projects.map((project) => (
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
                  
                  <div className="space-y-1 border-t border-slate-100 pt-2">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">{project.name}</h4>
                    <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-600">
                      <Building2 size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{project.ptCv}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-600">
                      <TrendingUp size={12} className="text-slate-400 shrink-0" />
                      <span 
                        className="font-bold"
                        style={{ color: project.progress > 75 ? '#10b981' : project.progress > 50 ? '#f59e0b' : project.progress > 25 ? '#f97316' : '#ef4444' }}
                      >
                        {project.progress}% Progress
                      </span>
                    </div>
                  </div>
                  
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${project.progress}%`,
                        backgroundColor: project.progress > 75 ? '#10b981' : project.progress > 50 ? '#f59e0b' : project.progress > 25 ? '#f97316' : '#ef4444'
                      }}
                    ></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          {selectedProject && <RecenterMap lat={selectedProject.lat} lng={selectedProject.lng} />}
        </MapContainer>

        {/* Map Legend - Collapsible on Mobile */}
        <div className="absolute bottom-3 left-3 z-10">
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className="sm:hidden bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 shadow-md border border-slate-200/50 flex items-center gap-1.5"
          >
            <Info size={14} className="text-emerald-600" />
            <span>Legend</span>
          </button>
          
          <div className={`${showLegend ? 'block' : 'hidden'} sm:block bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-100 p-2.5 sm:p-3 space-y-2 mt-2 sm:mt-0`}>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Keterangan Progress</p>
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

        {/* Info overlay on mobile/desktop */}
        {selectedProject && (
          <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:top-4 sm:right-4 z-10 sm:w-72 max-h-[50vh] sm:max-h-[calc(100%-32px)] overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between text-slate-900 font-bold border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-emerald-600" />
                <span className="text-xs sm:text-sm">Info Lokasi</span>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="text-xs text-slate-400 hover:text-slate-600 p-1"
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
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Lokasi</p>
                <div className="flex items-center gap-1 text-slate-600">
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">{selectedProject.location}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[9px] uppercase text-slate-400 font-bold">Progress</p>
                  <p 
                    className="font-bold text-xs sm:text-sm"
                    style={{ color: selectedProject.progress > 75 ? '#10b981' : selectedProject.progress > 50 ? '#f59e0b' : selectedProject.progress > 25 ? '#f97316' : '#ef4444' }}
                  >
                    {selectedProject.progress}%
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[9px] uppercase text-slate-400 font-bold">Anggaran</p>
                  <p className="text-xs font-bold text-slate-900 truncate">Rp {selectedProject.anggaran.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
