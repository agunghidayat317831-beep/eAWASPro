import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  AlertTriangle, 
  Wrench, 
  FileText, 
  CloudSun, 
  CheckCircle, 
  Trash2, 
  User, 
  Building2, 
  Clock, 
  Paperclip, 
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import { Project, UserProfile, ProjectChatMessage } from '../types';
import { getProjectMessages, sendProjectMessage, deleteProjectMessage } from '../services/firestore';

interface ProjectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUser: UserProfile;
}

export default function ProjectChatModal({
  isOpen,
  onClose,
  project,
  currentUser
}: ProjectChatModalProps) {
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectChatMessage['category']>('umum');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !project.id) return;

    const unsubscribe = getProjectMessages(project.id, (data) => {
      setMessages(data);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, project.id]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    try {
      const currentSenderName = currentUser.name || currentUser.username || currentUser.email || 'Pengguna';
      
      await sendProjectMessage(project.id, {
        projectId: project.id,
        senderId: currentUser.uid,
        senderName: currentSenderName,
        senderRole: currentUser.role,
        senderEmail: currentUser.email,
        message: inputMessage.trim(),
        category: selectedCategory,
        attachmentUrl: attachmentUrl.trim() || undefined
      });

      setInputMessage('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);
      setSelectedCategory('umum');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Gagal mengirim pesan. Silakan coba lagi.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Hapus pesan ini dari ruang diskusi?')) return;
    try {
      await deleteProjectMessage(project.id, msgId);
    } catch (err) {
      console.error('Gagal menghapus pesan:', err);
    }
  };

  const getCategoryBadge = (cat?: ProjectChatMessage['category']) => {
    switch (cat) {
      case 'kendala_teknis':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
            <AlertTriangle size={11} />
            Kendala Teknis
          </span>
        );
      case 'instruksi_lapangan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Wrench size={11} />
            Instruksi Lapangan
          </span>
        );
      case 'material_alat':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
            <FileText size={11} />
            Material &amp; Alat
          </span>
        );
      case 'cuaca_keadaan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
            <CloudSun size={11} />
            Cuaca / Kahar
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
            Diskusi Umum
          </span>
        );
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'pengawas':
        return <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Pengawas</span>;
      case 'ppk':
        return <span className="bg-purple-100 text-purple-800 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">PPK</span>;
      case 'admin':
        return <span className="bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>;
      case 'kepala_dinas':
        return <span className="bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Kadin</span>;
      default:
        return <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Penyedia / Tim</span>;
    }
  };

  const formatMessageTime = (dateStr: any) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' • ' + 
           d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const filteredMessages = filterCategory === 'all' 
    ? messages 
    : messages.filter(m => m.category === filterCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[90vh] max-h-[780px]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white line-clamp-1">{project.name}</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold shrink-0">
                  Live Diskusi
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Penyedia: <strong className="text-slate-200">{project.ptCv}</strong></span>
                <span>•</span>
                <span>Pengawas: <strong className="text-slate-200">{project.supervisorName || 'Semua'}</strong></span>
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Tutup Ruang Chat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter bar & Quick category chips */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-slate-500 font-semibold text-[11px] mr-1">Filter:</span>
            {[
              { id: 'all', label: 'Semua Pesan' },
              { id: 'kendala_teknis', label: 'Kendala Teknis' },
              { id: 'instruksi_lapangan', label: 'Instruksi' },
              { id: 'material_alat', label: 'Material & Alat' },
              { id: 'cuaca_keadaan', label: 'Cuaca' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterCategory(f.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all whitespace-nowrap ${
                  filterCategory === f.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            {filteredMessages.length} pesan
          </span>
        </div>

        {/* Chat message history container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-100/60">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 bg-emerald-100/70 rounded-full flex items-center justify-center text-emerald-600">
                <MessageSquare size={28} />
              </div>
              <h4 className="text-base font-bold text-slate-800">Ruang Diskusi Masih Kosong</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Belum ada pesan terkait proyek ini. Pengawas dan penyedia dapat saling mengirim instruksi lapangan, melaporkan kendala teknis, atau mendiskusikan material di sini.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.senderId === currentUser.uid;

              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-xs font-bold text-slate-800">
                      {msg.senderName}
                    </span>
                    {getRoleBadge(msg.senderRole)}
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>

                  <div className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-xs transition-all ${
                    isMe 
                      ? 'bg-emerald-600 text-white rounded-tr-xs' 
                      : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                  }`}>
                    {/* Category pill indicator */}
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {getCategoryBadge(msg.category)}
                      {(isMe || currentUser.role === 'admin' || currentUser.role === 'ppk') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition-opacity ${
                            isMe ? 'hover:bg-emerald-700 text-emerald-200' : 'hover:bg-slate-100 text-slate-400 hover:text-red-600'
                          }`}
                          title="Hapus pesan"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Message Body */}
                    <p className={`text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                      isMe ? 'text-emerald-50' : 'text-slate-800'
                    }`}>
                      {msg.message}
                    </p>

                    {/* Attachment preview if link or image */}
                    {msg.attachmentUrl && (
                      <div className="mt-2.5 pt-2 border-t border-white/20">
                        {msg.attachmentUrl.match(/\.(jpeg|jpg|png|webp|gif)/i) ? (
                          <a 
                            href={msg.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden border border-white/30 hover:opacity-90 transition-opacity"
                          >
                            <img 
                              src={msg.attachmentUrl} 
                              alt="Lampiran chat" 
                              className="max-h-48 w-full object-cover rounded-lg"
                            />
                          </a>
                        ) : (
                          <a 
                            href={msg.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 text-xs font-semibold underline truncate ${
                              isMe ? 'text-emerald-100' : 'text-blue-600'
                            }`}
                          >
                            <ExternalLink size={13} />
                            Buka Tautan/Dokumen Pendukung
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 space-y-2">
          {/* Category selection and optional attachment toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-600">Kategori Topik:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="umum">💬 Diskusi Umum</option>
                <option value="kendala_teknis">⚠️ Kendala Teknis</option>
                <option value="instruksi_lapangan">🛠️ Instruksi Lapangan</option>
                <option value="material_alat">📦 Material &amp; Alat</option>
                <option value="cuaca_keadaan">🌧️ Cuaca / Force Majeure</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowAttachmentInput(!showAttachmentInput)}
              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                showAttachmentInput || attachmentUrl
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Paperclip size={12} />
              {showAttachmentInput ? 'Tutup Lampiran' : 'Tambah Lampiran/Foto URL'}
            </button>
          </div>

          {/* Conditional Attachment input field */}
          {showAttachmentInput && (
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 animate-in fade-in duration-150">
              <input
                type="url"
                placeholder="Tempelkan URL foto bukti / dokumen (cth: https://...)"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {attachmentUrl && (
                <button
                  type="button"
                  onClick={() => setAttachmentUrl('')}
                  className="text-slate-400 hover:text-red-500 text-xs px-1"
                >
                  Batal
                </button>
              )}
            </div>
          )}

          {/* Message textarea and send button */}
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              required
              placeholder={`Tulis pesan atau tanggapan terkait ${project.name}...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={sending || !inputMessage.trim()}
              className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer active:scale-95"
            >
              <Send size={16} />
              <span className="hidden sm:inline text-xs">Kirim</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Tekan <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600">Enter</kbd> untuk mengirim, <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600">Shift+Enter</kbd> untuk baris baru.</span>
            <span>Semua percakapan tersimpan permanen di cloud Firestore.</span>
          </div>
        </form>

      </div>
    </div>
  );
}
