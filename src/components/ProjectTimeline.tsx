import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  Flag, 
  FileCheck, 
  TrendingUp,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Project, WeeklyReport } from '../types';

export interface MilestoneItem {
  id: string;
  name: string;
  description: string;
  date?: string;
  targetPercent?: number;
  status: 'completed' | 'in_progress' | 'upcoming' | 'delayed';
  category: 'contract' | 'spmk' | 'midterm' | 'final' | 'report';
  progressRecorded?: number;
}

interface ProjectTimelineProps {
  project: Project;
  reports?: WeeklyReport[];
  defaultExpanded?: boolean;
}

export default function ProjectTimeline({ 
  project, 
  reports = [], 
  defaultExpanded = false 
}: ProjectTimelineProps) {
  const [viewMode, setViewMode] = useState<'stepper' | 'gantt'>('stepper');
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  // Helper date parsing
  const parseDate = (dStr?: string): Date | null => {
    if (!dStr) return null;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (dateObj: Date | null, fallback = '-'): string => {
    if (!dateObj) return fallback;
    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const startDate = parseDate(project.spmkDate) || parseDate(project.contractDate) || new Date();
  const execPeriod = project.executionPeriod && project.executionPeriod > 0 ? project.executionPeriod : 120;
  const endDate = addDays(startDate, execPeriod);
  const midDate = addDays(startDate, Math.round(execPeriod / 2));
  const currentProgress = Number(project.progress) || 0;

  // Compute key milestones
  const milestones: MilestoneItem[] = [
    {
      id: 'm-kontrak',
      name: 'Tanda Tangan Kontrak',
      description: project.contractNumber ? `No: ${project.contractNumber}` : 'Penerbitan Surat Perjanjian Kontrak',
      date: project.contractDate ? formatDate(parseDate(project.contractDate)) : undefined,
      category: 'contract',
      status: project.contractDate || project.spmkDate || currentProgress > 0 ? 'completed' : 'in_progress',
      targetPercent: 0
    },
    {
      id: 'm-spmk',
      name: 'Penerbitan SPMK (Mulai Kerja)',
      description: 'Surat Perintah Mulai Kerja (Hari ke-0)',
      date: project.spmkDate ? formatDate(parseDate(project.spmkDate)) : undefined,
      category: 'spmk',
      status: project.spmkDate || currentProgress > 0 ? 'completed' : 'in_progress',
      targetPercent: 0
    },
    {
      id: 'm-midterm',
      name: 'Milestone 50% (Kritis Midterm)',
      description: 'Evaluasi struktur tengah & pengawasan lapangan',
      date: formatDate(midDate),
      category: 'midterm',
      status: currentProgress >= 50 
        ? 'completed' 
        : currentProgress > 0 
          ? 'in_progress' 
          : 'upcoming',
      targetPercent: 50
    },
    {
      id: 'm-final',
      name: 'Serah Terima Pekerjaan (100% PHO)',
      description: 'Provisional Hand Over & Uji Kelayakan Akhir',
      date: formatDate(endDate),
      category: 'final',
      status: currentProgress >= 100 
        ? 'completed' 
        : currentProgress >= 80 
          ? 'in_progress' 
          : 'upcoming',
      targetPercent: 100
    }
  ];

  // Calculate days elapsed / remaining
  const now = new Date();
  const totalDays = execPeriod;
  let daysElapsed = 0;
  if (startDate) {
    const diffTime = now.getTime() - startDate.getTime();
    daysElapsed = Math.max(0, Math.min(totalDays, Math.floor(diffTime / (1000 * 60 * 60 * 24))));
  }
  const timeProgressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

  return (
    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 transition-all hover:bg-slate-50">
      {/* Header bar with accordion toggle & view switch */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left group flex-1"
        >
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition-colors">
            <Layers size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Timeline &amp; Milestone Proyek
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                currentProgress >= 100 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : currentProgress >= 50 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-amber-100 text-amber-700'
              }`}>
                {currentProgress >= 100 ? 'Selesai' : `${currentProgress}% tercapai`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Durasi: {execPeriod} Hari Kalender | Waktu berjalan: {daysElapsed} hari ({timeProgressPercent}%)
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {isExpanded && (
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('stepper')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'stepper' 
                    ? 'bg-emerald-600 text-white shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Stepper
              </button>
              <button
                type="button"
                onClick={() => setViewMode('gantt')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'gantt' 
                    ? 'bg-emerald-600 text-white shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                GANTT
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title={isExpanded ? 'Tutup timeline' : 'Buka visualisasi timeline'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Collapsed Compact Stepper Preview */}
      {!isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/60">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <Clock size={12} className="text-slate-400" />
              Mulai: {formatDate(startDate)}
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <Flag size={12} className="text-emerald-600" />
              Target Selesai: {formatDate(endDate)}
            </span>
          </div>

          {/* Mini Stepper Line */}
          <div className="relative flex items-center justify-between px-2 py-1">
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-200 rounded-full z-0" />
            <div 
              className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-500"
              style={{ width: `calc((100% - 2rem) * ${Math.min(100, Math.max(0, currentProgress)) / 100})` }}
            />

            {milestones.map((m, idx) => {
              const isDone = m.status === 'completed';
              const isCurrent = m.status === 'in_progress';

              return (
                <div key={m.id} className="relative z-10 flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 text-[10px] font-bold transition-transform ${
                    isDone 
                      ? 'bg-emerald-600 border-white text-white shadow-xs' 
                      : isCurrent 
                        ? 'bg-blue-600 border-white text-white ring-2 ring-blue-300 shadow-xs scale-110' 
                        : 'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span className="text-[10px] text-slate-600 font-semibold mt-1 max-w-[70px] text-center truncate">
                    {m.targetPercent !== undefined ? `${m.targetPercent}%` : m.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded Detailed Visualization */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-in fade-in duration-200">
          
          {/* View 1: Horizontal Stepper */}
          {viewMode === 'stepper' && (
            <div className="space-y-4">
              {/* Stepper Node Track */}
              <div className="relative pt-2 pb-4 overflow-x-auto">
                <div className="min-w-[480px] relative px-4">
                  {/* Background progress track */}
                  <div className="absolute left-8 right-8 top-5 h-1.5 bg-slate-200 rounded-full z-0" />
                  
                  {/* Completed track fill */}
                  <div 
                    className="absolute left-8 top-5 h-1.5 bg-emerald-500 rounded-full z-0 transition-all duration-500"
                    style={{ 
                      width: `calc((100% - 4rem) * ${Math.min(100, Math.max(0, currentProgress)) / 100})` 
                    }}
                  />

                  {/* Nodes */}
                  <div className="relative z-10 flex items-start justify-between">
                    {milestones.map((m, idx) => {
                      const isDone = m.status === 'completed';
                      const isCurrent = m.status === 'in_progress';

                      return (
                        <div key={m.id} className="flex flex-col items-center max-w-[110px] text-center">
                          {/* Circle Icon Badge */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-sm transition-all ${
                            isDone 
                              ? 'bg-emerald-600 border-emerald-600 text-white' 
                              : isCurrent 
                                ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100' 
                                : 'bg-white border-slate-300 text-slate-400'
                          }`}>
                            {isDone ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>

                          {/* Milestone Info */}
                          <h5 className={`text-xs font-bold mt-2 leading-tight ${
                            isDone ? 'text-emerald-900' : isCurrent ? 'text-blue-900' : 'text-slate-600'
                          }`}>
                            {m.name}
                          </h5>
                          
                          <p className="text-[10px] font-semibold text-slate-500 mt-1">
                            {m.date || 'Belum diisi'}
                          </p>

                          <span className={`mt-1 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            isDone 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isCurrent 
                                ? 'bg-blue-100 text-blue-800 animate-pulse' 
                                : 'bg-slate-200/70 text-slate-600'
                          }`}>
                            {isDone ? 'Selesai' : isCurrent ? 'Berlangsung' : 'Mendatang'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Milestones Card Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {milestones.map((m, idx) => (
                  <div 
                    key={m.id} 
                    className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                      m.status === 'completed' 
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-700' 
                        : m.status === 'in_progress'
                          ? 'bg-blue-50/50 border-blue-200 text-slate-700 ring-1 ring-blue-300/40'
                          : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      m.status === 'completed' 
                        ? 'bg-emerald-600 text-white' 
                        : m.status === 'in_progress' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      {m.category === 'contract' && <FileCheck size={14} />}
                      {m.category === 'spmk' && <Calendar size={14} />}
                      {m.category === 'midterm' && <TrendingUp size={14} />}
                      {m.category === 'final' && <Flag size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 truncate">
                          {idx + 1}. {m.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 shrink-0">
                          {m.date}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                        {m.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View 2: GANTT-Style Chart Bar */}
          {viewMode === 'gantt' && (
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-700 font-bold border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-emerald-600" />
                  GANTT Progress &amp; Tahapan Pelaksanaan
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Target: {execPeriod} Hari
                </span>
              </div>

              {/* GANTT Tracks */}
              <div className="space-y-3 text-xs pt-1">
                {/* 1. Overall Schedule vs Time */}
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1 font-medium">
                    <span className="text-slate-700 font-semibold">1. Waktu Pelaksanaan Kontrak</span>
                    <span className="text-slate-500">{daysElapsed} / {totalDays} hari ({timeProgressPercent}%)</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-md overflow-hidden relative border border-slate-200">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 rounded-sm"
                      style={{ width: `${timeProgressPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-bold text-slate-600 pointer-events-none">
                      <span>SPMK: {formatDate(startDate)}</span>
                      <span>Target Selesai: {formatDate(endDate)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Physical Construction Progress */}
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1 font-medium">
                    <span className="text-slate-700 font-semibold">2. Realisasi Fisik Lapangan</span>
                    <span className={`font-bold ${
                      currentProgress >= 100 ? 'text-emerald-600' : 'text-blue-600'
                    }`}>
                      {currentProgress}% Tercapai
                    </span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-md overflow-hidden relative border border-slate-200">
                    <div 
                      className={`h-full transition-all duration-500 rounded-sm ${
                        currentProgress >= 100 
                          ? 'bg-emerald-500' 
                          : currentProgress >= 50 
                            ? 'bg-blue-500' 
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-bold text-slate-700 pointer-events-none">
                      <span>0% Mulai</span>
                      <span>50% Midterm</span>
                      <span>100% Selesai (PHO)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Phased Milestones Gantt Bars */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Tahapan Milestone (Gantt Phase):
                  </div>

                  {/* Phase 1: Persiapan & Administrasi (0 - 15%) */}
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-4 text-[11px] font-medium text-slate-600 truncate" title="Persiapan & Pengukuran Awal (Uitzet)">
                      Persiapan &amp; Uitzet
                    </span>
                    <div className="col-span-8 bg-slate-100 h-3 rounded relative overflow-hidden">
                      <div 
                        className={`h-full ${currentProgress >= 15 ? 'bg-emerald-500' : currentProgress > 0 ? 'bg-blue-400' : 'bg-slate-300'}`}
                        style={{ width: '25%' }}
                      />
                    </div>
                  </div>

                  {/* Phase 2: Konstruksi Utama / Struktur (15% - 70%) */}
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-4 text-[11px] font-medium text-slate-600 truncate" title="Pekerjaan Utama & Pengendalian">
                      Pekerjaan Utama
                    </span>
                    <div className="col-span-8 bg-slate-100 h-3 rounded relative overflow-hidden">
                      <div 
                        className={`h-full ml-[25%] ${currentProgress >= 70 ? 'bg-emerald-500' : currentProgress >= 25 ? 'bg-blue-500' : 'bg-slate-300'}`}
                        style={{ width: '55%' }}
                      />
                    </div>
                  </div>

                  {/* Phase 3: Finishing & PHO (70% - 100%) */}
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-4 text-[11px] font-medium text-slate-600 truncate" title="Finishing & Serah Terima Pertama (PHO)">
                      Finishing &amp; PHO
                    </span>
                    <div className="col-span-8 bg-slate-100 h-3 rounded relative overflow-hidden">
                      <div 
                        className={`h-full ml-[80%] ${currentProgress >= 100 ? 'bg-emerald-500' : currentProgress >= 70 ? 'bg-blue-400' : 'bg-slate-300'}`}
                        style={{ width: '20%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Progress Health Note */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <AlertCircle size={13} className={
                      currentProgress >= timeProgressPercent ? 'text-emerald-500' : 'text-amber-500'
                    } />
                    <span>
                      {currentProgress >= timeProgressPercent
                        ? 'Status: Progres fisik sesuai / melampaui waktu kalender.'
                        : `Status: Deviasi waktu kalender (-${(timeProgressPercent - currentProgress).toFixed(0)}%). Perlu percepatan.`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Footer summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
            <span className="font-medium">
              Pengawas: <strong className="text-slate-700">{project.supervisorName || 'Belum ditugaskan'}</strong>
            </span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
              Lokasi: {project.location}
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
