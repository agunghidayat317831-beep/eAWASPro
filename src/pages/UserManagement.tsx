import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  UserCheck, 
  Search, 
  ChevronRight,
  Loader2,
  UserCircle,
  Plus,
  X,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { getUsers, updateUserRole, addUser, deleteUser, updateUserProfile } from '../services/firestore';

interface UserManagementProps {
  user: UserProfile | null;
}

export default function UserManagement({ user }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'user' as UserProfile['role']
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const unsubscribe = getUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (uid: string, newRole: UserProfile['role']) => {
    if (!isAdmin) return;
    setUpdatingUid(uid);
    try {
      await updateUserRole(uid, newRole);
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Gagal mengubah hak akses.");
    } finally {
      setUpdatingUid(null);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', username: '', email: '', password: '', role: 'user' });
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setFormData({ 
      name: u.name || '', 
      username: u.username || '', 
      email: u.email || '', 
      password: u.password || '', 
      role: u.role 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        await updateUserProfile(editingUser.uid, formData);
      } else {
        await addUser(formData);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ name: '', username: '', email: '', password: '', role: 'user' });
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Gagal menyimpan data pengguna.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    setUserToDelete(u);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setSubmitting(true);
    try {
      await deleteUser(userToDelete.uid);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Gagal menghapus pengguna.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: UserProfile['role']) => {
    switch (role) {
      case 'admin':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider">Admin</span>;
      case 'pengawas':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">Pengawas</span>;
      case 'ppk':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">PPK</span>;
      case 'kepala_dinas':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider">Kepala Dinas</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">User</span>;
    }
  };

  const togglePasswordVisibility = (uid: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Shield size={48} className="mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-slate-900">Akses Dibatasi</h2>
        <p>Hanya Administrator yang dapat mengakses menu ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Pengguna</h1>
          <p className="text-slate-500 font-medium">Atur hak akses dan peran pengguna aplikasi</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
        >
          <Plus size={20} />
          Tambah User
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Cari pengguna berdasarkan nama, username atau email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-sm font-bold text-slate-600 uppercase tracking-wider">Pengguna</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-600 uppercase tracking-wider">Username</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-600 uppercase tracking-wider">Password</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-600 uppercase tracking-wider">Peran Saat Ini</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-600 uppercase tracking-wider">Ubah Peran</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-600 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <UserCircle size={24} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{u.name || 'Tanpa Nama'}</span>
                          {(u as any).isPending && (
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">Menunggu Login</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-slate-600 font-bold">{u.username || <span className="text-slate-300 italic">N/A</span>}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-slate-600 font-medium">{u.email}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-mono text-sm">
                          {u.password ? (showPasswords[u.uid] ? u.password : '••••••••') : <span className="text-slate-300 italic">Tidak tersimpan</span>}
                        </span>
                        {u.password && (
                          <button 
                            onClick={() => togglePasswordVisibility(u.uid)}
                            className="text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            {showPasswords[u.uid] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="px-8 py-5">
                      <div className="relative inline-block w-full max-w-[200px]">
                        <select
                          disabled={updatingUid === u.uid || u.uid === user?.uid}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value as UserProfile['role'])}
                          className="w-full appearance-none px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 disabled:opacity-50 transition-all pr-10"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="pengawas">Pengawas</option>
                          <option value="ppk">PPK</option>
                          <option value="kepala_dinas">Kepala Dinas</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          {updatingUid === u.uid ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <ChevronRight size={16} className="rotate-90" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Edit User"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          disabled={u.uid === user?.uid}
                          onClick={() => handleDeleteUser(u)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-0"
                          title="Hapus User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="py-20 text-center text-slate-400 font-medium">
              Tidak ada pengguna ditemukan.
            </div>
          )}
        </div>
      )}

      {/* User Form Modal */}
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
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Nama Lengkap</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      placeholder="Masukkan nama lengkap..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
                    <input
                      required
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                      placeholder="username_baru"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      placeholder="email@instansi.go.id"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        required
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                        placeholder="Set password untuk user..."
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 ml-1 italic">*Password ini akan disimpan agar admin dapat memonitoring.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Peran / Hak Akses</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserProfile['role'] })}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700 outline-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="pengawas">Pengawas</option>
                      <option value="ppk">PPK</option>
                      <option value="kepala_dinas">Kepala Dinas</option>
                    </select>
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
                      className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 size={20} className="animate-spin" /> : (editingUser ? 'Simpan Perubahan' : 'Tambah User')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Pengguna?</h3>
              <p className="text-slate-500 mb-8">
                Apakah Anda yakin ingin menghapus <strong>{userToDelete?.name || userToDelete?.email}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
