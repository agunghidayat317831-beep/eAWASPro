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
  Calculator,
  FileCheck
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
import TechnicalSpecs from './pages/TechnicalSpecs';
import Login from './pages/Login';

import AppLogo from './components/AppLogo';
import FloatingPillNav from './components/FloatingPillNav';

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
          <div className="relative min-h-screen">
            <FloatingPillNav user={user} onLogout={handleLogout} />
            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pt-20 sm:pt-24 pb-28 sm:pb-32 min-w-0 w-full overflow-x-hidden">
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
                <Route path="/spesifikasi-teknis" element={<TechnicalSpecs user={user} />} />
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
