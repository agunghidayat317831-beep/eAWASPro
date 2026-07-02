import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { getProjects, getProviders } from '../services/firestore';
import { Project, UserProfile, Provider } from '../types';

const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

export default function Dashboard({ user }: { user: UserProfile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    const unsubscribeProjects = getProjects((data) => {
      setAllProjects(data);
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

    const unsubscribeProviders = getProviders((data) => {
      setProviders(data);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeProviders();
    };
  }, [user]);

  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.progress === 100).length;
  const ongoingProjects = projects.filter(p => p.progress > 0 && p.progress < 100).length;
  const averageProgress = totalProjects > 0 
    ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / totalProjects) 
    : 0;

  // Statistik Penyedia & SKP
  const totalProviders = providers.length;
  const providerSKPList = providers.map(p => {
    const ongoingCount = allProjects.filter(project => 
      (project.providerId === p.id || (project.ptCv && project.ptCv === p.name)) && 
      project.progress < 100
    ).length;
    const score = 5 - ongoingCount;
    return {
      providerId: p.id,
      skp: score < 0 ? 0 : score
    };
  });

  const providersWithSKPZero = providerSKPList.filter(item => item.skp === 0).length;
  const providersWithSKPGreaterThanZero = providerSKPList.filter(item => item.skp > 0).length;

  const chartData = projects.slice(0, 10).map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    progress: p.progress
  }));

  const pieData = [
    { name: 'Selesai', value: completedProjects, color: '#10b981' },
    { name: 'Berjalan', value: ongoingProjects, color: '#f59e0b' },
    { name: 'Belum Mulai', value: totalProjects - completedProjects - ongoingProjects, color: '#64748b' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Dashboard Monitoring</h2>
        <p className="text-slate-500">Ringkasan status proyek pemerintah saat ini.</p>
      </div>

      {/* Proyek Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Briefcase size={20} className="text-slate-700" />
          Statistik Proyek
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Proyek" 
            value={totalProjects} 
            icon={Briefcase} 
            color="bg-slate-800" 
          />
          <StatCard 
            title="Proyek Selesai" 
            value={completedProjects} 
            icon={CheckCircle2} 
            color="bg-emerald-500" 
            subValue={`${Math.round((completedProjects/totalProjects)*100 || 0)}% dari total`}
          />
          <StatCard 
            title="Proyek Berjalan" 
            value={ongoingProjects} 
            icon={Clock} 
            color="bg-amber-500" 
          />
          <StatCard 
            title="Progress Rata-rata" 
            value={`${averageProgress}%`} 
            icon={TrendingUp} 
            color="bg-indigo-500" 
          />
        </div>
      </div>

      {/* Penyedia Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building2 size={20} className="text-slate-700" />
          Statistik Penyedia Terdaftar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total Penyedia" 
            value={totalProviders} 
            icon={Building2} 
            color="bg-slate-700" 
          />
          <StatCard 
            title="Penyedia SKP = 0" 
            value={providersWithSKPZero} 
            icon={AlertTriangle} 
            color="bg-rose-500" 
            subValue="Kapasitas pengerjaan proyek penuh"
          />
          <StatCard 
            title="Penyedia SKP > 0" 
            value={providersWithSKPGreaterThanZero} 
            icon={CheckCircle2} 
            color="bg-teal-500" 
            subValue="Tersedia kapasitas pengerjaan proyek baru"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Progress Proyek Terbaru</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => {
                    let barColor = '#ef4444'; // Red (< 50%)
                    if (entry.progress === 100) {
                      barColor = '#10b981'; // Green (100%)
                    } else if (entry.progress >= 50) {
                      barColor = '#3b82f6'; // Blue (>= 50%)
                    }
                    return <Cell key={`cell-${index}`} fill={barColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Status Proyek</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Daftar Proyek Terbaru</h3>
          <Link to="/proyek" className="text-sm text-emerald-600 font-medium flex items-center gap-1 hover:underline">
            Lihat Semua <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Nama Proyek</th>
                <th className="px-6 py-4 font-semibold">No. Kontrak</th>
                <th className="px-6 py-4 font-semibold">PT/CV</th>
                <th className="px-6 py-4 font-semibold">Anggaran</th>
                <th className="px-6 py-4 font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.slice(0, 10).map((project) => (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{project.name}</p>
                    <p className="text-xs text-slate-500">{project.location}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">
                    {project.contractNumber || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{project.ptCv}</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-900">
                    Rp {project.anggaran.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            project.progress === 100 ? 'bg-emerald-500' : 
                            project.progress >= 50 ? 'bg-blue-500' : 'bg-red-500'
                          }`}
                          style={{width: `${project.progress}%`}}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{project.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
