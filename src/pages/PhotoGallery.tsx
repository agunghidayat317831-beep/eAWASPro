import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Camera, 
  Calendar, 
  Tag, 
  X, 
  Maximize2,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import { getProjects, getProjectPhotos, addPhoto } from '../services/firestore';
import { Project, ProjectPhoto, UserProfile } from '../types';

export default function PhotoGallery({ user }: { user: UserProfile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<ProjectPhoto | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    projectId: '',
    category: '0%' as '0%' | '50%' | '100%',
    description: '',
    date: new Date().toISOString().split('T')[0],
    progress: 0
  });

  useEffect(() => {
    const unsubscribe = getProjects((data) => {
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
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (selectedProjectId) {
      const unsubscribe = getProjectPhotos(selectedProjectId, setPhotos);
      return () => unsubscribe();
    } else {
      setPhotos([]);
    }
  }, [selectedProjectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !filePreview) {
      alert('Silakan pilih proyek dan file foto.');
      return;
    }

    await addPhoto(formData.projectId, {
      ...formData,
      url: filePreview
    });

    setIsModalOpen(false);
    setSelectedFile(null);
    setFilePreview(null);
    setFormData({
      projectId: '',
      category: '0%',
      description: '',
      date: new Date().toISOString().split('T')[0],
      progress: 0
    });
  };

  const filteredPhotos = photos.filter(p => 
    filterCategory === 'all' ? true : p.category === filterCategory
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Dokumentasi Foto</h2>
          <p className="text-slate-500">Pantau progres fisik melalui dokumentasi visual.</p>
        </div>
        {user.role === 'admin' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
          >
            <Plus size={20} />
            Upload Foto
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Pilih Proyek</label>
            <select 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">-- Pilih Proyek untuk Melihat Foto --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Filter Kategori</label>
            <div className="flex items-center gap-2">
              <Filter className="text-slate-400" size={20} />
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">Semua Kategori</option>
                <option value="0%">Progres 0% (Awal)</option>
                <option value="50%">Progres 50% (Tengah)</option>
                <option value="100%">Progres 100% (Selesai)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-500">Pilih proyek terlebih dahulu</h3>
          <p className="text-slate-400">Pilih salah satu proyek dari dropdown di atas untuk melihat galeri foto.</p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <Camera size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-500">Belum ada dokumentasi</h3>
          <p className="text-slate-400">Proyek ini belum memiliki foto dokumentasi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all">
              <div className="relative aspect-video overflow-hidden">
                <img 
                  src={photo.url} 
                  alt={photo.description}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3">
                  <span className={`
                    px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm
                    ${photo.category === '100%' ? 'bg-emerald-500' : photo.category === '50%' ? 'bg-amber-500' : 'bg-slate-500'}
                  `}>
                    Kategori {photo.category}
                  </span>
                </div>
                <button 
                  onClick={() => setPreviewPhoto(photo)}
                  className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                >
                  <Maximize2 size={32} />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{photo.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag size={12} />
                    <span className="font-bold text-slate-700">{photo.progress}% Progress</span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 font-medium line-clamp-2">{photo.description || 'Tidak ada deskripsi'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">Upload Dokumentasi</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Pilih Foto Lokal</label>
                <div className="relative group">
                  <input 
                    required
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-emerald-500 transition-all overflow-hidden"
                  >
                    {filePreview ? (
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Camera className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">Klik untuk pilih foto</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Pilih Proyek</label>
                <select 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                  value={formData.projectId}
                  onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                >
                  <option value="">-- Pilih Proyek --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Kategori</label>
                  <select 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                  >
                    <option value="0%">0% (Awal)</option>
                    <option value="50%">50% (Tengah)</option>
                    <option value="100%">100% (Selesai)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Progress (%)</label>
                  <input 
                    required
                    type="number"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={isNaN(formData.progress) ? '' : formData.progress}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({...formData, progress: isNaN(val) ? 0 : val});
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tanggal</label>
                <input 
                  required
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Deskripsi</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none min-h-[100px]"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full px-6 py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                >
                  <Camera size={20} />
                  Simpan Dokumentasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <button 
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-6 right-6 p-2 text-white hover:text-emerald-400 transition-colors"
          >
            <X size={32} />
          </button>
          <div className="max-w-5xl w-full space-y-4">
            <img 
              src={previewPhoto.url} 
              alt={previewPhoto.description}
              className="w-full h-auto max-h-[70vh] object-contain rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="bg-white p-6 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  Kategori {previewPhoto.category}
                </span>
                <span className="text-sm text-slate-500 font-medium">{previewPhoto.date}</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{previewPhoto.description || 'Tidak ada deskripsi'}</p>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Tag size={16} className="text-slate-400" />
                <span>Progress saat ini: <span className="font-bold text-emerald-600">{previewPhoto.progress}%</span></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
