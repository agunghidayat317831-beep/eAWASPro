import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  FileText, 
  TrendingUp, 
  ChevronRight,
  AlertCircle,
  Loader2,
  Trash2,
  Edit2,
  ArrowLeft,
  Mail,
  MessageCircle,
  X,
  Copy,
  Check
} from 'lucide-react';
import { 
  getProjects, 
  getWeeklyReports, 
  addWeeklyReport, 
  updateWeeklyReport, 
  deleteWeeklyReport,
  getProviders,
  getRABItems,
  getUsers
} from '../services/firestore';
import { Project, WeeklyReport as WeeklyReportType, Provider, UserProfile, RABItem, WeeklyReportDetail } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';

interface WeeklyReportProps {
  user: UserProfile | null;
}

const WeeklyReport: React.FC<WeeklyReportProps> = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const isPengawas = user?.role === 'pengawas';
  const isPPK = user?.role === 'ppk';
  const isUser = user?.role === 'user';
  const canModify = isAdmin || isPengawas || isUser; // Authorized roles can modify, PPK is view-only
  const [projects, setProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<WeeklyReportType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<WeeklyReportType | null>(null);
  const [rabItems, setRabItems] = useState<RABItem[]>([]);
  const [reportDetails, setReportDetails] = useState<WeeklyReportDetail[]>([]);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [searchTermItem, setSearchTermItem] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    rabItemId: string;
    volume: number;
  }>({ isOpen: false, rabItemId: '', volume: 0 });
  const [formData, setFormData] = useState({
    weekNumber: 1,
    startDate: '',
    endDate: '',
    weeklyProgress: 0,
    cumulativeProgress: 0,
    notes: ''
  });

  const initialSelectionDone = React.useRef(false);

  const [ppkList, setPpkList] = useState<UserProfile[]>([]);
  const [copied, setCopied] = useState(false);

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningConfig, setWarningConfig] = useState({
    level: 'PERTAMA', // 'PERTAMA', 'KEDUA', 'KETIGA'
    scmLevel: 'I', // 'I', 'II', 'III'
    nomor: '',
    lampiran: '-',
    weekNum: 1,
    deviasi: '0',
    date: new Date().toISOString().split('T')[0],
    ppkName: ''
  });

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
        const stateProjectId = location.state?.projectId;
        if (stateProjectId) {
          const found = filteredData.find(p => p.id === stateProjectId);
          if (found) {
            setSelectedProject(found);
            initialSelectionDone.current = true;
          }
        } else {
          setSelectedProject(filteredData[0]);
          initialSelectionDone.current = true;
        }
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
  }, [location.state?.projectId, user]);

  useEffect(() => {
    if (selectedProject) {
      setLoading(true);
      const unsubscribe = getWeeklyReports(selectedProject.id, (data) => {
        setReports(data);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setReports([]);
    }
  }, [selectedProject]);

  const handleOpenModal = (report?: WeeklyReportType) => {
    if (!selectedProject) return;

    // Helper to add days
    const addDays = (dateStr: string, days: number) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    };

    // Fetch RAB Items
    const unsubscribe = getRABItems(selectedProject.id, (items) => {
      setRabItems(items);
      
      const subTotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
      const totalWeightBase = subTotal || 1;
      
      if (report) {
        setEditingReport(report);
        setFormData({
          weekNumber: report.weekNumber,
          startDate: report.startDate,
          endDate: report.endDate,
          weeklyProgress: report.weeklyProgress,
          cumulativeProgress: report.cumulativeProgress,
          notes: report.notes || ''
        });
        
        // If report has details, use them. Otherwise start empty
        if (report.details && report.details.length > 0) {
          setReportDetails(report.details);
        } else {
          setReportDetails([]);
        }
      } else {
        setEditingReport(null);
        // Sort reports by week number to find the latest
        const sortedReports = [...reports].sort((a, b) => a.weekNumber - b.weekNumber);
        const nextWeek = sortedReports.length > 0 ? Math.max(...sortedReports.map(r => r.weekNumber)) + 1 : 1;
        const lastCumulative = sortedReports.length > 0 ? sortedReports[sortedReports.length - 1].cumulativeProgress : 0;
        
        let startDate = '';
        let endDate = '';

        if (nextWeek === 1) {
          if (selectedProject.spmkDate) {
            startDate = selectedProject.spmkDate;
            endDate = addDays(startDate, 6);
          }
        } else if (sortedReports.length > 0) {
          const lastReport = sortedReports[sortedReports.length - 1];
          startDate = addDays(lastReport.endDate, 1);
          endDate = addDays(startDate, 6);
        }

        // Start empty for new report, let user pick items
        setReportDetails([]);
        setFormData({
          weekNumber: nextWeek,
          startDate,
          endDate,
          weeklyProgress: 0,
          cumulativeProgress: lastCumulative,
          notes: ''
        });
      }
      setIsModalOpen(true);
      unsubscribe();
    });
  };

  const handleAddItem = (item: RABItem) => {
    if (reportDetails.some(d => d.rabItemId === item.id)) return;

    const items = rabItems;
    const subTotal = items.reduce((acc, i) => acc + i.totalPrice, 0);
    const totalWeightBase = subTotal || 1;

    // Find previous report's cumulative for this specific item
    const nextWeek = formData.weekNumber;
    const prevReport = reports.find(r => r.weekNumber === nextWeek - 1);
    const prevDetail = prevReport?.details?.find(d => d.rabItemId === item.id);
    const lastCumulativeProgress = prevDetail?.cumulativeProgress || 0;
    const lastCumulativeVolume = prevDetail?.cumulativeVolume || 0;

    const newDetail: WeeklyReportDetail = {
      rabItemId: item.id,
      description: item.description,
      unit: item.unit,
      targetVolume: item.volume,
      volumeThisWeek: 0,
      cumulativeVolume: lastCumulativeVolume,
      weight: (item.totalPrice / totalWeightBase) * 100,
      progressThisWeek: 0,
      cumulativeProgress: lastCumulativeProgress
    };

    setReportDetails([...reportDetails, newDetail]);
    setShowItemSelector(false);
    setSearchTermItem('');
  };

  const handleRemoveItem = (rabItemId: string) => {
    setReportDetails(prev => {
      const updated = prev.filter(d => d.rabItemId !== rabItemId);
      
      // Recalculate totals
      const totalWeekly = updated.reduce((acc, curr) => acc + (curr.progressThisWeek * curr.weight) / 100, 0);
      const totalCumulative = updated.reduce((acc, curr) => acc + (curr.cumulativeProgress * curr.weight) / 100, 0);

      setFormData(f => ({
        ...f,
        weeklyProgress: parseFloat(totalWeekly.toFixed(2)),
        cumulativeProgress: parseFloat(totalCumulative.toFixed(2))
      }));

      return updated;
    });
  };

  const handleVolumeChange = (rabItemId: string, volume: number, force: boolean = false) => {
    setReportDetails(prev => {
      let isExceeding = false;
      const updated = prev.map(detail => {
        if (detail.rabItemId === rabItemId) {
          const nextWeek = formData.weekNumber;
          const prevReport = reports.find(r => r.weekNumber === nextWeek - 1);
          const prevDetail = prevReport?.details?.find(d => d.rabItemId === rabItemId);
          
          const lastVolume = prevDetail?.cumulativeVolume || 0;
          const lastProgress = prevDetail?.cumulativeProgress || 0;
          
          const newCumulativeVolume = lastVolume + volume;

          if (!force && newCumulativeVolume > detail.targetVolume + 0.001) { // Adding small epsilon for float precision
            isExceeding = true;
            return detail;
          }
          
          // Calculate progress but cap at 100%
          let newProgressThisWeek = (volume / detail.targetVolume) * 100;
          let newCumulativeProgress = lastProgress + newProgressThisWeek;

          if (newCumulativeProgress > 100) {
            newCumulativeProgress = 100;
            newProgressThisWeek = Math.max(0, 100 - lastProgress);
          }

          return {
            ...detail,
            volumeThisWeek: volume,
            cumulativeVolume: newCumulativeVolume,
            progressThisWeek: newProgressThisWeek,
            cumulativeProgress: newCumulativeProgress
          };
        }
        return detail;
      });

      if (isExceeding) {
        setConfirmModal({ isOpen: true, rabItemId, volume });
        return prev;
      }

      // Calculate total weekly and cumulative progress
      const totalWeekly = updated.reduce((acc, curr) => acc + (curr.progressThisWeek * curr.weight) / 100, 0);
      const totalCumulative = updated.reduce((acc, curr) => acc + (curr.cumulativeProgress * curr.weight) / 100, 0);

      setFormData(f => ({
        ...f,
        weeklyProgress: parseFloat(totalWeekly.toFixed(2)),
        cumulativeProgress: parseFloat(totalCumulative.toFixed(2))
      }));

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const reportData = {
      ...formData,
      projectId: selectedProject.id,
      weeklyProgress: Number(formData.weeklyProgress),
      cumulativeProgress: Number(formData.cumulativeProgress),
      details: reportDetails
    };

    if (editingReport) {
      await updateWeeklyReport(selectedProject.id, editingReport.id, reportData);
    } else {
      await addWeeklyReport(selectedProject.id, reportData);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (reportId: string) => {
    if (!selectedProject || !window.confirm('Apakah Anda yakin ingin menghapus laporan ini?')) return;
    await deleteWeeklyReport(selectedProject.id, reportId);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'text-green-600 bg-green-50';
    if (progress >= 50) return 'text-blue-600 bg-blue-50';
    return 'text-red-600 bg-red-50';
  };

  const getPlannedProgressForWeek = (weekNum: number) => {
    if (!selectedProject) return 100;
    const totalWeeks = selectedProject.executionPeriod 
      ? Math.ceil(selectedProject.executionPeriod / 7) 
      : 5;
    if (weekNum <= totalWeeks) {
      const x = weekNum / totalWeeks;
      const n = 3; // Steeping factor for S-curve
      const sigmoid = Math.pow(x, n) / (Math.pow(x, n) + Math.pow(1 - x, n));
      return Number((sigmoid * 100).toFixed(2));
    }
    return 100;
  };

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

  const openWarningModal = (weekNum: number, dev: string) => {
    if (!selectedProject) return;
    
    const devNum = Number(dev);
    let autoLevel = 'PERTAMA';
    let autoScm = 'I';
    
    if (devNum <= -15) {
      autoLevel = 'KETIGA';
      autoScm = 'III';
    } else if (devNum <= -10) {
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
      deviasi: dev,
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

    return `SURAT PERINGATAN ${warningConfig.level}

Nomor: ${warningConfig.nomor}
Lampiran: ${warningConfig.lampiran}

Yth. Direktur ${selectedProject.ptCv}
di
    ${provider?.address || '[Alamat CV/PT]'}

Dengan hormat,
Berdasarkan catatan kemajuan pekerjaan yang Saudara/i laksanakan pada paket pekerjaan ${selectedProject.name} hingga periode Minggu ke-${warningConfig.weekNum} terdapat deviasi ${warningConfig.deviasi}% Sesuai Syarat-Sarat Umum Kontrak Bagian B.6 Pasal 43.1, 43.2 dan 43.3, maka pekerjaan Saudara Kami nyatakan sebagai Kontrak Kritis.
Dengan demikian kami kirimkan surat ini sebagai Surat Peringatan ${spLevelWord} atas keterlambatan pekerjaan yang menjadi tanggung jawab Saudara.
Selanjutnya, agar Saudara dapat mempersiapkan Program Percepatan/Action Plan (segala kebutuhan guna peningkatan pencapaian kemajuan pelaksanaan) yang akan dibahas pada Rapat Pembuktian (Show Cause Meeting/SCM) Tingkat ${warningConfig.scmLevel}.
Demikian agar menjadi perhatiannya.

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

  const handleSendWarning = (weekNum: number, dev: string) => {
    openWarningModal(weekNum, dev);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/proyek')}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Mingguan</h1>
            <p className="text-gray-500">
              {selectedProject ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span>Proyek: <span className="font-semibold text-gray-700">{selectedProject.name}</span></span>
                  {selectedProject.contractNumber && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">
                      KONTRAK: {selectedProject.contractNumber}
                    </span>
                  )}
                </span>
              ) : 'Pilih proyek untuk melihat laporan'}
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

          {canModify && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-semibold"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Tambah Laporan</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p>Memuat data laporan...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Laporan</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Proyek ini belum memiliki catatan laporan mingguan. Mulai tambahkan laporan pertama untuk memantau progres.
          </p>
          {canModify && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Tambah Laporan Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Calendar size={24} />
                </div>
                <span className="text-sm font-medium text-gray-400">Total Minggu</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{reports.length}</div>
              <div className="text-sm text-gray-500 mt-1">Minggu pelaporan</div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <TrendingUp size={24} />
                </div>
                <span className="text-sm font-medium text-gray-400">Progres Terakhir</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {reports[reports.length - 1].cumulativeProgress}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Kumulatif progres</div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <TrendingUp size={24} />
                </div>
                <span className="text-sm font-medium text-gray-400">Rata-rata Mingguan</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {(reports.reduce((acc, curr) => acc + curr.weeklyProgress, 0) / reports.length).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Per minggu</div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Minggu Ke-</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Periode</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Progres Mingguan</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Progres Kumulatif</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Catatan</th>
                    {canModify && <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">W-{report.weekNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {new Date(report.startDate).toLocaleDateString('id-ID')} - {new Date(report.endDate).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          +{report.weeklyProgress}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getProgressColor(report.cumulativeProgress)}`}>
                            {report.cumulativeProgress}%
                          </span>
                          <div className="w-16 bg-gray-100 rounded-full h-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                report.cumulativeProgress >= 100 ? 'bg-green-500' : 
                                report.cumulativeProgress >= 50 ? 'bg-blue-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${report.cumulativeProgress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const plan = getPlannedProgressForWeek(report.weekNumber);
                          const dev = report.cumulativeProgress - plan;
                          
                          if (dev <= -5) {
                            return (
                              <button 
                                onClick={() => handleSendWarning(report.weekNumber, dev.toFixed(2))}
                                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors shadow-sm cursor-pointer"
                                title="Kirim Surat Peringatan Resmi"
                              >
                                <FileText size={12} className="text-red-600" />
                                Surat Peringatan
                              </button>
                            );
                          } else if (dev < 0) {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                Terlambat
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                On Track
                              </span>
                            );
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500 max-w-xs truncate" title={report.notes}>
                          {report.notes || '-'}
                        </p>
                      </td>
                      {canModify && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleOpenModal(report)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(report.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Laporan */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingReport ? 'Edit Laporan Mingguan' : 'Tambah Laporan Mingguan'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">Proyek: {selectedProject?.name} {selectedProject?.contractNumber ? `(${selectedProject.contractNumber})` : ''}</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh]">
                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Minggu Ke-</label>
                      <input
                        type="number"
                        required
                        value={isNaN(formData.weekNumber) ? '' : formData.weekNumber}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setFormData({ ...formData, weekNumber: isNaN(val) ? 0 : val });
                        }}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Catatan / Kendala</label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Catatan singkat..."
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Tanggal Mulai</label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Tanggal Selesai</label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Summary Data */}
                  <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-blue-500 font-bold mb-1">Total Minggu Ini</div>
                      <div className="text-2xl font-black text-blue-700">{formData.weeklyProgress}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-blue-500 font-bold mb-1">Total Kumulatif</div>
                      <div className="text-2xl font-black text-blue-700">{formData.cumulativeProgress}%</div>
                    </div>
                  </div>

                  {/* RAB Details Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h4 className="font-bold text-gray-900 uppercase text-xs tracking-wider">Rincian Progres Mingguan</h4>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowItemSelector(!showItemSelector)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] uppercase hover:bg-blue-100 transition-colors"
                        >
                          <Plus size={14} />
                          Tambah Item Pekerjaan
                        </button>
                        
                        {showItemSelector && (
                          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-[60] overflow-hidden">
                            <div className="p-2 border-b border-gray-50">
                              <input
                                autoFocus
                                type="text"
                                placeholder="Cari uraian pekerjaan..."
                                value={searchTermItem}
                                onChange={(e) => setSearchTermItem(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-0 outline-none"
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {rabItems
                                .filter(item => 
                                  item.description.toLowerCase().includes(searchTermItem.toLowerCase()) && 
                                  !reportDetails.some(d => d.rabItemId === item.id)
                                )
                                .map(item => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleAddItem(item)}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    <p className="text-xs font-bold text-gray-800 line-clamp-2">{item.description}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Vol: {item.volume} {item.unit}</p>
                                  </button>
                                ))}
                              {rabItems.filter(item => 
                                item.description.toLowerCase().includes(searchTermItem.toLowerCase()) && 
                                !reportDetails.some(d => d.rabItemId === item.id)
                              ).length === 0 && (
                                <div className="p-4 text-center text-xs text-gray-400 italic">
                                  Tidak ada hasil
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {reportDetails.map((detail) => (
                        <div key={detail.rabItemId} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 space-y-2 relative group">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(detail.rabItemId)}
                            className="absolute -right-2 -top-2 w-6 h-6 bg-white shadow-sm border border-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                          >
                            <Plus size={14} className="rotate-45" />
                          </button>

                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                              <p className="text-xs font-bold text-gray-800 line-clamp-1">{detail.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400 font-medium">Vol Target: {detail.targetVolume.toFixed(3)} {detail.unit}</span>
                                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">• Bobot: {detail.weight.toFixed(3)}%</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 font-medium italic">Prog: {detail.cumulativeProgress.toFixed(2)}%</p>
                              <p className="text-xs font-bold text-blue-600">Vol Total: {detail.cumulativeVolume.toFixed(3)} {detail.unit}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <label className="text-[10px] font-bold text-gray-500 flex-shrink-0 uppercase">Volume Minggu Ini</label>
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="number"
                                step="0.001"
                                value={detail.volumeThisWeek || ''}
                                onChange={(e) => handleVolumeChange(detail.rabItemId, parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="0.000"
                              />
                              <span className="text-xs font-medium text-gray-400 w-8">{detail.unit}</span>
                            </div>
                            <div className="w-20 text-right">
                              <span className="text-[10px] font-bold text-emerald-600">+{detail.progressThisWeek.toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {reportDetails.length === 0 && (
                        <div className="py-10 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                          <p className="text-xs font-medium text-gray-400">Belum ada item pekerjaan terpilih.</p>
                          <p className="text-[10px] text-gray-400 mt-1">Gunakan tombol "TAMBAH ITEM" di atas untuk mulai.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3 pb-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-500/20"
                    >
                      {editingReport ? 'Simpan Perubahan' : 'Simpan Laporan'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Volume Exceeding */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">Volume Melebihi RAB</h3>
                <p className="text-gray-500 font-medium">
                  Apakah volume yang Anda input memang melebihi dari volume yang ada pada RAB?
                </p>
                <div className="flex flex-col gap-2 pt-4">
                  <button
                    onClick={() => {
                      handleVolumeChange(confirmModal.rabItemId, confirmModal.volume, true);
                      setConfirmModal({ isOpen: false, rabItemId: '', volume: 0 });
                    }}
                    className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black hover:bg-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                  >
                    YA, LANJUTKAN
                  </button>
                  <button
                    onClick={() => setConfirmModal({ isOpen: false, rabItemId: '', volume: 0 })}
                    className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95"
                  >
                    TIDAK, BATALKAN
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    <h3 className="text-lg font-bold text-slate-900 font-sans">Format Surat Peringatan</h3>
                  </div>
                  <button 
                    onClick={() => setIsWarningModalOpen(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 font-sans">
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
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

export default WeeklyReport;
