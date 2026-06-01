import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  ComposedChart,
  Scatter
} from 'recharts';
import { 
  getProjects, 
  getWeeklyReports,
  getProviders
} from '../services/firestore';
import { Project, WeeklyReport, Provider } from '../types';
import { 
  TrendingUp, 
  Calendar, 
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Mail,
  MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SCurve: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const initialSelectionDone = React.useRef(false);

  useEffect(() => {
    const unsubscribeProjects = getProjects((data) => {
      setProjects(data);
      if (!initialSelectionDone.current && data.length > 0) {
        setSelectedProject(data[0]);
        initialSelectionDone.current = true;
      }
      setLoading(false);
    });

    const unsubscribeProviders = getProviders(setProviders);

    return () => {
      unsubscribeProjects();
      unsubscribeProviders();
    };
  }, []);

  useEffect(() => {
    if (selectedProject) {
      setLoading(true);
      const unsubscribe = getWeeklyReports(selectedProject.id, (data) => {
        setReports(data);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [selectedProject]);

  // Calculate total weeks from execution period (masa pelaksanaan)
  const totalWeeks = selectedProject?.executionPeriod 
    ? Math.ceil(selectedProject.executionPeriod / 7) 
    : 5;

  const chartData = Array.from({ length: Math.max(totalWeeks, reports.length) }, (_, i) => {
    const weekNum = i + 1;
    const actualReport = reports.find(r => r.weekNumber === weekNum);
    
    // Determine planned progress using Sigmoid Progression Analysis
    // Formula: f(x) = x^n / (x^n + (1-x)^n) where x = t/N
    // This creates a smooth S-curve starting at 0% and ending at 100%
    let plannedValue: number | null = null;
    if (i < totalWeeks) {
      const x = weekNum / totalWeeks;
      const n = 3; // Steeping factor for S-curve
      const sigmoid = Math.pow(x, n) / (Math.pow(x, n) + Math.pow(1 - x, n));
      plannedValue = Number((sigmoid * 100).toFixed(2));
    } else {
      // Work beyond planned weeks should have a target of 100%
      plannedValue = 100;
    }
    
    return {
      name: `Minggu ${weekNum}`,
      rencana: plannedValue,
      realisasi: actualReport ? actualReport.cumulativeProgress : null,
      deviasi: actualReport && plannedValue ? (actualReport.cumulativeProgress - plannedValue).toFixed(2) : null
    };
  });

  const lastActual = reports.length > 0 ? reports[reports.length - 1].cumulativeProgress : 0;
  
  // Find planned value for the current week (based on number of reports)
  const currentWeekIdx = reports.length > 0 ? reports.length - 1 : 0;
  const lastPlanned = chartData[currentWeekIdx]?.rencana || 0;
  const deviation = (lastActual - lastPlanned).toFixed(2);

  const handleSendEmail = (weekNum: number, dev: string) => {
    if (!selectedProject) return;
    
    const provider = providers.find(p => p.name === selectedProject.ptCv);
    if (!provider || !provider.email) {
      alert(`Email penyedia ${selectedProject.ptCv} tidak ditemukan. Silakan lengkapi data penyedia di menu Penyedia.`);
      return;
    }

    const subject = encodeURIComponent(`Surat Peringatan - ${selectedProject.name} (Minggu ${weekNum})`);
    const body = encodeURIComponent(
      `Yth. Pimpinan ${selectedProject.ptCv},\n\n` +
      `Berdasarkan laporan mingguan proyek "${selectedProject.name}" pada Minggu ke-${weekNum}, ` +
      `ditemukan deviasi progres sebesar ${dev}% (Terlambat).\n\n` +
      `Mohon segera dilakukan percepatan pekerjaan agar proyek dapat selesai sesuai jadwal.\n\n` +
      `Terima kasih.`
    );

    window.location.href = `mailto:${provider.email}?subject=${subject}&body=${body}`;
  };

  const handleSendWhatsApp = (weekNum: number, dev: string) => {
    if (!selectedProject) return;
    
    const provider = providers.find(p => p.name === selectedProject.ptCv);
    if (!provider || !provider.phone) {
      alert(`Nomor WhatsApp penyedia ${selectedProject.ptCv} tidak ditemukan. Silakan lengkapi data penyedia di menu Penyedia.`);
      return;
    }

    // Format phone number: remove non-numeric, replace leading 0 with 62
    let phone = provider.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    const message = encodeURIComponent(
      `*SURAT PERINGATAN*\n\n` +
      `Yth. Pimpinan *${selectedProject.ptCv}*,\n\n` +
      `Berdasarkan laporan mingguan proyek *${selectedProject.name}* pada Minggu ke-${weekNum}, ` +
      `ditemukan deviasi progres sebesar *${dev}%* (Terlambat).\n\n` +
      `Mohon segera dilakukan percepatan pekerjaan agar proyek dapat selesai sesuai jadwal.\n\n` +
      `Terima kasih.`
    );

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kurva S Proyek</h1>
            <p className="text-gray-500">
              {selectedProject ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span>Proyek: <span className="font-semibold">{selectedProject.name}</span></span>
                  {selectedProject.contractNumber && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      No. Kontrak: {selectedProject.contractNumber}
                    </span>
                  )}
                </span>
              ) : 'Pilih proyek untuk melihat Kurva S'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => setSelectedProject(projects.find(p => p.id === e.target.value) || null)}
              className="appearance-none px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px] pr-10 font-medium text-gray-700"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ChevronRight size={16} className="rotate-90" />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p>Memuat data Kurva S...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-sm font-medium text-gray-400 mb-1">Rencana Terakhir</p>
              <div className="text-2xl font-bold text-gray-900">{lastPlanned}%</div>
              <div className="text-xs text-gray-500 mt-1">Target kumulatif</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-sm font-medium text-gray-400 mb-1">Realisasi Terakhir</p>
              <div className={`text-2xl font-bold ${lastActual >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                {lastActual}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Progres lapangan</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-sm font-medium text-gray-400 mb-1">Deviasi</p>
              <div className={`text-2xl font-bold ${Number(deviation) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(deviation) > 0 ? `+${deviation}` : deviation}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Selisih rencana & realisasi</div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">Visualisasi Kurva S</h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-blue-500"></div>
                  <span className="text-gray-600">Rencana</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-emerald-500"></div>
                  <span className="text-gray-600">Realisasi</span>
                </div>
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${value}%`, '']}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  
                  {/* Planned Line (S-Curve) */}
                  <Line 
                    type="monotone" 
                    dataKey="rencana" 
                    name="Rencana (Target)" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8 }}
                  />
                  
                  {/* Actual Line */}
                  <Line 
                    type="monotone" 
                    dataKey="realisasi" 
                    name="Realisasi (Lapangan)" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8 }}
                  />

                  {/* Scatter points for "Scatter Chart" look as requested */}
                  <Scatter 
                    dataKey="realisasi" 
                    fill="#10b981" 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Detail Data Mingguan</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Minggu</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Rencana (%)</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Realisasi (%)</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Deviasi (%)</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {chartData.map((data, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{data.name}</td>
                      <td className="px-6 py-4 text-center text-blue-600 font-semibold">{data.rencana || '-'}%</td>
                      <td className="px-6 py-4 text-center text-emerald-600 font-semibold">{data.realisasi || '-'}%</td>
                      <td className={`px-6 py-4 text-center font-bold ${Number(data.deviasi) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.deviasi ? (Number(data.deviasi) > 0 ? `+${data.deviasi}` : data.deviasi) : '-'}%
                      </td>
                      <td className="px-6 py-4">
                        {data.realisasi && data.rencana ? (
                          Number(data.deviasi) <= -5 ? (
                            <div className="flex flex-col gap-1 items-center">
                              <button 
                                onClick={() => handleSendEmail(idx + 1, data.deviasi || '0')}
                                className="w-full flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 transition-colors"
                                title="Kirim Email Peringatan"
                              >
                                <Mail size={10} />
                                Email SP
                              </button>
                              <button 
                                onClick={() => handleSendWhatsApp(idx + 1, data.deviasi || '0')}
                                className="w-full flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 transition-colors"
                                title="Kirim WA Peringatan"
                              >
                                <MessageCircle size={10} />
                                WA SP
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              Number(data.deviasi) >= 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {Number(data.deviasi) >= 0 ? 'On Track' : 'Terlambat'}
                            </span>
                          )
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SCurve;
