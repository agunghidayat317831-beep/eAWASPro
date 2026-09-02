/**
 * Evaluasi Kontrak Kritis dan Penentuan Surat Peringatan (SP) & SCM
 * Berdasarkan Syarat-Syarat Umum Kontrak (SSUK) / Ketentuan Teknis:
 * 1. Jika % Rencana < 70%: Surat peringatan diberikan saat deviasi <= -10% dari % rencana (contoh: rencana 22% -> batas deviasi -2.2%)
 * 2. Jika % Rencana >= 70%: Surat peringatan diberikan saat deviasi <= -5% dari % rencana (contoh: rencana 70% -> batas deviasi -3.5%)
 */

export interface ContractStatusResult {
  isCritical: boolean;
  status: 'START' | 'ON_TRACK' | 'SLIGHT_DELAY' | 'CRITICAL' | 'PLANNED';
  label: string;
  badgeBg: string;
  badgeText: string;
  threshold: number;
  explanation: string;
}

/**
 * Menghitung batas deviasi negatif maksimum yang diizinkan sebelum dinyatakan Kontrak Kritis.
 * @param plannedProgress Persentase progres rencana kumulatif (misal 22 untuk 22%)
 * @returns Batas toleransi deviasi bertanda minus (misal -2.2 untuk rencana 22%, -3.5 untuk rencana 70%)
 */
export const getCriticalDeviationThreshold = (plannedProgress: number): number => {
  if (plannedProgress <= 0) return 0;
  if (plannedProgress < 70) {
    // 10% dari % rencana
    return -parseFloat((0.10 * plannedProgress).toFixed(2));
  } else {
    // 5% dari % rencana
    return -parseFloat((0.05 * plannedProgress).toFixed(2));
  }
};

/**
 * Mengetahui apakah kondisi proyek pada minggu tertentu masuk kategori Kontrak Kritis
 */
export const isCriticalContract = (plannedProgress: number, deviation: number): boolean => {
  if (plannedProgress <= 0) return false;
  const threshold = getCriticalDeviationThreshold(plannedProgress);
  return deviation <= threshold;
};

/**
 * Mendapatkan status lengkap kontrak untuk visualisasi, badge, dan tabel
 */
export const evaluateContractStatus = (
  weekNum: number,
  plannedProgress: number | null,
  actualProgress: number | null,
  deviation: number | null
): ContractStatusResult => {
  if (weekNum === 0) {
    return {
      isCritical: false,
      status: 'START',
      label: 'Mulai Pelaksanaan (SPMK)',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-700',
      threshold: 0,
      explanation: 'Titik nol pelaksanaan proyek (SPMK)'
    };
  }

  if (actualProgress === null || deviation === null || plannedProgress === null) {
    return {
      isCritical: false,
      status: 'PLANNED',
      label: 'Rencana Pelaksanaan',
      badgeBg: 'bg-slate-50',
      badgeText: 'text-slate-400',
      threshold: plannedProgress !== null ? getCriticalDeviationThreshold(plannedProgress) : 0,
      explanation: 'Periode rencana kerja belum dilaporkan'
    };
  }

  const threshold = getCriticalDeviationThreshold(plannedProgress);

  if (deviation >= 0) {
    return {
      isCritical: false,
      status: 'ON_TRACK',
      label: 'On Track',
      badgeBg: 'bg-green-50',
      badgeText: 'text-green-700',
      threshold,
      explanation: 'Kemajuan pekerjaan memenuhi atau melampaui jadwal rencana'
    };
  }

  // deviasi < 0
  if (deviation <= threshold) {
    const ruleDesc = plannedProgress < 70 
      ? `Rencana < 70%: Toleransi deviasi -10% dari rencana (${threshold}%)`
      : `Rencana ≥ 70%: Toleransi deviasi -5% dari rencana (${threshold}%)`;

    return {
      isCritical: true,
      status: 'CRITICAL',
      label: 'Kontrak Kritis (Surat Peringatan)',
      badgeBg: 'bg-red-50',
      badgeText: 'text-red-700',
      threshold,
      explanation: `Deviasi ${deviation}% telah melampaui batas toleransi ${threshold}%. (${ruleDesc})`
    };
  } else {
    return {
      isCritical: false,
      status: 'SLIGHT_DELAY',
      label: 'Terlambat Ringan',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-700',
      threshold,
      explanation: `Deviasi ${deviation}% masih dalam batas toleransi ${threshold}%.`
    };
  }
};
