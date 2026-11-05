import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';
import { 
  getUserProfile, 
  createUserProfile, 
  getUserProfileByEmail, 
  getUserProfileByUsername, 
  deleteUser 
} from '../services/firestore';
import { 
  Lock, 
  User as UserIcon, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2
} from 'lucide-react';
import AppLogo from '../components/AppLogo';

export default function Login() {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form inputs
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');

  const handleResetPassword = async () => {
    if (!loginIdentifier || !loginIdentifier.includes('@')) {
      setError('Masukkan alamat email yang valid di kolom login untuk mereset kata sandi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, loginIdentifier.trim());
      setSuccessMessage('Tautan reset password telah dikirim ke email Anda.');
    } catch (err: any) {
      setError('Gagal mengirim email reset: ' + (err.message || 'Coba lagi nanti.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      let loginEmail = '';
      const identifier = loginIdentifier.trim();

      if (identifier.includes('@')) {
        loginEmail = identifier;
      } else {
        const profile = await getUserProfileByUsername(identifier);
        if (!profile) {
          setError('Username atau email tidak terdaftar di sistem e-AWAS Pro.');
          setLoading(false);
          return;
        }
        loginEmail = profile.email;
      }

      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err: any) {
      const errorCode = err.code || '';
      const errorMessage = err.message || '';

      if (
        errorCode === 'auth/user-not-found' ||
        errorCode === 'auth/wrong-password' ||
        errorCode === 'auth/invalid-credential' ||
        errorMessage.includes('auth/invalid-credential')
      ) {
        setError('Username/Email atau password salah. Pastikan kredensial Anda benar.');
      } else if (errorCode === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat atau reset password.');
      } else {
        setError('Gagal masuk: ' + (errorMessage || 'Periksa koneksi Anda.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    if (!registerEmail) {
      setError('Email wajib diisi.');
      setLoading(false);
      return;
    }
    if (!registerUsername) {
      setError('Username wajib diisi.');
      setLoading(false);
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, registerEmail.trim(), registerPassword);
      const user = result.user;

      const cleanName = registerName.trim() || registerUsername.trim();
      await updateProfile(user, { displayName: cleanName });

      // Check for pending profile created by admin
      const pendingProfile = await getUserProfileByEmail(registerEmail.trim());

      if (pendingProfile && (pendingProfile as any).isPending) {
        await createUserProfile({
          ...pendingProfile,
          uid: user.uid,
          username: registerUsername.toLowerCase().replace(/\s+/g, ''),
          name: cleanName,
          password: registerPassword,
          isPending: false
        } as any);

        if (pendingProfile.uid.startsWith('pending_')) {
          await deleteUser(pendingProfile.uid);
        }
      } else if (!pendingProfile) {
        await createUserProfile({
          uid: user.uid,
          email: user.email!,
          username: registerUsername.toLowerCase().replace(/\s+/g, ''),
          name: cleanName,
          password: registerPassword,
          role: 'user'
        });
      }
    } catch (err: any) {
      const errorCode = err.code || '';
      if (errorCode === 'auth/email-already-in-use') {
        setError('Email ini sudah terdaftar. Silakan pindah ke halaman Login.');
      } else if (errorCode === 'auth/weak-password') {
        setError('Password terlalu singkat (minimal 6 karakter).');
      } else {
        setError('Gagal mendaftar: ' + (err.message || 'Coba lagi.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#212529] flex flex-col items-center justify-center p-4 selection:bg-[#7494ec] selection:text-white font-sans antialiased">
      
      {/* Embedded CSS for exact 1:1 smooth animations from the reference video */}
      <style>{`
        .custom-auth-container {
          position: relative;
          width: 850px;
          height: 550px;
          background: #ffffff;
          border-radius: 30px;
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.35);
          overflow: hidden;
        }

        /* Form boxes styling */
        .custom-form-box {
          position: absolute;
          top: 0;
          width: 50%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          transition: all 0.6s ease-in-out;
          z-index: 1;
        }

        .custom-form-box.login-box {
          left: 0;
          z-index: 2;
          opacity: 1;
          pointer-events: auto;
        }

        .custom-auth-container.active .custom-form-box.login-box {
          transform: translateX(100%);
          opacity: 0;
          pointer-events: none;
        }

        .custom-form-box.register-box {
          left: 0;
          z-index: 1;
          opacity: 0;
          pointer-events: none;
        }

        .custom-auth-container.active .custom-form-box.register-box {
          transform: translateX(100%);
          opacity: 1;
          pointer-events: auto;
          z-index: 2;
        }

        /* Sliding toggle box */
        .custom-toggle-box {
          position: absolute;
          top: 0;
          left: 50%;
          width: 50%;
          height: 100%;
          background: #7494ec;
          border-radius: 150px 0 0 150px;
          z-index: 10;
          color: #ffffff;
          transition: all 0.6s ease-in-out;
          overflow: hidden;
        }

        .custom-auth-container.active .custom-toggle-box {
          left: 0;
          border-radius: 0 150px 150px 0;
        }

        .custom-toggle-panel {
          position: absolute;
          top: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 0 35px;
          text-align: center;
          transition: all 0.6s ease-in-out;
        }

        /* Left toggle panel (Hello, Welcome! -> Prompt Register) */
        .custom-toggle-panel.panel-left {
          left: 0;
          opacity: 1;
          pointer-events: auto;
          transition-delay: 0.1s;
        }

        .custom-auth-container.active .custom-toggle-panel.panel-left {
          transform: translateX(-100%);
          opacity: 0;
          pointer-events: none;
          transition-delay: 0s;
        }

        /* Right toggle panel (Welcome Back! -> Prompt Login) */
        .custom-toggle-panel.panel-right {
          right: 0;
          transform: translateX(100%);
          opacity: 0;
          pointer-events: none;
          transition-delay: 0s;
        }

        .custom-auth-container.active .custom-toggle-panel.panel-right {
          transform: translateX(0);
          opacity: 1;
          pointer-events: auto;
          transition-delay: 0.1s;
        }

        /* Mobile fallback adjustments */
        @media (max-width: 768px) {
          .custom-auth-container {
            width: 100%;
            height: auto;
            min-height: 600px;
            border-radius: 24px;
          }
          .custom-form-box {
            position: relative;
            width: 100%;
            height: auto;
            padding: 24px;
            transform: none !important;
            opacity: 1 !important;
            display: block;
          }
          .custom-toggle-box {
            display: none;
          }
        }
      `}</style>

      {/* Top Title as in the Video ("Modern Login/Signup Form") */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
          <span className="text-[#6c8cff]">e-AWAS</span> Pro
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
          Sistem Monitoring Proyek Pemerintah
        </p>
      </div>

      {/* The Animated Container */}
      <div className={`custom-auth-container ${isActive ? 'active' : ''}`}>
        
        {/* ======================================================= */}
        {/* 1. LOGIN FORM BOX (Left position, moves right on active) */}
        {/* ======================================================= */}
        <div className={`custom-form-box login-box ${isActive ? 'max-md:hidden' : 'max-md:block'}`}>
          <div className="w-[85%] max-w-[340px] mx-auto py-8">
            <h1 className="text-3xl font-extrabold text-slate-900 text-center mb-6">Login</h1>

            {error && !isActive && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                {error}
              </div>
            )}

            {successMessage && !isActive && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                {successMessage}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Username / Email field */}
              <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-4 py-3 border border-transparent focus-within:border-[#7494ec] transition-colors">
                <input
                  required
                  type="text"
                  placeholder="Username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none pr-8 font-medium"
                />
                <UserIcon size={18} className="absolute right-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Password field */}
              <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-4 py-3 border border-transparent focus-within:border-[#7494ec] transition-colors">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none pr-8 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Lock size={18} />}
                </button>
              </div>

              {/* Forgot password */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs font-medium text-slate-500 hover:text-[#7494ec] transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#7494ec] hover:bg-[#5f82e8] text-white font-bold text-sm shadow-md shadow-[#7494ec]/30 transition-all hover:shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Login'}
              </button>
            </form>

            {/* Social logins */}
            <div className="mt-7 text-center">
              <p className="text-xs text-slate-400 font-medium mb-3">
                or login with social platforms
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setLoginIdentifier('agunghidayat317831@gmail.com')}
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#7494ec] hover:border-[#7494ec] hover:bg-slate-50 transition-all font-bold text-sm cursor-pointer"
                  title="Admin"
                >
                  G
                </button>
                <button
                  type="button"
                  onClick={() => setLoginIdentifier('pengawas')}
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#7494ec] hover:border-[#7494ec] hover:bg-slate-50 transition-all font-bold text-sm cursor-pointer"
                  title="Pengawas"
                >
                  P
                </button>
                <button
                  type="button"
                  onClick={() => setLoginIdentifier('ppk')}
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#7494ec] hover:border-[#7494ec] hover:bg-slate-50 transition-all font-bold text-sm cursor-pointer"
                  title="PPK"
                >
                  K
                </button>
                <button
                  type="button"
                  onClick={() => setLoginIdentifier('penyedia')}
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#7494ec] hover:border-[#7494ec] hover:bg-slate-50 transition-all font-bold text-sm cursor-pointer"
                  title="Penyedia CV/PT"
                >
                  in
                </button>
              </div>

              {/* Mobile button to toggle */}
              <div className="mt-6 md:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccessMessage('');
                    setIsActive(true);
                  }}
                  className="text-xs font-bold text-[#7494ec] hover:underline"
                >
                  Belum punya akun? Buat Akun Baru (Register)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* 2. REGISTER FORM BOX (Left position, slides in on active)  */}
        {/* ========================================================== */}
        <div className={`custom-form-box register-box ${!isActive ? 'max-md:hidden' : 'max-md:block'}`}>
          <div className="w-[85%] max-w-[340px] mx-auto py-8">
            <h1 className="text-3xl font-extrabold text-slate-900 text-center mb-6">Registration</h1>

            {error && isActive && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Username */}
              <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-4 py-3 border border-transparent focus-within:border-[#7494ec] transition-colors">
                <input
                  required
                  type="text"
                  placeholder="Username"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none pr-8 font-medium"
                />
                <UserIcon size={18} className="absolute right-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Email */}
              <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-4 py-3 border border-transparent focus-within:border-[#7494ec] transition-colors">
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none pr-8 font-medium"
                />
                <Mail size={18} className="absolute right-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Password */}
              <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-4 py-3 border border-transparent focus-within:border-[#7494ec] transition-colors">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none pr-8 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Lock size={18} />}
                </button>
              </div>

              {/* Full name (Optional) */}
              <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-4 py-3 border border-transparent focus-within:border-[#7494ec] transition-colors">
                <input
                  type="text"
                  placeholder="Nama Lengkap (Opsional)"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none pr-8 font-medium"
                />
                <UserIcon size={18} className="absolute right-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#7494ec] hover:bg-[#5f82e8] text-white font-bold text-sm shadow-md shadow-[#7494ec]/30 transition-all hover:shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Register'}
              </button>
            </form>

            {/* Social logins */}
            <div className="mt-5 text-center">
              <p className="text-xs text-slate-400 font-medium mb-3">
                or register with social platforms
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">G</span>
                <span className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">f</span>
                <span className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">🐙</span>
                <span className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">in</span>
              </div>

              {/* Mobile button to toggle */}
              <div className="mt-4 md:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccessMessage('');
                    setIsActive(false);
                  }}
                  className="text-xs font-bold text-[#7494ec] hover:underline"
                >
                  Sudah punya akun? Masuk di sini (Login)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. SLIDING TOGGLE BOX & PANELS                                 */}
        {/* ============================================================== */}
        <div className="custom-toggle-box">
          
          {/* Panel Left (Shown initially: "Hello, Welcome! Don't have an account? -> Register") */}
          <div className="custom-toggle-panel panel-left">
            <div className="mb-4 w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <AppLogo />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">
              Hello, Welcome!
            </h1>
            <p className="text-xs text-blue-100 font-medium mb-8 max-w-[240px]">
              Don&apos;t have an account?
            </p>
            <button
              type="button"
              id="register"
              onClick={() => {
                setError('');
                setSuccessMessage('');
                setIsActive(true);
              }}
              className="py-3 px-10 rounded-2xl border-2 border-white text-white font-bold text-xs uppercase tracking-wider hover:bg-white hover:text-[#7494ec] transition-all cursor-pointer shadow-lg active:scale-95"
            >
              Register
            </button>
          </div>

          {/* Panel Right (Shown when active: "Welcome Back! Already have an account? -> Login") */}
          <div className="custom-toggle-panel panel-right">
            <div className="mb-4 w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <AppLogo />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">
              Welcome Back!
            </h1>
            <p className="text-xs text-blue-100 font-medium mb-8 max-w-[240px]">
              Already have an account?
            </p>
            <button
              type="button"
              id="login"
              onClick={() => {
                setError('');
                setSuccessMessage('');
                setIsActive(false);
              }}
              className="py-3 px-10 rounded-2xl border-2 border-white text-white font-bold text-xs uppercase tracking-wider hover:bg-white hover:text-[#7494ec] transition-all cursor-pointer shadow-lg active:scale-95"
            >
              Login
            </button>
          </div>

        </div>

      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-500 font-medium">
        &copy; 2026 e-AWAS Pro &bull; Aplikasi Pengawasan dan Monitoring Proyek Konstruksi
      </div>
    </div>
  );
}
