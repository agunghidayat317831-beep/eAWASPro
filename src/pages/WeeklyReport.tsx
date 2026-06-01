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
  MessageCircle
} from 'lucide-react';
import { 
  getProjects, 
  getWeeklyReports, 
  addWeeklyReport, 
  updateWeeklyReport, 
  deleteWeeklyReport,
  getProviders,
  getRABItems
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

  useEffect(() => {
    const unsubscribeProjects = getProjects((data) => {
      setProjects(data);
      
      if (!initialSelectionDone.current && data.length > 0) {
        const stateProjectId = location.state?.projectId;
        if (stateProjectId) {
          const found = data.find(p => p.id === stateProjectId);
          if (found) {
            setSelectedProject(found);
            initialSelectionDone.current = true;
          }
        } else {
          setSelectedProject(data[0]);
          initialSelectionDone.current = true;
        }
      }
      setLoading(false);
    });

    const unsubscribeProviders = getProviders(setProviders);

    return () => {
      unsubscribeProjects();
      unsubscribeProviders();
    };
  }, [location.state?.projectId]);

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

  const plannedProgress = [7.67, 24.70, 57.56, 91.19, 100];

  const handleSendEmail = (weekNum: number, dev: number) => {
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
      `ditemukan deviasi progres sebesar ${dev.toFixed(2)}% (Terlambat).\n\n` +
      `Mohon segera dilakukan percepatan pekerjaan agar proyek dapat selesai sesuai jadwal.\n\n` +
      `Terima kasih.`
    );

    window.location.href = `mailto:${provider.email}?subject=${subject}&body=${body}`;
  };

  const handleSendWhatsApp = (weekNum: number, dev: number) => {
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
      `ditemukan deviasi progres sebesar *${dev.toFixed(2)}%* (Terlambat).\n\n` +
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
                          const plan = plannedProgress[report.weekNumber - 1];
                          if (plan === undefined) return '-';
                          const dev = report.cumulativeProgress - plan;
                          
                          if (dev <= -5) {
                            return (
                              <div className="flex flex-col gap-1 items-center">
                                <button 
                                  onClick={() => handleSendEmail(report.weekNumber, dev)}
                                  className="w-full flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 transition-colors"
                                  title="Kirim Email Peringatan"
                                >
                                  <Mail size={10} />
                                  Email SP
                                </button>
                                <button 
                                  onClick={() => handleSendWhatsApp(report.weekNumber, dev)}
                                  className="w-full flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 transition-colors"
                                  title="Kirim WA Peringatan"
                                >
                                  <MessageCircle size={10} />
                                  WA SP
                                </button>
                              </div>
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
    </div>
  );
};

export default WeeklyReport;
