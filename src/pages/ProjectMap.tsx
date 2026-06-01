import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getProjects } from '../services/firestore';
import { Project } from '../types';
import { MapPin, Building2, TrendingUp, Info } from 'lucide-react';

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

export default function ProjectMap() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    const unsubscribe = getProjects(setProjects);
    return () => unsubscribe();
  }, []);

  const center = { lat: -6.2088, lng: 106.8456 }; // Jakarta default

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Peta Lokasi Proyek</h2>
          <p className="text-slate-500">Pemetaan geografis seluruh proyek pembangunan.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
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
                <div className="p-1 min-w-[200px] space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm leading-tight">{project.name}</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Building2 size={14} className="text-slate-400" />
                      <span>{project.ptCv}</span>
                    </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <TrendingUp size={14} className="text-slate-400" />
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
                    className="h-full rounded-full"
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

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/20 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Keterangan Progress</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
              <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
              <span>Selesai (76-100%)</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
              <span>Lanjut (51-75%)</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
              <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
              <span>Awal (26-50%)</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
              <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
              <span>Persiapan (0-25%)</span>
            </div>
          </div>
        </div>

        {/* Sidebar overlay for project details on map */}
        <div className="absolute top-4 right-4 z-10 w-72 max-h-[calc(100%-32px)] overflow-y-auto bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
            <Info size={18} className="text-emerald-600" />
            <span>Info Lokasi</span>
          </div>
          
          {selectedProject ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Nama Proyek</p>
                <p className="text-sm font-bold text-slate-900">{selectedProject.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Lokasi</p>
                <div className="flex items-center gap-1 text-slate-600 text-xs">
                  <MapPin size={12} />
                  <span>{selectedProject.location}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[9px] uppercase text-slate-400 font-bold">Progress</p>
                  <p 
                    className="text-sm font-bold"
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
              <button 
                onClick={() => setSelectedProject(null)}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Tutup Detail
              </button>
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <MapPin size={32} className="mx-auto text-slate-300" />
              <p className="text-xs text-slate-500">Klik marker pada peta untuk melihat detail proyek.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
