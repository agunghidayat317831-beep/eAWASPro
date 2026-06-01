import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Package, 
  Wrench,
  Edit2,
  FileText,
  Download,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AHSP, AHSPItem, UserProfile, LaborMaster, MaterialMaster, EquipmentMaster } from '../types';
import { 
  getAHSPs, 
  addAHSP, 
  updateAHSP, 
  deleteAHSP, 
  resetAHSPs,
  getLaborMasters, 
  addLaborMaster,
  getMaterialMasters,
  addMaterialMaster,
  getEquipmentMasters,
  addEquipmentMaster
} from '../services/firestore';

interface AHSPPageProps {
  user: UserProfile | null;
}

const EmptyItem: Omit<AHSPItem, 'id'> = {
  description: '',
  code: '',
  unit: '',
  coefficient: 0,
  unitPrice: 0,
  totalPrice: 0
};

const Combobox = ({ value, onChange, options, onSelect, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = options.filter((opt: any) => 
    opt.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <textarea 
        className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 resize-none"
        placeholder={placeholder}
        rows={2}
        value={search}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
        }}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
        }}
      />
      <AnimatePresence>
        {isOpen && filtered.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-100 shadow-xl rounded-xl max-h-48 overflow-y-auto"
          >
            {filtered.map((opt: any) => (
              <button
                key={opt.id}
                type="button"
                onMouseDown={() => {
                  onSelect(opt);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-none transition-colors"
              >
                <p className="text-sm font-bold text-slate-800">{opt.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1 rounded uppercase">{opt.code}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{opt.unit} • Rp {opt.unitPrice.toLocaleString('id-ID')}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Section = ({ title, icon: Icon, type, color, items, onAddItem, onRemoveItem, onItemChange, masters = [] }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${color} text-white`}>
          <Icon size={18} />
        </div>
        <h4 className="font-bold text-slate-900">{title}</h4>
      </div>
      <button 
        type="button"
        onClick={() => onAddItem(type)}
        className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
      >
        <Plus size={16} /> Tambah
      </button>
    </div>

    <div className="overflow-x-auto overflow-y-visible">
      <table className="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-400">
            <th className="pb-3 pr-4 font-black min-w-[350px]">Uraian</th>
            <th className="pb-3 pr-4 font-black w-24">Kode</th>
            <th className="pb-3 pr-4 font-black w-20 text-center">Satuan</th>
            <th className="pb-3 pr-4 font-black w-24 text-right">Koefisien</th>
            <th className="pb-3 pr-4 font-black w-32 text-right">Harga Satuan</th>
            <th className="pb-3 pr-4 font-black w-32 text-right">Jumlah Harga</th>
            <th className="pb-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="space-y-2">
          {items.map((item: AHSPItem) => (
            <tr key={item.id} className="group transition-colors hover:bg-slate-50/50">
              <td className="py-2 pr-4">
                {masters.length > 0 ? (
                  <Combobox 
                    value={item.description}
                    options={masters}
                    placeholder={`Pilih atau ketik ${title.toLowerCase()}...`}
                    onChange={(val: string) => onItemChange(type, item.id, 'description', val)}
                    onSelect={(opt: any) => {
                      onItemChange(type, item.id, 'description', opt.description);
                      onItemChange(type, item.id, 'code', opt.code);
                      onItemChange(type, item.id, 'unit', opt.unit);
                      onItemChange(type, item.id, 'unitPrice', opt.unitPrice);
                    }}
                  />
                ) : (
                  <textarea 
                    className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 resize-none"
                    placeholder="Uraian pekerjaan..."
                    rows={2}
                    value={item.description}
                    onChange={(e) => onItemChange(type, item.id, 'description', e.target.value)}
                  />
                )}
              </td>
              <td className="py-2 pr-4">
                <input 
                  className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 uppercase"
                  placeholder="Kode"
                  value={item.code}
                  onChange={(e) => onItemChange(type, item.id, 'code', e.target.value)}
                />
              </td>
              <td className="py-2 pr-4">
                <input 
                  className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs text-center font-bold focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Satuan"
                  value={item.unit}
                  onChange={(e) => onItemChange(type, item.id, 'unit', e.target.value)}
                />
              </td>
              <td className="py-2 pr-4">
                <input 
                  type="number"
                  step="0.001"
                  className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-sm text-right font-bold focus:ring-2 focus:ring-emerald-500/20"
                  value={isNaN(item.coefficient) ? '' : (item.coefficient || '')}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onItemChange(type, item.id, 'coefficient', isNaN(val) ? 0 : val);
                  }}
                />
              </td>
              <td className="py-2 pr-4">
                <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 focus-within:ring-2 focus-within:ring-emerald-500/20">
                  <span className="text-[10px] font-black text-slate-400">Rp</span>
                  <input 
                    type="number"
                    className="w-full bg-transparent border-none py-2 text-sm text-right font-black text-slate-900 outline-none"
                    value={isNaN(item.unitPrice) ? '' : (item.unitPrice || '')}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onItemChange(type, item.id, 'unitPrice', isNaN(val) ? 0 : val);
                    }}
                  />
                </div>
              </td>
              <td className="py-2 pr-4 text-right">
                <span className="text-sm font-black text-slate-900">
                  Rp {(item.coefficient * item.unitPrice).toLocaleString('id-ID')}
                </span>
              </td>
              <td className="py-2 text-center">
                <button 
                  type="button"
                  onClick={() => onRemoveItem(type, item.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function AHSPPage({ user }: AHSPPageProps) {
  const [ahsps, setAHSPs] = useState<AHSP[]>([]);
  const [laborMasters, setLaborMasters] = useState<LaborMaster[]>([]);
  const [materialMasters, setMaterialMasters] = useState<MaterialMaster[]>([]);
  const [equipmentMasters, setEquipmentMasters] = useState<EquipmentMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAHSP, setEditingAHSP] = useState<AHSP | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    jobName: '',
    labor: [{ ...EmptyItem, id: crypto.randomUUID() }] as AHSPItem[],
    materials: [{ ...EmptyItem, id: crypto.randomUUID() }] as AHSPItem[],
    equipment: [{ ...EmptyItem, id: crypto.randomUUID() }] as AHSPItem[],
    overheadPercentage: 10
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'ppk';

  useEffect(() => {
    const unsubAHSPs = getAHSPs((data) => {
      setAHSPs(data);
    });
    const unsubLabor = getLaborMasters(setLaborMasters);
    const unsubMaterial = getMaterialMasters(setMaterialMasters);
    const unsubEquipment = getEquipmentMasters((data) => {
      setEquipmentMasters(data);
      setLoading(false);
    });

    return () => {
      unsubAHSPs();
      unsubLabor();
      unsubMaterial();
      unsubEquipment();
    };
  }, []);

  const totals = useMemo(() => {
    const laborTotal = formData.labor.reduce((sum, item) => sum + ((item.coefficient || 0) * (item.unitPrice || 0)), 0);
    const materialsTotal = formData.materials.reduce((sum, item) => sum + ((item.coefficient || 0) * (item.unitPrice || 0)), 0);
    const equipmentTotal = formData.equipment.reduce((sum, item) => sum + ((item.coefficient || 0) * (item.unitPrice || 0)), 0);
    const subtotal = laborTotal + materialsTotal + equipmentTotal;
    const overheadValue = ((formData.overheadPercentage || 0) / 100) * subtotal;
    const totalPrice = subtotal + overheadValue;
    const roundedPrice = Math.round(totalPrice) || 0;

    return {
      laborTotal: laborTotal || 0,
      materialsTotal: materialsTotal || 0,
      equipmentTotal: equipmentTotal || 0,
      subtotal: subtotal || 0,
      overheadValue: overheadValue || 0,
      totalPrice: totalPrice || 0,
      roundedPrice: roundedPrice || 0
    };
  }, [formData]);

  const handleAddItem = (type: 'labor' | 'materials' | 'equipment') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { ...EmptyItem, id: crypto.randomUUID() }]
    }));
  };

  const handleRemoveItem = (type: 'labor' | 'materials' | 'equipment', id: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  const handleItemChange = (type: 'labor' | 'materials' | 'equipment', id: string, field: keyof AHSPItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'coefficient' || field === 'unitPrice') {
            updated.totalPrice = (updated.coefficient || 0) * (updated.unitPrice || 0);
          }
          return updated;
        }
        return item;
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSubmitting(true);

    // Save any new master items if they don't exist
    const saveNewMasterItems = async () => {
      // Labor
      const newLabor = formData.labor.filter(item => 
        item.description && !laborMasters.some(m => m.description === item.description)
      );
      for (const item of newLabor) {
        await addLaborMaster({ description: item.description, code: item.code, unit: item.unit, unitPrice: item.unitPrice });
      }

      // Materials
      const newMaterials = formData.materials.filter(item => 
        item.description && !materialMasters.some(m => m.description === item.description)
      );
      for (const item of newMaterials) {
        await addMaterialMaster({ description: item.description, code: item.code, unit: item.unit, unitPrice: item.unitPrice });
      }

      // Equipment
      const newEquipment = formData.equipment.filter(item => 
        item.description && !equipmentMasters.some(m => m.description === item.description)
      );
      for (const item of newEquipment) {
        await addEquipmentMaster({ description: item.description, code: item.code, unit: item.unit, unitPrice: item.unitPrice });
      }
    };

    const finalData: Omit<AHSP, 'id' | 'createdAt' | 'updatedAt'> = {
      ...formData,
      ...totals
    };

    try {
      if (editingAHSP) {
        await updateAHSP(editingAHSP.id, finalData);
      } else {
        await saveNewMasterItems();
        await addAHSP(finalData);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving AHSP:", error);
      alert("Gagal menyimpan AHSP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingAHSP(null);
    setFormData({
      code: '',
      jobName: '',
      labor: [{ ...EmptyItem, id: crypto.randomUUID() }],
      materials: [{ ...EmptyItem, id: crypto.randomUUID() }],
      equipment: [{ ...EmptyItem, id: crypto.randomUUID() }],
      overheadPercentage: 10
    });
  };

  const handleEdit = (ahsp: AHSP) => {
    setEditingAHSP(ahsp);
    setFormData({
      code: ahsp.code,
      jobName: ahsp.jobName,
      labor: ahsp.labor.map(item => ({ ...item })),
      materials: ahsp.materials.map(item => ({ ...item })),
      equipment: ahsp.equipment.map(item => ({ ...item })),
      overheadPercentage: ahsp.overheadPercentage
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus analisa ini?")) return;
    try {
      await deleteAHSP(id);
    } catch (error) {
      console.error("Error deleting AHSP:", error);
      alert("Gagal menghapus analisa.");
    }
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    if (!window.confirm("⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA analisa harga satuan? Tindakan ini tidak dapat dibatalkan.")) return;
    
    setIsSubmitting(true);
    try {
      await resetAHSPs();
      alert("Semua data analisa berhasil dihapus.");
    } catch (error) {
      console.error("Error resetting AHSPs:", error);
      alert("Gagal menghapus semua data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAHSPs = ahsps.filter(a => 
    a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.jobName.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analisa Harga Satuan Pekerjaan (AHSP)</h1>
          <p className="text-slate-500 font-medium">Manajemen rincian komponen biaya tenaga, bahan, dan alat.</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleReset}
              disabled={ahsps.length === 0 || isSubmitting}
              className="flex items-center justify-center gap-2 bg-white text-red-600 border-2 border-red-100 px-6 py-4 rounded-3xl font-black hover:bg-red-50 hover:border-red-200 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:border-slate-100 disabled:text-slate-300"
              title="Hapus Semua Data Analisa"
            >
              <RotateCcw size={20} />
              Reset Data
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-3xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
            >
              <Plus size={20} />
              Buat Analisa Baru
            </button>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Calculator size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Analisa</p>
            <h3 className="text-2xl font-black text-slate-900">{ahsps.length} Item</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Komponen Tenaga</p>
            <h3 className="text-2xl font-black text-slate-900">
              {laborMasters.length} Item
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Komponen Bahan</p>
            <h3 className="text-2xl font-black text-slate-900">
              {materialMasters.length} Item
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <Wrench size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Komponen Alat</p>
            <h3 className="text-2xl font-black text-slate-900">
              {equipmentMasters.length} Item
            </h3>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan kode atau nama pekerjaan..."
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
        ) : filteredAHSPs.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <Calculator size={40} className="text-slate-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Belum ada analisa harga</h3>
              <p className="text-slate-500 font-medium">Buat analisa harga satuan baru untuk mulai mengelola biaya proyek.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAHSPs.map(ahsp => {
              const isExpanded = expandedId === ahsp.id;
              
              return (
                <motion.div 
                  layout
                  key={ahsp.id}
                  className="bg-white rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all border border-slate-100 overflow-hidden group"
                >
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 bg-slate-50 flex flex-col items-center justify-center rounded-2xl border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">AHSP</span>
                        <span className="text-lg font-black text-slate-900 uppercase">{ahsp.code.slice(0, 2)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">{ahsp.code}</span>
                          <span className="text-xs font-bold text-slate-400">• {(new Date(ahsp.createdAt?.toDate())).toLocaleDateString('id-ID')}</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900">{ahsp.jobName}</h3>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-8 md:pr-4">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Harga Satuan Pekerjaan</p>
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-xs font-bold text-slate-400">Rp</span>
                          <span className="text-2xl font-black text-emerald-600">
                            {ahsp.roundedPrice.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : ahsp.id); }}
                            className={`p-3 rounded-2xl transition-all ${isExpanded ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                            title={isExpanded ? "Sembunyikan Detail" : "Tampilkan Detail"}
                          >
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                        )}
                        {!isExpanded && !isAdmin && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : ahsp.id); }}
                            className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
                          >
                            <ChevronDown size={20} />
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEdit(ahsp); }}
                              className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                              title="Edit Analisa"
                            >
                              <Edit2 size={20} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(ahsp.id); }}
                              className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                              title="Hapus Analisa"
                            >
                              <Trash2 size={20} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-50 bg-slate-50/50"
                      >
                        <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-indigo-600 mb-1">
                              <Users size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Tenaga Kerja (A)</span>
                            </div>
                            <p className="text-lg font-black text-slate-800">Rp {ahsp.laborTotal.toLocaleString('id-ID')}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{ahsp.labor.length} Komponen</p>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-amber-600 mb-1">
                              <Package size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Bahan (B)</span>
                            </div>
                            <p className="text-lg font-black text-slate-800">Rp {ahsp.materialsTotal.toLocaleString('id-ID')}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{ahsp.materials.length} Komponen</p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-rose-600 mb-1">
                              <Wrench size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Peralatan (C)</span>
                            </div>
                            <p className="text-lg font-black text-slate-800">Rp {ahsp.equipmentTotal.toLocaleString('id-ID')}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{ahsp.equipment.length} Komponen</p>
                          </div>

                          <div className="space-y-2 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 text-emerald-600 mb-1">
                              <Calculator size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Overhead ({ahsp.overheadPercentage}%)</span>
                            </div>
                            <p className="text-lg font-black text-slate-900 font-mono">Rp {ahsp.overheadValue.toLocaleString('id-ID')}</p>
                            <div className="pt-2 border-t border-slate-50">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Subtotal (A+B+C)</p>
                              <p className="text-sm font-bold text-slate-600">Rp {ahsp.subtotal.toLocaleString('id-ID')}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal AHSP Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-6xl h-full rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-emerald-600 text-white rounded-[1.5rem] shadow-xl shadow-emerald-900/20">
                    <Calculator size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {editingAHSP ? 'Edit Analisa Harga Satuan' : 'Input Analisa Harga Satuan Pekerjaan'}
                    </h2>
                    <p className="text-sm font-medium text-slate-500">Isi komponen analisa harga satuan pekerjaan secara detail.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <X size={28} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Content - Two Column Layout when big screen */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Form Fields */}
                <div className="flex-1 p-10 overflow-y-auto space-y-12">
                  <form id="ahsp-form" onSubmit={handleSubmit} className="space-y-12">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      <div className="md:col-span-3 space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Kode Analisa</label>
                        <input 
                          required
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-emerald-500/20 font-black text-slate-800 outline-none uppercase tracking-widest"
                          placeholder="A.2.2.1-..."
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-9 space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nama Pekerjaan</label>
                        <textarea 
                          required
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-800 outline-none resize-none"
                          placeholder="Contoh: Pekerjaan Galian Tanah Biasa Kedalaman s.d. 1 m"
                          rows={2}
                          value={formData.jobName}
                          onChange={(e) => setFormData({...formData, jobName: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Section A: Labor */}
                    <Section 
                      title="TENAGA KERJA (A)" 
                      icon={Users} 
                      type="labor" 
                      color="bg-indigo-500"
                      items={formData.labor}
                      masters={laborMasters}
                      onAddItem={handleAddItem}
                      onRemoveItem={handleRemoveItem}
                      onItemChange={handleItemChange}
                    />

                    {/* Section B: Materials */}
                    <Section 
                      title="BAHAN (B)" 
                      icon={Package} 
                      type="materials" 
                      color="bg-amber-500"
                      items={formData.materials}
                      masters={materialMasters}
                      onAddItem={handleAddItem}
                      onRemoveItem={handleRemoveItem}
                      onItemChange={handleItemChange}
                    />

                    {/* Section C: Equipment */}
                    <Section 
                      title="PERALATAN (C)" 
                      icon={Wrench} 
                      type="equipment" 
                      color="bg-rose-500"
                      items={formData.equipment}
                      masters={equipmentMasters}
                      onAddItem={handleAddItem}
                      onRemoveItem={handleRemoveItem}
                      onItemChange={handleItemChange}
                    />
                  </form>
                </div>

                {/* Sidebar Summary & Calculations */}
                <div className="w-full lg:w-[380px] bg-slate-50 border-l border-slate-100 p-10 flex flex-col shrink-0 overflow-y-auto">
                  <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                    <FileText size={20} className="text-emerald-600" />
                    Ringkasan Biaya
                  </h3>

                  <div className="space-y-6 flex-1">
                    <div className="p-5 bg-white rounded-3xl border border-slate-200">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Tenaga (A)</span>
                          <span className="text-sm font-black text-slate-800">Rp {totals.laborTotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Bahan (B)</span>
                          <span className="text-sm font-black text-slate-800">Rp {totals.materialsTotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Alat (C)</span>
                          <span className="text-sm font-black text-slate-800">Rp {totals.equipmentTotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Total (A+B+C)</span>
                          <span className="text-lg font-black text-emerald-600 font-mono">Rp {totals.subtotal.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-emerald-600 rounded-[2rem] text-white space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black uppercase tracking-widest opacity-80">Biaya Umum & Keuntungan</label>
                          <span className="text-xs font-black font-mono">{formData.overheadPercentage}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="15" 
                          step="0.5"
                          value={isNaN(formData.overheadPercentage) ? 0 : formData.overheadPercentage}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setFormData({...formData, overheadPercentage: isNaN(val) ? 0 : val});
                          }}
                          className="w-full h-2 bg-emerald-700 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <div className="flex justify-between text-[10px] font-bold opacity-60">
                          <span>0%</span>
                          <span>Max 15%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Nilai Keuntungan</p>
                        <p className="text-xl font-black font-mono">Rp {totals.overheadValue.toLocaleString('id-ID')}</p>
                      </div>

                      <div className="pt-6 border-t border-emerald-500/50 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Harga Satuan Pekerjaan (D+E)</p>
                        <p className="text-3xl font-black font-mono">Rp {totals.roundedPrice.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] font-bold opacity-60 italic">Pembulatan nilai ke satuan terdekat.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 space-y-4">
                    <button 
                      form="ahsp-form"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-slate-900 text-white px-8 py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Menyimpan...' : (
                        <>
                          <Save size={20} />
                          {editingAHSP ? 'Simpan Perubahan' : 'Terbitkan Analisa'}
                        </>
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full bg-slate-200 text-slate-700 px-8 py-4 rounded-[1.5rem] font-bold text-sm transition-all hover:bg-slate-300"
                    >
                      Batal
                    </button>
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
