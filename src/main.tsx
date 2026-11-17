import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

declare global {
  interface Window {
    __EAWAS_MOUNTED__?: boolean;
  }
}

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    window.__EAWAS_MOUNTED__ = true;
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err: any) {
    console.error('Fatal mount error:', err);
    rootElement.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:system-ui,sans-serif;padding:16px;">' +
        '<div style="max-width:420px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:24px;text-align:center;">' +
          '<h2 style="font-size:16px;font-weight:800;color:#0f172a;margin:0 0 8px;">Gagal Memulai Aplikasi</h2>' +
          '<p style="font-size:12px;color:#64748b;margin:0 0 16px;">' + (err?.message || 'Kesalahan inisialisasi.') + '</p>' +
          '<button onclick="window.location.reload()" style="background:#059669;color:#fff;border:none;border-radius:12px;padding:10px 18px;font-size:12px;font-weight:700;cursor:pointer;">Muat Ulang</button>' +
        '</div>' +
      '</div>';
  }
}
