import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Camera, 
  MapPin, 
  FileText,
  LineChart,
  LogOut, 
  Building2,
  Users,
  Calculator,
  FileCheck,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  User as UserIcon,
  X,
  Layers
} from 'lucide-react';
import { UserProfile } from '../types';

interface FloatingPillNavProps {
  user: UserProfile | null;
  onLogout: () => void;
}

export default function FloatingPillNav({ user, onLogout }: FloatingPillNavProps) {
  const location = useLocation();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAhspSubOpen, setIsAhspSubOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [isNavDraggedOver, setIsNavDraggedOver] = useState(false);
  const [isNavManuallyExpanded, setIsNavManuallyExpanded] = useState(false);

  const isExpanded = isHovered || isDraggedOver || isUserMenuOpen;

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close submenus on route change
  useEffect(() => {
    setIsMoreMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsAhspSubOpen(false);
    setIsNavManuallyExpanded(false);
  }, [location.pathname]);

  // Primary navigation items directly visible in the floating pill
  const primaryNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Proyek', path: '/proyek', icon: Briefcase },
    { name: 'Kurva S', path: '/kurva-s', icon: LineChart },
    { name: 'Laporan', path: '/laporan', icon: FileText },
    { name: 'Foto & Video', path: '/foto', icon: Camera },
    { name: 'Peta', path: '/peta', icon: MapPin },
  ];

  // Secondary items located in the "Lainnya" / "More" popover
  const secondaryNavItems = [
    { name: 'RAB Proyek', path: '/rab', icon: Calculator, description: 'Rencana Anggaran Biaya' },
    { name: 'Spesifikasi Teknis', path: '/spesifikasi-teknis', icon: FileCheck, description: 'Tata cara pemeriksaan teknis' },
    { name: 'Penyedia (PT/CV)', path: '/penyedia', icon: Building2, hideForRoles: ['pengawas'], description: 'Data rekanan kontraktor & SKP' },
    { name: 'Manajemen Pengguna', path: '/pengguna', icon: Users, adminOnly: true, description: 'Hak akses & kelola akun dinas' },
  ];

  const ahspSubItems = [
    { name: 'Daftar Analisa AHSP', path: '/ahsp' },
    { name: 'Harga Satuan Upah', path: '/ahsp/upah' },
    { name: 'Harga Satuan Bahan', path: '/ahsp/bahan' },
    { name: 'Harga Satuan Alat', path: '/ahsp/alat' },
  ];

  const isAHSPActive = location.pathname.startsWith('/ahsp');

  // Check if any secondary item is currently active
  const isSecondaryActive = secondaryNavItems.some(item => item.path === location.pathname) || isAHSPActive;
  const isAnyPrimaryActive = primaryNavItems.some(item => item.path === location.pathname);
  const isDockExpanded = isNavHovered || isNavDraggedOver || isMoreMenuOpen || isNavManuallyExpanded;

  return (
    <>
      {/* ============================================================== */}
      {/* TOP FLOATING USER PROFILE ACTION PILL ONLY (NO FLOATING LOGO) */}
      {/* ============================================================== */}
      <header className="fixed top-3 sm:top-4 inset-x-0 z-40 px-4 sm:px-8 pointer-events-none flex justify-end items-center max-w-7xl mx-auto">
        {/* User Account Floating Pill */}
        <div 
          className="pointer-events-auto relative group" 
          ref={userMenuRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDraggedOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggedOver(true);
          }}
          onDragLeave={() => setIsDraggedOver(false)}
          onDrop={() => setIsDraggedOver(false)}
        >
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`
              floating-user-btn flex items-center bg-slate-900/90 backdrop-blur-md text-white rounded-full 
              shadow-lg shadow-slate-950/25 border border-slate-700/60 hover:border-emerald-500/50 hover:shadow-emerald-950/30
              cursor-pointer select-none transition-all duration-300 ease-out
              ${isExpanded 
                ? 'py-1.5 px-3 sm:px-3.5 ring-2 ring-emerald-400/50 shadow-xl shadow-emerald-500/20' 
                : 'p-1 sm:p-1.5 hover:ring-2 hover:ring-emerald-400/40'}
            `}
            title={user?.name ? `${user.name} (${user.role})` : 'Akun Pengguna'}
          >
            {/* 1. Circular Avatar (Hanya elemen ini yang ditampilkan saat mengecil) */}
            <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs sm:text-sm group-hover:scale-105 group-hover:border-emerald-400 transition-all duration-300 shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* 2. Text Container & Chevron (Mengecil / Membesar dengan animasi halus saat mouse drag/hover) */}
            <div 
              className={`
                overflow-hidden transition-all duration-300 ease-out flex items-center
                ${isExpanded 
                  ? 'max-w-[200px] opacity-100 ml-2.5 mr-0.5' 
                  : 'max-w-0 opacity-0 ml-0 mr-0 group-hover:max-w-[200px] group-hover:opacity-100 group-hover:ml-2.5 group-hover:mr-0.5'}
              `}
            >
              <div className="text-left whitespace-nowrap pr-2">
                <p className="text-xs font-bold text-slate-100 max-w-[120px] truncate leading-tight group-hover:text-emerald-300 transition-colors">
                  {user?.name || user?.username || 'User'}
                </p>
                <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold leading-tight">
                  {user?.role || 'User'}
                </p>
              </div>
              <ChevronDown 
                size={14} 
                className={`text-slate-400 group-hover:text-emerald-400 transition-transform duration-200 shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} 
              />
            </div>
          </button>

          {/* User Profile Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl p-2 text-white z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 border-b border-slate-800">
                <p className="text-xs font-semibold text-slate-400">Masuk sebagai</p>
                <p className="text-sm font-bold text-white truncate">{user?.name || user?.username}</p>
                <p className="text-xs text-slate-400 font-mono truncate">{user?.email}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                  Role: {user?.role}
                </span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Logout dari Sistem</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* FLOATING PILL NAVIGATION BAR (CENTERED BOTTOM FLOATING DOCK)   */}
      {/* ============================================================== */}
      <div className="fixed bottom-5 sm:bottom-6 inset-x-0 z-40 pointer-events-none flex justify-center px-3 sm:px-4">
        <div 
          className="pointer-events-auto relative group/dock"
          onMouseEnter={() => setIsNavHovered(true)}
          onMouseLeave={() => {
            setIsNavHovered(false);
            setIsNavManuallyExpanded(false);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsNavDraggedOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsNavDraggedOver(true);
          }}
          onDragLeave={() => setIsNavDraggedOver(false)}
          onDrop={() => setIsNavDraggedOver(false)}
        >
          {/* Main Floating Capsule / Pill */}
          <nav className="floating-dock-pill flex items-center bg-slate-900/90 backdrop-blur-xl p-1.5 sm:p-2 rounded-full border border-slate-700/70 shadow-2xl shadow-slate-950/40 ring-1 ring-white/10 transition-all hover:bg-slate-900/95 hover:border-emerald-500/50 hover:shadow-emerald-950/30">
            
            {/* Primary Nav Links */}
            {primaryNavItems.map((item, idx) => {
              const isActive = location.pathname === item.path || (!isAnyPrimaryActive && !isSecondaryActive && idx === 0);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={(e) => {
                    if (isActive) {
                      e.preventDefault();
                      setIsNavManuallyExpanded(!isNavManuallyExpanded);
                    }
                  }}
                  className={`
                    dock-item-collapsible group relative flex items-center gap-2 rounded-full text-xs font-bold transition-all duration-300 select-none whitespace-nowrap overflow-hidden
                    ${isActive 
                      ? 'max-w-[200px] opacity-100 scale-100 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-white/20 pointer-events-auto cursor-pointer' 
                      : isDockExpanded
                        ? 'max-w-[170px] opacity-100 scale-100 px-3 sm:px-4 py-2 sm:py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 pointer-events-auto mx-0.5'
                        : 'max-w-0 opacity-0 scale-90 !px-0 !py-2 sm:!py-2.5 pointer-events-none -mx-0 !border-0 text-slate-300 group-hover/dock:max-w-[170px] group-hover/dock:opacity-100 group-hover/dock:scale-100 group-hover/dock:px-3 sm:group-hover/dock:px-4 group-hover/dock:pointer-events-auto group-hover/dock:mx-0.5'
                    }
                  `}
                  title={isActive ? `${item.name} (Aktif - Klik untuk buka menu)` : item.name}
                >
                  <item.icon size={17} className={`transition-transform duration-300 shrink-0 group-hover:scale-110 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                  <span className={`inline whitespace-nowrap transition-all duration-300 ${isActive ? 'font-black' : 'font-semibold'}`}>
                    {item.name}
                  </span>

                  {/* Active expand indicator chevron */}
                  {isActive && (
                    <ChevronUp 
                      size={13} 
                      className={`transition-transform duration-300 ml-0.5 text-emerald-100 shrink-0 ${isDockExpanded ? 'rotate-180' : ''}`} 
                    />
                  )}
                </Link>
              );
            })}

            {/* Separator Line */}
            <div 
              className={`
                dock-item-collapsible h-6 bg-slate-700/70 overflow-hidden
                ${isDockExpanded 
                  ? 'w-px mx-1 opacity-100' 
                  : 'w-0 mx-0 opacity-0 group-hover/dock:w-px group-hover/dock:mx-1 group-hover/dock:opacity-100'}
              `} 
            />

            {/* "More / Lainnya" Dropdown Trigger Pill */}
            <div 
              className={`
                dock-item-collapsible relative overflow-visible
                ${(isDockExpanded || isSecondaryActive)
                  ? 'max-w-[170px] opacity-100 scale-100 pointer-events-auto' 
                  : 'max-w-0 opacity-0 scale-90 pointer-events-none group-hover/dock:max-w-[170px] group-hover/dock:opacity-100 group-hover/dock:scale-100 group-hover/dock:pointer-events-auto'}
              `} 
              ref={moreMenuRef}
            >
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`
                  flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap
                  ${isSecondaryActive || isMoreMenuOpen
                    ? 'bg-slate-800 text-emerald-400 ring-1 ring-emerald-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95'}
                `}
                title="Fitur Tambahan (RAB, Spesifikasi Teknis, AHSP, Penyedia)"
              >
                <MoreHorizontal size={17} className="transition-transform group-hover:rotate-90 duration-300" />
                <span className="inline font-semibold">Lainnya</span>
                <ChevronUp size={13} className={`transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Popover Menu for More Features */}
              {isMoreMenuOpen && (
                <div className="absolute bottom-full right-0 mb-3 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl p-2.5 text-white animate-in fade-in slide-in-from-bottom-3 duration-200 z-50">
                  <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={13} className="text-emerald-400" />
                      Menu &amp; Modul Proyek
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMoreMenuOpen(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="py-1 space-y-1 max-h-[60vh] overflow-y-auto">
                    {/* Secondary menu items */}
                    {secondaryNavItems.filter(item => {
                      if (item.adminOnly && user?.role !== 'admin') return false;
                      if (item.hideForRoles && user?.role && item.hideForRoles.includes(user.role)) return false;
                      return true;
                    }).map((item) => {
                      const isActive = location.pathname === item.path;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMoreMenuOpen(false)}
                          className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all
                            ${isActive 
                              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold' 
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                          `}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                            <item.icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold leading-tight">{item.name}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.description}</p>
                          </div>
                        </Link>
                      );
                    })}

                    {/* AHSP Accordion Submenu */}
                    <div className="pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsAhspSubOpen(!isAhspSubOpen)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all cursor-pointer
                          ${isAHSPActive ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${isAHSPActive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                            <Calculator size={16} />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold leading-tight">Analisa AHSP</p>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Upah, Bahan &amp; Alat</p>
                          </div>
                        </div>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isAhspSubOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isAhspSubOpen && (
                        <div className="ml-5 pl-4 border-l border-slate-700/60 my-1 space-y-1">
                          {ahspSubItems.map(sub => (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              onClick={() => setIsMoreMenuOpen(false)}
                              className={`
                                block py-1.5 px-2.5 rounded-xl text-xs font-medium transition-colors
                                ${location.pathname === sub.path 
                                  ? 'bg-emerald-500/20 text-emerald-300 font-bold' 
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}
                              `}
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </nav>
        </div>
      </div>
    </>
  );
}
