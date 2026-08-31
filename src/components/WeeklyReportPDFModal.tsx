import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  FileText, 
  TrendingUp, 
  Calendar, 
  Building2, 
  Check, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Mail,
  MessageSquare,
  Share2,
  Send,
  Copy,
  Phone,
  ExternalLink,
  User
} from 'lucide-react';
import { Project, WeeklyReport, Provider, UserProfile, RABItem } from '../types';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';

interface WeeklyReportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  reports: WeeklyReport[];
  providers: Provider[];
  ppkList: UserProfile[];
  rabItems?: RABItem[];
  defaultSelectedWeek?: number | 'all';
}

export const WeeklyReportPDFModal: React.FC<WeeklyReportPDFModalProps> = ({
  isOpen,
  onClose,
  project,
  reports,
  providers,
  ppkList,
  rabItems = [],
  defaultSelectedWeek = 'all'
}) => {
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(defaultSelectedWeek);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeSCurve, setIncludeSCurve] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [customPpkName, setCustomPpkName] = useState('');
  const [customSupervisorName, setCustomSupervisorName] = useState(project.supervisorName || '');
  const [customProviderName, setCustomProviderName] = useState(project.ptCv || '');
  const [customCity, setCustomCity] = useState('Karawang');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareChannel, setShareChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [customRecipient, setCustomRecipient] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Resolve provider from master data CV/PT
  const provider = (() => {
    if (!providers || providers.length === 0) return undefined;
    if (project.providerId) {
      const foundById = providers.find(p => p.id === project.providerId);
      if (foundById) return foundById;
    }
    const searchName = (customProviderName || project.ptCv || '').trim().toLowerCase();
    if (!searchName) return undefined;
    
    const exactMatch = providers.find(p => p.name && p.name.trim().toLowerCase() === searchName);
    if (exactMatch) return exactMatch;

    return providers.find(p => {
      if (!p.name) return false;
      const pName = p.name.trim().toLowerCase();
      return pName.includes(searchName) || searchName.includes(pName);
    });
  })();

  const defaultPpk = ppkList.length > 0 ? (ppkList[0].name || ppkList[0].username || '') : '';
  const currentPpk = customPpkName || defaultPpk || 'Pejabat Pembuat Komitmen';

  // Calculate total weeks from execution period
  const totalPlannedWeeks = project.executionPeriod 
    ? Math.max(1, Math.ceil(project.executionPeriod / 7)) 
    : Math.max(5, reports.length);

  const maxWeeksToDisplay = Math.max(totalPlannedWeeks, reports.length);

  const computedReports = useMemo(() => {
    const sorted = [...reports].sort((a, b) => a.weekNumber - b.weekNumber);
    let runCum = 0;
    return sorted.map(r => {
      const weekly = Number(r.weeklyProgress) || 0;
      runCum = parseFloat((runCum + weekly).toFixed(2));
      return {
        ...r,
        weeklyProgress: weekly,
        cumulativeProgress: runCum
      };
    });
  }, [reports]);

  // Compute S-curve planned vs actual data
  const sCurveData = Array.from({ length: maxWeeksToDisplay }, (_, i) => {
    const weekNum = i + 1;
    const actualReport = computedReports.find(r => r.weekNumber === weekNum);

    let plannedCumulative = 100;
    if (weekNum <= totalPlannedWeeks) {
      const x = weekNum / totalPlannedWeeks;
      const n = 3;
      const sigmoid = Math.pow(x, n) / (Math.pow(x, n) + Math.pow(1 - x, n));
      plannedCumulative = Number((sigmoid * 100).toFixed(2));
    }

    const prevPlannedCumulative = i === 0 ? 0 : (() => {
      const prevX = i / totalPlannedWeeks;
      const n = 3;
      const prevSigmoid = Math.pow(prevX, n) / (Math.pow(prevX, n) + Math.pow(1 - prevX, n));
      return i <= totalPlannedWeeks ? Number((prevSigmoid * 100).toFixed(2)) : 100;
    })();

    const plannedWeekly = Number((plannedCumulative - prevPlannedCumulative).toFixed(2));

    const actualCumulative = actualReport ? actualReport.cumulativeProgress : null;
    const actualWeekly = actualReport ? actualReport.weeklyProgress : null;
    const deviation = (actualCumulative !== null) ? Number((actualCumulative - plannedCumulative).toFixed(2)) : null;

    let startDate = actualReport?.startDate || '';
    let endDate = actualReport?.endDate || '';

    // If no report date, extrapolate from SPMK
    if (!startDate && project.spmkDate) {
      const start = new Date(project.spmkDate);
      start.setDate(start.getDate() + (i * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    }

    return {
      weekNum,
      startDate,
      endDate,
      plannedWeekly,
      actualWeekly,
      plannedCumulative,
      actualCumulative,
      deviation,
      report: actualReport
    };
  });

  const sortedReports = computedReports;
  const latestReport = sortedReports.length > 0 ? sortedReports[sortedReports.length - 1] : null;
  const currentWeekNum = typeof selectedWeek === 'number' ? selectedWeek : (latestReport ? latestReport.weekNumber : 1);
  const activeReport = computedReports.find(r => r.weekNumber === currentWeekNum);
  
  const currentPlannedData = sCurveData.find(d => d.weekNum === currentWeekNum);
  const currentPlannedCumulative = currentPlannedData?.plannedCumulative ?? 0;
  const currentActualCumulative = activeReport?.cumulativeProgress ?? (latestReport?.cumulativeProgress ?? 0);
  const currentDeviation = Number((currentActualCumulative - currentPlannedCumulative).toFixed(2));

  const formatIndoDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const day = date.getDate();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPDF(true);

    try {
      const element = printAreaRef.current;
      
      const pageElements = printAreaRef.current.querySelectorAll<HTMLElement>('.pdf-page');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const a4WidthMm = 210;
      const a4HeightMm = 297;

      if (pageElements && pageElements.length > 0) {
        for (let i = 0; i < pageElements.length; i++) {
          const pageEl = pageElements[i];
          const pageImgData = await toJpeg(pageEl, {
            quality: 0.98,
            backgroundColor: '#ffffff',
            pixelRatio: 2,
          });

          if (i > 0) {
            pdf.addPage('a4', 'portrait');
          }

          pdf.addImage(pageImgData, 'JPEG', 0, 0, a4WidthMm, a4HeightMm, undefined, 'FAST');
        }
      } else {
        // Fallback for single container
        const imgData = await toJpeg(printAreaRef.current, {
          quality: 0.98,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, a4WidthMm, a4HeightMm, undefined, 'FAST');
      }

      const fileName = `Laporan_Mingguan_${project.name.replace(/\s+/g, '_')}_${selectedWeek === 'all' ? 'Lengkap' : `W${selectedWeek}`}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal menghasilkan file PDF. Silakan gunakan tombol "Cetak Print" untuk mencetak langsung atau simpan sebagai PDF via printer browser.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate executive summary text for WhatsApp or Email
  const generateSummaryText = (forWhatsApp = false) => {
    const weekLabel = selectedWeek === 'all' 
      ? `Semua Minggu (s/d Minggu ke-${currentWeekNum})` 
      : `Minggu ke-${currentWeekNum} (${formatIndoDate(activeReport?.startDate)} s/d ${formatIndoDate(activeReport?.endDate)})`;
    
    let statusText = 'SESUAI JADWAL';
    if (currentDeviation > 0) statusText = `LEBIH CEPAT (+${currentDeviation}%)`;
    else if (currentDeviation === 0) statusText = 'TEPAT WAKTU (0.00%)';
    else if (currentDeviation >= -5) statusText = `TERLAMBAT RINGAN (${currentDeviation}%)`;
    else statusText = `KRITIS / PERLU PENANGANAN KHUSUS (${currentDeviation}%)`;

    if (forWhatsApp) {
      return `*LAPORAN KEMAJUAN PEKERJAAN PROYEK*
*Sistem Informasi e-AWAS PRO*
━━━━━━━━━━━━━━━━━━━━━
📌 *INFORMASI PAKET*
• *Paket Pekerjaan:* ${project.name}
• *No. Kontrak:* ${project.contractNumber || '-'}
• *Nilai Kontrak:* Rp ${project.anggaran.toLocaleString('id-ID')}
• *Penyedia Jasa:* ${customProviderName || project.ptCv}
• *Konsultan Pengawas:* ${customSupervisorName || 'Pengawas Lapangan'}
• *PPK:* ${currentPpk}
• *Lokasi:* ${project.location || '-'}

📊 *PROGRESS & EVALUASI*
• *Periode:* ${weekLabel}
• *Target Rencana:* ${currentPlannedCumulative}%
• *Realisasi Lapangan:* ${currentActualCumulative}%
• *Deviasi:* ${currentDeviation >= 0 ? '+' : ''}${currentDeviation}%
• *Status Proyek:* ${statusText}
${activeReport?.notes ? `• *Catatan Lapangan:* ${activeReport.notes}\n` : ''}━━━━━━━━━━━━━━━━━━━━━
_Laporan resmi dibuat dan dievaluasi via e-AWAS Pro._`;
    } else {
      return `LAPORAN KEMAJUAN PEKERJAAN PROYEK & KURVA S
Sistem Informasi Pengendalian Proyek - e-AWAS PRO
==================================================

INFORMASI PAKET PEKERJAAN:
- Nama Paket Pekerjaan : ${project.name}
- Nomor Kontrak        : ${project.contractNumber || '-'}
- Tanggal Kontrak      : ${formatIndoDate(project.contractDate)}
- Nilai Kontrak        : Rp ${project.anggaran.toLocaleString('id-ID')}
- Waktu Pelaksanaan    : ${project.executionPeriod || (totalPlannedWeeks * 7)} Hari Kalender
- Penyedia Jasa        : ${customProviderName || project.ptCv}
- Konsultan Pengawas   : ${customSupervisorName || 'Pengawas Lapangan'}
- Pejabat Pembuat Komitmen : ${currentPpk}
- Lokasi Pekerjaan     : ${project.location || '-'}

RINGKASAN PROGRES FISIK & EVALUASI:
- Periode Laporan      : ${weekLabel}
- Target Rencana       : ${currentPlannedCumulative}%
- Realisasi Lapangan   : ${currentActualCumulative}%
- Deviasi Progres      : ${currentDeviation >= 0 ? '+' : ''}${currentDeviation}%
- Status Pelaksanaan   : ${statusText}
${activeReport?.notes ? `- Catatan Lapangan     : ${activeReport.notes}\n` : ''}
==================================================
Laporan ini dibuat dan dicetak secara resmi melalui sistem e-AWAS Pro.`;
    }
  };

  const handleSendWhatsApp = (targetPhone?: string) => {
    const text = generateSummaryText(true);
    let url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
    if (targetPhone) {
      let cleanPhone = targetPhone.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.slice(1);
      }
      if (cleanPhone) {
        url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
      }
    }
    window.open(url, '_blank');
  };

  const handleSendEmail = (targetEmail?: string) => {
    const subject = `[Laporan Mingguan] Kemajuan Fisik Proyek - ${project.name} (Minggu ke-${currentWeekNum})`;
    const body = generateSummaryText(false);
    const mailto = `mailto:${targetEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleCopySummary = () => {
    const text = generateSummaryText(shareChannel === 'whatsapp');
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // SVG dimensions for Kurva S
  const svgWidth = 800;
  const svgHeight = 280;
  const padding = { top: 30, right: 40, bottom: 45, left: 55 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // S-Curve calculations: Target plan is ALWAYS FULL (all project weeks), while Actual curve stops at selected week
  const totalWeeksCount = Math.max(1, sCurveData.length);

  // Scale functions (W-0 at padding.left to W-Total at right)
  const xScale = (week: number) => {
    return padding.left + (week / totalWeeksCount) * graphWidth;
  };

  const yScale = (val: number) => {
    return padding.top + graphHeight - (val / 100) * graphHeight;
  };

  // Build SVG path for Target Rencana (FULL from W-0 = 0% to W-End = 100%)
  const planPoints = [
    { x: xScale(0), y: yScale(0), val: 0, week: 0 },
    ...sCurveData.map(d => ({
      x: xScale(d.weekNum),
      y: yScale(d.plannedCumulative),
      val: d.plannedCumulative,
      week: d.weekNum
    }))
  ];

  const planPathD = planPoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Build SVG path for Realisasi Lapangan (only up to selected week / available actual data)
  const maxActualWeek = selectedWeek === 'all' ? totalWeeksCount : currentWeekNum;
  const actualReportsInScope = sCurveData.filter(d => d.weekNum <= maxActualWeek && d.actualCumulative !== null);
  const actualPoints = [
    { x: xScale(0), y: yScale(0), val: 0, week: 0 },
    ...actualReportsInScope.map(d => ({
      x: xScale(d.weekNum),
      y: yScale(d.actualCumulative!),
      val: d.actualCumulative!,
      week: d.weekNum
    }))
  ];

  const actualPathD = actualPoints.length > 1 ? actualPoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '') : '';

  // Filter progress table data up to the chosen week if specific week selected
  const displayedTableData = selectedWeek === 'all'
    ? sCurveData
    : sCurveData.filter(d => d.weekNum <= currentWeekNum);

  // Construct complete list of items corresponding to all RAB items for the project
  const allReportDetails = React.useMemo(() => {
    // If rabItems are provided and not empty
    if (rabItems && rabItems.length > 0) {
      const totalRabCost = rabItems.reduce((acc, i) => acc + (Number(i.totalPrice) || 0), 0) || 1;
      const prevReport = reports.find(r => r.weekNumber === currentWeekNum - 1);

      const mappedRabItems = rabItems.map(item => {
        const activeDetail = activeReport?.details?.find(
          d => d.rabItemId === item.id || d.description.trim().toLowerCase() === item.description.trim().toLowerCase()
        );
        const prevDetail = prevReport?.details?.find(
          d => d.rabItemId === item.id || d.description.trim().toLowerCase() === item.description.trim().toLowerCase()
        );

        const targetVolume = Number(item.volume || 0);
        // Use recorded weight if present and valid, otherwise calculate from RAB totalPrice
        const calculatedWeight = (Number(item.totalPrice || 0) / totalRabCost) * 100;
        const weight = activeDetail && Number(activeDetail.weight) > 0 ? Number(activeDetail.weight) : calculatedWeight;

        const volumeThisWeek = activeDetail ? Number(activeDetail.volumeThisWeek || 0) : 0;
        const progressThisWeek = activeDetail 
          ? Number(activeDetail.progressThisWeek || 0) 
          : (targetVolume > 0 && volumeThisWeek > 0 ? (volumeThisWeek / targetVolume) * 100 : 0);

        const volumeSdMggLalu = prevDetail 
          ? Number(prevDetail.cumulativeVolume || 0) 
          : (activeDetail ? Math.max(0, Number(activeDetail.cumulativeVolume || 0) - volumeThisWeek) : 0);

        const progressSdMggLalu = prevDetail 
          ? Number(prevDetail.cumulativeProgress || 0) 
          : (activeDetail ? Math.max(0, Number(activeDetail.cumulativeProgress || 0) - progressThisWeek) : (targetVolume > 0 && volumeSdMggLalu > 0 ? (volumeSdMggLalu / targetVolume) * 100 : 0));

        // Progres Kumulatif = Progres Minggu Sebelumnya + Progres Minggu Tersebut
        const cumulativeVolume = volumeSdMggLalu + volumeThisWeek;
        const cumulativeProgress = progressSdMggLalu + progressThisWeek;

        return {
          rabItemId: item.id,
          description: item.description,
          unit: item.unit,
          targetVolume,
          weight,
          volumeSdMggLalu,
          progressSdMggLalu,
          volumeThisWeek,
          progressThisWeek,
          cumulativeVolume,
          cumulativeProgress
        };
      });

      // Also check if activeReport has details that are NOT in rabItems (ad-hoc custom items)
      if (activeReport?.details) {
        const extraItems = activeReport.details.filter(
          d => !rabItems.some(r => r.id === d.rabItemId || r.description.trim().toLowerCase() === d.description.trim().toLowerCase())
        );
        for (const extra of extraItems) {
          const targetVol = Number(extra.targetVolume || 0);
          const vMggIni = Number(extra.volumeThisWeek || 0);
          const pMggIni = Number(extra.progressThisWeek || 0);

          const vSdMggIniOld = Number(extra.cumulativeVolume || 0);
          const pSdMggIniOld = Number(extra.cumulativeProgress || 0);

          const vSdMggLalu = Math.max(0, vSdMggIniOld - vMggIni);
          const pSdMggLalu = targetVol > 0 && vSdMggLalu > 0 
            ? (vSdMggLalu / targetVol) * 100 
            : Math.max(0, pSdMggIniOld - pMggIni);

          const vSdMggIni = vSdMggLalu + vMggIni;
          const pSdMggIni = pSdMggLalu + pMggIni;

          mappedRabItems.push({
            rabItemId: extra.rabItemId,
            description: extra.description,
            unit: extra.unit,
            targetVolume: targetVol,
            weight: Number(extra.weight || 0),
            volumeSdMggLalu: vSdMggLalu,
            progressSdMggLalu: pSdMggLalu,
            volumeThisWeek: vMggIni,
            progressThisWeek: pMggIni,
            cumulativeVolume: vSdMggIni,
            cumulativeProgress: pSdMggIni
          });
        }
      }

      return mappedRabItems;
    }

    // Fallback if no rabItems in database
    if (activeReport?.details && activeReport.details.length > 0) {
      return activeReport.details.map(item => {
        const targetVol = Number(item.targetVolume || 0);
        const vMggIni = Number(item.volumeThisWeek || 0);
        const pMggIni = Number(item.progressThisWeek || 0);
        
        const vSdMggIniOld = Number(item.cumulativeVolume || 0);
        const pSdMggIniOld = Number(item.cumulativeProgress || 0);
        
        const vSdMggLalu = Math.max(0, vSdMggIniOld - vMggIni);
        const pSdMggLalu = targetVol > 0 && vSdMggLalu > 0 
          ? (vSdMggLalu / targetVol) * 100 
          : Math.max(0, pSdMggIniOld - pMggIni);

        const vSdMggIni = vSdMggLalu + vMggIni;
        const pSdMggIni = pSdMggLalu + pMggIni;

        return {
          rabItemId: item.rabItemId,
          description: item.description,
          unit: item.unit,
          targetVolume: targetVol,
          weight: Number(item.weight || 0),
          volumeSdMggLalu: vSdMggLalu,
          progressSdMggLalu: pSdMggLalu,
          volumeThisWeek: vMggIni,
          progressThisWeek: pMggIni,
          cumulativeVolume: vSdMggIni,
          cumulativeProgress: pSdMggIni
        };
      });
    }

    return [];
  }, [rabItems, activeReport, reports, currentWeekNum]);

  // Page calculation (21 items per page: Page 2 = 1-21, Page 3 = 22-42, etc.)
  const ITEMS_PER_PAGE = 21;
  const hasDetails = allReportDetails.length > 0;
  
  const detailPages = React.useMemo(() => {
    if (allReportDetails.length === 0) return [[]];
    const pages = [];
    for (let i = 0; i < allReportDetails.length; i += ITEMS_PER_PAGE) {
      pages.push(allReportDetails.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [allReportDetails]);

  const totalDocPages = 1 + detailPages.length;

  // Total calculations for Item Details Table
  const detailsTotalWeight = allReportDetails.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
  const detailsTotalProgWeightedLalu = allReportDetails.reduce((acc, curr) => 
    acc + ((Number(curr.progressSdMggLalu) || 0) * (Number(curr.weight) || 0)) / 100, 0);
  const detailsTotalProgWeightedIni = allReportDetails.reduce((acc, curr) => 
    acc + ((Number(curr.progressThisWeek) || 0) * (Number(curr.weight) || 0)) / 100, 0);
  const detailsTotalProgWeightedSdIni = detailsTotalProgWeightedLalu + detailsTotalProgWeightedIni;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header & Controls */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Cetak Laporan Mingguan & Kurva S (PDF A4)
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-md">
                {project.name} {project.contractNumber ? `• No. ${project.contractNumber}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Kirim WhatsApp */}
            <button
              onClick={() => {
                setShareChannel('whatsapp');
                setCustomRecipient(provider?.phone || '');
                setShowShareModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              title="Kirim Ringkasan Laporan via WhatsApp"
            >
              <MessageSquare size={15} className="text-emerald-600" />
              <span className="hidden sm:inline">Kirim WhatsApp</span>
            </button>

            {/* Tombol Kirim Email */}
            <button
              onClick={() => {
                setShareChannel('email');
                setCustomRecipient(provider?.email || '');
                setShowShareModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-700 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              title="Kirim Laporan via Email"
            >
              <Mail size={15} className="text-blue-600" />
              <span className="hidden sm:inline">Kirim Email</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              title="Cetak via browser"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Cetak Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Membuat PDF A4...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Download PDF ({totalDocPages} Hal)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs shrink-0 font-sans">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Pilihan Laporan
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="all">Semua Minggu (Rekapitulasi + Kurva S)</option>
              {reports.map(r => (
                <option key={r.id} value={r.weekNumber}>
                  Minggu ke-{r.weekNumber} ({new Date(r.startDate).toLocaleDateString('id-ID')} s/d {new Date(r.endDate).toLocaleDateString('id-ID')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Nama PPK (Tanda Tangan)
            </label>
            <input
              type="text"
              value={customPpkName}
              placeholder={defaultPpk || 'Nama Pejabat Pembuat Komitmen'}
              onChange={(e) => setCustomPpkName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Konsultan Pengawas
            </label>
            <input
              type="text"
              value={customSupervisorName}
              placeholder="Nama Konsultan Pengawas"
              onChange={(e) => setCustomSupervisorName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Kota / Tempat Surat
            </label>
            <input
              type="text"
              value={customCity}
              placeholder="Contoh: Karawang"
              onChange={(e) => setCustomCity(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Preview Scrollable Area */}
        <div className="flex-1 overflow-y-auto bg-slate-200/70 p-4 sm:p-6 flex justify-center">
          
          {/* Printable Document Container */}
          <div 
            ref={printAreaRef}
            id="printable-report"
            className="w-full max-w-[820px] flex flex-col gap-6"
          >
            
            {/* ==================== HALAMAN 1 (HALAMAN UTAMA & KURVA S) ==================== */}
            <div className="pdf-page bg-white text-slate-900 w-full min-h-[1130px] p-8 sm:p-10 shadow-lg border border-slate-300 rounded-none sm:rounded-md text-[12px] leading-relaxed font-sans flex flex-col justify-between">
              <div>
                {/* Kop Laporan Resmi */}
                <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center relative">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-[11px] font-black uppercase tracking-widest text-emerald-800">
                        SISTEM MONITORING PROYEK PEMERINTAH (e-AWAS PRO)
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Dokumen Pengendalian & Evaluasi Kemajuan Proyek Fisik
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      Tanggal Cetak: {formatIndoDate(new Date().toISOString().split('T')[0])}
                    </div>
                  </div>

                  <div className="mt-3">
                    <h1 className="text-lg font-black uppercase tracking-wide text-slate-950">
                      LAPORAN KEMAJUAN PEKERJAAN MINGGUAN & KURVA S
                    </h1>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                      {selectedWeek === 'all' 
                        ? `REKAPITULASI PROGRES s/d MINGGU KE-${latestReport?.weekNumber || totalPlannedWeeks}`
                        : `PERIODE MINGGU KE-${currentWeekNum} (${formatIndoDate(activeReport?.startDate)} s/d ${formatIndoDate(activeReport?.endDate)})`}
                    </p>
                  </div>
                </div>

                {/* Informasi Paket Kontrak */}
                <div className="mb-4 bg-slate-50 border border-slate-300 rounded-lg p-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <Building2 size={13} className="text-emerald-700" />
                    <span>INFORMASI PAKET PEKERJAAN</span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                    <div className="flex">
                      <span className="w-36 font-semibold text-slate-600 shrink-0">Nama Pekerjaan</span>
                      <span className="mr-2">:</span>
                      <span className="font-bold text-slate-900">{project.name}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 font-semibold text-slate-600 shrink-0">Nilai Kontrak</span>
                      <span className="mr-2">:</span>
                      <span className="font-bold text-slate-900">Rp {project.anggaran.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 font-semibold text-slate-600 shrink-0">Nomor Kontrak</span>
                      <span className="mr-2">:</span>
                      <span className="font-medium text-slate-800">{project.contractNumber || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 font-semibold text-slate-600 shrink-0">Tanggal Kontrak</span>
                      <span className="mr-2">:</span>
                      <span className="font-medium text-slate-800">{formatIndoDate(project.contractDate)}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 font-semibold text-slate-600 shrink-0">Tanggal SPMK</span>
                      <span className="mr-2">:</span>
                      <span className="font-medium text-slate-800">{formatIndoDate(project.spmkDate)}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 font-semibold text-slate-600 shrink-0">Waktu Pelaksanaan</span>
                      <span className="mr-2">:</span>
                      <span className="font-medium text-slate-800">
                        {project.executionPeriod || (totalPlannedWeeks * 7)} Hari Kalender ({totalPlannedWeeks} Minggu)
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-36 font-semibold text-slate-600 shrink-0">Penyedia Jasa (Kontraktor)</span>
                      <span className="mr-2">:</span>
                      <span className="font-bold text-slate-900">{customProviderName || project.ptCv}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 font-semibold text-slate-600 shrink-0">Konsultan Pengawas</span>
                      <span className="mr-2">:</span>
                      <span className="font-medium text-slate-800">{customSupervisorName || 'Pengawas Lapangan'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 font-semibold text-slate-600 shrink-0">Lokasi Pekerjaan</span>
                      <span className="mr-2">:</span>
                      <span className="font-medium text-slate-800">{project.location || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 font-semibold text-slate-600 shrink-0">Pejabat Pembuat Komitmen</span>
                      <span className="mr-2">:</span>
                      <span className="font-medium text-slate-800">{currentPpk}</span>
                    </div>
                  </div>
                </div>

                {/* Summary Progress Badges */}
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Rencana Kumulatif</div>
                    <div className="text-xl font-black text-blue-900 mt-0.5">{currentPlannedCumulative}%</div>
                    <div className="text-[10px] text-blue-600 font-medium">Target s/d Minggu ke-{currentWeekNum}</div>
                  </div>

                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Realisasi Lapangan</div>
                    <div className="text-xl font-black text-emerald-900 mt-0.5">{currentActualCumulative}%</div>
                    <div className="text-[10px] text-emerald-600 font-medium">Progres Fisik Aktual</div>
                  </div>

                  <div className={`p-2.5 border rounded-lg text-center ${
                    currentDeviation >= 0 
                      ? 'bg-green-50/70 border-green-200 text-green-900' 
                      : currentDeviation >= -5 
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-red-50/70 border-red-200 text-red-900'
                  }`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider">
                      Deviasi ({currentDeviation >= 0 ? '+' : ''}{currentDeviation}%)
                    </div>
                    <div className="text-xs font-black mt-0.5">
                      {currentDeviation >= 0 
                        ? 'STATUS: SESUAI JADWAL' 
                        : currentDeviation >= -5 
                        ? 'STATUS: TERLAMBAT RINGAN'
                        : 'STATUS: KONTRAK KRITIS (SCM)'}
                    </div>
                    <div className="text-[9.5px] opacity-80 font-medium">
                      {currentDeviation >= 0 ? 'Pekerjaan berjalan baik' : 'Perlu percepatan lapangan'}
                    </div>
                  </div>
                </div>

                {/* Kurva S Grafik Visual */}
                {includeSCurve && (
                  <div className="border border-slate-300 rounded-lg p-2.5 bg-white mb-4">
                    <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-blue-700" />
                        <span>
                          GRAFIK KURVA S KEMAJUAN PEKERJAAN {selectedWeek === 'all' ? '(SEMUA MINGGU)' : `s/d MINGGU KE-${currentWeekNum}`}
                        </span>
                      </h2>
                      <div className="flex items-center gap-4 text-[10px] font-bold">
                        <span className="flex items-center gap-1 text-blue-700">
                          <span className="inline-block w-3 h-1 bg-blue-600 rounded"></span> Rencana (%)
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="inline-block w-3 h-1 bg-emerald-600 rounded"></span> Realisasi (%)
                        </span>
                      </div>
                    </div>

                    <div className="w-full flex justify-center py-0.5">
                      <svg 
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                        className="w-full h-auto max-h-[170px]"
                        style={{ fontFamily: 'sans-serif' }}
                      >
                        {/* Background Grid Lines for Y axis */}
                        {[0, 20, 40, 60, 80, 100].map(val => {
                          const y = yScale(val);
                          return (
                            <g key={val}>
                              <line 
                                x1={padding.left} 
                                y1={y} 
                                x2={svgWidth - padding.right} 
                                y2={y} 
                                stroke="#e2e8f0" 
                                strokeWidth="1"
                                strokeDasharray={val === 0 || val === 100 ? 'none' : '3 3'}
                              />
                              <text 
                                x={padding.left - 8} 
                                y={y + 3.5} 
                                textAnchor="end" 
                                fontSize="10" 
                                fill="#64748b"
                                fontWeight="bold"
                              >
                                {val}%
                              </text>
                            </g>
                          );
                        })}

                        {/* Baseline Grid Line for W-0 (Awal Proyek) */}
                        <g key="w-0">
                          <line 
                            x1={xScale(0)} 
                            y1={padding.top} 
                            x2={xScale(0)} 
                            y2={svgHeight - padding.bottom} 
                            stroke="#cbd5e1" 
                            strokeWidth="1.5"
                          />
                          <text 
                            x={xScale(0)} 
                            y={svgHeight - padding.bottom + 16} 
                            textAnchor="middle" 
                            fontSize="9" 
                            fill="#64748b"
                            fontWeight="bold"
                          >
                            W-0
                          </text>
                        </g>

                        {/* Vertical Grid Lines for All Project Weeks */}
                        {sCurveData.map(d => {
                          const x = xScale(d.weekNum);
                          return (
                            <g key={d.weekNum}>
                              <line 
                                x1={x} 
                                y1={padding.top} 
                                x2={x} 
                                y2={svgHeight - padding.bottom} 
                                stroke="#f1f5f9" 
                                strokeWidth="1"
                              />
                              <text 
                                x={x} 
                                y={svgHeight - padding.bottom + 16} 
                                textAnchor="middle" 
                                fontSize="9.5" 
                                fill="#334155"
                                fontWeight="bold"
                              >
                                W-{d.weekNum}
                              </text>
                            </g>
                          );
                        })}

                        {/* Planned Curve (Blue Line) */}
                        <path
                          d={planPathD}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Planned Data Points */}
                        {planPoints.map(pt => (
                          <circle
                            key={`plan-${pt.week}`}
                            cx={pt.x}
                            cy={pt.y}
                            r="3.5"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                          />
                        ))}

                        {/* Actual Curve (Green Line) */}
                        {actualPoints.length > 0 && (
                          <>
                            <path
                              d={actualPathD}
                              fill="none"
                              stroke="#059669"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {actualPoints.map(pt => (
                              <g key={`actual-${pt.week}`}>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="4"
                                  fill="#059669"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                />
                                {pt.week > 0 && (
                                  <text
                                    x={pt.x}
                                    y={pt.y - 7}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontWeight="bold"
                                    fill="#065f46"
                                  >
                                    {pt.val}%
                                  </text>
                                )}
                              </g>
                            ))}
                          </>
                        )}

                        {/* Axis Labels */}
                        <text 
                          x={padding.left} 
                          y={padding.top - 12} 
                          fontSize="9.5" 
                          fontWeight="bold" 
                          fill="#475569"
                        >
                          Progres Kumulatif (%)
                        </text>
                        <text 
                          x={svgWidth - padding.right} 
                          y={svgHeight - 8} 
                          textAnchor="end" 
                          fontSize="9.5" 
                          fontWeight="bold" 
                          fill="#475569"
                        >
                          Periode Waktu
                        </text>
                      </svg>
                    </div>
                  </div>
                )}

                {/* Tabel Data Rekapitulasi Kemajuan Mingguan (Dinaikkan ke Halaman 1) */}
                <div className="mb-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5 border-b border-slate-200 pb-1">
                    TABEL DATA KEMAJUAN PEKERJAAN {selectedWeek === 'all' ? '& KURVA S' : `s/d MINGGU KE-${currentWeekNum}`}
                  </h2>

                  <div className="overflow-x-auto border border-slate-300 rounded-lg">
                    <table className="w-full text-left border-collapse text-[9.5px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold text-center">
                          <th rowSpan={2} className="px-1.5 py-1 border-r border-slate-300 w-10">Minggu</th>
                          <th rowSpan={2} className="px-1.5 py-1 border-r border-slate-300 min-w-[110px]">Periode Tanggal</th>
                          <th colSpan={2} className="px-1.5 py-1 border-b border-r border-slate-300 bg-blue-50/70 text-blue-900">
                            Progres Mingguan (%)
                          </th>
                          <th colSpan={2} className="px-1.5 py-1 border-b border-r border-slate-300 bg-emerald-50/70 text-emerald-900">
                            Progres Kumulatif (%)
                          </th>
                          <th rowSpan={2} className="px-1.5 py-1 border-r border-slate-300 w-16">Deviasi (%)</th>
                          <th rowSpan={2} className="px-1.5 py-1 min-w-[100px]">Status & Catatan</th>
                        </tr>
                        <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 text-center font-bold text-[8.5px]">
                          <th className="px-1 py-0.5 border-r border-slate-300 bg-blue-50/40 text-blue-800">Rencana</th>
                          <th className="px-1 py-0.5 border-r border-slate-300 bg-blue-50/40 text-blue-800">Realisasi</th>
                          <th className="px-1 py-0.5 border-r border-slate-300 bg-emerald-50/40 text-emerald-800">Rencana</th>
                          <th className="px-1 py-0.5 border-r border-slate-300 bg-emerald-50/40 text-emerald-800">Realisasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {displayedTableData.map((d) => {
                          const isTargetWeek = selectedWeek !== 'all' && selectedWeek === d.weekNum;
                          const hasActual = d.actualCumulative !== null;
                          
                          return (
                            <tr 
                              key={d.weekNum} 
                              className={`${isTargetWeek ? 'bg-amber-50 font-semibold' : hasActual ? 'bg-white' : 'bg-slate-50/60 text-slate-400'}`}
                            >
                              <td className="px-1.5 py-1 text-center font-bold border-r border-slate-300">
                                W-{d.weekNum}
                              </td>
                              <td className="px-1.5 py-1 border-r border-slate-300 text-center text-[9px]">
                                {d.startDate && d.endDate ? (
                                  `${new Date(d.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(d.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                ) : '-'}
                              </td>
                              <td className="px-1.5 py-1 text-center border-r border-slate-300 font-mono">
                                {d.plannedWeekly}%
                              </td>
                              <td className="px-1.5 py-1 text-center border-r border-slate-300 font-mono font-bold text-slate-900">
                                {d.actualWeekly !== null ? `${d.actualWeekly}%` : '-'}
                              </td>
                              <td className="px-1.5 py-1 text-center border-r border-slate-300 font-mono text-blue-700">
                                {d.plannedCumulative}%
                              </td>
                              <td className="px-1.5 py-1 text-center border-r border-slate-300 font-mono font-bold text-emerald-700">
                                {d.actualCumulative !== null ? `${d.actualCumulative}%` : '-'}
                              </td>
                              <td className="px-1.5 py-1 text-center border-r border-slate-300 font-mono">
                                {d.deviation !== null ? (
                                  <span className={`font-bold ${d.deviation >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                    {d.deviation > 0 ? `+${d.deviation}` : d.deviation}%
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-1.5 py-1 text-[9px]">
                                {d.deviation !== null ? (
                                  d.deviation >= 0 ? (
                                    <span className="text-green-700 font-medium">Sesuai Jadwal</span>
                                  ) : d.deviation >= -5 ? (
                                    <span className="text-amber-700 font-medium">Terlambat Ringan</span>
                                  ) : (
                                    <span className="text-red-700 font-bold">Kritis ({d.report?.notes || 'Perlu SCM'})</span>
                                  )
                                ) : (
                                  <span className="text-slate-400 italic">Rencana Pelaksanaan</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer Halaman 1 */}
              <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-[9.5px] text-slate-500 mt-4">
                <span>e-AWAS Pro | Sistem Monitoring & Evaluasi Proyek Fisik</span>
                <span className="font-semibold text-slate-700">Halaman 1 dari {totalDocPages}</span>
              </div>
            </div>

            {/* ==================== HALAMAN-HALAMAN RINCIAN RAB & PENGESAHAN (HALAMAN 2 dst) ==================== */}
            {detailPages.map((pageItems, pageIdx) => {
              const currentPageNumber = pageIdx + 2;
              const isLastDetailPage = pageIdx === detailPages.length - 1;
              const startItemNumber = pageIdx * ITEMS_PER_PAGE + 1;
              const endItemNumber = Math.min((pageIdx + 1) * ITEMS_PER_PAGE, allReportDetails.length);
              const isFirstDetailPage = pageIdx === 0;

              return (
                <div 
                  key={`detail-page-${pageIdx}`}
                  className="pdf-page bg-white text-slate-900 w-full min-h-[1130px] p-8 sm:p-10 shadow-lg border border-slate-300 rounded-none sm:rounded-md text-[12px] leading-relaxed font-sans flex flex-col justify-between"
                >
                  <div>
                    {/* Mini Header Page */}
                    <div className="border-b border-slate-800 pb-2 mb-4 flex justify-between items-end">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                          e-AWAS PRO • {isFirstDetailPage ? 'RINCIAN CAPAIAN ITEM PEKERJAAN' : 'LANJUTAN RINCIAN ITEM PEKERJAAN'} {isLastDetailPage ? '& PENGESAHAN' : ''}
                        </div>
                        <div className="text-xs font-bold text-slate-900 truncate max-w-md">
                          {project.name} (Minggu ke-{currentWeekNum})
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 text-right">
                        Tanggal: {formatIndoDate(new Date().toISOString().split('T')[0])}
                      </div>
                    </div>

                    {/* Rincian Item Pekerjaan RAB */}
                    {hasDetails && (
                      <div className="mb-5">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
                          <span>
                            {isFirstDetailPage ? 'RINCIAN CAPAIAN ITEM PEKERJAAN SESUAI RAB' : 'LANJUTAN RINCIAN ITEM PEKERJAAN SESUAI RAB'} (MINGGU KE-{currentWeekNum})
                          </span>
                          <span className="text-[9.5px] font-normal lowercase text-slate-500">
                            (Item {startItemNumber} - {endItemNumber} dari {allReportDetails.length} item RAB)
                          </span>
                        </h2>

                        <div className="overflow-x-auto border border-slate-300 rounded-lg">
                          <table className="w-full text-left border-collapse text-[9.5px]">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold text-center">
                                <th rowSpan={2} className="px-1.5 py-1.5 border-r border-slate-300 w-7">No</th>
                                <th rowSpan={2} className="px-2 py-1.5 border-r border-slate-300 text-left min-w-[130px]">Uraian Pekerjaan (RAB)</th>
                                <th rowSpan={2} className="px-1 py-1.5 border-r border-slate-300 w-11">Satuan</th>
                                <th rowSpan={2} className="px-1.5 py-1.5 border-r border-slate-300 w-14">Vol. Target</th>
                                <th rowSpan={2} className="px-1.5 py-1.5 border-r border-slate-300 w-13">Bobot (%)</th>
                                <th colSpan={2} className="px-1.5 py-1 border-b border-r border-slate-300 bg-slate-200/70 text-slate-800">
                                  s/d Minggu Lalu
                                </th>
                                <th colSpan={2} className="px-1.5 py-1 border-b border-r border-slate-300 bg-blue-100/70 text-blue-900">
                                  Minggu Ini
                                </th>
                                <th colSpan={2} className="px-1.5 py-1 border-b border-slate-300 bg-emerald-100/70 text-emerald-900">
                                  s/d Minggu Ini
                                </th>
                              </tr>
                              <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 text-center font-bold text-[8.5px]">
                                <th className="px-1 py-1 border-r border-slate-300 bg-slate-100/80 w-13">Vol. s/d Mgg Lalu</th>
                                <th className="px-1 py-1 border-r border-slate-300 bg-slate-100/80 w-13">Prog. (%) Mgg Lalu</th>
                                <th className="px-1 py-1 border-r border-slate-300 bg-blue-50/80 text-blue-900 w-13">Vol. Mgg Ini</th>
                                <th className="px-1 py-1 border-r border-slate-300 bg-blue-50/80 text-blue-900 w-13">Prog. (%) Mgg Ini</th>
                                <th className="px-1 py-1 border-r border-slate-300 bg-emerald-50/80 text-emerald-900 w-13">Vol. s/d Mgg Ini</th>
                                <th className="px-1 py-1 bg-emerald-50/80 text-emerald-900 w-13">Prog. (%) s/d Mgg Ini</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {pageItems.map((item, idx) => {
                                const globalItemIndex = (pageIdx * ITEMS_PER_PAGE) + idx + 1;
                                return (
                                  <tr key={item.rabItemId || idx} className="hover:bg-slate-50">
                                    <td className="px-1.5 py-1 text-center font-medium border-r border-slate-300 text-slate-600">
                                      {globalItemIndex}
                                    </td>
                                    <td className="px-2 py-1 font-medium text-slate-900 border-r border-slate-300">{item.description}</td>
                                    <td className="px-1 py-1 text-center border-r border-slate-300 text-slate-600">{item.unit}</td>
                                    <td className="px-1.5 py-1 text-right border-r border-slate-300 font-mono text-slate-700">{item.targetVolume.toFixed(2)}</td>
                                    <td className="px-1.5 py-1 text-right border-r border-slate-300 font-mono text-slate-700">{item.weight.toFixed(3)}%</td>
                                    <td className="px-1.5 py-1 text-right border-r border-slate-300 font-mono text-slate-600">{item.volumeSdMggLalu.toFixed(2)}</td>
                                    <td className="px-1.5 py-1 text-right border-r border-slate-300 font-mono text-slate-600">{item.progressSdMggLalu.toFixed(2)}%</td>
                                    <td className="px-1.5 py-1 text-right border-r border-slate-300 font-mono font-bold text-blue-700 bg-blue-50/20">{item.volumeThisWeek.toFixed(2)}</td>
                                    <td className="px-1.5 py-1 text-right border-r border-slate-300 font-mono font-bold text-blue-700 bg-blue-50/20">{item.progressThisWeek.toFixed(2)}%</td>
                                    <td className="px-1.5 py-1 text-right border-r border-slate-300 font-mono font-bold text-emerald-700 bg-emerald-50/20">{item.cumulativeVolume.toFixed(2)}</td>
                                    <td className="px-1.5 py-1 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">{item.cumulativeProgress.toFixed(2)}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            {isLastDetailPage && (
                              <tfoot>
                                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-[9px]">
                                  <td colSpan={4} className="px-2 py-1.5 text-right border-r border-slate-300 uppercase tracking-wider">
                                    Total Bobot & Progres Fisik:
                                  </td>
                                  <td className="px-1.5 py-1.5 text-right border-r border-slate-300 font-mono">
                                    {detailsTotalWeight.toFixed(3)}%
                                  </td>
                                  <td className="px-1 py-1.5 text-center border-r border-slate-300 text-slate-400 font-normal">-</td>
                                  <td className="px-1.5 py-1.5 text-right border-r border-slate-300 font-mono text-slate-800">
                                    {detailsTotalProgWeightedLalu.toFixed(2)}%
                                  </td>
                                  <td className="px-1 py-1.5 text-center border-r border-slate-300 text-slate-400 font-normal">-</td>
                                  <td className="px-1.5 py-1.5 text-right border-r border-slate-300 font-mono text-blue-700">
                                    {detailsTotalProgWeightedIni.toFixed(2)}%
                                  </td>
                                  <td className="px-1 py-1.5 text-center border-r border-slate-300 text-slate-400 font-normal">-</td>
                                  <td className="px-1.5 py-1.5 text-right font-mono text-emerald-700">
                                    {detailsTotalProgWeightedSdIni.toFixed(2)}%
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Lembar Pengesahan / Tanda Tangan jika di Halaman Terakhir */}
                    {isLastDetailPage && (
                      <div className="mt-6 pt-3 border-t border-slate-300 break-inside-avoid">
                        <div className="text-right text-[11px] text-slate-700 font-medium mb-3">
                          {customCity}, {formatIndoDate(new Date().toISOString().split('T')[0])}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center text-[11px]">
                          {/* Kontraktor */}
                          <div className="flex flex-col justify-between h-32">
                            <div>
                              <p className="font-bold text-slate-600 uppercase text-[10px]">Dibuat Oleh:</p>
                              <p className="font-bold text-slate-900 mt-0.5">{customProviderName || project.ptCv}</p>
                              <p className="text-[10px] text-slate-500">Kontraktor Pelaksana</p>
                            </div>
                            <div>
                              <div className="w-32 border-b border-slate-900 mx-auto mb-1"></div>
                              <p className="font-bold text-slate-900 uppercase text-[10px]">( Direktur / Site Manager )</p>
                            </div>
                          </div>

                          {/* Konsultan Pengawas */}
                          <div className="flex flex-col justify-between h-32">
                            <div>
                              <p className="font-bold text-slate-600 uppercase text-[10px]">Diperiksa Oleh:</p>
                              <p className="font-bold text-slate-900 mt-0.5">KONSULTAN PENGAWAS</p>
                              <p className="text-[10px] text-slate-500">Pengawas Lapangan</p>
                            </div>
                            <div>
                              <div className="w-36 border-b border-slate-900 mx-auto mb-1"></div>
                              <p className="font-bold text-slate-900 text-[10px]">{customSupervisorName || 'Pengawas Lapangan'}</p>
                            </div>
                          </div>

                          {/* PPK */}
                          <div className="flex flex-col justify-between h-32">
                            <div>
                              <p className="font-bold text-slate-600 uppercase text-[10px]">Disetujui Oleh:</p>
                              <p className="font-bold text-slate-900 mt-0.5">PEJABAT PEMBUAT KOMITMEN</p>
                              <p className="text-[10px] text-slate-500">(PPK)</p>
                            </div>
                            <div>
                              <div className="w-36 border-b border-slate-900 mx-auto mb-1"></div>
                              <p className="font-bold text-slate-900 text-[10px]">{currentPpk}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Halaman */}
                  <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-[9.5px] text-slate-500 mt-6">
                    <span>e-AWAS Pro | Sistem Monitoring & Evaluasi Proyek Fisik</span>
                    <span className="font-semibold text-slate-700">Halaman {currentPageNumber} dari {totalDocPages}</span>
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* Modal / Dialog Kirim Laporan (WhatsApp / Email) */}
        {showShareModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
              {/* Header Dialog */}
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl text-white shadow-sm ${
                    shareChannel === 'whatsapp' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    {shareChannel === 'whatsapp' ? <MessageSquare size={18} /> : <Mail size={18} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {shareChannel === 'whatsapp' ? 'Kirim Ringkasan Laporan via WhatsApp' : 'Kirim Laporan via Email'}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium truncate max-w-xs">
                      {project.name} {selectedWeek === 'all' ? '(Semua Minggu)' : `(Minggu ke-${currentWeekNum})`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs Switcher */}
              <div className="px-5 pt-3 pb-1 border-b border-slate-100 flex gap-2">
                <button
                  onClick={() => {
                    setShareChannel('whatsapp');
                    setCustomRecipient(provider?.phone || '');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    shareChannel === 'whatsapp'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <MessageSquare size={15} className={shareChannel === 'whatsapp' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    setShareChannel('email');
                    setCustomRecipient(provider?.email || '');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    shareChannel === 'email'
                      ? 'bg-blue-50 text-blue-700 border border-blue-300 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <Mail size={15} className={shareChannel === 'email' ? 'text-blue-600' : 'text-slate-400'} />
                  <span>Email</span>
                </button>
              </div>

              {/* Content Body */}
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Kartu Informasi Kontak Penyedia Jasa (CV/PT) */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={15} className="text-emerald-700" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                        Data Penyedia Jasa (CV/PT)
                      </span>
                    </div>
                    {provider ? (
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-200 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Terhubung Master Data
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                        <AlertCircle size={11} />
                        Belum Terdaftar di Master
                      </span>
                    )}
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 space-y-1.5 text-xs text-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium text-[11px]">Nama Perusahaan:</span>
                      <span className="font-bold text-slate-900">{provider?.name || customProviderName || project.ptCv}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
                        <Phone size={12} className="text-emerald-600" /> WhatsApp / HP:
                      </span>
                      <span className={`font-semibold ${provider?.phone ? 'text-slate-900 font-mono' : 'text-amber-700 italic'}`}>
                        {provider?.phone || 'Belum diisi di Master Penyedia'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
                        <Mail size={12} className="text-blue-600" /> Email:
                      </span>
                      <span className={`font-semibold ${provider?.email ? 'text-slate-900 font-mono' : 'text-amber-700 italic'}`}>
                        {provider?.email || 'Belum diisi di Master Penyedia'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (shareChannel === 'whatsapp') {
                          setCustomRecipient(provider?.phone || '');
                        } else {
                          setCustomRecipient(provider?.email || '');
                        }
                      }}
                      className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      {shareChannel === 'whatsapp' ? <MessageSquare size={13} /> : <Mail size={13} />}
                      <span>Gunakan Kontak CV/PT ({shareChannel === 'whatsapp' ? (provider?.phone || 'Penyedia') : (provider?.email || 'Penyedia')})</span>
                    </button>
                  </div>
                </div>

                {/* Kontak Cepat Lainnya (PPK / Pengawas) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Penerima Alternatif
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* PPK */}
                    <button
                      type="button"
                      onClick={() => {
                        const ppkUser = ppkList.find(u => u.name === currentPpk || u.username === currentPpk);
                        if (shareChannel === 'email' && ppkUser?.email) {
                          setCustomRecipient(ppkUser.email);
                        }
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 text-left transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User size={13} className="text-slate-500 group-hover:text-blue-600" />
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                          {currentPpk}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        Pejabat Pembuat Komitmen (PPK)
                      </p>
                    </button>

                    {/* Konsultan Pengawas */}
                    <button
                      type="button"
                      onClick={() => {
                        // Keep current recipient or focus
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-left transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User size={13} className="text-slate-500 group-hover:text-slate-700" />
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                          {customSupervisorName || 'Konsultan Pengawas'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        Pengawas Lapangan Proyek
                      </p>
                    </button>
                  </div>
                </div>

                {/* Input Penerima Kustom */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    {shareChannel === 'whatsapp' ? 'Nomor WhatsApp Tujuan' : 'Alamat Email Tujuan'}
                  </label>
                  <div className="relative">
                    <input
                      type={shareChannel === 'whatsapp' ? 'tel' : 'email'}
                      value={customRecipient}
                      onChange={(e) => setCustomRecipient(e.target.value)}
                      placeholder={shareChannel === 'whatsapp' ? (provider?.phone ? `Default CV/PT: ${provider.phone}` : 'Contoh: 08123456789 atau kosongkan untuk pilih kontak di WA') : (provider?.email ? `Default CV/PT: ${provider.email}` : 'Contoh: kontraktor@gmail.com')}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      {shareChannel === 'whatsapp' ? <Phone size={14} /> : <Mail size={14} />}
                    </div>
                  </div>
                  {shareChannel === 'whatsapp' ? (
                    <p className="text-[10px] text-slate-400 mt-1">
                      💡 Nomor diambil otomatis dari data CV/PT. Jika dikosongkan, Anda dapat memilih kontak langsung di aplikasi WhatsApp.
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">
                      💡 Alamat email diambil otomatis dari data CV/PT. Dapat diubah atau ditambahkan manual jika perlu.
                    </p>
                  )}
                </div>

                {/* Preview Teks Laporan */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Pratinjau Format Pesan Laporan
                    </label>
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-bold transition-colors"
                    >
                      {copiedSummary ? (
                        <>
                          <Check size={13} className="text-emerald-600" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Salin Teks</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10.5px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-slate-800 select-all">
                    {generateSummaryText(shareChannel === 'whatsapp')}
                  </pre>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  {copiedSummary ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedSummary ? 'Tersalin' : 'Salin Pesan'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-3 py-2 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                  >
                    Batal
                  </button>

                  {shareChannel === 'whatsapp' ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleSendWhatsApp(customRecipient);
                        setShowShareModal(false);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      <MessageSquare size={15} />
                      <span>Buka WhatsApp</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleSendEmail(customRecipient);
                        setShowShareModal(false);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      <Send size={15} />
                      <span>Buka Email Client</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
