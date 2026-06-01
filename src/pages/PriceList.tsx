import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  Wrench, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Save,
  Calculator,
  Upload,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { read, utils, writeFile } from 'xlsx';
import { LaborMaster, MaterialMaster, EquipmentMaster, UserProfile } from '../types';
import { useLocation } from 'react-router-dom';
import { 
  getLaborMasters, 
  addLaborMaster, 
  updateLaborMaster, 
  deleteLaborMaster,
  resetLaborMasters,
  getMaterialMasters,
  addMaterialMaster,
  updateMaterialMaster,
  deleteMaterialMaster,
  resetMaterialMasters,
  getEquipmentMasters,
  addEquipmentMaster,
  updateEquipmentMaster,
  deleteEquipmentMaster,
  resetEquipmentMasters
} from '../services/firestore';

interface PriceListProps {
  user: UserProfile | null;
}

type Category = 'upah' | 'bahan' | 'alat';

const EmptyItem = {
  description: '',
  code: '',
  unit: '',
  unitPrice: 0
};

export default function PriceList({ user }: PriceListProps) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Category>('upah');

  useEffect(() => {
    if (location.pathname.includes('/upah')) setActiveTab('upah');
    if (location.pathname.includes('/bahan')) setActiveTab('bahan');
    if (location.pathname.includes('/alat')) setActiveTab('alat');
  }, [location.pathname]);
  const [laborItems, setLaborItems] = useState<LaborMaster[]>([]);
  const [materialItems, setMaterialItems] = useState<MaterialMaster[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState(EmptyItem);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'ppk' || user?.role === 'pengawas' || user?.role === 'user';
  const canImport = user?.role === 'admin' || user?.role === 'ppk' || user?.role === 'user';
  const canReset = user?.role === 'admin' || user?.role === 'user';

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canImport) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert("File Excel kosong atau tidak valid.");
        return;
      }

      let successCount = 0;
      for (const row of jsonData as any[]) {
        // Mapping: accommodate variations in column names
        const description = row.Uraian || row.Description || row.Nama || row.uraian || row.description;
        const code = row.Kode || row.Code || row.kode || row.code || '';
        const unit = row.Satuan || row.Unit || row.satuan || row.unit || '';
        const unitPrice = parseFloat(row.Harga || row.Price || row['Harga Satuan'] || row.harga || row.price || '0');

        if (description) {
          const itemData = { description, code, unit, unitPrice };
          if (activeTab === 'upah') await addLaborMaster(itemData);
          else if (activeTab === 'bahan') await addMaterialMaster(itemData);
          else if (activeTab === 'alat') await addEquipmentMaster(itemData);
          successCount++;
        }
      }

      alert(`Berhasil mengimpor ${successCount} data ${activeTab}.`);
    } catch (error) {
      console.error("Error importing Excel:", error);
      alert("Gagal mengimpor file Excel. Pastikan format file benar.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Uraian': `Contoh ${activeTab.toUpperCase()} 1`,
        'Kode': 'X.01',
        'Satuan': activeTab === 'upah' ? 'OH' : 'm3',
        'Harga': 150000
      },
      {
        'Uraian': `Contoh ${activeTab.toUpperCase()} 2`,
        'Kode': 'X.02',
        'Satuan': activeTab === 'upah' ? 'OH' : 'kg',
        'Harga': 25000
      }
    ];

    const worksheet = utils.json_to_sheet(templateData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Template');
    
    // Auto-size columns
    worksheet['!cols'] = [
      { wch: 40 }, // Uraian
      { wch: 15 }, // Kode
      { wch: 10 }, // Satuan
      { wch: 15 }, // Harga
    ];

    writeFile(workbook, `Template_Master_${activeTab.toUpperCase()}.xlsx`);
  };

  useEffect(() => {
    const unsubLabor = getLaborMasters(setLaborItems);
    const unsubMaterial = getMaterialMasters(setMaterialItems);
    const unsubEquipment = getEquipmentMasters((data) => {
      setEquipmentItems(data);
      setLoading(false);
    });

    return () => {
      unsubLabor();
      unsubMaterial();
      unsubEquipment();
    };
  }, []);

  const getActiveItems = () => {
    switch (activeTab) {
      case 'upah': return laborItems;
      case 'bahan': return materialItems;
      case 'alat': return equipmentItems;
      default: return [];
    }
  };

  const filteredItems = getActiveItems().filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      description: item.description,
      code: item.code,
      unit: item.unit,
      unitPrice: item.unitPrice
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    
    try {
      if (activeTab === 'upah') {
        await deleteLaborMaster(id);
      } else if (activeTab === 'bahan') {
        await deleteMaterialMaster(id);
      } else if (activeTab === 'alat') {
        await deleteEquipmentMaster(id);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Gagal menghapus data. Pastikan Anda memiliki izin yang cukup.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsSubmitting(true);

    try {
      if (editingItem) {
        if (activeTab === 'upah') await updateLaborMaster(editingItem.id, formData);
        else if (activeTab === 'bahan') await updateMaterialMaster(editingItem.id, formData);
        else if (activeTab === 'alat') await updateEquipmentMaster(editingItem.id, formData);
      } else {
        if (activeTab === 'upah') await addLaborMaster(formData);
        else if (activeTab === 'bahan') await addMaterialMaster(formData);
        else if (activeTab === 'alat') await addEquipmentMaster(formData);
      }
      setIsModalOpen(false);
      setFormData(EmptyItem);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving item:", error);
      alert("Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!canReset) return;
    if (!window.confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA ${activeTab.toUpperCase()}? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    setIsSubmitting(true);
    try {
      if (activeTab === 'upah') await resetLaborMasters();
      else if (activeTab === 'bahan') await resetMaterialMasters();
      else if (activeTab === 'alat') await resetEquipmentMasters();
      alert(`Semua data ${activeTab} berhasil dihapus.`);
    } catch (error) {
      console.error(`Error resetting ${activeTab}:`, error);
      alert("Gagal menghapus semua data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'upah' as Category, name: 'Harga Satuan Upah', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'bahan' as Category, name: 'Harga Satuan Bahan', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'alat' as Category, name: 'Harga Satuan Alat', icon: Wrench, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Master Harga Satuan</h1>
          <p className="text-slate-500 font-medium">Manajemen data dasar upah, bahan, dan peralatan.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-wrap gap-4">
            {canReset && (
              <button 
                onClick={handleReset}
                disabled={getActiveItems().length === 0 || isSubmitting}
                className="flex items-center justify-center gap-2 bg-white text-red-600 px-6 py-4 rounded-3xl font-black hover:bg-red-50 transition-all border-2 border-red-100 active:scale-95 disabled:opacity-50"
              >
                Reset Data
              </button>
            )}
            
            {canImport && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleExcelImport} 
                  accept=".xlsx, .xls"
                  className="hidden" 
                />
                <button 
                  onClick={handleDownloadTemplate}
                  className="flex items-center justify-center gap-2 bg-white text-slate-700 px-6 py-4 rounded-3xl font-black hover:bg-slate-50 transition-all border-2 border-slate-200 active:scale-95"
                >
                  <FileDown size={20} className="text-emerald-600" />
                  Template Excel
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-4 rounded-3xl font-black hover:bg-slate-900 transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
                >
                  <Upload size={20} />
                  {isImporting ? 'Mengimpor...' : 'Impor Excel'}
                </button>
              </>
            )}

            {canEdit && (
              <button 
                onClick={() => { setEditingItem(null); setFormData(EmptyItem); setIsModalOpen(true); }}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-3xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
              >
                <Plus size={20} />
                Tambah Data Baru
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap p-2 bg-slate-100 rounded-[2rem] gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
              className={`
                flex items-center gap-2 px-6 py-4 rounded-[1.5rem] font-black transition-all
                ${isActive 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:bg-white/50'}
              `}
            >
              <Icon size={18} className={isActive ? tab.color : ''} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Search & List */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder={`Cari berdasarkan uraian atau kode ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent rounded-3xl shadow-sm focus:border-emerald-500/10 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-slate-700 outline-none placeholder:text-slate-300"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <Calculator size={48} className="text-slate-200 mb-4" />
            <div className="h-4 w-48 bg-slate-100 rounded-full"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
               {activeTab === 'upah' ? <Users size={40} /> : activeTab === 'bahan' ? <Package size={40} /> : <Wrench size={40} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Belum ada data {activeTab}</h3>
              <p className="text-slate-500 font-medium">Tambahkan master data baru untuk mulai digunakan dalam analisa AHSP.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map(item => (
              <motion.div 
                layout
                key={item.id}
                className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-14 h-14 ${tabs.find(t => t.id === activeTab)?.bg} flex items-center justify-center rounded-2xl border border-transparent group-hover:scale-105 transition-transform`}>
                    {activeTab === 'upah' ? <Users size={24} className="text-indigo-600" /> : activeTab === 'bahan' ? <Package size={24} className="text-amber-600" /> : <Wrench size={24} className="text-rose-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">{item.code}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.unit}</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 line-clamp-1">{item.description}</h3>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pr-2">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Harga Satuan</p>
                    <div className="flex items-baseline gap-1 justify-end font-black">
                      <span className="text-xs text-slate-400">Rp</span>
                      <span className="text-xl text-emerald-600">
                        {item.unitPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <>
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                          title="Hapus"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl">
                    <Save size={20} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900">
                    {editingItem ? 'Edit Data' : 'Tambah Data Baru'}
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Uraian {activeTab}</label>
                  <textarea 
                    required
                    rows={3}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-800 outline-none resize-none"
                    placeholder={`Contoh: ${activeTab === 'upah' ? 'Pekerja' : activeTab === 'bahan' ? 'Semen Portland (PC)' : 'Excavator 80-140 HP'}`}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode</label>
                    <input 
                      required
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-black text-slate-800 outline-none uppercase tracking-widest"
                      placeholder="L.01"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Satuan</label>
                    <input 
                      required
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-800 outline-none uppercase"
                      placeholder="OH"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Dasar</label>
                  <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-5 focus-within:ring-2 focus-within:ring-emerald-500/20">
                    <span className="font-black text-slate-400">Rp</span>
                    <input 
                      required
                      type="number"
                      className="w-full py-4 bg-transparent border-none font-black text-slate-900 outline-none text-right"
                      placeholder="0"
                      value={isNaN(formData.unitPrice) ? '' : (formData.unitPrice || '')}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({...formData, unitPrice: isNaN(val) ? 0 : val});
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
