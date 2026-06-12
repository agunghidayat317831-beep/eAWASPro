import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  X,
  MapPin,
  Building2,
  Wallet,
  Briefcase,
  FileText,
  Calculator,
  Star,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getProjects, 
  addProject, 
  updateProject, 
  deleteProject, 
  getProviders,
  addProjectEvaluation,
  updateProjectEvaluation,
  getProjectEvaluation,
  getUsers
} from '../services/firestore';
import { Project, UserProfile, Provider, ProjectEvaluation } from '../types';
import { useNavigate } from 'react-router-dom';

export default function ProjectList({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgress, setFilterProgress] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contractNumber: '',
    contractDate: '',
    spmkDate: '',
    executionPeriod: 0,
    ptCv: '',
    providerId: '',
    anggaran: 0,
    progress: 0,
    supervisorName: '',
    lat: -6.2088,
    lng: 106.8456
  });

  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [selectedProjectForEvaluation, setSelectedProjectForEvaluation] = useState<Project | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [evaluationFormData, setEvaluationFormData] = useState({
    quality: 1.50,
    cost: 1.00,
    time: 1.50,
    service: 1.00
  });
  const [existingEvaluation, setExistingEvaluation] = useState<ProjectEvaluation | null>(null);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);

  useEffect(() => {
    const unsubscribeProjects = getProjects((data) => {
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
    const unsubscribeProviders = getProviders(setProviders);
    const unsubscribeUsers = getUsers((uList) => {
      // Filter users where role is 'pengawas'
      const onlyPengawas = uList.filter(u => u.role === 'pengawas');
      setSupervisors(onlyPengawas);
    });
    return () => {
      unsubscribeProjects();
      unsubscribeProviders();
      unsubscribeUsers();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find provider name if not set manually
    let ptCv = formData.ptCv;
    if (formData.providerId) {
      const provider = providers.find(p => p.id === formData.providerId);
      if (provider) ptCv = provider.name;
    }

    const projectData = { ...formData, ptCv };

    if (editingProject) {
      await updateProject(editingProject.id, projectData);
    } else {
      await addProject(projectData);
    }
    setIsModalOpen(false);
    setEditingProject(null);
    setFormData({ 
      name: '', 
      location: '', 
      contractNumber: '', 
      contractDate: '',
      spmkDate: '',
      executionPeriod: 0,
      ptCv: '', 
      providerId: '', 
      anggaran: 0, 
      progress: 0, 
      supervisorName: '',
      lat: -6.2088, 
      lng: 106.8456 
    });
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      location: project.location,
      contractNumber: project.contractNumber || '',
      contractDate: project.contractDate || '',
      spmkDate: project.spmkDate || '',
      executionPeriod: project.executionPeriod || 0,
      ptCv: project.ptCv,
      providerId: project.providerId || '',
      anggaran: project.anggaran,
      progress: project.progress,
      supervisorName: project.supervisorName || '',
      lat: project.lat,
      lng: project.lng
    });
    setIsModalOpen(true);
  };

  const handleOpenEvaluation = async (project: Project) => {
    console.log("handleOpenEvaluation called with project:", project);
    if (!project.providerId) {
      console.warn("Project has no providerId:", project.id);
      alert("Proyek ini belum memiliki penyedia yang terasosiasi. Silakan edit proyek dan pilih penyedia terlebih dahulu.");
      return;
    }
    
    setIsLoadingEvaluation(true);
    setSelectedProjectForEvaluation(project);
    
    try {
      const evaluation = await getProjectEvaluation(project.id);
      if (evaluation) {
        setExistingEvaluation(evaluation);
        setEvaluationFormData({
          quality: evaluation.quality,
          cost: evaluation.cost,
          time: evaluation.time,
          service: evaluation.service
        });
      } else {
        setExistingEvaluation(null);
        setEvaluationFormData({
          quality: 1.50,
          cost: 1.00,
          time: 1.50,
          service: 1.00
        });
      }
      setIsEvaluationModalOpen(true);
    } catch (error) {
      console.error("Error fetching evaluation:", error);
      // Still open modal for new evaluation if fetch fails
      setExistingEvaluation(null);
      setEvaluationFormData({
        quality: 1.50,
        cost: 1.00,
        time: 1.50,
        service: 1.00
      });
      setIsEvaluationModalOpen(true);
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  const handleEvaluationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting evaluation...", { selectedProjectForEvaluation, evaluationFormData });
    
    if (!selectedProjectForEvaluation) {
      console.error("No project selected for evaluation");
      return;
    }
    
    if (!selectedProjectForEvaluation.providerId) {
      console.error("Project has no providerId", selectedProjectForEvaluation);
      alert("Error: ID Penyedia tidak ditemukan. Silakan coba lagi.");
      return;
    }

    setIsSubmittingEvaluation(true);
    const totalScore = evaluationFormData.quality + evaluationFormData.cost + evaluationFormData.time + evaluationFormData.service;

    const evaluationData = {
      projectId: selectedProjectForEvaluation.id,
      projectName: selectedProjectForEvaluation.name,
      providerId: selectedProjectForEvaluation.providerId,
      ...evaluationFormData,
      totalScore
    };

    console.log("Evaluation data to save:", evaluationData);

    try {
      if (existingEvaluation) {
        console.log("Updating existing evaluation:", existingEvaluation.id);
        await updateProjectEvaluation(existingEvaluation.id, evaluationData);
      } else {
        console.log("Adding new evaluation");
        await addProjectEvaluation(evaluationData);
      }
      alert("Penilaian berhasil disimpan!");
      setIsEvaluationModalOpen(false);
    } catch (error) {
      console.error("Error saving evaluation:", error);
      alert("Gagal menyimpan penilaian. Silakan periksa koneksi atau izin Anda.");
    } finally {
      setIsSubmittingEvaluation(false);
    }
  };

  const handleDelete = async (id: string) => {
    setProjectToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete);
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.ptCv.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterProgress === 'all' ? true :
                         filterProgress === '100' ? p.progress === 100 :
                         filterProgress === 'ongoing' ? p.progress > 0 && p.progress < 100 :
                         p.progress === 0;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Manajemen Proyek</h2>
          <p className="text-slate-500">Kelola data proyek pembangunan pemerintah.</p>
        </div>
        {(user.role === 'admin' || user.role === 'ppk') && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
          >
            <Plus size={20} />
            Tambah Proyek
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama proyek atau PT/CV..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-slate-400" size={20} />
          <select 
            className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
            value={filterProgress}
            onChange={(e) => setFilterProgress(e.target.value)}
          >
            <option value="all">Semua Progress</option>
            <option value="100">Selesai (100%)</option>
            <option value="ongoing">Berjalan (1-99%)</option>
            <option value="0">Belum Mulai (0%)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 bg-slate-100 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <Briefcase size={48} className="mx-auto text-slate-300" />
            <h3 className="text-lg font-bold text-slate-500">Belum ada proyek ditemukan</h3>
            <p className="text-slate-400">Silakan tambahkan proyek baru atau ubah filter pencarian Anda.</p>
            {(user.role === 'admin' || user.role === 'ppk') && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
              >
                <Plus size={20} />
                Tambah Proyek
              </button>
            )}
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-slate-900 line-clamp-2">{project.name}</h4>
                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                      <MapPin size={14} />
                      <span>{project.location}</span>
                    </div>
                    {project.contractNumber && (
                      <div className="flex items-center gap-1 text-slate-400 text-[11px] font-medium mt-1">
                        <FileText size={12} />
                        <span>Kontrak: {project.contractNumber}</span>
                      </div>
                    )}
                    {(project.contractDate || project.spmkDate) && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {project.contractDate && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                            Tgl: {project.contractDate}
                          </span>
                        )}
                        {project.spmkDate && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                            SPMK: {project.spmkDate}
                          </span>
                        )}
                        {project.executionPeriod && project.executionPeriod > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                            {project.executionPeriod} Hari
                          </span>
                        )}
                      </div>
                    )}
                    {project.supervisorName && (
                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-2 font-semibold">
                        <User size={12} className="text-slate-400" />
                        <span>Pengawas: {project.supervisorName}</span>
                      </div>
                    )}
                  </div>
                  {(user.role === 'admin' || user.role === 'ppk') && (
                    <div className="flex gap-1">
                      {project.progress === 100 && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Evaluation button clicked! Project ID:", project.id);
                            handleOpenEvaluation(project);
                          }} 
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors z-30 relative cursor-pointer"
                          title="Nilai Penyedia"
                        >
                          {isLoadingEvaluation && selectedProjectForEvaluation?.id === project.id ? (
                            <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                          ) : (
                            <ClipboardCheck size={16} />
                          )}
                        </button>
                      )}
                      <button onClick={() => handleEdit(project)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(project.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">PT/CV</p>
                    <div className="flex items-center gap-1 text-slate-700 text-sm font-medium">
                      <Building2 size={14} className="text-slate-400" />
                      <span className="truncate">{project.ptCv}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Anggaran</p>
                    <div className="flex items-center gap-1 text-slate-700 text-sm font-medium">
                      <Wallet size={14} className="text-slate-400" />
                      <span>Rp {project.anggaran.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">Progress</span>
                    <span className={`text-sm font-bold ${
                      project.progress === 100 ? 'text-emerald-600' : 
                      project.progress >= 50 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {project.progress}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        project.progress === 100 ? 'bg-emerald-500' : 
                        project.progress >= 50 ? 'bg-blue-500' : 'bg-red-500'
                      }`}
                      style={{width: `${project.progress}%`}}
                    ></div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => navigate('/rab', { state: { projectId: project.id } })}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-700 rounded-xl font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100"
                  >
                    <Calculator size={18} />
                    Lihat RAB
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Proyek?</h3>
              <p className="text-slate-500 mb-8">Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Evaluation Modal */}
      <AnimatePresence>
        {isEvaluationModalOpen && selectedProjectForEvaluation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEvaluationModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-8 pb-4 flex justify-between items-center shrink-0 border-b border-slate-50 bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Penilaian Kinerja</h2>
                  <p className="text-sm text-slate-500 font-medium">{selectedProjectForEvaluation.ptCv}</p>
                </div>
                <button
                  onClick={() => setIsEvaluationModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 pt-6 overflow-y-auto flex-1">
                <form onSubmit={handleEvaluationSubmit} className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Proyek</p>
                    <p className="text-sm font-bold text-blue-900">{selectedProjectForEvaluation.name}</p>
                  </div>

                  {/* Aspect 1: Quality */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-600">1. Kualitas dan Kuantitas Pekerjaan</label>
                    <div className="space-y-2">
                      {[
                        { label: '> 50% hasil pekerjaan memerlukan perbaikan/ penggantian agar sesuai dengan ketentuan dalam kontrak', value: 0.50 },
                        { label: '≤ 50% hasil pekerjaan memerlukan perbaikan/ penggantian agar sesuai dengan ketentuan dalam kontrak', value: 1.00 },
                        { label: '100% hasil pekerjaan sesuai dengan ketentuan dalam kontrak', value: 1.50 }
                      ].map((opt) => (
                        <label key={opt.value} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:border-emerald-500 transition-all">
                          <input
                            type="radio"
                            name="quality"
                            checked={evaluationFormData.quality === opt.value}
                            onChange={() => setEvaluationFormData({ ...evaluationFormData, quality: opt.value })}
                            className="mt-1 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-medium text-slate-600">{opt.label} (Poin {opt.value.toFixed(2)})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Aspect 2: Biaya */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-600">2. Biaya</label>
                    <div className="space-y-2">
                      {[
                        { label: 'Tidak menginformasikan sejak awal atas kondisi/ kejadian yang berpotensi menambah biaya', value: 0.25 },
                        { label: 'Mengajukan perubahan kontrak yang akan berdampak pada penambahan total biaya tanpa alasan yang memadai sehingga ditolak oleh PPK', value: 0.25 },
                        { label: 'Melakukan salah satu kondisi pada kriteria Cukup', value: 0.75 },
                        { label: 'Telah melakukan pengendalian biaya dengan baik dengan menginformasikan sejak awal atas kondisi yang berpotensi menambah biaya dan perubahan kontrak yang diajukan sudah didasari dengan alasan yang dapat dipertanggungjawabkan', value: 1.00 }
                      ].map((opt, idx) => (
                        <label key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:border-emerald-500 transition-all">
                          <input
                            type="radio"
                            name="cost"
                            checked={evaluationFormData.cost === opt.value}
                            onChange={() => setEvaluationFormData({ ...evaluationFormData, cost: opt.value })}
                            className="mt-1 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-medium text-slate-600">{opt.label} (Poin {opt.value.toFixed(2)})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Aspect 3: Waktu */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-600">3. Waktu</label>
                    <div className="space-y-2">
                      {[
                        { label: 'Penyelesaian pekerjaan terlambat melebihi 50 (lima puluh) hari kalender dari waktu yang ditetapkan dalam kontrak karena kesalahan Penyedia', value: 0.50 },
                        { label: 'Penyelesaian pekerjaan terlambat sampai dengan 50 (lima puluh) hari kalender dari waktu yang ditetapkan dalam kontrak karena kesalahan Penyedia', value: 1.00 },
                        { label: 'Penyelesaian pekerjaan sesuai dengan waktu yang ditetapkan dalam kontrak atau lebih cepat sesuai dengan kebutuhan PPK', value: 1.50 }
                      ].map((opt) => (
                        <label key={opt.value} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:border-emerald-500 transition-all">
                          <input
                            type="radio"
                            name="time"
                            checked={evaluationFormData.time === opt.value}
                            onChange={() => setEvaluationFormData({ ...evaluationFormData, time: opt.value })}
                            className="mt-1 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-medium text-slate-600">{opt.label} (Poin {opt.value.toFixed(2)})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Aspect 4: Tingkat Layanan */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-600">4. Tingkat Layanan</label>
                    <div className="space-y-2">
                      {[
                        { label: 'Penyedia lambat memberi tanggapan positif atas permintaan PPK / Sulit diajak berdiskusi', value: 0.33 },
                        { label: 'Merespon permintaan dengan penyelesaian sesuai dengan yang diminta / Mudah dihubungi (Cukup)', value: 0.67 },
                        { label: 'Merespon permintaan dengan penyelesaian sesuai dengan yang diminta / Mudah dihubungi (Baik)', value: 1.00 }
                      ].map((opt, idx) => (
                        <label key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:border-emerald-500 transition-all">
                          <input
                            type="radio"
                            name="service"
                            checked={evaluationFormData.service === opt.value}
                            onChange={() => setEvaluationFormData({ ...evaluationFormData, service: opt.value })}
                            className="mt-1 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-medium text-slate-600">{opt.label} (Poin {opt.value.toFixed(2)})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-800">Total Skor:</span>
                    <span className="text-xl font-black text-emerald-600">
                      {(evaluationFormData.quality + evaluationFormData.cost + evaluationFormData.time + evaluationFormData.service).toFixed(2)} / 5.00
                    </span>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEvaluationModalOpen(false)}
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingEvaluation}
                      className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmittingEvaluation ? 'Menyimpan...' : 'Simpan Penilaian'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">
                {editingProject ? 'Edit Proyek' : 'Tambah Proyek Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nama Proyek</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Lokasi</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nomor Kontrak</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 602/01/KONTRAK/DPU-PR/2024"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({...formData, contractNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tanggal Kontrak</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={formData.contractDate}
                    onChange={(e) => setFormData({...formData, contractDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tanggal SPMK</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={formData.spmkDate}
                    onChange={(e) => setFormData({...formData, spmkDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Masa Pelaksanaan (Hari)</label>
                  <input 
                    type="number" 
                    placeholder="Contoh: 120"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={isNaN(formData.executionPeriod) ? '' : formData.executionPeriod}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({...formData, executionPeriod: isNaN(val) ? 0 : val});
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Penyedia (PT/CV)</label>
                  <select 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                    value={formData.providerId}
                    onChange={(e) => setFormData({...formData, providerId: e.target.value})}
                  >
                    <option value="">Pilih Penyedia</option>
                    {providers
                      .filter(p => {
                        // SKP = 5 - jumlah proyek berjalan (progress < 100)
                        const ongoingCount = projects.filter(proj => proj.providerId === p.id && proj.progress < 100).length;
                        // Selalu tampilkan jika sedang diedit (agar tidak hilang pilihan saat ini)
                        // atau jika masih punya kuota (ongoing < 5)
                        return (editingProject && editingProject.providerId === p.id) || ongoingCount < 5;
                      })
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {projects.filter(proj => proj.providerId === p.id && proj.progress < 100).length >= 5 ? '(Full)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Anggaran (Rp)</label>
                  <input 
                    required
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={isNaN(formData.anggaran) ? '' : formData.anggaran}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({...formData, anggaran: isNaN(val) ? 0 : val});
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Pilih Pengawas</label>
                  <select 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                    value={formData.supervisorName}
                    onChange={(e) => setFormData({...formData, supervisorName: e.target.value})}
                  >
                    <option value="">Pilih Pengawas</option>
                    {supervisors.map(p => {
                      const name = p.name || p.username || p.email;
                      return (
                        <option key={p.uid} value={name}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Latitude</label>
                  <input 
                    required
                    type="number" 
                    step="any"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={isNaN(formData.lat) ? '' : formData.lat}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({...formData, lat: isNaN(val) ? 0 : val});
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Longitude</label>
                  <input 
                    required
                    type="number" 
                    step="any"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={isNaN(formData.lng) ? '' : formData.lng}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({...formData, lng: isNaN(val) ? 0 : val});
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20"
                >
                  {editingProject ? 'Simpan Perubahan' : 'Tambah Proyek'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
