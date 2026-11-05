import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  Building2,
  AlertTriangle,
  Wallet,
  ShieldAlert,
  Activity,
  Layers,
  Calendar,
  Filter
} from 'lucide-react';
import { getProjects, getProviders } from '../services/firestore';
import { Project, UserProfile, Provider } from '../types';

interface InteractiveStatCardProps {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  textColor?: string;
  subValue?: string;
  trend?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

const StatCard: React.FC<InteractiveStatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  textColor = 'text-white',
  subValue, 
  trend,
  onClick,
  isSelected
}) => (
  <div 
    onClick={onClick}
    className={`bg-white p-4 sm:p-5 rounded-2xl shadow-sm border transition-all cursor-pointer hover:shadow-md ${
      isSelected 
        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' 
        : 'border-slate-100 hover:border-slate-200'
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 mb-1 truncate">{title}</p>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
        {subValue && (
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-medium">{subValue}</p>
        )}
      </div>
      <div className={`p-2.5 sm:p-3 rounded-2xl shrink-0 shadow-sm ${color}`}>
        <Icon size={20} className={textColor} />
      </div>
    </div>
    {trend && (
      <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px] font-semibold text-slate-500">
        <span>{trend}</span>
        <ArrowUpRight size={13} className="text-slate-400" />
      </div>
    )}
  </div>
);

export default function Dashboard({ user }: { user: UserProfile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  
  // Interactive Filter selection: 'all' | 'ongoing' | 'completed' | 'critical' | 'delayed' | 'not_started'
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [chartViewMode, setChartViewMode] = useState<'budget' | 'progress' | 'delay'>('budget');

  useEffect(() => {
    const unsubscribeProjects = getProjects((data) => {
      setAllProjects(data);
      if (user?.role === 'pengawas') {
        const currentSupervisorName = user.name || user.username || user.email;
        const filtered = data.filter(p => {
          if (!p.supervisorName) return false;
          return p.supervisorName === currentSupervisorName ||
                 p.supervisorName === user.name ||
                 p.supervisorName === user.username ||
                 p.supervisorName === user.email;
        });
        setProjects(filtered);
      } else {
        setProjects(data);
      }
    });

    const unsubscribeProviders = getProviders((data) => {
      setProviders(data);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeProviders();
    };
  }, [user]);

  // Project delay analysis calculation
  const evaluatedProjects = useMemo(() => {
    const now = new Date();
    
    return projects.map(p => {
      const spmk = p.spmkDate ? new Date(p.spmkDate) : (p.contractDate ? new Date(p.contractDate) : null);
      const period = p.executionPeriod && p.executionPeriod > 0 ? p.executionPeriod : 120;
      
      let timeProgressPercent = 0;
      let daysElapsed = 0;
      let daysRemaining = period;

      if (spmk && !isNaN(spmk.getTime())) {
        const diffTime = now.getTime() - spmk.getTime();
        daysElapsed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        daysRemaining = Math.max(0, period - daysElapsed);
        timeProgressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / period) * 100)));
      }

      const progress = Number(p.progress) || 0;
      // Deviation between physical progress and elapsed contract time
      const deviation = progress - timeProgressPercent;

      // Status classification
      let delayStatus: 'on_track' | 'slight_delay' | 'critical' | 'completed' | 'not_started' = 'not_started';
      let delayLabel = 'Belum Mulai';

      if (progress >= 100) {
        delayStatus = 'completed';
        delayLabel = 'Selesai';
      } else if (progress === 0 && daysElapsed === 0) {
        delayStatus = 'not_started';
        delayLabel = 'Belum Mulai';
      } else if (deviation >= 0) {
        delayStatus = 'on_track';
        delayLabel = 'On Track (Tepat Waktu)';
      } else if (deviation <= -10) {
        delayStatus = 'critical';
        delayLabel = 'Kontrak Kritis (Terlambat Parah)';
      } else {
        delayStatus = 'slight_delay';
        delayLabel = 'Terlambat Ringan';
      }

      return {
        ...p,
        daysElapsed,
        daysRemaining,
        timeProgressPercent,
        deviation,
        delayStatus,
        delayLabel
      };
    });
  }, [projects]);

  // Aggregate Key Metrics
  const totalProjects = evaluatedProjects.length;
  const completedProjects = evaluatedProjects.filter(p => p.delayStatus === 'completed').length;
  const ongoingProjects = evaluatedProjects.filter(p => p.progress > 0 && p.progress < 100).length;
  const notStartedProjects = evaluatedProjects.filter(p => p.progress === 0).length;
  
  // Real-time delay status counts
  const onTrackCount = evaluatedProjects.filter(p => p.delayStatus === 'on_track').length;
  const slightDelayCount = evaluatedProjects.filter(p => p.delayStatus === 'slight_delay').length;
  const criticalDelayCount = evaluatedProjects.filter(p => p.delayStatus === 'critical').length;

  // Total Nilai Anggaran Proyek
  const totalBudget = useMemo(() => {
    return evaluatedProjects.reduce((acc, p) => acc + (Number(p.anggaran) || 0), 0);
  }, [evaluatedProjects]);

  const ongoingBudget = useMemo(() => {
    return evaluatedProjects
      .filter(p => p.progress > 0 && p.progress < 100)
      .reduce((acc, p) => acc + (Number(p.anggaran) || 0), 0);
  }, [evaluatedProjects]);

  const averageProgress = totalProjects > 0 
    ? Math.round(evaluatedProjects.reduce((acc, p) => acc + p.progress, 0) / totalProjects) 
    : 0;

  // Format IDR Currency
  const formatRupiah = (val: number) => {
    if (val >= 1_000_000_000_000) {
      return `Rp ${(val / 1_000_000_000_000).toFixed(2)} T`;
    }
    if (val >= 1_000_000_000) {
      return `Rp ${(val / 1_000_000_000).toFixed(2)} M`;
    }
    if (val >= 1_000_000) {
      return `Rp ${(val / 1_000_000).toFixed(1)} Jt`;
    }
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  // Filtered List based on interactive clicks
  const filteredProjects = useMemo(() => {
    if (selectedFilter === 'all') return evaluatedProjects;
    if (selectedFilter === 'ongoing') return evaluatedProjects.filter(p => p.progress > 0 && p.progress < 100);
    if (selectedFilter === 'completed') return evaluatedProjects.filter(p => p.progress === 100);
    if (selectedFilter === 'critical') return evaluatedProjects.filter(p => p.delayStatus === 'critical');
    if (selectedFilter === 'slight_delay') return evaluatedProjects.filter(p => p.delayStatus === 'slight_delay');
    if (selectedFilter === 'on_track') return evaluatedProjects.filter(p => p.delayStatus === 'on_track');
    if (selectedFilter === 'not_started') return evaluatedProjects.filter(p => p.progress === 0);
    return evaluatedProjects;
  }, [evaluatedProjects, selectedFilter]);

  // Chart 1: Delay Status Recharts Pie
  const delayPieData = useMemo(() => {
    return [
      { name: 'On Track', value: onTrackCount, color: '#10b981', desc: 'Kemajuan sesuai jadwal rencana' },
      { name: 'Terlambat Ringan', value: slightDelayCount, color: '#f59e0b', desc: 'Deviasi di bawah 10%' },
      { name: 'Kontrak Kritis', value: criticalDelayCount, color: '#ef4444', desc: 'Deviasi parah (perlu SP)' },
      { name: 'Selesai (100%)', value: completedProjects, color: '#059669', desc: 'Serah terima pekerjaan PHO' },
      { name: 'Belum Mulai', value: notStartedProjects, color: '#94a3b8', desc: 'Progres 0% awal' }
    ].filter(d => d.value > 0);
  }, [onTrackCount, slightDelayCount, criticalDelayCount, completedProjects, notStartedProjects]);

  // Chart 2: Top Projects interactive comparison bar data
  const topProjectsData = useMemo(() => {
    return filteredProjects.slice(0, 8).map(p => ({
      id: p.id,
      name: p.name.length > 18 ? p.name.substring(0, 18) + '...' : p.name,
      fullName: p.name,
      progress: p.progress,
      anggaranMiliar: Number(((p.anggaran || 0) / 1_000_000_000).toFixed(2)),
      deviation: p.deviation,
      delayStatus: p.delayStatus,
      ptCv: p.ptCv
    }));
  }, [filteredProjects]);

  // Provider SKP calculation
  const totalProviders = providers.length;
  const providerSKPList = providers.map(p => {
    const ongoingCount = allProjects.filter(project => 
      (project.providerId === p.id || (project.ptCv && project.ptCv === p.name)) && 
      project.progress < 100
    ).length;
    const score = 5 - ongoingCount;
    return {
      providerId: p.id,
      skp: score < 0 ? 0 : score
    };
  });
  const providersWithSKPZero = providerSKPList.filter(item => item.skp === 0).length;
  const providersWithSKPGreaterThanZero = providerSKPList.filter(item => item.skp > 0).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dashboard Monitoring</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Ringkasan statistik interaktif nilai anggaran, progres fisik, dan status keterlambatan real-time.
          </p>
        </div>

        {/* Quick Filter Reset Indicator */}
        {selectedFilter !== 'all' && (
          <button
            onClick={() => setSelectedFilter('all')}
            className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
          >
            <span>Reset Filter: <strong>{selectedFilter.toUpperCase()}</strong></span>
            <span className="text-slate-500 hover:text-slate-900">✕</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* 1. ROW STATISTIK UTAMA (ANGGARAN, REALISASI, STATUS)            */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Nilai Anggaran */}
        <StatCard 
          title="Total Nilai Proyek" 
          value={formatRupiah(totalBudget)} 
          icon={Wallet} 
          color="bg-emerald-600"
          subValue={`Anggaran Berjalan: ${formatRupiah(ongoingBudget)}`}
          trend={`${totalProjects} Paket Pekerjaan`}
          onClick={() => setSelectedFilter('all')}
          isSelected={selectedFilter === 'all'}
        />

        {/* Proyek Berjalan */}
        <StatCard 
          title="Proyek Sedang Berjalan" 
          value={ongoingProjects} 
          icon={Clock} 
          color="bg-blue-600"
          subValue={`${totalProjects > 0 ? Math.round((ongoingProjects / totalProjects) * 100) : 0}% dari seluruh paket`}
          trend="Klik untuk filter proyek berjalan"
          onClick={() => setSelectedFilter(selectedFilter === 'ongoing' ? 'all' : 'ongoing')}
          isSelected={selectedFilter === 'ongoing'}
        />

        {/* Status Kritis (Real-time Delay Indicator) */}
        <StatCard 
          title="Kontrak Kritis (Terlambat)" 
          value={criticalDelayCount} 
          icon={ShieldAlert} 
          color={criticalDelayCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-slate-400'}
          subValue={criticalDelayCount > 0 ? 'Deviasi fisik > 10% dari rencana' : 'Seluruh proyek on track'}
          trend="Perlu Surat Peringatan (SP)"
          onClick={() => setSelectedFilter(selectedFilter === 'critical' ? 'all' : 'critical')}
          isSelected={selectedFilter === 'critical'}
        />

        {/* Progres Rata-Rata */}
        <StatCard 
          title="Rata-rata Progres Fisik" 
          value={`${averageProgress}%`} 
          icon={TrendingUp} 
          color="bg-indigo-600"
          subValue={`${completedProjects} paket telah selesai 100%`}
          trend={`${onTrackCount} proyek on track`}
          onClick={() => setSelectedFilter(selectedFilter === 'completed' ? 'all' : 'completed')}
          isSelected={selectedFilter === 'completed'}
        />
      </div>

      {/* ============================================================== */}
      {/* 2. REAL-TIME DELAY MONITORING & INTERACTIVE RECHARTS           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Recharts Dynamic Project Breakdown (Bar / Area Chart) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity size={18} className="text-emerald-600" />
                  Visualisasi Komparasi Paket Proyek
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menampilkan {topProjectsData.length} proyek {selectedFilter !== 'all' ? `(Filter: ${selectedFilter})` : 'teratas'}.
                </p>
              </div>

              {/* Chart Mode Switcher Buttons */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartViewMode('budget')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    chartViewMode === 'budget' 
                      ? 'bg-white text-emerald-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nilai Anggaran
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('progress')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    chartViewMode === 'progress' 
                      ? 'bg-white text-blue-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Progres (%)
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('delay')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    chartViewMode === 'delay' 
                      ? 'bg-white text-red-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Deviasi Waktu
                </button>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="h-[280px] sm:h-[320px] w-full">
              {topProjectsData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Briefcase size={36} className="mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">Tidak ada proyek dalam kategori filter ini</p>
                  <button 
                    onClick={() => setSelectedFilter('all')} 
                    className="text-xs text-emerald-600 font-bold mt-2 hover:underline"
                  >
                    Tampilkan Semua Proyek
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProjectsData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(val) => {
                        if (chartViewMode === 'budget') return `${val} M`;
                        if (chartViewMode === 'progress') return `${val}%`;
                        return `${val}%`;
                      }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '12px'
                      }}
                      formatter={(val: any, name: any, item: any) => {
                        if (chartViewMode === 'budget') {
                          return [`Rp ${(val * 1_000_000_000).toLocaleString('id-ID')}`, 'Nilai Anggaran'];
                        }
                        if (chartViewMode === 'progress') {
                          return [`${val}%`, 'Progres Lapangan'];
                        }
                        return [`${val}%`, 'Deviasi Waktu'];
                      }}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item ? `${item.fullName} (${item.ptCv})` : label;
                      }}
                    />
                    <Bar 
                      dataKey={chartViewMode === 'budget' ? 'anggaranMiliar' : chartViewMode === 'progress' ? 'progress' : 'deviation'} 
                      radius={[6, 6, 0, 0]}
                    >
                      {topProjectsData.map((entry, index) => {
                        let fill = '#3b82f6';
                        if (chartViewMode === 'budget') {
                          fill = '#10b981';
                        } else if (chartViewMode === 'progress') {
                          fill = entry.progress === 100 ? '#10b981' : entry.progress >= 50 ? '#3b82f6' : '#ef4444';
                        } else {
                          fill = entry.deviation >= 0 ? '#10b981' : entry.deviation <= -10 ? '#ef4444' : '#f59e0b';
                        }
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick Chart Guide */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Selesai / On Track
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Berjalan / Sesuai
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Terlambat Ringan
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Kontrak Kritis
            </span>
          </div>
        </div>

        {/* Right: Real-time Keterlambatan Pie Chart & Interactive Filter */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle size={17} className="text-amber-500" />
                Status Keterlambatan Real-Time
              </h3>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-600">
                {totalProjects} Proyek
              </span>
            </div>

            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={delayPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {delayPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} Proyek`, 'Jumlah']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Interactive Legend with filter trigger */}
            <div className="space-y-2 mt-2">
              {delayPieData.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    if (item.name === 'On Track') setSelectedFilter('on_track');
                    else if (item.name === 'Terlambat Ringan') setSelectedFilter('slight_delay');
                    else if (item.name === 'Kontrak Kritis') setSelectedFilter('critical');
                    else if (item.name === 'Selesai (100%)') setSelectedFilter('completed');
                    else setSelectedFilter('not_started');
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 font-mono">{item.value}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      ({totalProjects > 0 ? Math.round((item.value / totalProjects) * 100) : 0}%)
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Evaluasi deviasi otomatis</span>
            <Link to="/kurva-s" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
              Lihat Kurva S <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 3. PENYEDIA & SKP OVERVIEW SECTION                             */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building2 size={18} className="text-slate-700 sm:w-5 sm:h-5" />
          Kapasitas &amp; Sisa Kemampuan Paket (SKP) Penyedia
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard 
            title="Total Penyedia Terdaftar" 
            value={totalProviders} 
            icon={Building2} 
            color="bg-slate-700" 
            subValue="Kontraktor rekanan dinas"
          />
          <StatCard 
            title="Penyedia SKP = 0 (Kapasitas Penuh)" 
            value={providersWithSKPZero} 
            icon={AlertTriangle} 
            color="bg-rose-500" 
            subValue="Sedang menangani 5 paket berjalan (Full)"
          />
          <StatCard 
            title="Penyedia SKP > 0 (Tersedia Kuota)" 
            value={providersWithSKPGreaterThanZero} 
            icon={CheckCircle2} 
            color="bg-teal-500" 
            subValue="Dapat ditunjuk untuk paket proyek baru"
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. DETAIL TABEL PROYEK (RESPONSIF DENGAN FILTER AKTIF)         */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Daftar Proyek</span>
              {selectedFilter !== 'all' && (
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                  Filter: {selectedFilter} ({filteredProjects.length})
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Evaluasi nilai kontrak, progres, dan toleransi deviasi per paket pekerjaan.
            </p>
          </div>
          <Link to="/proyek" className="text-xs sm:text-sm text-emerald-600 font-bold flex items-center gap-1 hover:underline">
            Kelola di Halaman Proyek <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Nama Proyek</th>
                <th className="px-6 py-4 font-semibold">Penyedia (PT/CV)</th>
                <th className="px-6 py-4 font-semibold">Nilai Anggaran</th>
                <th className="px-6 py-4 font-semibold">Progres Fisik</th>
                <th className="px-6 py-4 font-semibold">Status Keterlambatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                    Tidak ada proyek yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredProjects.slice(0, 10).map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{project.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{project.location}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {project.ptCv}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-slate-900">
                      Rp {project.anggaran.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              project.progress === 100 ? 'bg-emerald-500' : 
                              project.progress >= 50 ? 'bg-blue-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 font-mono">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {project.delayStatus === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 size={12} />
                          Selesai (100%)
                        </span>
                      ) : project.delayStatus === 'critical' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                          <ShieldAlert size={12} />
                          Kritis (Deviasi {project.deviation}%)
                        </span>
                      ) : project.delayStatus === 'slight_delay' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <Clock size={12} />
                          Terlambat ({project.deviation}%)
                        </span>
                      ) : project.delayStatus === 'on_track' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Activity size={12} />
                          On Track
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          Belum Mulai
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
