import type { DayName, OperationalSettings, EffectiveStoreStatus } from '../types/domain';

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('id-ID').format(Math.abs(rounded));
  return `${rounded < 0 ? '-' : ''}Rp${formatted}`;
}

export function formatStockNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const HARI_ID: DayName[] = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export function getWibParts(dateInput: Date | string = new Date()): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayName: DayName;
  isoDate: string;
  timeShort: string;
} {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  // Convert to Asia/Jakarta (+07:00) consistently
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hours = Number(map.hour === '24' ? '0' : map.hour);
  const minutes = Number(map.minute);
  const seconds = Number(map.second);

  const weekdayMap: Record<string, DayName> = {
    Sun: 'Minggu',
    Mon: 'Senin',
    Tue: 'Selasa',
    Wed: 'Rabu',
    Thu: 'Kamis',
    Fri: 'Jumat',
    Sat: 'Sabtu',
  };
  const dayName = weekdayMap[map.weekday] ?? HARI_ID[date.getDay()];

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    dayName,
    isoDate: `${year}-${pad(month)}-${pad(day)}`,
    timeShort: `${pad(hours)}:${pad(minutes)}`,
  };
}

export function getTodayWibDate(): string {
  return getWibParts(new Date()).isoDate;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function formatTanggalIndonesia(isoDateOrTimestamp: string, includeDay = false): string {
  if (!isoDateOrTimestamp) return '-';
  let y: number;
  let m: number;
  let d: number;
  let dayName: DayName | undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDateOrTimestamp)) {
    const [yy, mm, dd] = isoDateOrTimestamp.split('-').map(Number);
    y = yy;
    m = mm;
    d = dd;
    const dt = new Date(Date.UTC(yy, mm - 1, dd, 12, 0, 0));
    dayName = HARI_ID[dt.getUTCDay()];
  } else {
    const wib = getWibParts(isoDateOrTimestamp);
    y = wib.year;
    m = wib.month;
    d = wib.day;
    dayName = wib.dayName;
  }

  const base = `${d} ${BULAN_ID[m - 1]} ${y}`;
  return includeDay && dayName ? `${dayName}, ${base}` : base;
}

export function formatTanggalWaktuWib(isoTimestamp: string): string {
  if (!isoTimestamp) return '-';
  const wib = getWibParts(isoTimestamp);
  return `${wib.day} ${BULAN_ID[wib.month - 1]} ${wib.year}, ${wib.timeShort} WIB`;
}

export function formatWaktuWib(timeStr: string): string {
  if (!timeStr) return '-';
  return `${timeStr.slice(0, 5)} WIB`;
}

export function isValidIndonesianPhone(phone: string): boolean {
  const cleaned = phone.trim().replace(/[\s-]/g, '');
  if (/^08\d{8,13}$/.test(cleaned)) return true;
  if (/^\+628\d{7,12}$/.test(cleaned)) return true;
  return false;
}

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s-]/g, '');
}

export function generateOrderCode(existingCodes: string[]): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    let suffix = '';
    for (let i = 0; i < 6; i += 1) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    code = `EFD-${suffix}`;
  } while (existingCodes.includes(code));
  return code;
}

export function generateNotaNumber(existingNotas: string[], isoDate: string): string {
  const compact = isoDate.replace(/-/g, '');
  const prefix = `NOTA-${compact}-`;
  const maxSeq = existingNotas
    .filter((n) => n.startsWith(prefix))
    .reduce((acc, n) => {
      const seq = Number(n.slice(prefix.length)) || 0;
      return Math.max(acc, seq);
    }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

export function computeEffectiveStoreStatus(
  settings: OperationalSettings,
  now: Date = new Date()
): EffectiveStoreStatus {
  const orderedDays: DayName[] = [
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu',
    'Minggu',
  ];

  const hasValidSchedule = settings.jadwal.some(
    (j) => j.aktif && j.jamBuka && j.jamTutup && j.jamBuka < j.jamTutup
  );

  const findNextOpen = (): string | null => {
    if (!hasValidSchedule) return null;
    const wib = getWibParts(now);
    const todayIdx = orderedDays.indexOf(wib.dayName);

    for (let offset = 0; offset < 7; offset += 1) {
      const idx = (todayIdx + offset) % 7;
      const day = orderedDays[idx];
      const sched = settings.jadwal.find((j) => j.hari === day);
      if (!sched || !sched.aktif || !sched.jamBuka || !sched.jamTutup || sched.jamBuka >= sched.jamTutup) {
        continue;
      }
      if (offset === 0) {
        if (wib.timeShort < sched.jamBuka) {
          return `Hari ini (${day}), pukul ${sched.jamBuka} WIB`;
        }
        continue;
      }
      const label = offset === 1 ? `Besok (${day})` : day;
      return `${label}, pukul ${sched.jamBuka} WIB`;
    }
    return null;
  };

  if (settings.mode === 'Dibuka Manual') {
    return {
      isOpen: true,
      mode: settings.mode,
      reasonText: 'Pemesanan dibuka secara manual oleh pengelola.',
      nextOpenText: null,
    };
  }

  if (settings.mode === 'Ditutup Manual') {
    return {
      isOpen: false,
      mode: settings.mode,
      reasonText: 'Pemesanan sedang ditutup sementara oleh pengelola.',
      nextOpenText: findNextOpen(),
    };
  }

  if (!hasValidSchedule || settings.jadwal.length === 0) {
    return {
      isOpen: false,
      mode: settings.mode,
      reasonText: 'Jadwal operasional belum diatur.',
      nextOpenText: null,
    };
  }

  const wib = getWibParts(now);
  const todaySched = settings.jadwal.find((j) => j.hari === wib.dayName);
  if (
    todaySched &&
    todaySched.aktif &&
    todaySched.jamBuka &&
    todaySched.jamTutup &&
    wib.timeShort >= todaySched.jamBuka &&
    wib.timeShort < todaySched.jamTutup
  ) {
    return {
      isOpen: true,
      mode: settings.mode,
      reasonText: `Buka hari ini hingga pukul ${todaySched.jamTutup} WIB.`,
      nextOpenText: null,
    };
  }

  return {
    isOpen: false,
    mode: settings.mode,
    reasonText: 'Saat ini di luar jam operasional pemesanan.',
    nextOpenText: findNextOpen(),
  };
}

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let result = 'Efd!';
  for (let i = 0; i < 8; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
