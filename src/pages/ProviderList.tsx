import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  MapPin,
  FileText,
  Mail,
  Phone,
  Star,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ListFilter,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Provider, UserProfile, ProjectEvaluation, Project } from '../types';
import { getProviders, addProvider, updateProvider, deleteProvider, getProjectEvaluations, getProjects } from '../services/firestore';

interface ProviderListProps {
  user: UserProfile | null;
}

export default function ProviderList({ user }: ProviderListProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [evaluations, setEvaluations] = useState<ProjectEvaluation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'skp' | 'performance'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    npwp: '',
    email: '',
    phone: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const unsubscribeProviders = getProviders((data) => {
      setProviders(data);
      setLoading(false);
    });
    const unsubscribeEvaluations = getProjectEvaluations(setEvaluations);
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
    });
    return () => {
      unsubscribeProviders();
      unsubscribeEvaluations();
      unsubscribeProjects();
    };
  }, [user]);

  const getProviderAverage = (providerId: string) => {
    const providerEvaluations = evaluations.filter(e => e.providerId === providerId);
    if (providerEvaluations.length === 0) return null;
    
    const sum = providerEvaluations.reduce((acc, curr) => acc + curr.totalScore, 0);
    return {
      score: sum / providerEvaluations.length,
      count: providerEvaluations.length
    };
  };

  const getProviderSKP = (providerId: string) => {
    // SKP = 5 - jumlah proyek yang sedang dikerjakan (progress < 100)
    const ongoingProjects = projects.filter(p => p.providerId === providerId && p.progress < 100);
    const score = 5 - ongoingProjects.length;
    return {
      score: score < 0 ? 0 : score, // Ensure it doesn't go below 0
      ongoingCount: ongoingProjects.length
    };
  };

  const handleOpenModal = (provider?: Provider) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData({
        name: provider.name,
        address: provider.address,
        npwp: provider.npwp,
        email: provider.email || '',
        phone: provider.phone || ''
      });
    } else {
      setEditingProvider(null);
      setFormData({
        name: '',
        address: '',
        npwp: '',
        email: '',
        phone: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (editingProvider) {
        await updateProvider(editingProvider.id, formData);
      } else {
        await addProvider(formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving provider:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setProviderToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (providerToDelete) {
      await deleteProvider(providerToDelete);
      setIsDeleteModalOpen(false);
      setProviderToDelete(null);
    }
  };

  const sortedAndFilteredProviders = [...providers]
    .filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.npwp.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === 'skp') {
        valA = getProviderSKP(a.id).score;
        valB = getProviderSKP(b.id).score;
      } else if (sortBy === 'performance') {
        valA = getProviderAverage(a.id)?.score || 0;
        valB = getProviderAverage(b.id)?.score || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Daftar Penyedia</h1>
          <p className="text-slate-500 font-medium">Manajemen data CV/PT penyedia jasa</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Plus size={20} />
            Tambah Penyedia
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari penyedia, alamat, atau NPWP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm self-stretch md:self-auto overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 px-3 py-2 border-r border-slate-100 mr-1">
            <ListFilter size={18} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Urutkan</span>
          </div>
          
          <button
            onClick={() => {
              if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              else { setSortBy('name'); setSortOrder('asc'); }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${sortBy === 'name' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Nama
            {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
          </button>

          <button
            onClick={() => {
              if (sortBy === 'skp') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              else { setSortBy('skp'); setSortOrder('desc'); }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${sortBy === 'skp' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            SKP
            {sortBy === 'skp' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
          </button>

          <button
            onClick={() => {
              if (sortBy === 'performance') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              else { setSortBy('performance'); setSortOrder('desc'); }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${sortBy === 'performance' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Skor Kinerja
            {sortBy === 'performance' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {sortedAndFilteredProviders.map((provider) => (
              <motion.div
                key={provider.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all border border-slate-100 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Building2 size={24} />
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(provider)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-4">{provider.name}</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-slate-600">
                    <MapPin size={18} className="mt-1 shrink-0 text-slate-400" />
                    <p className="text-sm font-medium leading-relaxed">{provider.address}</p>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <FileText size={18} className="shrink-0 text-slate-400" />
                    <p className="text-sm font-mono font-medium bg-slate-50 px-2 py-1 rounded-md">
                      {provider.npwp}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Mail size={18} className="shrink-0 text-slate-400" />
                    <p className="text-sm font-medium">{provider.email}</p>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone size={18} className="shrink-0 text-slate-400" />
                    <p className="text-sm font-medium">{provider.phone}</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-4">
                  <div className="flex-1 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">SKP</p>
                    {(() => {
                      const skp = getProviderSKP(provider.id);
                      return (
                        <div className="flex items-end gap-1">
                          <span className={`text-xl font-black ${skp.score <= 1 ? 'text-red-500' : skp.score <= 3 ? 'text-amber-500' : 'text-emerald-600'}`}>
                            {skp.score}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold mb-1">/ 5</span>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Berjalan</p>
                    {(() => {
                      const skp = getProviderSKP(provider.id);
                      return (
                        <span className="text-xl font-black text-slate-700">
                          {skp.ongoingCount}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {(() => {
                  const avg = getProviderAverage(provider.id);
                  if (!avg) return null;
                  return (
                    <div className="mt-6 pt-6 border-t border-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-rata Skor Kinerja</span>
                          <span className="text-[10px] text-slate-400 font-medium">Dari {avg.count} proyek yang dinilai</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 font-black">
                          <Star size={14} fill="currentColor" />
                          <span>{avg.score.toFixed(2)} / 5.00</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-1000" 
                          style={{ width: `${(avg.score / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Penyedia?</h3>
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

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-8 pb-4 flex justify-between items-center shrink-0 border-b border-slate-50 bg-slate-50/50">
                <h2 className="text-2xl font-black text-slate-900">
                  {editingProvider ? 'Edit Penyedia' : 'Tambah Penyedia Baru'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 pt-6 overflow-y-auto flex-1">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Nama CV/PT</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      placeholder="Masukkan nama perusahaan..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Alamat</label>
                    <textarea
                      required
                      rows={3}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium resize-none"
                      placeholder="Masukkan alamat lengkap..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">NPWP</label>
                    <input
                      required
                      type="text"
                      value={formData.npwp}
                      onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      placeholder="00.000.000.0-000.000"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                        placeholder="email@perusahaan.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Nomor Telepon</label>
                      <input
                        required
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                        placeholder="0812..."
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        editingProvider ? 'Simpan Perubahan' : 'Tambah Penyedia'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
