export type CategoryType = 'Pañales' | 'Toallitas Húmedas';

export type ChannelKey = 'RDs' | 'DPP' | 'WHS' | 'HSM' | 'ECOMM' | 'Otros';

export type TierKey =
  | 'Tier 0'
  | 'Tier 1'
  | 'Tier 2'
  | 'Tier 2.5'
  | 'Tier 3'
  | 'Pants'
  | 'Wipes'
  | 'Summer'
  | 'Otros';

export type DiaperBrandFocus =
  | 'Pampers'
  | 'Kimberly Clark'
  | 'BabySec'
  | 'Estrella'
  | 'Duffy'
  | 'M.Propias';

export interface ScentiaRow {
  period: string;       // Canonical "YYYY-MM"
  periodLabel: string;  // Display "Jul 25"
  category: CategoryType;
  manufacturer: string;
  brandRaw: string;
  brandGroup: string;
  isPG: boolean;
  subbrand: string;
  tier: TierKey;
  channelRaw: string;
  channelGroup: ChannelKey;
  volumen: number;        // Unidades
  volConvertido: number;  // MSUs (Consumo)
  som: number;            // Share of Market (0..100)
  sov: number;            // Share of Value (0..100)
  valueSales?: number;    // Facturacion / Valor si existe en el archivo
}

export interface ColumnMapping {
  period?: string;
  category?: string;
  manufacturer?: string;
  brand?: string;
  subbrand?: string;
  channel?: string;
  volumen?: string;
  volConvertido?: string;
  som?: string;
  sov?: string;
  valueSales?: string;
}

export interface DatasetMetadata {
  sourceName: string;
  sourceType: 'file' | 'sheets-url' | 'pasted' | 'sample';
  isSample: boolean;
  rowCount: number;
  sheetNames: string[];
  rawHeaders: string[];
  mapping: ColumnMapping;
  periods: string[];
  unmappedChannels: string[];
  unmappedSubbrands: string[];
  loadedAt: string;
}

export interface ParsedWorkbookResult {
  rows: ScentiaRow[];
  meta: DatasetMetadata;
  rawTables: { sheetName: string; headers: string[]; rows: Record<string, unknown>[] }[];
}

export interface PeriodDeltaSummary {
  pmValue: number;
  pmLabel: string;
  prevValue: number | null;
  prevLabel: string | null;
  vsPM: number | null;   // % change vs previous month
  vsP3M: number | null;  // % change vs avg of previous 3 months
  vsP6M: number | null;  // % change vs avg of previous 6 months
  p3mAvg: number | null;
  p6mAvg: number | null;
}

export interface BrandShareComparisonRow {
  rank: number;
  brand: string;
  color: string;
  pmSov: number;
  p3mSov: number | null;
  p6mSov: number | null;
  vsP3Mpp: number | null; // percentage points diff (PM - P3M)
  vsP6Mpp: number | null; // percentage points diff (PM - P6M)
  pmSom?: number;
  msus?: number;
}

export interface BrandCytdFytdRow {
  rank: number;
  brand: string;
  color: string;
  cytdWeightedSov: number | null;
  fytdWeightedSov: number | null;
  diffCytdVsFytdPp: number | null;
  cytdMonthsCount: number;
  fytdMonthsCount: number;
}
