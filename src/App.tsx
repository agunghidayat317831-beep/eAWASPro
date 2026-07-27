import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Camera, 
  MapPin, 
  FileText,
  LineChart,
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  Building2,
  Users,
  Calculator
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { getUserProfile, getUserProfileByEmail, createUserProfile, deleteUser } from './services/firestore';
import { UserProfile } from './types';

// Pages
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import PhotoGallery from './pages/PhotoGallery';
import ProjectMap from './pages/ProjectMap';
import WeeklyReport from './pages/WeeklyReport';
import SCurve from './pages/SCurve';
import ProviderList from './pages/ProviderList';
import AHSP from './pages/AHSP';
import PriceList from './pages/PriceList';
import UserManagement from './pages/UserManagement';
import RAB from './pages/RAB';
import Login from './pages/Login';

import AppLogo from './components/AppLogo';

const Sidebar = ({ user, onLogout }: { user: UserProfile | null, onLogout: () => void }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Proyek', path: '/proyek', icon: Briefcase },
    { name: 'Penyedia', path: '/penyedia', icon: Building2, hideForRoles: ['pengawas'] },
    { name: 'RAB Proyek', path: '/rab', icon: Calculator },
    { name: 'Foto Kegiatan', path: '/foto', icon: Camera },
    { name: 'Laporan Mingguan', path: '/laporan', icon: FileText },
    { name: 'Kurva S', path: '/kurva-s', icon: LineChart },
    { name: 'Peta Lokasi', path: '/peta', icon: MapPin },
    { 
      name: 'Analisa AHSP', 
      path: '/ahsp', 
      icon: Calculator, 
      subItems: [
        { name: 'Daftar Analisa', path: '/ahsp' },
        { name: 'Harga Satuan Upah', path: '/ahsp/upah' },
        { name: 'Harga Satuan Bahan', path: '/ahsp/bahan' },
        { name: 'Harga Satuan Alat', path: '/ahsp/alat' },
      ]
    },
    { name: 'Manajemen Pengguna', path: '/pengguna', icon: Users, adminOnly: true },
  ];

  // Quick items for bottom navigation on mobile
  const bottomNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Proyek', path: '/proyek', icon: Briefcase },
    { name: 'Foto', path: '/foto', icon: Camera },
    { name: 'Peta', path: '/peta', icon: MapPin },
  ];

  return (
    <>
      {/* Top Fixed Mobile Navbar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 bg-slate-900 border-b border-slate-800 text-white z-40 px-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
            aria-label="Toggle Navigation Menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex items-center gap-2">
            <AppLogo />
            <div>
              <h1 className="text-lg font-bold text-emerald-400 leading-none">e-AWAS Pro</h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Monitoring Proyek</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Drawer Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 sm:w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppLogo />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-emerald-400 leading-tight">e-AWAS Pro</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-semibold">Monitoring Proyek</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {navItems.filter(item => {
              if (item.adminOnly && user?.role !== 'admin') return false;
              if (item.hideForRoles && user?.role && item.hideForRoles.includes(user.role)) return false;
              return true;
            }).map((item) => {
              const isAHSPRoot = location.pathname.startsWith('/ahsp');
              const isActive = item.path === '/ahsp' ? isAHSPRoot : location.pathname === item.path;
              
              return (
                <div key={item.path} className="space-y-1">
                  <Link
                    to={item.path}
                    onClick={() => !item.subItems && setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-98
                      ${isActive 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-semibold' 
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}
                    `}
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </Link>
                  
                  {isAHSPRoot && item.subItems && (
                    <div className="ml-9 border-l border-slate-800 pl-4 space-y-1 py-1">
                      {item.subItems.map(sub => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setIsOpen(false)}
                          className={`
                            block py-2 text-sm transition-colors
                            ${location.pathname === sub.path ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-300'}
                          `}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 px-3 py-2.5 mb-3 bg-slate-800/60 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                <UserIcon size={18} />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-semibold truncate text-white">{user?.name || 'User'}</p>
                <p className="text-xs text-emerald-400/80 truncate capitalize font-medium">{user?.role || 'User'}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-950/40 rounded-xl transition-colors font-medium text-sm"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 z-30 flex items-center justify-around h-16 px-1 shadow-lg">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-xs font-medium transition-all ${
                isActive 
                  ? 'text-emerald-400 font-bold scale-105' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <item.icon size={20} className={isActive ? 'stroke-[2.5px]' : ''} />
              <span className="text-[10px] mt-1">{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200"
        >
          <Menu size={20} />
          <span className="text-[10px] mt-1">Lainnya</span>
        </button>
      </nav>
    </>
  );
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let profile = await getUserProfile(firebaseUser.uid);
        
        if (!profile && firebaseUser.email) {
          // Check if there's a pending profile created by admin
          const pendingProfile = await getUserProfileByEmail(firebaseUser.email);
          if (pendingProfile) {
            // Link the pending profile to this real UID
            profile = {
              ...pendingProfile,
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || pendingProfile.name || 'User'
            };
            // Remove isPending if it exists
            const { isPending, ...cleanProfile } = profile as any;
            await createUserProfile(cleanProfile);
            
            // Delete the pending document if it was a placeholder
            if (pendingProfile.uid.startsWith('pending_')) {
              await deleteUser(pendingProfile.uid);
            }
          }
        }

        if (profile) {
          // Force admin role if email matches hardcoded admin
          if (firebaseUser.email === "agunghidayat317831@gmail.com") {
            profile.role = 'admin';
          }
          setUser(profile);
        } else {
          // Fallback if profile not found yet
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: firebaseUser.email === "agunghidayat317831@gmail.com" ? 'admin' : 'user'
          };
          await createUserProfile(newProfile);
          setUser(newProfile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        {user ? (
          <div className="flex">
            <Sidebar user={user} onLogout={handleLogout} />
            <main className="flex-1 lg:ml-64 p-3 sm:p-6 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8 min-w-0 max-w-full overflow-x-hidden">
              <Routes>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route path="/proyek" element={<ProjectList user={user} />} />
                <Route path="/penyedia" element={<ProviderList user={user} />} />
                <Route path="/foto" element={<PhotoGallery user={user} />} />
                <Route path="/laporan" element={<WeeklyReport user={user} />} />
                <Route path="/kurva-s" element={<SCurve user={user} />} />
                <Route path="/peta" element={<ProjectMap user={user} />} />
                <Route path="/ahsp" element={<AHSP user={user} />} />
                <Route path="/rab" element={<RAB user={user} />} />
                <Route path="/ahsp/upah" element={<PriceList user={user} />} />
                <Route path="/ahsp/bahan" element={<PriceList user={user} />} />
                <Route path="/ahsp/alat" element={<PriceList user={user} />} />
                <Route path="/pengguna" element={<UserManagement user={user} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}
