import { CategoryType, ChannelKey, DiaperBrandFocus, TierKey } from '../types/scentia';

export const DIAPER_FOCUS_BRANDS: DiaperBrandFocus[] = [
  'Pampers',
  'Kimberly Clark',
  'BabySec',
  'Estrella',
  'Duffy',
  'M.Propias',
];

export const PRIMARY_CHANNELS: Exclude<ChannelKey, 'Otros'>[] = [
  'RDs',
  'DPP',
  'WHS',
  'HSM',
  'ECOMM',
];

export const CHANNEL_DESCRIPTIONS: Record<Exclude<ChannelKey, 'Otros'>, string> = {
  RDs: 'Almacenes y kioscos + Self Independientes',
  DPP: 'Farmacias',
  WHS: 'Mayoristas - CF',
  HSM: 'Self Cadenas',
  ECOMM: 'Pedidos Ya + Rappi',
};

export const BRAND_COLORS: Record<string, string> = {
  Pampers: '#0099A8',          // Pampers Teal
  'Kimberly Clark': '#D61F2C', // Huggies Red
  Huggies: '#D61F2C',
  BabySec: '#2563EB',          // BabySec Royal Blue
  Estrella: '#D97706',         // Estrella Gold Amber
  Duffy: '#16A34A',            // Duffy Emerald Green
  'M.Propias': '#64748B',      // Neutral Slate
  'Q-Soft': '#7C3AED',
  "Johnson's": '#EC4899',
  Noni: '#0EA5E9',
  Otros: '#94A3B8',
};

export const CHANNEL_COLORS: Record<ChannelKey, string> = {
  RDs: '#0099A8',
  DPP: '#0B3B60',
  WHS: '#D97706',
  HSM: '#2563EB',
  ECOMM: '#16A34A',
  Otros: '#94A3B8',
};

const EXTRA_PALETTE = ['#7C3AED', '#EC4899', '#0EA5E9', '#0F766E', '#EA580C', '#4F46E5', '#78716C'];

export function getBrandColor(brand: string, index = 0): string {
  if (BRAND_COLORS[brand]) return BRAND_COLORS[brand];
  const normalized = normalizeText(brand);
  if (normalized.includes('pampers')) return BRAND_COLORS.Pampers;
  if (normalized.includes('kimberly') || normalized.includes('huggies')) return BRAND_COLORS['Kimberly Clark'];
  if (normalized.includes('babysec') || normalized.includes('baby sec')) return BRAND_COLORS.BabySec;
  if (normalized.includes('estrella')) return BRAND_COLORS.Estrella;
  if (normalized.includes('duffy')) return BRAND_COLORS.Duffy;
  if (normalized.includes('propia')) return BRAND_COLORS['M.Propias'];
  return EXTRA_PALETTE[index % EXTRA_PALETTE.length];
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mapCategory(rawCategory: string, subbrandRaw = '', sheetName = ''): CategoryType {
  const combined = normalizeText(`${rawCategory} ${subbrandRaw} ${sheetName}`);
  if (
    combined.includes('toallita') ||
    combined.includes('wipe') ||
    combined.includes('humeda') ||
    combined.includes('toalla humeda')
  ) {
    return 'Toallitas Húmedas';
  }
  return 'Pañales';
}

export function mapChannel(rawChannel: string): ChannelKey {
  const n = normalizeText(rawChannel);
  if (!n) return 'Otros';

  if (
    n === 'rds' ||
    n === 'rd' ||
    n.includes('almacen') ||
    n.includes('kiosco') ||
    n.includes('self indep') ||
    n.includes('autoservicio indep') ||
    n.includes('tradicional')
  ) {
    return 'RDs';
  }

  if (n === 'dpp' || n.includes('farmacia') || n.includes('perfumeria')) {
    return 'DPP';
  }

  if (n === 'whs' || n.includes('mayorista') || n.includes('cf') || n.includes('cash')) {
    return 'WHS';
  }

  if (
    n === 'hsm' ||
    n.includes('self cadena') ||
    n.includes('hiper') ||
    n.includes('supermercado') ||
    n.includes('cadenas')
  ) {
    return 'HSM';
  }

  if (
    n === 'ecomm' ||
    n.includes('pedidos ya') ||
    n.includes('pedidosya') ||
    n.includes('rappi') ||
    n.includes('ecomm') ||
    n.includes('e comm') ||
    n.includes('delivery') ||
    n.includes('online') ||
    n.includes('quick commerce')
  ) {
    return 'ECOMM';
  }

  return 'Otros';
}

export function mapIsPG(manufacturer: string, brand: string): boolean {
  const m = normalizeText(manufacturer);
  const b = normalizeText(brand);
  return (
    m.includes('p&g') ||
    m.includes('procter') ||
    m === 'pg' ||
    b.includes('pampers')
  );
}

export function mapBrand(rawBrand: string, rawManufacturer: string, category: CategoryType): string {
  const b = normalizeText(rawBrand);
  const m = normalizeText(rawManufacturer);

  if (category === 'Pañales') {
    if (b.includes('pampers') || m.includes('p&g') || m.includes('procter')) {
      return 'Pampers';
    }
    if (b.includes('kimberly') || b.includes('huggies') || b.includes('kimbies') || m.includes('kimberly') || b === 'kc') {
      return 'Kimberly Clark';
    }
    if (b.includes('babysec') || b.includes('baby sec')) {
      return 'BabySec';
    }
    if (b.includes('estrella')) {
      return 'Estrella';
    }
    if (b.includes('duffy')) {
      return 'Duffy';
    }
    return 'M.Propias';
  }

  // Toallitas Húmedas: keep all players cleanly normalized
  if (b.includes('pampers')) return 'Pampers';
  if (b.includes('kimberly') || b.includes('huggies')) return 'Kimberly Clark';
  if (b.includes('kimbies')) return 'Kimbies';
  if (b.includes('babysec') || b.includes('baby sec')) return 'BabySec';
  if (b.includes('estrella')) return 'Estrella';
  if (b.includes('duffy')) return 'Duffy';
  if (b.includes('q soft') || b.includes('qsoft')) return 'Q-Soft';
  if (b === 'j&j' || b.includes('johnson')) return "Johnson's";
  if (b.includes('algabo')) return 'Algabo';
  if (b.includes('marca propia') || b.includes('marcas propias') || b.includes('m propia') || b.includes('private label')) return 'M.Propias';

  return rawBrand.trim() || rawManufacturer.trim() || 'Otros';
}

export function mapTier(rawSubbrand: string, rawBrand: string, category: CategoryType): TierKey {
  if (category === 'Toallitas Húmedas') {
    return 'Wipes';
  }

  const s = normalizeText(rawSubbrand);
  const b = normalizeText(rawBrand);
  const full = `${b} ${s}`.trim();

  if (s.includes('toallita') || s.includes('wipe')) {
    return 'Wipes';
  }

  // Summer: Pampers Splashers, Huggies Little Swimmers (incl. "HUGGIES LITTLE S.")
  if (
    s.includes('splasher') ||
    s.includes('little swimmer') ||
    s.includes('little s') ||
    s.includes('swimmer') ||
    s.includes('voy al agua')
  ) {
    return 'Summer';
  }

  // Pants: Todos los pañales que sean Pants de cualquier Brand
  if (/\bpants?\b/.test(s) || s.includes('pants')) {
    return 'Pants';
  }

  // Tier 0: Huggies Dermacare
  if (s.includes('dermacare') || s.includes('derma care')) {
    return 'Tier 0';
  }

  // Tier 1: Pampers Premium Care (incl. PAMPERS PREMIUM), Pampers Deluxe Protection,
  // Huggies Natural Care, Huggies Supreme Care, Huggies Ultra Confort, BabySec Super Premium, Estrella Premium
  if (
    s.includes('premium care') ||
    s === 'pampers premium' ||
    (b.includes('pampers') && s === 'premium') ||
    s.includes('deluxe protection') ||
    s.includes('natural care') ||
    s.includes('supreme care') ||
    s.includes('ultra confort') ||
    s.includes('ultra comfort') ||
    s.includes('super premium') ||
    (s.includes('estrella') && s.includes('premium')) ||
    (b.includes('estrella') && s.includes('premium'))
  ) {
    return 'Tier 1';
  }

  // Tier 2: Pampers Baby Dry, Huggies FlexiComfort, Babysec Premium, Estrella, Duffy Premium Cotton
  if (
    s.includes('baby dry') ||
    s.includes('babydry') ||
    s.includes('flexicomfort') ||
    s.includes('flexi comfort') ||
    (full.includes('babysec') && s.includes('premium')) ||
    (full.includes('duffy') && s.includes('premium')) ||
    s.includes('premium cotton') ||
    (b.includes('estrella') && (s === '' || s === 'estrella' || s === 'clasico' || s === 'classic' || s === 'regular')) ||
    s === 'estrella'
  ) {
    return 'Tier 2';
  }

  // Tier 2.5: Pampers Babysan, Huggies Protect Plus (incl. "HUGGIES PROTEC PLUS"),
  // Babysec Ultra, Babysec Classic, Duffy Cotton (incl. "DUFFY")
  if (
    s.includes('babysan') ||
    s.includes('protect plus') ||
    s.includes('protec plus') ||
    (full.includes('babysec') && (s.includes('ultra') || s.includes('classic'))) ||
    s.includes('duffy cotton') ||
    (b.includes('duffy') && !s.includes('premium')) ||
    s === 'duffy'
  ) {
    return 'Tier 2.5';
  }

  // Tier 3: Pampers Supersec, Huggies Classic, Huggies Maxi Protect
  if (
    s.includes('supersec') ||
    s.includes('super sec') ||
    (full.includes('huggies') && s.includes('classic')) ||
    (full.includes('kimberly') && s.includes('classic')) ||
    s.includes('maxi protect') ||
    s.includes('maxiprotect')
  ) {
    return 'Tier 3';
  }

  return 'Otros';
}

const MONTH_MAP: Record<string, number> = {
  ene: 1, enero: 1, jan: 1, january: 1,
  feb: 2, febrero: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  abr: 4, abril: 4, apr: 4, april: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6, june: 6,
  jul: 7, julio: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  sep: 9, sept: 9, septiembre: 9, set: 9, setiembre: 9, september: 9,
  oct: 10, octubre: 10, october: 10,
  nov: 11, noviembre: 11, november: 11,
  dic: 12, diciembre: 12, dec: 12, december: 12,
};

const SHORT_ES_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function formatPeriodLabel(ym: string): string {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return ym;
  const monthIdx = parseInt(m[2], 10) - 1;
  const yearShort = m[1].slice(2);
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${SHORT_ES_MONTHS[monthIdx]} ${yearShort}`;
  }
  return ym;
}

export function parsePeriod(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  // Excel serial number (approx 1990..2050 -> 32874..55000)
  if (typeof raw === 'number' && raw > 30000 && raw < 65000) {
    const utcDays = Math.floor(raw - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}`;
  }

  const str = String(raw).trim();
  if (!str) return null;

  // YYYY-MM or YYYY/MM or YYYY-MM-DD
  let match = str.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (m >= 1 && m <= 12) return `${y}-${String(m).padStart(2, '0')}`;
  }

  // YYYYMM (e.g. 202507)
  match = str.match(/^(\d{4})(\d{2})$/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (y >= 2000 && y <= 2050 && m >= 1 && m <= 12) {
      return `${y}-${String(m).padStart(2, '0')}`;
    }
  }

  // MM/YYYY or DD/MM/YYYY
  match = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (match) {
    const m = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    if (m >= 1 && m <= 12) return `${y}-${String(m).padStart(2, '0')}`;
  }
  match = str.match(/^\d{1,2}[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const m = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    if (m >= 1 && m <= 12) return `${y}-${String(m).padStart(2, '0')}`;
  }

  // Textual month e.g. "Ene-25", "Jul 2025", "Septiembre 25", "2025 Ene"
  const clean = normalizeText(str).replace(/['.]/g, '');
  const tokens = clean.split(/[\s/-]+/);
  let foundMonth: number | null = null;
  let foundYear: number | null = null;
  for (const tok of tokens) {
    if (MONTH_MAP[tok]) {
      foundMonth = MONTH_MAP[tok];
    } else if (/^\d{4}$/.test(tok)) {
      const y = parseInt(tok, 10);
      if (y >= 2000 && y <= 2050) foundYear = y;
    } else if (/^\d{2}$/.test(tok)) {
      foundYear = 2000 + parseInt(tok, 10);
    }
  }
  if (foundMonth && foundYear) {
    return `${foundYear}-${String(foundMonth).padStart(2, '0')}`;
  }

  return null;
}

export function parseLocaleNumber(raw: unknown): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (raw === null || raw === undefined) return 0;
  let str = String(raw).trim();
  if (!str || str === '-' || str === 'N/A' || str === '#N/A') return 0;

  str = str.replace(/[%$\s]/g, '');

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    // Whichever appears last is the decimal separator
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = str.split(',');
    // If exactly 3 digits after single comma and no decimals, treat cautiously:
    // For shares/MSUs e.g. "12,4" -> 12.4; if "1,234" -> check length
    if (parts.length === 2 && parts[1].length !== 3) {
      str = str.replace(',', '.');
    } else if (parts.length > 2) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
  }

  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
}
