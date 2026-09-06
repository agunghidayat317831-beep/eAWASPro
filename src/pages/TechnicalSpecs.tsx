import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCheck, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Briefcase, 
  Printer, 
  Copy, 
  Check, 
  Share2, 
  Eye, 
  X, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Wrench, 
  Scale, 
  Layers, 
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  BookmarkCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TechnicalSpec, Project, UserProfile } from '../types';
import { 
  getTechnicalSpecs, 
  addTechnicalSpec, 
  updateTechnicalSpec, 
  deleteTechnicalSpec, 
  seedDefaultTechnicalSpecs, 
  getProjects 
} from '../services/firestore';

interface TechnicalSpecsProps {
  user: UserProfile | null;
}

const CATEGORIES = [
  'Semua Kategori',
  'Pekerjaan Struktur',
  'Pekerjaan Tanah & Pondasi',
  'Pekerjaan Arsitektur',
  'Pekerjaan Saluran & Sanitasi',
  'Pekerjaan Jalan & Jembatan',
  'Pekerjaan Mekanikal & Elektrikal',
  'Mutu Material & Bahan'
];

const PRESET_SPEC_TYPES = [
  { name: 'Pekerjaan Beton Struktur (K-250 / fc 20 MPa)', category: 'Pekerjaan Struktur' },
  { name: 'Pekerjaan Baja Tulangan Beton (SNI 2052)', category: 'Pekerjaan Struktur' },
  { name: 'Pekerjaan Galian & Pondasi Batu Belah', category: 'Pekerjaan Tanah & Pondasi' },
  { name: 'Pekerjaan Pasangan Dinding Bata Ringan AAC & Plesteran', category: 'Pekerjaan Arsitektur' },
  { name: 'Pekerjaan Saluran Drainase U-Ditch & Cover', category: 'Pekerjaan Saluran & Sanitasi' },
  { name: 'Pekerjaan Lapis Perkerasan Aspal (AC-WC / AC-BC)', category: 'Pekerjaan Jalan & Jembatan' },
  { name: 'Pekerjaan Rangka Atap Baja Ringan & Penutup Genteng Metal', category: 'Pekerjaan Arsitektur' },
  { name: 'Pekerjaan Instalasi Pipa Sanitasi & Bio Septic Tank', category: 'Pekerjaan Saluran & Sanitasi' },
  { name: 'Pekerjaan Instalasi Titik Lampu & Panel Listrik', category: 'Pekerjaan Mekanikal & Elektrikal' }
];

export default function TechnicalSpecs({ user }: TechnicalSpecsProps) {
  const [specs, setSpecs] = useState<TechnicalSpec[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<TechnicalSpec | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<{ [id: string]: boolean }>({});
  const [isSeeding, setIsSeeding] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    projectId: string;
    specType: string;
    inspectionProcedure: string;
    category: string;
    standardReference: string;
    acceptanceCriteria: string;
    criticalPoints: string;
    inspectionTools: string;
  }>({
    projectId: 'all',
    specType: '',
    inspectionProcedure: '',
    category: 'Pekerjaan Struktur',
    standardReference: '',
    acceptanceCriteria: '',
    criticalPoints: '',
    inspectionTools: ''
  });

  const canManage = user?.role === 'admin' || user?.role === 'ppk' || user?.role === 'pengawas';

  useEffect(() => {
    const unsubProjects = getProjects((data) => {
      setProjects(data);
    });

    const unsubSpecs = getTechnicalSpecs((data) => {
      setSpecs(data);
      setLoading(false);
    });

    return () => {
      unsubProjects();
      unsubSpecs();
    };
  }, []);

  const filteredSpecs = useMemo(() => {
    return specs.filter(spec => {
      const matchSearch = 
        spec.specType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.inspectionProcedure.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (spec.category && spec.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (spec.standardReference && spec.standardReference.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (spec.criticalPoints && spec.criticalPoints.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = 
        selectedCategory === 'Semua Kategori' || spec.category === selectedCategory;

      const matchProject = 
        selectedProjectFilter === 'all' || 
        !spec.projectId || 
        spec.projectId === 'all' || 
        spec.projectId === selectedProjectFilter;

      return matchSearch && matchCategory && matchProject;
    });
  }, [specs, searchQuery, selectedCategory, selectedProjectFilter]);

  const handleOpenAddModal = () => {
    setFormData({
      projectId: selectedProjectFilter !== 'all' ? selectedProjectFilter : 'all',
      specType: '',
      inspectionProcedure: '',
      category: 'Pekerjaan Struktur',
      standardReference: '',
      acceptanceCriteria: '',
      criticalPoints: '',
      inspectionTools: ''
    });
    setIsEditing(false);
    setSelectedSpec(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (spec: TechnicalSpec) => {
    setFormData({
      projectId: spec.projectId || 'all',
      specType: spec.specType,
      inspectionProcedure: spec.inspectionProcedure,
      category: spec.category || 'Pekerjaan Struktur',
      standardReference: spec.standardReference || '',
      acceptanceCriteria: spec.acceptanceCriteria || '',
      criticalPoints: spec.criticalPoints || '',
      inspectionTools: spec.inspectionTools || ''
    });
    setSelectedSpec(spec);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleOpenDetailModal = (spec: TechnicalSpec) => {
    setSelectedSpec(spec);
    setIsDetailOpen(true);
  };

  const handleOpenPrintModal = (spec: TechnicalSpec) => {
    setSelectedSpec(spec);
    setIsPrintModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.specType.trim() || !formData.inspectionProcedure.trim()) {
      alert('Mohon isi Jenis Spesifikasi Teknis dan Tata Cara Pemeriksaan');
      return;
    }

    const selectedProj = projects.find(p => p.id === formData.projectId);
    const projectName = formData.projectId === 'all' ? 'Standar Umum (Semua Proyek)' : (selectedProj?.name || '');

    try {
      if (isEditing && selectedSpec) {
        await updateTechnicalSpec(selectedSpec.id, {
          ...formData,
          projectName
        });
      } else {
        await addTechnicalSpec({
          ...formData,
          projectName
        });
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving technical spec:', error);
      alert('Gagal menyimpan spesifikasi teknis.');
    }
  };

  const handleDelete = async (spec: TechnicalSpec) => {
    if (window.confirm(`Yakin ingin menghapus spesifikasi teknis "${spec.specType}"?`)) {
      try {
        await deleteTechnicalSpec(spec.id);
        if (selectedSpec?.id === spec.id) {
          setIsDetailOpen(false);
          setSelectedSpec(null);
        }
      } catch (error) {
        console.error('Error deleting spec:', error);
        alert('Gagal menghapus spesifikasi teknis.');
      }
    }
  };

  const handleSeedDefault = async () => {
    if (window.confirm('Muat contoh template spesifikasi teknis standar PUPR & panduan pengawasan lapangan?')) {
      setIsSeeding(true);
      try {
        await seedDefaultTechnicalSpecs();
      } catch (error) {
        console.error('Error seeding specs:', error);
      } finally {
        setIsSeeding(false);
      }
    }
  };

  const handleCopyText = (spec: TechnicalSpec) => {
    const textToCopy = `SPESIFIKASI TEKNIS & TATA CARA PEMERIKSAAN PENGAWAS
--------------------------------------------------
Jenis Spesifikasi : ${spec.specType}
Kategori          : ${spec.category || '-'}
Standar Acuan     : ${spec.standardReference || '-'}
Proyek Terkait    : ${spec.projectName || 'Standar Umum'}

TITIK KRITIS PENGAWASAN:
${spec.criticalPoints || '-'}

KRITERIA KEBERTERIMAAN:
${spec.acceptanceCriteria || '-'}

PERALATAN / ALAT UJI:
${spec.inspectionTools || '-'}

TATA CARA PEMERIKSAAN OLEH PENGAWAS:
${spec.inspectionProcedure}
--------------------------------------------------
Dicatat melalui Sistem e-AWAS Pro`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(spec.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const insertInspectionTemplate = (type: 'steps' | 'criteria' | 'tools') => {
    if (type === 'steps') {
      const template = `1. PEMERIKSAAN PRA-PELAKSANAAN (PRE-WORK INSPECTION):
   a. Pemeriksaan kesiapan gambar kerja (Shop Drawing) & Request for Work (RFI).
   b. Verifikasi sertifikat bahan, hasil uji lab material, dan kondisi penyimpanan di lapangan.
   c. Pemeriksaan alat kerja, rambu K3 konstruksi, dan izin kerja tim teknis.

2. PEMERIKSAAN SAAT PELAKSANAAN (DURING WORK INSPECTION):
   a. Pengawasan metode kerja di lokasi sesuai urutan teknis & standar SOP.
   b. Pengambilan sampel uji lapangan (benda uji/slump/kepadatan/dimensi) sesuai frekuensi yang ditentukan.
   c. Pengukuran elevasi, dimensi, kelurusan, ketegakan (lot), dan ketebalan secara berkala.

3. PEMERIKSAAN PASCA-PELAKSANAAN (POST-WORK INSPECTION):
   a. Inspeksi visual menyeluruh terhadap hasil akhir (bebas cacat/keropos/retak).
   b. Pengujian performa fungsi / uji beban / uji hidrolis / curing minimal waktu yang disyaratkan.
   c. Penandatanganan Berita Acara Pemeriksaan Pekerjaan (Inspection Checklist Form).`;

      setFormData(prev => ({
        ...prev,
        inspectionProcedure: prev.inspectionProcedure ? `${prev.inspectionProcedure}\n\n${template}` : template
      }));
    } else if (type === 'criteria') {
      const critTemplate = `1. Toleransi dimensi: Maksimal ±5 mm dari ukuran gambar bestek.
2. Mutu material: Sesuai spesifikasi RKS (dibuktikan sertifikat uji lab terakreditasi).
3. Hasil uji lapangan: Lolos 100% dari batas ambang minimal yang dipersyaratkan.`;
      setFormData(prev => ({ ...prev, acceptanceCriteria: critTemplate }));
    } else if (type === 'tools') {
      const toolTemplate = `Meteran Baja, Waterpass Auto-Level, Jangka Sorong, Slump Cone, Kerucut Sandcone, Hammer Test, Kamera Dokumentasi`;
      setFormData(prev => ({ ...prev, inspectionTools: toolTemplate }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
              <FileCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Spesifikasi Teknis</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {specs.length} Spesifikasi
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Katalog standar mutu pekerjaan, rincian teknis, dan panduan tata cara pemeriksaan bagi pengawas lapangan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {specs.length === 0 && (
              <button
                onClick={handleSeedDefault}
                disabled={isSeeding}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                title="Muat contoh standar spesifikasi teknis PUPR"
              >
                <Sparkles size={16} className="text-amber-500" />
                <span>{isSeeding ? 'Memuat...' : 'Muat Template PUPR'}</span>
              </button>
            )}

            {canManage && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Plus size={18} />
                <span>Tambah Spesifikasi</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Spesifikasi</span>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{specs.length}</p>
          </div>
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pekerjaan Struktur</span>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">
              {specs.filter(s => s.category?.toLowerCase().includes('struktur')).length}
            </p>
          </div>
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Standar SNI & PUPR</span>
            <p className="text-lg font-bold text-blue-700 mt-0.5">
              {specs.filter(s => s.standardReference).length}
            </p>
          </div>
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Kategori Aktif</span>
            <p className="text-lg font-bold text-indigo-700 mt-0.5">
              {new Set(specs.map(s => s.category).filter(Boolean)).size || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari jenis spesifikasi teknis, kata kunci pemeriksaan, SNI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
              >
                <option value="all">Semua / Standar Umum</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Kartu"
              >
                <Layers size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'table' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Tabel"
              >
                <FileText size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-sm text-slate-500 mt-4">Memuat data spesifikasi teknis...</p>
        </div>
      ) : filteredSpecs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <BookOpen size={32} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-800">Belum Ada Spesifikasi Teknis</h3>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery || selectedCategory !== 'Semua Kategori' || selectedProjectFilter !== 'all'
                ? 'Tidak ada spesifikasi yang cocok dengan filter pencarian Anda.'
                : 'Mulai dengan menambahkan jenis spesifikasi teknis dan tata cara pemeriksaan pengawas baru atau muat template standar PUPR.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {specs.length === 0 && (
              <button
                onClick={handleSeedDefault}
                disabled={isSeeding}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                <Sparkles size={16} className="text-amber-400" />
                <span>{isSeeding ? 'Memuat...' : 'Muat Template PUPR'}</span>
              </button>
            )}
            {canManage && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Plus size={16} />
                <span>Tambah Spesifikasi</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSpecs.map((spec) => {
            const isExpanded = !!expandedCards[spec.id];
            return (
              <motion.div
                key={spec.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Top Badge & Project Tag */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {spec.category || 'Pekerjaan Struktur'}
                      </span>
                      {spec.standardReference && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200" title="Standar Acuan">
                          {spec.standardReference}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                      {spec.projectName || 'Standar Umum'}
                    </span>
                  </div>

                  {/* Spec Title / Jenis Spesifikasi Teknis */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {spec.specType}
                    </h3>
                  </div>

                  {/* Critical Points Pill if present */}
                  {spec.criticalPoints && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                        <AlertTriangle size={14} className="text-amber-600" />
                        <span>Titik Kritis Pengawasan:</span>
                      </div>
                      <p className="text-xs text-amber-900/90 whitespace-pre-line leading-relaxed font-sans">
                        {spec.criticalPoints}
                      </p>
                    </div>
                  )}

                  {/* Inspection Procedure / Tata Cara Pemeriksaan */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck size={15} className="text-emerald-600" />
                        Tata Cara Pemeriksaan oleh Pengawas:
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-xs text-slate-700 font-mono leading-relaxed relative">
                      <p className={`whitespace-pre-line ${!isExpanded ? 'line-clamp-6' : ''}`}>
                        {spec.inspectionProcedure}
                      </p>

                      {spec.inspectionProcedure.length > 250 && (
                        <button
                          onClick={() => toggleExpand(spec.id)}
                          className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>Tutup Rincian <ChevronUp size={14} /></>
                          ) : (
                            <>Baca Selengkapnya <ChevronDown size={14} /></>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Acceptance Criteria & Tools snippet */}
                  {(spec.acceptanceCriteria || spec.inspectionTools) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                      {spec.acceptanceCriteria && (
                        <div className="text-slate-600">
                          <span className="font-bold text-slate-800">Kriteria Lolos:</span> {spec.acceptanceCriteria}
                        </div>
                      )}
                      {spec.inspectionTools && (
                        <div className="text-slate-600">
                          <span className="font-bold text-slate-800">Alat Uji:</span> {spec.inspectionTools}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenDetailModal(spec)}
                      className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Lihat Detail Lengkap"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleCopyText(spec)}
                      className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Salin Teks Panduan"
                    >
                      {copiedId === spec.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => handleOpenPrintModal(spec)}
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Cetak Lembar Pemeriksaan"
                    >
                      <Printer size={16} />
                    </button>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(spec)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Spesifikasi"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(spec)}
                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Spesifikasi"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No</th>
                  <th className="px-4 py-3.5 min-w-[240px]">Jenis Spesifikasi Teknis</th>
                  <th className="px-4 py-3.5 min-w-[140px]">Kategori</th>
                  <th className="px-4 py-3.5 min-w-[140px]">Standar Acuan</th>
                  <th className="px-4 py-3.5 min-w-[320px]">Tata Cara Pemeriksaan Pengawas</th>
                  <th className="px-4 py-3.5 min-w-[140px] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSpecs.map((spec, index) => (
                  <tr key={spec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 text-center text-slate-400 font-mono text-xs">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900">{spec.specType}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{spec.projectName || 'Standar Umum'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {spec.category || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-slate-600">
                      {spec.standardReference || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-slate-600 line-clamp-3 font-mono leading-relaxed">
                        {spec.inspectionProcedure}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetailModal(spec)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Detail"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleCopyText(spec)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Salin"
                        >
                          {copiedId === spec.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                        </button>
                        <button
                          onClick={() => handleOpenPrintModal(spec)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Cetak"
                        >
                          <Printer size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(spec)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(spec)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: FORM TAMBAH / EDIT SPESIFIKASI TEKNIS */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <FileCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {isEditing ? 'Edit Spesifikasi Teknis' : 'Tambah Spesifikasi Teknis Baru'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Input jenis spesifikasi dan rincian tata cara pemeriksaan pengawas
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Proyek Terkait & Kategori */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Briefcase size={14} className="text-slate-500" />
                      Proyek Terkait
                    </label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                      <option value="all">Standar Umum (Berlaku Semua Proyek)</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers size={14} className="text-slate-500" />
                      Kategori Pekerjaan
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                      {CATEGORIES.filter(c => c !== 'Semua Kategori').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 1. INPUT UTAMA: Jenis Spesifikasi Teknis */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
                      Jenis Spesifikasi Teknis <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">Contoh: Pekerjaan Beton Struktur K-250</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama / jenis spesifikasi teknis (misal: Pekerjaan Pasangan Dinding Bata Ringan AAC)"
                    value={formData.specType}
                    onChange={(e) => setFormData(prev => ({ ...prev, specType: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />

                  {/* Preset Quick Chips */}
                  <div className="pt-1">
                    <span className="text-[11px] text-slate-500 font-medium block mb-1">Preset Cepat:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_SPEC_TYPES.slice(0, 5).map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, specType: preset.name, category: preset.category }))}
                          className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 transition-colors cursor-pointer"
                        >
                          + {preset.name.split('(')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Standar Acuan & Peralatan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Scale size={14} className="text-slate-500" />
                      Standar Acuan (SNI / Permen PUPR / Spesifikasi Umum)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: SNI 2847:2019 / Bina Marga 2018 Divisi 7"
                      value={formData.standardReference}
                      onChange={(e) => setFormData(prev => ({ ...prev, standardReference: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Wrench size={14} className="text-slate-500" />
                      Peralatan &amp; Alat Uji Lapangan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Slump cone, Meteran, Caliper, Hammer test"
                      value={formData.inspectionTools}
                      onChange={(e) => setFormData(prev => ({ ...prev, inspectionTools: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Titik Kritis & Kriteria Keberterimaan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-600" />
                      Titik Kritis Pengawasan (Wajib Diperiksa)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="1. Pengecekan elevasi dan ketegakan&#10;2. Slump test dan pengambilan sampel&#10;3. Selimut beton & jarak tahu beton"
                      value={formData.criticalPoints}
                      onChange={(e) => setFormData(prev => ({ ...prev, criticalPoints: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Kriteria Keberterimaan / Batas Toleransi
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Contoh: Kuat tekan f'c mencapai target 100%, deviasi dimensi maksimal ±5 mm, slump 10 ± 2 cm."
                      value={formData.acceptanceCriteria}
                      onChange={(e) => setFormData(prev => ({ ...prev, acceptanceCriteria: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* 2. INPUT UTAMA: Tata Cara Pemeriksaan oleh Pengawas */}
                <div className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                      Tata Cara Pemeriksaan oleh Pengawas <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => insertInspectionTemplate('steps')}
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold border border-emerald-200 cursor-pointer"
                      >
                        + Template 3 Tahap (Pra/Saat/Pasca)
                      </button>
                    </div>
                  </div>

                  <textarea
                    required
                    rows={9}
                    placeholder={`Tuliskan panduan langkah demi langkah prosedur pemeriksaan pengawas lapangan:
1. Pra-Pelaksanaan: Pemeriksaan shop drawing, approval material, izin kerja.
2. Saat Pelaksanaan: Metode pengerjaan, pengawasan mutu, pengujian lapangan.
3. Pasca-Pelaksanaan: Curing/perawatan, uji performa, berita acara checklist.`}
                    value={formData.inspectionProcedure}
                    onChange={(e) => setFormData(prev => ({ ...prev, inspectionProcedure: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono text-slate-800"
                  />
                </div>

                {/* Submit Actions */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-95"
                  >
                    {isEditing ? 'Simpan Perubahan' : 'Simpan Spesifikasi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 2: DETAIL LENGKAP SPESIFIKASI TEKNIS */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isDetailOpen && selectedSpec && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto"
            >
              {/* Detail Header */}
              <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-900 text-white">
                <div className="space-y-1.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {selectedSpec.category || 'Pekerjaan Struktur'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedSpec.projectName || 'Standar Umum'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    {selectedSpec.specType}
                  </h2>
                  {selectedSpec.standardReference && (
                    <p className="text-xs text-blue-300 font-mono">
                      Acuan Standar: {selectedSpec.standardReference}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopyText(selectedSpec)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Salin Teks"
                  >
                    {copiedId === selectedSpec.id ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenPrintModal(selectedSpec);
                    }}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Cetak"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Detail Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
                {/* Highlight Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedSpec.criticalPoints && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <AlertTriangle size={15} className="text-amber-600" />
                        Titik Kritis Pengawasan:
                      </div>
                      <p className="text-xs text-amber-950 whitespace-pre-line leading-relaxed">
                        {selectedSpec.criticalPoints}
                      </p>
                    </div>
                  )}

                  {selectedSpec.acceptanceCriteria && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        Kriteria Keberterimaan / Toleransi:
                      </div>
                      <p className="text-xs text-emerald-950 whitespace-pre-line leading-relaxed">
                        {selectedSpec.acceptanceCriteria}
                      </p>
                    </div>
                  )}
                </div>

                {selectedSpec.inspectionTools && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs">
                    <Wrench size={16} className="text-slate-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800">Peralatan &amp; Alat Uji: </span>
                      <span className="text-slate-600">{selectedSpec.inspectionTools}</span>
                    </div>
                  </div>
                )}

                {/* Main Inspection Procedure */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600" />
                    Tata Cara &amp; Prosedur Pemeriksaan oleh Pengawas
                  </h4>
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-line overflow-x-auto shadow-inner">
                    {selectedSpec.inspectionProcedure}
                  </div>
                </div>
              </div>

              {/* Detail Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {selectedSpec.updatedAt ? `Terakhir diperbarui: ${new Date(selectedSpec.updatedAt).toLocaleDateString('id-ID')}` : ''}
                </span>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <button
                      onClick={() => {
                        setIsDetailOpen(false);
                        handleOpenEditModal(selectedSpec);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                    >
                      Edit Spesifikasi
                    </button>
                  )}
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 3: CETAK / PRINT FORMULIR PEMERIKSAAN PENGAWAS */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isPrintModalOpen && selectedSpec && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
            >
              {/* Print Modal Top Controls */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white print:hidden">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-emerald-400" />
                  <span className="font-bold text-sm">Lembar Pemeriksaan Spesifikasi Teknis Pengawas</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer size={14} /> Cetak Sekarang
                  </button>
                  <button
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Printable Document Paper */}
              <div className="p-8 overflow-y-auto bg-white text-slate-900 font-sans space-y-6 print:p-0">
                {/* Official Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-900">
                    PEMERINTAH KABUPATEN KARAWANG
                  </h3>
                  <h4 className="text-lg font-black uppercase tracking-tight text-slate-900">
                    LEMBAR PEMERIKSAAN SPESIFIKASI TEKNIS PENGAWAS LAPANGAN
                  </h4>
                  <p className="text-xs text-slate-600">
                    Sistem Pengawasan dan Monitoring Pekerjaan Konstruksi (e-AWAS Pro)
                  </p>
                </div>

                {/* Metadata Table */}
                <div className="grid grid-cols-2 gap-4 text-xs border border-slate-300 p-4 rounded-lg bg-slate-50/50">
                  <div className="space-y-1.5">
                    <div>
                      <span className="font-bold text-slate-700">Paket Pekerjaan : </span>
                      <span className="font-semibold text-slate-900">{selectedSpec.projectName || 'Standar Spesifikasi Umum'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Jenis Spesifikasi : </span>
                      <span className="font-semibold text-slate-900">{selectedSpec.specType}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Kategori : </span>
                      <span>{selectedSpec.category || 'Pekerjaan Struktur'}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <span className="font-bold text-slate-700">Standar Acuan : </span>
                      <span className="font-mono">{selectedSpec.standardReference || 'Spesifikasi Teknis Dokumen Kontrak'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Peralatan Uji : </span>
                      <span>{selectedSpec.inspectionTools || 'Sesuai RKS'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Tanggal Pemeriksaan : </span>
                      <span>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Critical & Acceptance Criteria */}
                <div className="space-y-3">
                  {selectedSpec.criticalPoints && (
                    <div className="border border-amber-300 bg-amber-50/50 p-3 rounded-lg text-xs space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-amber-700" />
                        TITIK KRITIS PENGAWASAN LAPANGAN:
                      </div>
                      <p className="whitespace-pre-line text-amber-950 font-medium">
                        {selectedSpec.criticalPoints}
                      </p>
                    </div>
                  )}

                  {selectedSpec.acceptanceCriteria && (
                    <div className="border border-emerald-300 bg-emerald-50/50 p-3 rounded-lg text-xs space-y-1">
                      <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-700" />
                        KRITERIA KEBERTERIMAAN &amp; TOLERANSI:
                      </div>
                      <p className="whitespace-pre-line text-emerald-950">
                        {selectedSpec.acceptanceCriteria}
                      </p>
                    </div>
                  )}
                </div>

                {/* Inspection Procedure Table Checklist */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    TATA CARA PEMERIKSAAN &amp; FORM VERIFIKASI PENGAWAS
                  </h5>
                  <div className="border border-slate-300 rounded-lg p-4 bg-slate-50/30 text-xs font-mono whitespace-pre-line leading-relaxed">
                    {selectedSpec.inspectionProcedure}
                  </div>
                </div>

                {/* Notes & Signatures */}
                <div className="pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">Catatan Khusus Pengawas Lapangan:</p>
                    <div className="border border-dashed border-slate-300 rounded-lg h-24 p-2 text-slate-400 italic">
                      Tulis catatan rekomendasi / hasil pengujian lapangan di sini...
                    </div>
                  </div>

                  <div className="text-center space-y-16">
                    <p className="font-semibold text-slate-800">
                      Karawang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      <br />
                      <span className="font-bold">Pengawas Lapangan</span>
                    </p>
                    <div>
                      <p className="font-bold underline text-slate-900">( .................................................... )</p>
                      <p className="text-[10px] text-slate-500">NIP / Sertifikat Keahlian</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
