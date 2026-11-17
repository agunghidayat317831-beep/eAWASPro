import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { getUserProfile, getUserProfileByEmail, createUserProfile, deleteUser } from './services/firestore';
import { UserProfile } from './types';

import FloatingPillNav from './components/FloatingPillNav';
import ErrorBoundary from './components/ErrorBoundary';

// Eagerly load primary entry pages so the main screen renders immediately without chunk waterfall
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Lazy-loaded secondary pages
const ProjectList = lazy(() => import('./pages/ProjectList'));
const PhotoGallery = lazy(() => import('./pages/PhotoGallery'));
const ProjectMap = lazy(() => import('./pages/ProjectMap'));
const WeeklyReport = lazy(() => import('./pages/WeeklyReport'));
const SCurve = lazy(() => import('./pages/SCurve'));
const ProviderList = lazy(() => import('./pages/ProviderList'));
const AHSP = lazy(() => import('./pages/AHSP'));
const PriceList = lazy(() => import('./pages/PriceList'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const RAB = lazy(() => import('./pages/RAB'));
const TechnicalSpecs = lazy(() => import('./pages/TechnicalSpecs'));

const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
    <p className="text-xs font-semibold text-slate-400">Memuat halaman...</p>
  </div>
);

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Safety fallback so loading screen never hangs indefinitely if Auth/IndexedDB stalls
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2500);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        clearTimeout(safetyTimer);
        try {
          if (firebaseUser) {
            const isOwnerAdmin = firebaseUser.email === 'agunghidayat317831@gmail.com';
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: isOwnerAdmin ? 'admin' : 'user',
            };

            // Unblock UI immediately with fallback profile so Dashboard renders without waiting on Firestore
            if (isMounted) {
              setUser((prev) => (prev?.uid === firebaseUser.uid ? prev : fallbackProfile));
              setLoading(false);
            }

            // Sync full Firestore profile in background
            try {
              let profile = await getUserProfile(firebaseUser.uid);

              if (!profile && firebaseUser.email) {
                const pendingProfile = await getUserProfileByEmail(firebaseUser.email);
                if (pendingProfile) {
                  profile = {
                    ...pendingProfile,
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || pendingProfile.name || 'User',
                  };
                  const { isPending, ...cleanProfile } = profile as any;
                  await createUserProfile(cleanProfile);

                  if (pendingProfile.uid.startsWith('pending_')) {
                    await deleteUser(pendingProfile.uid);
                  }
                }
              }

              if (!profile) {
                await createUserProfile(fallbackProfile);
                profile = fallbackProfile;
              }

              if (profile && isOwnerAdmin) {
                profile.role = 'admin';
              }

              if (isMounted && profile) {
                setUser(profile);
              }
            } catch (profileErr) {
              console.error('Gagal memuat profil Firestore, menggunakan profil fallback:', profileErr);
            }
          } else if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        } catch (err) {
          console.error('Auth state error:', err);
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        }
      },
      (authError) => {
        console.error('Firebase Auth listener error:', authError);
        clearTimeout(safetyTimer);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <p className="text-xs font-semibold text-slate-500">Memuat e-AWAS Pro...</p>
      </div>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-50">
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

