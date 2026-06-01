import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile, createUserProfile, getUserProfileByEmail, getUserProfileByUsername, deleteUser } from '../services/firestore';
import { LogIn, ShieldCheck, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

import AppLogo from '../components/AppLogo';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: ''
  });

  const handleResetPassword = async () => {
    if (!formData.email) {
      setError('Silakan masukkan email Anda terlebih dahulu untuk reset password.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, formData.email);
      setError('Link reset password telah dikirim ke email Anda. Silakan cek kotak masuk (atau folder spam).');
    } catch (err: any) {
      setError('Gagal mengirim email reset: ' + (err.message || 'Coba lagi nanti.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        let loginEmail = '';
        const identifier = formData.username.trim();

        // Check if identifier is email or username
        const isEmail = identifier.includes('@');

        if (isEmail) {
          loginEmail = identifier;
        } else {
          // Login via username - find profile first
          const profile = await getUserProfileByUsername(identifier);
          if (!profile) {
            setError('Username atau email tidak ditemukan. Silakan periksa kembali atau hubungi administrator.');
            setLoading(false);
            return;
          }
          loginEmail = profile.email;
        }

        await signInWithEmailAndPassword(auth, loginEmail, formData.password);
      } else {
        // Register logic (requires email)
        if (!formData.email) {
          setError('Email wajib diisi untuk pendaftaran akun.');
          setLoading(false);
          return;
        }
        if (!formData.username && !isLogin) {
          setError('Username wajib diisi.');
          setLoading(false);
          return;
        }
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = result.user;

        if (formData.name) {
          await updateProfile(user, { displayName: formData.name });
        }

        // Check if a pending profile exists for this email
        const pendingProfile = await getUserProfileByEmail(formData.email);
        
        if (pendingProfile && (pendingProfile as any).isPending) {
          // Link the pending profile to the new UID
          await createUserProfile({
            ...pendingProfile,
            uid: user.uid,
            username: formData.username || pendingProfile.username || formData.email.split('@')[0],
            name: formData.name || pendingProfile.name,
            password: formData.password, // Save password for admin visibility
            isPending: false
          } as any);
          
          // Delete the temporary pending document
          await deleteUser(pendingProfile.uid);
        } else if (!pendingProfile) {
          // Create a new profile if none exists
          await createUserProfile({
            uid: user.uid,
            email: user.email!,
            username: formData.username || user.email!.split('@')[0],
            name: formData.name || 'User',
            password: formData.password, // Save password for admin visibility
            role: 'user'
          });
        }
      }
    } catch (err: any) {
      const errorCode = err.code || "";
      const errorMessage = err.message || "";
      
      if (errorCode === 'auth/user-not-found' || 
          errorCode === 'auth/wrong-password' || 
          errorCode === 'auth/invalid-credential' ||
          errorMessage.includes('auth/invalid-credential')) {
        setError('Email atau password salah. Jika ini pertama kalinya Anda masuk, pastikan Anda telah mendaftar melalui menu "Daftar Akun" terlebih dahulu.');
      } else if (errorCode === 'auth/email-already-in-use') {
        setError('Email ini sudah terdaftar sebagai akun aktif. Silakan gunakan menu "Login" untuk masuk.');
      } else if (errorCode === 'auth/weak-password') {
        setError('Password terlalu lemah. Minimal harus 6 karakter.');
      } else if (errorCode === 'auth/invalid-email') {
        setError('Alamat email tidak valid. Periksa kembali penulisan email Anda.');
      } else if (errorCode === 'auth/user-disabled') {
        setError('Akun ini telah dinonaktifkan oleh administrator.');
      } else if (errorCode === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan masuk yang gagal. Akun dikunci sementara untuk keamanan. Silakan coba lagi nanti atau reset password.');
      } else if (errorCode === 'auth/network-request-failed') {
        setError('Gagal menghubungkan ke server. Periksa koneksi internet Anda.');
      } else {
        setError('Terjadi kesalahan saat masuk: ' + (errorMessage || 'Silakan hubungi admin.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-6 bg-white/5 rounded-[2.5rem] mb-4 border border-white/10 backdrop-blur-sm">
            <AppLogo className="scale-150" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">e-AWAS Pro</h1>
          <p className="text-slate-400 font-medium">Sistem Monitoring Proyek Pemerintah</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">
              {isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
            </h2>
            <p className="text-sm text-slate-400">
              {isLogin 
                ? 'Silakan login untuk mengakses dashboard monitoring.' 
                : 'Daftar untuk mulai memantau proyek pembangunan.'}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      required
                      type="text"
                      placeholder="Nama Anda"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      required
                      type="text"
                      placeholder="username_baru"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">{isLogin ? 'Email atau Username' : 'Email'}</label>
              <div className="relative">
                {isLogin ? (
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                ) : (
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                )}
                <input
                  required
                  type="text"
                  placeholder={isLogin ? "email@anda.com atau username" : "email@instansi.go.id"}
                  value={isLogin ? formData.username : formData.email}
                  onChange={(e) => setFormData({ ...formData, [isLogin ? 'username' : 'email']: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-900/20 mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isLogin ? 'Masuk Sekarang' : 'Daftar Akun'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 text-center space-y-4">
            {isLogin && (
              <button
                onClick={handleResetPassword}
                className="block w-full text-xs font-medium text-slate-500 hover:text-emerald-400 transition-colors"
              >
                Lupa password? Klik untuk reset
              </button>
            )}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {isLogin ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Login di sini'}
            </button>
            <p className="text-xs text-slate-500">
              Dengan masuk, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi kami.
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-slate-600 text-xs font-medium">© 2026 e-AWAS Pro Indonesia. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
