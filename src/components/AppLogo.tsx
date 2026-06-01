import React from 'react';
import { ClipboardCheck, Settings, Home, Leaf } from 'lucide-react';

const AppLogo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Container for the logo elements */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        {/* Wheat/Leafe arch on top - curving around */}
        <div className="absolute inset-0 z-0">
          <Leaf size={16} className="absolute -top-1 left-0 text-emerald-500 rotate-[-45deg]" />
          <Leaf size={16} className="absolute -top-1 right-0 text-emerald-500 rotate-[45deg] scale-x-[-1]" />
          <Leaf size={14} className="absolute top-2 -left-2 text-emerald-400 rotate-[-70deg]" />
          <Leaf size={14} className="absolute top-2 -right-2 text-emerald-400 rotate-[70deg] scale-x-[-1]" />
        </div>

        {/* Side Gears */}
        <Settings size={14} className="absolute left-[-10px] top-1/2 -translate-y-1/2 text-slate-400 animate-[spin_10s_linear_infinite]" />
        <Settings size={14} className="absolute right-[-10px] top-1/2 -translate-y-1/2 text-slate-400 animate-[spin_10s_linear_infinite_reverse]" />

        {/* Main Clipboard Container */}
        <div className="bg-white rounded-lg p-1.5 shadow-lg border border-slate-200 z-10 flex items-center justify-center transform hover:scale-105 transition-transform">
          <ClipboardCheck size={24} className="text-emerald-600 font-bold" />
        </div>

        {/* House at bottom - centered and slightly overlapping */}
        <div className="absolute -bottom-2 z-20 bg-slate-900 rounded-md p-1 border border-slate-700 shadow-xl shadow-slate-900/40">
          <Home size={14} className="text-white" />
        </div>
      </div>
    </div>
  );
};

export default AppLogo;
