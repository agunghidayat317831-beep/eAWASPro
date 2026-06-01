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

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-emerald-600 text-white rounded-md shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <AppLogo />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-emerald-400 leading-tight">e-AWAS Pro</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-semibold">Monitoring Proyek</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
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
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                    `}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.name}</span>
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

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
                <UserIcon size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user?.role || 'User'}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-xl transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
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
            <main className="flex-1 lg:ml-64 p-4 lg:p-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/proyek" element={<ProjectList user={user} />} />
                <Route path="/penyedia" element={<ProviderList user={user} />} />
                <Route path="/foto" element={<PhotoGallery user={user} />} />
                <Route path="/laporan" element={<WeeklyReport user={user} />} />
                <Route path="/kurva-s" element={<SCurve />} />
                <Route path="/peta" element={<ProjectMap />} />
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
