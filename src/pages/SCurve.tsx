import React, { useState, useEffect, useMemo } from 'react';
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
import { getProjects, getWeeklyReports, getProviders, getUsers } from '../services/firestore';
import { Project, WeeklyReport, Provider, UserProfile } from '../types';
import { 
  TrendingUp, 
  Calendar, 
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Mail,
  MessageCircle,
  FileText,
  X,
  Copy,
  Check,
  AlertTriangle,
  Info,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  getCriticalDeviationThreshold, 
  isCriticalContract, 
  evaluateContractStatus 
} from '../utils/contractStatus';

const SCurve: React.FC<{ user: UserProfile }> = ({ user }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [ppkList, setPpkList] = useState<UserProfile[]>([]);
  const [copied, setCopied] = useState(false);

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningConfig, setWarningConfig] = useState({
    level: 'PERTAMA', // 'PERTAMA', 'KEDUA', 'KETIGA'
    scmLevel: 'I', // 'I', 'II', 'III'
    nomor: '',
    lampiran: '-',
    weekNum: 1,
    rencana: '0',
    realisasi: '0',
    deviasi: '0',
    threshold: '0',
    date: new Date().toISOString().split('T')[0],
    ppkName: ''
  });

  const initialSelectionDone = React.useRef(false);

  useEffect(() => {
    const unsubscribeProjects = getProjects((data) => {
      let filteredData = data;
      if (user?.role === 'pengawas') {
        const currentSupervisorName = user.name || user.username || user.email;
        filteredData = data.filter(p => {
          if (!p.supervisorName) return false;
          return p.supervisorName === currentSupervisorName ||
                 p.supervisorName === user.name ||
                 p.supervisorName === user.username ||
                 p.supervisorName === user.email;
        });
      }
      setProjects(filteredData);
      
      if (!initialSelectionDone.current && filteredData.length > 0) {
        setSelectedProject(filteredData[0]);
        initialSelectionDone.current = true;
      }
      setLoading(false);
    });

    const unsubscribeProviders = getProviders(setProviders);

    const unsubscribeUsers = getUsers((uList) => {
      const onlyPpk = uList.filter(u => u.role === 'ppk');
      setPpkList(onlyPpk);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeProviders();
      unsubscribeUsers();
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

  const computedReports = useMemo(() => {
    const sorted = [...reports].sort((a, b) => a.weekNumber - b.weekNumber);
    let runCum = 0;
    return sorted.map(r => {
      const weekly = Number(r.weeklyProgress) || 0;
      runCum = parseFloat((runCum + weekly).toFixed(2));
      return {
        ...r,
        weeklyProgress: weekly,
        cumulativeProgress: runCum
      };
    });
  }, [reports]);

  const maxTotalWeeks = Math.max(
    totalWeeks, 
    computedReports.length > 0 ? computedReports[computedReports.length - 1].weekNumber : 0
  );

  const chartData = useMemo(() => {
    const data = [];
    
    // Minggu 0 (Titik Awal SPMK / Nol Proyek)
    data.push({
      name: 'Minggu 0',
      weekNum: 0,
      rencana: 0,
      realisasi: 0,
      deviasi: '0.00'
    });

    for (let i = 1; i <= maxTotalWeeks; i++) {
      const weekNum = i;
      const actualReport = computedReports.find(r => r.weekNumber === weekNum);
      
      // Determine planned progress using Sigmoid Progression Analysis
      // Formula: f(x) = x^n / (x^n + (1-x)^n) where x = t/N
      // This creates a smooth S-curve starting at 0% and ending at 100%
      let plannedValue: number | null = null;
      if (weekNum <= totalWeeks) {
        const x = weekNum / totalWeeks;
        const n = 3; // Steeping factor for S-curve
        const sigmoid = Math.pow(x, n) / (Math.pow(x, n) + Math.pow(1 - x, n));
        plannedValue = Number((sigmoid * 100).toFixed(2));
      } else {
        // Work beyond planned weeks should have a target of 100%
        plannedValue = 100;
      }
      
      data.push({
        name: `Minggu ${weekNum}`,
        weekNum: weekNum,
        rencana: plannedValue,
        realisasi: actualReport ? actualReport.cumulativeProgress : null,
        deviasi: actualReport && plannedValue !== null ? (actualReport.cumulativeProgress - plannedValue).toFixed(2) : null
      });
    }

    return data;
  }, [maxTotalWeeks, totalWeeks, computedReports]);

  const lastActualReport = computedReports.length > 0 ? computedReports[computedReports.length - 1] : null;
  const lastActual = lastActualReport ? lastActualReport.cumulativeProgress : 0;
  const currentWeekNumber = lastActualReport ? lastActualReport.weekNumber : 0;
  
  // Find planned value for the current active week
  const currentPlanEntry = chartData.find(d => d.weekNum === currentWeekNumber);
  const lastPlanned = currentPlanEntry?.rencana || 0;
  const deviation = (lastActual - lastPlanned).toFixed(2);

  const formatIndoDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleLevelChange = (level: string) => {
    let scmLevel = 'I';
    if (level === 'KEDUA') scmLevel = 'II';
    if (level === 'KETIGA') scmLevel = 'III';
    
    setWarningConfig(prev => ({
      ...prev,
      level,
      scmLevel,
      nomor: prev.nomor.includes('/SP-') 
        ? prev.nomor.replace(/\/SP-(I|II|III)\//, `/SP-${scmLevel}/`)
        : `.../SP-${scmLevel}/PPK/${new Date().getFullYear()}`
    }));
  };

  const openWarningModal = (weekNum: number, dev: string, rencanaVal?: number | null, realisasiVal?: number | null) => {
    if (!selectedProject) return;
    
    const devNum = Number(dev);
    const renNum = rencanaVal !== undefined && rencanaVal !== null ? rencanaVal : (chartData.find(d => d.weekNum === weekNum)?.rencana || 0);
    const realNum = realisasiVal !== undefined && realisasiVal !== null ? realisasiVal : (chartData.find(d => d.weekNum === weekNum)?.realisasi || 0);
    const thresh = renNum > 0 ? getCriticalDeviationThreshold(renNum) : 0;

    let autoLevel = 'PERTAMA';
    let autoScm = 'I';
    
    // Auto-detect warning level based on typical critical contracts progression:
    // If deviasi is far worse than threshold:
    // Level 3 if deviation <= threshold * 2 or <= -15%
    // Level 2 if deviation <= threshold * 1.5 or <= -10%
    if (devNum <= -15 || (thresh < 0 && devNum <= thresh * 2)) {
      autoLevel = 'KETIGA';
      autoScm = 'III';
    } else if (devNum <= -10 || (thresh < 0 && devNum <= thresh * 1.5)) {
      autoLevel = 'KEDUA';
      autoScm = 'II';
    } else {
      autoLevel = 'PERTAMA';
      autoScm = 'I';
    }

    const defaultPpk = ppkList.length > 0 ? (ppkList[0].name || ppkList[0].username || '') : '';

    setWarningConfig({
      level: autoLevel,
      scmLevel: autoScm,
      nomor: `.../SP-${autoScm}/PPK/${new Date().getFullYear()}`,
      lampiran: '-',
      weekNum,
      rencana: renNum.toString(),
      realisasi: realNum !== null ? realNum.toString() : '0',
      deviasi: dev,
      threshold: thresh.toString(),
      date: new Date().toISOString().split('T')[0],
      ppkName: defaultPpk
    });
    
    setIsWarningModalOpen(true);
  };

  const generateWarningLetterText = () => {
    if (!selectedProject) return '';
    const provider = providers.find(p => p.name === selectedProject.ptCv);
    const dateFormatted = formatIndoDate(warningConfig.date);
    
    const spLevelWord = warningConfig.level === 'PERTAMA' ? 'Pertama' : 
                        warningConfig.level === 'KEDUA' ? 'Kedua' : 'Ketiga';

    const ren = Number(warningConfig.rencana) || 0;
    const thresh = warningConfig.threshold || (ren > 0 ? getCriticalDeviationThreshold(ren).toString() : '0');
    const ruleDetail = ren < 70
      ? `* Untuk progres rencana < 70%, batas toleransi deviasi adalah -10% dari target rencana (${thresh}%).`
      : `* Untuk progres rencana ≥ 70%, batas toleransi deviasi adalah -5% dari target rencana (${thresh}%).`;

    return `SURAT PERINGATAN ${warningConfig.level}

Nomor: ${warningConfig.nomor}
Lampiran: ${warningConfig.lampiran}

Yth. Direktur ${selectedProject.ptCv}
di
    ${provider?.address || '[Alamat CV/PT]'}

Dengan hormat,
Berdasarkan catatan kemajuan pekerjaan yang Saudara/i laksanakan pada paket pekerjaan ${selectedProject.name} hingga periode Minggu ke-${warningConfig.weekNum}, tercatat kondisi sebagai berikut:
- Kemajuan Rencana : ${warningConfig.rencana}%
- Kemajuan Realisasi : ${warningConfig.realisasi}%
- Deviasi Realisasi : ${warningConfig.deviasi}% (Batas toleransi deviasi yang diizinkan: ${thresh}%)

Sesuai Syarat-Syarat Umum Kontrak (SSUK) Bagian B.6 Pasal 43 Mengenai Kontrak Kritis:
${ruleDetail}
Mengingat deviasi pekerjaan Saudara telah melampaui batas toleransi tersebut (${warningConfig.deviasi}% ≤ ${thresh}%), maka pekerjaan Saudara Kami nyatakan sebagai KONTRAK KRITIS.

Dengan demikian kami kirimkan surat ini sebagai Surat Peringatan ${spLevelWord} atas keterlambatan pekerjaan yang menjadi tanggung jawab Saudara.
Selanjutnya, agar Saudara dapat mempersiapkan Program Percepatan/Action Plan (segala kebutuhan guna peningkatan pencapaian kemajuan pelaksanaan) yang akan dibahas pada Rapat Pembuktian (Show Cause Meeting/SCM) Tingkat ${warningConfig.scmLevel}.

Demikian agar menjadi perhatian dan segera ditindaklanjuti.

Karawang, ${dateFormatted || '[Tanggal Bulan Tahun]'}
KPA selaku Pejabat Pembuat Komitmen


${warningConfig.ppkName || '[Nama PPK]'}`;
  };

  const triggerSendEmail = () => {
    if (!selectedProject) return;
    const provider = providers.find(p => p.name === selectedProject.ptCv);
    if (!provider || !provider.email) {
      alert(`Email penyedia ${selectedProject.ptCv} tidak ditemukan. Silakan lengkapi data penyedia di menu Penyedia.`);
      return;
    }

    const letterText = generateWarningLetterText();
    const subject = encodeURIComponent(`Surat Peringatan ${warningConfig.level} - ${selectedProject.name} (Minggu ${warningConfig.weekNum})`);
    const body = encodeURIComponent(letterText);

    window.location.href = `mailto:${provider.email}?subject=${subject}&body=${body}`;
  };

  const triggerSendWhatsApp = () => {
    if (!selectedProject) return;
    const provider = providers.find(p => p.name === selectedProject.ptCv);
    if (!provider || !provider.phone) {
      alert(`Nomor WhatsApp penyedia ${selectedProject.ptCv} tidak ditemukan. Silakan lengkapi data penyedia di menu Penyedia.`);
      return;
    }

    let phone = provider.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    const letterText = generateWarningLetterText();
    const message = encodeURIComponent(letterText);

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleSendWarning = (weekNum: number, dev: string, rencanaVal?: number | null, realisasiVal?: number | null) => {
    openWarningModal(weekNum, dev, rencanaVal, realisasiVal);
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
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-8">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Visualisasi Kurva S</h3>
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
            
            <div className="h-[280px] sm:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 10}}
                    dy={5}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 10}}
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
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                  
                  {/* Actual Line */}
                  <Line 
                    type="monotone" 
                    dataKey="realisasi" 
                    name="Realisasi (Lapangan)" 
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
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

          {/* Data Table with SSUK Critical Contract Rule Indicator */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Detail Data Mingguan &amp; Status Kontrak</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluasi deviasi progres mingguan berdasarkan Syarat-Syarat Umum Kontrak (SSUK) Bagian B.6
                </p>
              </div>

              {/* SSUK Rules Pill / Info */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs text-slate-600">
                <ShieldAlert size={15} className="text-red-600 shrink-0" />
                <span>
                  <strong>Syarat SP:</strong> Rencana &lt; 70% (deviasi ≤ -10% rencana) | Rencana ≥ 70% (deviasi ≤ -5% rencana)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Minggu</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Rencana (%)</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Realisasi (%)</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Deviasi (%)</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Toleransi Deviasi</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {chartData.map((data, idx) => {
                    const statusResult = evaluateContractStatus(
                      data.weekNum,
                      data.rencana,
                      data.realisasi,
                      data.deviasi !== null ? Number(data.deviasi) : null
                    );

                    return (
                      <tr key={idx} className={`transition-colors ${statusResult.isCritical ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-gray-50/50'}`}>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {data.name}
                          {data.weekNum === 0 && (
                            <span className="ml-2 text-xs font-normal text-slate-400">
                              (Awal SPMK)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-blue-600 font-semibold font-mono">
                          {data.rencana !== null ? `${data.rencana}%` : '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-emerald-600 font-semibold font-mono">
                          {data.realisasi !== null ? `${data.realisasi}%` : '-'}
                        </td>
                        <td className={`px-6 py-4 text-center font-bold font-mono ${data.deviasi !== null ? (Number(data.deviasi) >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'}`}>
                          {data.deviasi !== null ? (Number(data.deviasi) > 0 ? `+${data.deviasi}%` : `${data.deviasi}%`) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">
                          {data.weekNum === 0 ? (
                            '0.00%'
                          ) : data.rencana !== null ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium" title={data.rencana < 70 ? '10% dari rencana (< 70%)' : '5% dari rencana (≥ 70%)'}>
                              {getCriticalDeviationThreshold(data.rencana)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {data.weekNum === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              Mulai Pelaksanaan
                            </span>
                          ) : data.realisasi !== null && data.rencana !== null ? (
                            statusResult.isCritical ? (
                              <button 
                                onClick={() => handleSendWarning(data.weekNum, data.deviasi || '0', data.rencana, data.realisasi)}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors shadow-sm cursor-pointer animate-pulse"
                                title={`Kirim Surat Peringatan Resmi (Deviasi ${data.deviasi}% melampaui batas toleransi ${statusResult.threshold}%)`}
                              >
                                <AlertTriangle size={13} className="text-red-600" />
                                Surat Peringatan
                              </button>
                            ) : (
                              <span 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  Number(data.deviasi) >= 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                                }`}
                                title={Number(data.deviasi) < 0 ? `Deviasi ${data.deviasi}% masih dalam toleransi aman (${statusResult.threshold}%)` : 'Progres sesuai jadwal'}
                              >
                                {Number(data.deviasi) >= 0 ? 'On Track' : 'Terlambat Ringan'}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 text-xs italic">Belum Ada Laporan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {isWarningModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[80vh]">
            
            {/* Left Side: Editor Form */}
            <div className="md:w-1/2 p-6 overflow-y-auto flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 bg-white">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <FileText className="text-red-500" size={24} />
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-sans">Format Surat Peringatan</h3>
                      <p className="text-xs text-slate-500 font-sans">Kontrak Kritis &amp; Rapat Pembuktian (SCM)</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsWarningModalOpen(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 font-sans">
                  {/* Info Ringkasan Kritis */}
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-red-600" />
                      Evaluasi Keterlambatan Minggu Ke-{warningConfig.weekNum}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                      <div>Rencana: <span className="font-bold text-blue-700">{warningConfig.rencana}%</span></div>
                      <div>Realisasi: <span className="font-bold text-emerald-700">{warningConfig.realisasi}%</span></div>
                      <div>Deviasi: <span className="font-bold text-red-700">{warningConfig.deviasi}%</span></div>
                    </div>
                    <div className="text-[11px] text-red-700 pt-0.5">
                      Batas deviasi diizinkan: <strong>{warningConfig.threshold}%</strong> ({Number(warningConfig.rencana) < 70 ? '10% dari rencana' : '5% dari rencana'})
                    </div>
                  </div>

                  {/* SP Level Selector */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tingkat SP</label>
                      <select
                        value={warningConfig.level}
                        onChange={(e) => handleLevelChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      >
                        <option value="PERTAMA">PERTAMA (I)</option>
                        <option value="KEDUA">KEDUA (II)</option>
                        <option value="KETIGA">KETIGA (III)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tingkat SCM</label>
                      <select
                        value={warningConfig.scmLevel}
                        onChange={(e) => setWarningConfig(prev => ({ ...prev, scmLevel: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      >
                        <option value="I">I</option>
                        <option value="II">II</option>
                        <option value="III">III</option>
                      </select>
                    </div>
                  </div>

                  {/* Nomor & Lampiran */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nomor Surat</label>
                      <input
                        type="text"
                        value={warningConfig.nomor}
                        onChange={(e) => setWarningConfig(prev => ({ ...prev, nomor: e.target.value }))}
                        placeholder="Nomor Surat"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lampiran</label>
                      <input
                        type="text"
                        value={warningConfig.lampiran}
                        onChange={(e) => setWarningConfig(prev => ({ ...prev, lampiran: e.target.value }))}
                        placeholder="Lampiran"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Periode & Deviasi */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Minggu Ke-</label>
                      <input
                        type="number"
                        value={warningConfig.weekNum}
                        onChange={(e) => setWarningConfig(prev => ({ ...prev, weekNum: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nilai Deviasi (%)</label>
                      <input
                        type="text"
                        value={warningConfig.deviasi}
                        onChange={(e) => setWarningConfig(prev => ({ ...prev, deviasi: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-mono font-bold text-red-600"
                      />
                    </div>
                  </div>

                  {/* Tanggal Surat */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tanggal Surat</label>
                    <input
                      type="date"
                      value={warningConfig.date}
                      onChange={(e) => setWarningConfig(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                    />
                  </div>

                  {/* Pejabat Pembuat Komitmen (PPK) Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nama Pejabat Pembuat Komitmen (PPK)</label>
                    {ppkList.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setWarningConfig(prev => ({ ...prev, ppkName: e.target.value }));
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-2"
                      >
                        <option value="">-- Pilih PPK terdaftar --</option>
                        {ppkList.map(p => {
                          const value = p.name || p.username || p.email;
                          return (
                            <option key={p.uid} value={value}>{value}</option>
                          );
                        })}
                      </select>
                    )}
                    <input
                      type="text"
                      value={warningConfig.ppkName}
                      onChange={(e) => setWarningConfig(prev => ({ ...prev, ppkName: e.target.value }))}
                      placeholder="Ketik Nama PPK"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Panel */}
              <div className="flex flex-col gap-2 pt-6 border-t border-slate-200 mt-6 font-sans">
                <div className="flex gap-2">
                  <button
                    onClick={triggerSendEmail}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer"
                  >
                    <Mail size={16} />
                    Kirim via Email
                  </button>
                  <button
                    onClick={triggerSendWhatsApp}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer"
                  >
                    <MessageCircle size={16} />
                    Kirim via WA
                  </button>
                </div>
                <button
                  onClick={() => setIsWarningModalOpen(false)}
                  className="w-full px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Right Side: Virtual Letter Paper Preview */}
            <div className="md:w-1/2 p-6 bg-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">Pratinjau Surat Resmi</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateWarningLetterText());
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-all shadow-sm cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-green-500" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Salin Surat</span>
                    </>
                  )}
                </button>
              </div>

              {/* Letter sheet */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-slate-300 flex-1 overflow-y-auto max-h-[50vh] md:max-h-[60vh] font-serif text-xs text-slate-800 leading-relaxed whitespace-pre-wrap select-all focus:outline-none">
                {generateWarningLetterText()}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default SCurve;
