import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Search, 
  FileText,
  Briefcase,
  ChevronRight,
  ArrowLeft,
  Settings,
  Upload,
  Download,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { Project, RABItem, AHSP, UserProfile } from '../types';
import { 
  getProjects, 
  getAHSPs, 
  getRABItems, 
  addRABItem, 
  updateRABItem, 
  deleteRABItem,
  addRABItemsBulk,
  deleteAllRABItems
} from '../services/firestore';

interface RABPageProps {
  user: UserProfile | null;
}

const EmptyItem: Omit<RABItem, 'id'> = {
  description: '',
  volume: 0,
  unit: '',
  unitPrice: 0,
  totalPrice: 0
};

interface RABItemFormProps {
  item: Omit<RABItem, 'id'> | RABItem;
  ahsps: AHSP[];
  onSave: (data: Omit<RABItem, 'id'>) => void;
  onCancel: () => void;
}

const RABItemForm: React.FC<RABItemFormProps> = ({ item, ahsps, onSave, onCancel }) => {
  const [formData, setFormData] = useState(item);
  const [searchTerm, setSearchTerm] = useState(item.description || '');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredAHSP = ahsps.filter(a => 
    a.jobName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAHSP = (ahsp: AHSP) => {
    const volume = formData.volume || 0;
    setFormData({
      ...formData,
      ahspId: ahsp.id,
      description: ahsp.jobName,
      unitPrice: ahsp.roundedPrice,
      totalPrice: volume * ahsp.roundedPrice
    });
    setSearchTerm(ahsp.jobName);
    setShowDropdown(false);
  };

  useEffect(() => {
    const volume = parseFloat(formData.volume.toString()) || 0;
    const unitPrice = parseFloat(formData.unitPrice.toString()) || 0;
    setFormData(prev => ({
      ...prev,
      totalPrice: volume * unitPrice
    }));
  }, [formData.volume, formData.unitPrice]);

  return (
    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 relative">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Uraian Pekerjaan</label>
          <div className="relative">
            <input 
              type="text"
              placeholder="Ketik uraian atau cari Analisa..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none pr-10"
              value={searchTerm}
              onChange={(e) => {
                const val = e.target.value;
                setSearchTerm(val);
                setFormData({ ...formData, description: val });
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
            
            <AnimatePresence>
              {showDropdown && searchTerm && filteredAHSP.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-100 shadow-2xl rounded-2xl max-h-60 overflow-y-auto"
                >
                  {filteredAHSP.map(ahsp => (
                    <button
                      key={ahsp.id}
                      type="button"
                      onClick={() => handleSelectAHSP(ahsp)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-none transition-colors"
                    >
                      <p className="text-sm font-bold text-slate-800">{ahsp.jobName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1 rounded uppercase tracking-tighter">{ahsp.code}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Rp {ahsp.roundedPrice.toLocaleString('id-ID')}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Volume</label>
            <input 
              type="number"
              step="0.01"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
              value={formData.volume}
              onChange={(e) => setFormData({...formData, volume: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Satuan</label>
            <input 
              type="text"
              placeholder="e.g. m3, m2, ls"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              value={formData.unit}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Harga Satuan (Rp) - Penawaran</label>
          <input 
            type="number"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
            value={formData.unitPrice || 0}
            onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Jumlah Harga (Rp)</label>
          <input 
            type="number"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed outline-none font-mono"
            value={formData.totalPrice}
            readOnly
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button 
          onClick={onCancel}
          className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Batal
        </button>
        <button 
          onClick={() => onSave(formData)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
        >
          <Save size={18} />
          { 'id' in item ? 'Simpan Perubahan' : 'Tambah RAB' }
        </button>
      </div>
    </div>
  );
};

interface RABProjectCardProps {
  project: Project;
  onClick: () => void;
}

const RABProjectCard: React.FC<RABProjectCardProps> = ({ project, onClick }) => {
  const [rabItems, setRabItems] = useState<RABItem[]>([]);

  useEffect(() => {
    const unsub = getRABItems(project.id, setRabItems);
    return () => unsub();
  }, [project.id]);

  const subTotal = useMemo(() => rabItems.reduce((acc, item) => acc + item.totalPrice, 0), [rabItems]);
  const pajak = subTotal * 0.11;
  const totalWithPajak = subTotal + pajak;
  const pembulatan = Math.ceil(totalWithPajak / 1000) * 1000;

  return (
    <motion.button
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="flex flex-col text-left bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-900/10 transition-all group h-full"
    >
      <div className="flex items-center justify-between w-full mb-4">
        <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
          <Briefcase size={20} />
        </div>
        <ChevronRight className="text-slate-300 group-hover:text-emerald-400 transition-colors" />
      </div>
      <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">{project.name}</h3>
      <p className="text-sm text-slate-400 font-medium line-clamp-1 mb-1">{project.location}</p>
      
      {project.contractNumber && (
        <div className="flex items-center gap-1.5 mb-4">
          <FileText size={12} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
            {project.contractNumber}
          </span>
        </div>
      )}
      
      <div className="mt-auto pt-4 border-t border-slate-50 space-y-2">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>Nilai Kontrak</span>
          <span>Nilai RAB</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-600">Rp {project.anggaran.toLocaleString('id-ID')}</span>
          <span className="text-sm font-black text-emerald-600">
            Rp {pembulatan.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </motion.button>
  );
};

export default function RAB({ user }: RABPageProps) {
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [ahsps, setAHSPs] = useState<AHSP[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [rabItems, setRabItems] = useState<RABItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RABItem | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [importProgress, setImportProgress] = useState({ total: 0, current: 0 });

  const canEdit = user?.role === 'admin' || user?.role === 'ppk' || user?.role === 'pengawas' || user?.role === 'user';

  const downloadTemplate = () => {
    const templateData = [
      {
        'Kode Analisa': 'A.2.2.1.1',
        'Uraian Pekerjaan': 'Galian Tanah Biasa Sedalam 1 m',
        'Volume': 10,
        'Satuan': 'm3',
        'Harga Satuan': 75000
      },
      {
        'Kode Analisa': '',
        'Uraian Pekerjaan': 'Pekerjaan Persiapan Lainnya',
        'Volume': 1,
        'Satuan': 'ls',
        'Harga Satuan': 5000000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template RAB");
    XLSX.writeFile(wb, "Template_Import_RAB.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;

        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];

        if (rows.length === 0) {
          alert("File kosong atau format salah.");
          return;
        }

        setIsImporting(true);
        setImportProgress({ total: rows.length, current: 0 });

        const itemsToSave: Omit<RABItem, 'id'>[] = [];
        let skipCount = 0;

        for (const row of rows) {
          const code = row['Kode Analisa']?.toString().trim();
          const descInput = row['Uraian Pekerjaan']?.toString().trim();
          const volume = parseFloat(row['Volume']) || 0;
          const unit = row['Satuan']?.toString().trim() || 'bh';
          const priceInput = parseFloat(row['Harga Satuan']);

          if (!code && !descInput) {
            skipCount++;
            setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
            continue;
          }

          // Find AHSP if code is provided
          const ahsp = code ? ahsps.find(a => a.code === code) : null;
          
          // Determine unit price: Priority to Excel input, then AHSP, then 0
          let unitPrice = 0;
          if (!isNaN(priceInput)) {
            unitPrice = priceInput;
          } else if (ahsp) {
            unitPrice = ahsp.roundedPrice;
          }

          const itemToSave: Omit<RABItem, 'id'> = {
            description: descInput || ahsp?.jobName || 'Tanpa Keterangan',
            volume,
            unit,
            unitPrice: unitPrice,
            totalPrice: volume * unitPrice
          };

          if (ahsp?.id) {
            itemToSave.ahspId = ahsp.id;
          }

          itemsToSave.push(itemToSave);
          
          setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        if (itemsToSave.length > 0) {
          // Firestore batch limit is 500, let's chunk if needed
          const chunkSize = 400;
          for (let i = 0; i < itemsToSave.length; i += chunkSize) {
            const chunk = itemsToSave.slice(i, i + chunkSize);
            await addRABItemsBulk(selectedProject.id, chunk);
          }
        }

        alert(`Import selesai! Berhasil: ${itemsToSave.length}, Gagal/Skip: ${skipCount}`);
      } catch (err) {
        console.error("Error importing excel:", err);
        alert("Gagal mengimpor file. Pastikan format benar.");
      } finally {
        setIsImporting(false);
        e.target.value = ''; // Reset input
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleResetRAB = async () => {
    if (!selectedProject || rabItems.length === 0) return;
    
    if (!window.confirm("⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA item RAB untuk proyek ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }

    try {
      setIsResetting(true);
      const itemIds = rabItems.map(item => item.id);
      
      // Batch limit 500
      const chunkSize = 400;
      for (let i = 0; i < itemIds.length; i += chunkSize) {
        const chunk = itemIds.slice(i, i + chunkSize);
        await deleteAllRABItems(selectedProject.id, chunk);
      }
      
      alert("Seluruh data RAB berhasil dihapus.");
    } catch (err) {
      console.error("Error resetting RAB:", err);
      alert("Gagal menghapus data RAB.");
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    const unsubProjects = getProjects((pList) => {
      setProjects(pList);
      // Check for project from route state
      const state = location.state as { projectId?: string };
      if (state?.projectId) {
        const project = pList.find(p => p.id === state.projectId);
        if (project) {
          setSelectedProject(project);
        }
      }
    });
    const unsubAHSPs = getAHSPs(setAHSPs);
    return () => {
      unsubProjects();
      unsubAHSPs();
    };
  }, [location.state]);

  useEffect(() => {
    if (selectedProject) {
      const unsubRAB = getRABItems(selectedProject.id, setRabItems);
      return () => unsubRAB();
    } else {
      setRabItems([]);
    }
  }, [selectedProject]);

  const handleSaveItem = async (data: Omit<RABItem, 'id'>) => {
    if (!selectedProject) return;

    try {
      if (editingItem) {
        await updateRABItem(selectedProject.id, editingItem.id, data);
        setIsFormOpen(false);
        setEditingItem(null);
      } else {
        await addRABItem(selectedProject.id, data);
        // Keep form open, reset internal state
        setFormResetKey(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error saving RAB item:", error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedProject || !window.confirm("Hapus item RAB ini?")) return;
    try {
      await deleteRABItem(selectedProject.id, itemId);
    } catch (error) {
      console.error("Error deleting RAB item:", error);
    }
  };

  const subTotal = useMemo(() => rabItems.reduce((acc, item) => acc + item.totalPrice, 0), [rabItems]);
  const pajak = subTotal * 0.11;
  const totalWithPajak = subTotal + pajak;
  const pembulatan = Math.ceil(totalWithPajak / 1000) * 1000;

  const sortedItems = useMemo(() => {
    return [...rabItems].sort((a, b) => {
      const ahspA = ahsps.find(ah => ah.id === a.ahspId);
      const ahspB = ahsps.find(ah => ah.id === b.ahspId);
      
      const valA = ahspA?.code || a.description;
      const valB = ahspB?.code || b.description;
      
      return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [rabItems, ahsps]);

  const filteredItems = sortedItems.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
            <Calculator size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Rencana Anggaran Biaya (RAB)</h1>
            <p className="text-slate-500 font-medium">Pilih proyek untuk mulai mengelola RAB.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <RABProjectCard 
              key={project.id} 
              project={project} 
              onClick={() => setSelectedProject(project)} 
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedProject(null)}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">RAB: {selectedProject.name}</h1>
            <p className="text-slate-500 font-medium">{selectedProject.contractNumber || 'No. Kontrak belum tersedia'}</p>
          </div>
        </div>
        {canEdit && !isFormOpen && (
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={downloadTemplate}
              className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-6 py-4 rounded-3xl font-black hover:bg-slate-200 transition-all border border-slate-200"
              title="Download Template Excel"
            >
              <Download size={20} />
              <span className="hidden lg:inline uppercase text-[10px] tracking-widest">Template</span>
            </button>
            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleImportExcel}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isImporting}
              />
              <button 
                className={`flex items-center justify-center gap-2 bg-white text-emerald-600 border-2 border-emerald-600 px-6 py-4 rounded-3xl font-black hover:bg-emerald-50 transition-all active:scale-95 ${isImporting ? 'opacity-50' : ''}`}
              >
                <Upload size={20} />
                <span className="hidden lg:inline uppercase text-[10px] tracking-widest">{isImporting ? 'Importing...' : 'Impor Excel'}</span>
              </button>
            </div>
            
            <button 
              onClick={handleResetRAB}
              disabled={isResetting || rabItems.length === 0}
              className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border-2 border-red-200 px-6 py-4 rounded-3xl font-black hover:bg-red-100 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Hapus Semua Data RAB"
            >
              <Trash2 size={20} />
              <span className="hidden lg:inline uppercase text-[10px] tracking-widest">{isResetting ? 'Proses...' : 'Reset RAB'}</span>
            </button>

            <button 
              onClick={() => setIsFormOpen(true)}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-3xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
            >
              <Plus size={20} />
              Tambah Pekerjaan Baru
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isImporting && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex items-center gap-4"
          >
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Calculator size={20} className="animate-spin" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-900">Mengimpor RAB...</p>
              <div className="w-full bg-emerald-200 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs font-black text-emerald-600">{importProgress.current} / {importProgress.total}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <RABItemForm 
              key={`${formResetKey}-${editingItem?.id || 'new'}`}
              item={editingItem || EmptyItem} 
              ahsps={ahsps}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingItem(null);
              }}
              onSave={handleSaveItem}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-black text-slate-900">Rincian Anggaran Biaya</h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold" size={18} />
            <input 
              type="text" 
              placeholder="Cari uraian pekerjaan..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-medium text-sm focus:ring-2 focus:ring-emerald-500/10 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-[0.1em]">
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Uraian Pekerjaan</th>
                <th className="px-6 py-4 text-center">Volume</th>
                <th className="px-6 py-4 text-center">Satuan</th>
                <th className="px-6 py-4 text-right">Harga Satuan</th>
                <th className="px-6 py-4 text-right">Jumlah Harga</th>
                {canEdit && <th className="px-6 py-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{item.description}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Analisa: {ahsps.find(a => a.id === item.ahspId)?.code || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-mono text-slate-600">
                    {Number(item.volume).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase">
                    {item.unit}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-mono text-slate-900">
                    Rp {item.unitPrice.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-mono font-black text-slate-900">
                    Rp {item.totalPrice.toLocaleString('id-ID')}
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setIsFormOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="p-4 bg-slate-50 text-slate-300 rounded-full">
                        <FileText size={40} />
                      </div>
                      <p className="text-slate-400 font-medium">Belum ada rincian RAB untuk proyek ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {rabItems.length > 0 && (
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={canEdit ? 5 : 5} className="px-6 py-3 text-right text-sm font-bold text-slate-500">Sub Total</td>
                  <td className="px-6 py-3 text-right text-sm font-mono font-black text-slate-900">Rp {subTotal.toLocaleString('id-ID')}</td>
                  {canEdit && <td></td>}
                </tr>
                <tr>
                  <td colSpan={canEdit ? 5 : 5} className="px-6 py-3 text-right text-sm font-bold text-slate-500">Pajak (11%)</td>
                  <td className="px-6 py-3 text-right text-sm font-mono font-black text-slate-900">Rp {pajak.toLocaleString('id-ID')}</td>
                  {canEdit && <td></td>}
                </tr>
                <tr>
                  <td colSpan={canEdit ? 5 : 5} className="px-6 py-3 text-right text-sm font-heavy text-slate-900 bg-emerald-50">Total</td>
                  <td className="px-6 py-3 text-right text-base font-mono font-black text-emerald-700 bg-emerald-50">Rp {totalWithPajak.toLocaleString('id-ID')}</td>
                  {canEdit && <td className="bg-emerald-50"></td>}
                </tr>
                <tr>
                  <td colSpan={canEdit ? 5 : 5} className="px-6 py-4 text-right text-sm font-black text-slate-900 uppercase">Pembulatan</td>
                  <td className="px-6 py-4 text-right text-lg font-mono font-black text-slate-900 bg-white border-y-2 border-slate-900">Rp {pembulatan.toLocaleString('id-ID')}</td>
                  {canEdit && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
