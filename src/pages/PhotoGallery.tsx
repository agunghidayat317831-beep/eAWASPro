import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Camera, 
  Calendar, 
  Tag, 
  X, 
  Maximize2,
  Filter,
  Image as ImageIcon,
  Video,
  Film,
  Play,
  Trash2,
  Link as LinkIcon,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { getProjects, getProjectPhotos, addPhoto, deletePhoto } from '../services/firestore';
import { Project, ProjectPhoto, UserProfile } from '../types';

const SAMPLE_VIDEOS = [
  {
    title: 'Konstruksi Lapangan',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-crane-operating-on-a-construction-site-of-a-building-41005-large.mp4',
  },
  {
    title: 'Inspeksi Peta 3D',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-animation-of-a-3d-city-map-40282-large.mp4',
  },
  {
    title: 'Model Cetak Biru 3D',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-architecture-blueprint-plan-design-31711-large.mp4',
  }
];

export default function PhotoGallery({ user }: { user: UserProfile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<ProjectPhoto | null>(null);
  
  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video'>('all');

  // Form states
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const isVideo = file.type.startsWith('video/');
      setMediaType(isVideo ? 'video' : 'image');

      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = uploadMode === 'file' ? filePreview : urlInput;

    if (!formData.projectId || !finalUrl) {
      alert('Silakan pilih proyek dan tentukan file foto/video atau tautan URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addPhoto(formData.projectId, {
        ...formData,
        url: finalUrl,
        type: mediaType
      });

      setIsModalOpen(false);
      setSelectedFile(null);
      setFilePreview(null);
      setUrlInput('');
      setFormData({
        projectId: '',
        category: '0%',
        description: '',
        date: new Date().toISOString().split('T')[0],
        progress: 0
      });
    } catch (err) {
      console.error(err);
      alert('Gagal mengunggah dokumentasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!selectedProjectId) return;
    if (window.confirm('Apakah Anda yakin ingin menghapus dokumentasi ini?')) {
      await deletePhoto(selectedProjectId, photoId);
    }
  };

  const isVideoItem = (item: ProjectPhoto) => {
    if (item.type === 'video') return true;
    if (!item.url) return false;
    const urlLower = item.url.toLowerCase();
    return (
      urlLower.startsWith('data:video') ||
      urlLower.endsWith('.mp4') ||
      urlLower.endsWith('.webm') ||
      urlLower.endsWith('.mov') ||
      urlLower.includes('mixkit.co') ||
      urlLower.includes('youtube.com') ||
      urlLower.includes('vimeo.com')
    );
  };

  const filteredPhotos = photos.filter(p => {
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const isVid = isVideoItem(p);
    const matchesMediaType = 
      mediaTypeFilter === 'all' || 
      (mediaTypeFilter === 'video' && isVid) ||
      (mediaTypeFilter === 'image' && !isVid);
    return matchesCategory && matchesMediaType;
  });

  const canManage = user.role === 'admin' || user.role === 'pengawas' || user.role === 'ppk';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Dokumentasi Foto & Video</h2>
          <p className="text-xs sm:text-sm text-slate-500">Pantau progres fisik lapangan melalui dokumentasi foto dan video.</p>
        </div>
        {canManage && (
          <button 
            onClick={() => {
              if (selectedProjectId) {
                setFormData(prev => ({ ...prev, projectId: selectedProjectId }));
              }
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 text-sm active:scale-98"
          >
            <Plus size={18} />
            Upload Foto / Video
          </button>
        )}
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Pilih Proyek</label>
            <select 
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white font-medium"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">-- Pilih Proyek untuk Melihat Dokumentasi --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Filter Tipe Media</label>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMediaTypeFilter('all')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mediaTypeFilter === 'all' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setMediaTypeFilter('image')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  mediaTypeFilter === 'image' 
                    ? 'bg-white text-emerald-700 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ImageIcon size={14} /> Foto
              </button>
              <button
                type="button"
                onClick={() => setMediaTypeFilter('video')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  mediaTypeFilter === 'video' 
                    ? 'bg-white text-purple-700 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Video size={14} /> Video
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Filter Kategori Progress</label>
            <div className="flex items-center gap-2">
              <Filter className="text-slate-400 shrink-0" size={18} />
              <select 
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
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
        <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-3xl p-8 sm:p-12 text-center">
          <Film size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-base sm:text-lg font-bold text-slate-600">Pilih proyek terlebih dahulu</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
            Silakan pilih salah satu proyek dari dropdown di atas untuk melihat dokumentasi foto dan video kegiatan.
          </p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-3xl p-8 sm:p-12 text-center">
          <Camera size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-base sm:text-lg font-bold text-slate-600">Belum ada dokumentasi</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
            {mediaTypeFilter !== 'all' 
              ? `Tidak ada dokumentasi ber-tipe ${mediaTypeFilter === 'video' ? 'Video' : 'Foto'} untuk kriteria ini.`
              : 'Proyek ini belum memiliki dokumentasi foto atau video.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredPhotos.map((photo) => {
            const isVid = isVideoItem(photo);
            return (
              <div key={photo.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all flex flex-col">
                <div className="relative aspect-video overflow-hidden bg-slate-900">
                  {isVid ? (
                    <video 
                      src={photo.url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img 
                      src={photo.url} 
                      alt={photo.description}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className={`
                      px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm
                      ${photo.category === '100%' ? 'bg-emerald-500' : photo.category === '50%' ? 'bg-amber-500' : 'bg-slate-600'}
                    `}>
                      Cat {photo.category}
                    </span>
                    {isVid ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white shadow-sm flex items-center gap-1">
                        <Video size={10} /> VIDEO
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-sm flex items-center gap-1">
                        <ImageIcon size={10} /> FOTO
                      </span>
                    )}
                  </div>

                  {/* Hover Overlay & Play Button */}
                  <button 
                    onClick={() => setPreviewPhoto(photo)}
                    className="absolute inset-0 bg-slate-950/40 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    {isVid ? (
                      <div className="w-14 h-14 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg border border-purple-300/40 transform group-hover:scale-110 transition-transform">
                        <Play size={28} className="ml-1 fill-white" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-900/80 text-white flex items-center justify-center shadow-lg border border-white/20 transform group-hover:scale-110 transition-transform">
                        <Maximize2 size={22} />
                      </div>
                    )}
                  </button>
                </div>

                <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
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
                    <p className="text-xs sm:text-sm text-slate-700 font-medium line-clamp-2">
                      {photo.description || 'Tidak ada deskripsi'}
                    </p>
                  </div>

                  {canManage && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        onClick={() => handleDelete(photo.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 p-1 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus dokumentasi"
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto border border-slate-100">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  {mediaType === 'video' ? <Video size={20} /> : <Camera size={20} />}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">Upload Dokumentasi</h3>
                  <p className="text-xs text-slate-500">Foto atau video progres pekerjaan</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              {/* Upload Mode Selector (File vs URL) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Sumber Media</label>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setUploadMode('file'); setUrlInput(''); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      uploadMode === 'file' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    <Upload size={14} /> Upload File Lokal
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUploadMode('url'); setSelectedFile(null); setFilePreview(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      uploadMode === 'url' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    <LinkIcon size={14} /> Tautan URL Video/Foto
                  </button>
                </div>
              </div>

              {/* Media Type Toggle */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Jenis Dokumentasi</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaType('image')}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      mediaType === 'image' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ImageIcon size={16} /> Foto (Gambar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType('video')}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      mediaType === 'video' 
                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Video size={16} /> Video (Klip MP4/WebM)
                  </button>
                </div>
              </div>

              {/* Upload Input */}
              {uploadMode === 'file' ? (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">
                    Pilih File {mediaType === 'video' ? 'Video' : 'Foto'}
                  </label>
                  <div className="relative group">
                    <input 
                      type="file"
                      accept={mediaType === 'video' ? 'video/*' : 'image/*'}
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-emerald-500 transition-all overflow-hidden p-2"
                    >
                      {filePreview ? (
                        mediaType === 'video' ? (
                          <video src={filePreview} controls className="w-full h-32 object-cover rounded-xl" />
                        ) : (
                          <img src={filePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                          {mediaType === 'video' ? (
                            <Video className="w-8 h-8 text-purple-400 mb-2" />
                          ) : (
                            <Camera className="w-8 h-8 text-emerald-400 mb-2" />
                          )}
                          <p className="font-bold text-slate-700">Klik untuk memilih file {mediaType === 'video' ? 'Video (MP4/WebM)' : 'Foto'}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Mendukung format gambar & video singkat</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">Input URL Direct Video/Foto</label>
                  <input 
                    type="url"
                    placeholder="https://example.com/video.mp4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (e.target.value.toLowerCase().match(/\.(mp4|webm|mov)($|\?)/)) {
                        setMediaType('video');
                      }
                    }}
                  />

                  {/* Sample Video Options */}
                  {mediaType === 'video' && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500">Atau pilih contoh sampel video:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SAMPLE_VIDEOS.map((sample, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setUrlInput(sample.url);
                              setMediaType('video');
                            }}
                            className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-[11px] font-medium border border-purple-200 transition-colors flex items-center gap-1"
                          >
                            <Play size={10} /> {sample.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Project Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Pilih Proyek</label>
                <select 
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white font-medium"
                  value={formData.projectId}
                  onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                >
                  <option value="">-- Pilih Proyek --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Category & Progress */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Kategori</label>
                  <select 
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white font-medium"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                  >
                    <option value="0%">0% (Awal)</option>
                    <option value="50%">50% (Tengah)</option>
                    <option value="100%">100% (Selesai)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Progress (%)</label>
                  <input 
                    required
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium"
                    value={isNaN(formData.progress) ? '' : formData.progress}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({...formData, progress: isNaN(val) ? 0 : val});
                    }}
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Tanggal Dokumentasi</label>
                <input 
                  required
                  type="date"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Deskripsi Kegiatan</label>
                <textarea 
                  placeholder="Catatan pengerjaan atau kondisi fisik di lapangan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none min-h-[80px]"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-5 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {mediaType === 'video' ? <Video size={18} /> : <Camera size={18} />}
                  <span>{isSubmitting ? 'Menyimpan...' : `Simpan Dokumentasi ${mediaType === 'video' ? 'Video' : 'Foto'}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md">
          <button 
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X size={24} />
          </button>
          
          <div className="max-w-4xl w-full space-y-4 my-auto">
            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center max-h-[65vh]">
              {isVideoItem(previewPhoto) ? (
                <video 
                  src={previewPhoto.url} 
                  controls 
                  autoPlay 
                  className="w-full h-auto max-h-[65vh] object-contain"
                />
              ) : (
                <img 
                  src={previewPhoto.url} 
                  alt={previewPhoto.description}
                  className="w-full h-auto max-h-[65vh] object-contain rounded-2xl"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-2xl space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
                    Kategori {previewPhoto.category}
                  </span>
                  {isVideoItem(previewPhoto) ? (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <Video size={12} /> Format Video
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <ImageIcon size={12} /> Format Foto
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm text-slate-500 font-medium">{previewPhoto.date}</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-900">{previewPhoto.description || 'Tidak ada deskripsi'}</p>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 pt-1 border-t border-slate-100">
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
