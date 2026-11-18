import { ParsedWorkbookResult, ScentiaRow } from '../types/scentia';
import {
  formatPeriodLabel,
  mapBrand,
  mapChannel,
  mapIsPG,
  mapTier,
} from './mappings';

interface SubbrandSpec {
  category: 'Pañales' | 'Toallitas Húmedas';
  manufacturer: string;
  brand: string;
  subbrand: string;
  baseMsu: number;
  priceIndex: number;
  trendSlope: number;
}

const SAMPLE_SPECS: SubbrandSpec[] = [
  // Pañales - Pampers (P&G)
  { category: 'Pañales', manufacturer: 'P&G', brand: 'Pampers', subbrand: 'Pampers Premium Care', baseMsu: 42000, priceIndex: 1.32, trendSlope: 0.012 },
  { category: 'Pañales', manufacturer: 'P&G', brand: 'Pampers', subbrand: 'Pampers Deluxe Protection', baseMsu: 16500, priceIndex: 1.38, trendSlope: 0.015 },
  { category: 'Pañales', manufacturer: 'P&G', brand: 'Pampers', subbrand: 'Pampers Baby Dry', baseMsu: 39000, priceIndex: 1.08, trendSlope: 0.005 },
  { category: 'Pañales', manufacturer: 'P&G', brand: 'Pampers', subbrand: 'Pampers Babysan', baseMsu: 26000, priceIndex: 0.88, trendSlope: -0.004 },
  { category: 'Pañales', manufacturer: 'P&G', brand: 'Pampers', subbrand: 'Pampers Supersec', baseMsu: 29500, priceIndex: 0.78, trendSlope: 0.003 },
  { category: 'Pañales', manufacturer: 'P&G', brand: 'Pampers', subbrand: 'Pampers Pants', baseMsu: 24500, priceIndex: 1.24, trendSlope: 0.022 },
  { category: 'Pañales', manufacturer: 'P&G', brand: 'Pampers', subbrand: 'Pampers Splashers', baseMsu: 2200, priceIndex: 1.45, trendSlope: 0.01 },

  // Pañales - Kimberly Clark (Huggies)
  { category: 'Pañales', manufacturer: 'Kimberly Clark', brand: 'Huggies', subbrand: 'Huggies Dermacare', baseMsu: 14000, priceIndex: 1.44, trendSlope: 0.018 },
  { category: 'Pañales', manufacturer: 'Kimberly Clark', brand: 'Huggies', subbrand: 'Huggies Natural Care', baseMsu: 33000, priceIndex: 1.30, trendSlope: 0.006 },
  { category: 'Pañales', manufacturer: 'Kimberly Clark', brand: 'Huggies', subbrand: 'Huggies Supreme Care', baseMsu: 15000, priceIndex: 1.25, trendSlope: 0.004 },
  { category: 'Pañales', manufacturer: 'Kimberly Clark', brand: 'Huggies', subbrand: 'Huggies FlexiComfort', baseMsu: 36500, priceIndex: 1.05, trendSlope: 0.002 },
  { category: 'Pañales', manufacturer: 'Kimberly Clark', brand: 'Huggies', subbrand: 'Huggies Protect Plus', baseMsu: 31000, priceIndex: 0.89, trendSlope: -0.002 },
  { category: 'Pañales', manufacturer: 'Kimberly Clark', brand: 'Huggies', subbrand: 'Huggies Classic', baseMsu: 25000, priceIndex: 0.76, trendSlope: -0.006 },
  { category: 'Pañales', manufacturer: 'Kimberly Clark', brand: 'Huggies', subbrand: 'Huggies Active Sec Pants', baseMsu: 21000, priceIndex: 1.21, trendSlope: 0.019 },
  { category: 'Pañales', manufacturer: 'Kimberly Clark', brand: 'Huggies', subbrand: 'Huggies Little Swimmers', baseMsu: 2600, priceIndex: 1.48, trendSlope: 0.01 },

  // Pañales - BabySec
  { category: 'Pañales', manufacturer: 'Softys', brand: 'BabySec', subbrand: 'BabySec Super Premium', baseMsu: 14500, priceIndex: 1.18, trendSlope: 0.009 },
  { category: 'Pañales', manufacturer: 'Softys', brand: 'BabySec', subbrand: 'Babysec Premium', baseMsu: 26500, priceIndex: 0.96, trendSlope: 0.004 },
  { category: 'Pañales', manufacturer: 'Softys', brand: 'BabySec', subbrand: 'Babysec Ultra', baseMsu: 24000, priceIndex: 0.82, trendSlope: 0.002 },
  { category: 'Pañales', manufacturer: 'Softys', brand: 'BabySec', subbrand: 'Babysec Pants', baseMsu: 12000, priceIndex: 1.09, trendSlope: 0.014 },

  // Pañales - Estrella
  { category: 'Pañales', manufacturer: 'Algodonera Aconcagua', brand: 'Estrella', subbrand: 'Estrella Premium', baseMsu: 9500, priceIndex: 1.12, trendSlope: 0.007 },
  { category: 'Pañales', manufacturer: 'Algodonera Aconcagua', brand: 'Estrella', subbrand: 'Estrella', baseMsu: 17500, priceIndex: 0.88, trendSlope: 0.001 },

  // Pañales - Duffy
  { category: 'Pañales', manufacturer: 'Duffy', brand: 'Duffy', subbrand: 'Duffy Premium Cotton', baseMsu: 8200, priceIndex: 0.94, trendSlope: 0.006 },
  { category: 'Pañales', manufacturer: 'Duffy', brand: 'Duffy', subbrand: 'Duffy Cotton', baseMsu: 11200, priceIndex: 0.79, trendSlope: -0.003 },

  // Pañales - Marcas Propias / Remanente
  { category: 'Pañales', manufacturer: 'Marcas Propias', brand: 'Carrefour / Dia / Otros', subbrand: 'M.Propias Estándar', baseMsu: 22500, priceIndex: 0.72, trendSlope: 0.008 },

  // Toallitas Húmedas (Todos los players)
  { category: 'Toallitas Húmedas', manufacturer: 'P&G', brand: 'Pampers', subbrand: 'Pampers Toallitas Aroma Fresco', baseMsu: 16500, priceIndex: 1.18, trendSlope: 0.015 },
  { category: 'Toallitas Húmedas', manufacturer: 'Kimberly Clark', brand: 'Huggies', subbrand: 'Huggies One & Done', baseMsu: 19200, priceIndex: 1.15, trendSlope: 0.009 },
  { category: 'Toallitas Húmedas', manufacturer: 'Softys', brand: 'BabySec', subbrand: 'BabySec Toallitas Ultra', baseMsu: 13800, priceIndex: 0.92, trendSlope: 0.011 },
  { category: 'Toallitas Húmedas', manufacturer: 'Algodonera Aconcagua', brand: 'Estrella', subbrand: 'Estrella Baby Toallitas', baseMsu: 9600, priceIndex: 0.89, trendSlope: 0.006 },
  { category: 'Toallitas Húmedas', manufacturer: 'Q-Soft', brand: 'Q-Soft', subbrand: 'Q-Soft Toallitas', baseMsu: 7400, priceIndex: 0.82, trendSlope: 0.004 },
  { category: 'Toallitas Húmedas', manufacturer: 'Kenvue', brand: "Johnson's", subbrand: "Johnson's Recién Nacido", baseMsu: 5800, priceIndex: 1.25, trendSlope: -0.002 },
  { category: 'Toallitas Húmedas', manufacturer: 'Marcas Propias', brand: 'M.Propias', subbrand: 'M.Propias Toallitas', baseMsu: 6400, priceIndex: 0.71, trendSlope: 0.009 },
];

const RAW_CHANNELS: { raw: string; weight: number; pgAffinity: number }[] = [
  { raw: 'Almacenes y kioscos', weight: 0.24, pgAffinity: 1.05 },
  { raw: 'Self Independientes', weight: 0.19, pgAffinity: 1.02 },
  { raw: 'Farmacias', weight: 0.16, pgAffinity: 1.18 },
  { raw: 'Mayoristas - CF', weight: 0.15, pgAffinity: 0.92 },
  { raw: 'Self Cadenas', weight: 0.19, pgAffinity: 0.98 },
  { raw: 'Pedidos Ya', weight: 0.04, pgAffinity: 1.24 },
  { raw: 'Rappi', weight: 0.03, pgAffinity: 1.16 },
];

const SAMPLE_PERIODS = [
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09', '2026-10',
];

export function buildSampleDataset(): ParsedWorkbookResult {
  const tempRows: {
    period: string;
    category: 'Pañales' | 'Toallitas Húmedas';
    manufacturer: string;
    brandRaw: string;
    brandGroup: string;
    isPG: boolean;
    subbrand: string;
    channelRaw: string;
    volConvertido: number;
    volumen: number;
    valueSales: number;
  }[] = [];

  for (let pIdx = 0; pIdx < SAMPLE_PERIODS.length; pIdx++) {
    const period = SAMPLE_PERIODS[pIdx];
    const monthNum = parseInt(period.split('-')[1], 10);
    const isSummer = monthNum === 12 || monthNum === 1 || monthNum === 2;

    for (const spec of SAMPLE_SPECS) {
      const summerBoost =
        spec.subbrand.includes('Splashers') || spec.subbrand.includes('Swimmers')
          ? isSummer
            ? 2.4
            : 0.35
          : 1;

      const seasonal = 1 + 0.04 * Math.sin((pIdx / 12) * Math.PI * 2);

      for (let cIdx = 0; cIdx < RAW_CHANNELS.length; cIdx++) {
        const ch = RAW_CHANNELS[cIdx];
        const ecommGrowth = ch.raw === 'Pedidos Ya' || ch.raw === 'Rappi' ? 1 + pIdx * 0.025 : 1;
        const brandAffinity = spec.brand === 'Pampers' ? ch.pgAffinity : 1;
        const jitter = 1 + 0.03 * Math.sin(pIdx * 1.7 + cIdx * 2.3 + spec.baseMsu);

        const msu =
          spec.baseMsu *
          ch.weight *
          (1 + spec.trendSlope * pIdx) *
          seasonal *
          summerBoost *
          ecommGrowth *
          brandAffinity *
          jitter;

        const units = msu * (spec.category === 'Toallitas Húmedas' ? 48 : 34);
        const valueSales = msu * spec.priceIndex * 1150;

        tempRows.push({
          period,
          category: spec.category,
          manufacturer: spec.manufacturer,
          brandRaw: spec.brand,
          brandGroup: mapBrand(spec.brand, spec.manufacturer, spec.category),
          isPG: mapIsPG(spec.manufacturer, spec.brand),
          subbrand: spec.subbrand,
          channelRaw: ch.raw,
          volConvertido: Math.round(msu),
          volumen: Math.round(units),
          valueSales,
        });
      }
    }
  }

  // Compute SOM & SOV per period & category
  const periodCatTotals = new Map<string, { msu: number; val: number }>();
  for (const r of tempRows) {
    const k = `${r.period}|${r.category}`;
    const prev = periodCatTotals.get(k) ?? { msu: 0, val: 0 };
    prev.msu += r.volConvertido;
    prev.val += r.valueSales;
    periodCatTotals.set(k, prev);
  }

  const rows: ScentiaRow[] = tempRows.map((r) => {
    const totals = periodCatTotals.get(`${r.period}|${r.category}`)!;
    return {
      period: r.period,
      periodLabel: formatPeriodLabel(r.period),
      category: r.category,
      manufacturer: r.manufacturer,
      brandRaw: r.brandRaw,
      brandGroup: r.brandGroup,
      isPG: r.isPG,
      subbrand: r.subbrand,
      tier: mapTier(r.subbrand, r.brandRaw, r.category),
      channelRaw: r.channelRaw,
      channelGroup: mapChannel(r.channelRaw),
      volumen: r.volumen,
      volConvertido: r.volConvertido,
      som: totals.msu > 0 ? (r.volConvertido / totals.msu) * 100 : 0,
      sov: totals.val > 0 ? (r.valueSales / totals.val) * 100 : 0,
      valueSales: r.valueSales,
    };
  });

  return {
    rows,
    rawTables: [],
    meta: {
      sourceName: 'Plantilla Estructural Scentia (Datos Simulados)',
      sourceType: 'sample',
      isSample: true,
      rowCount: rows.length,
      sheetNames: ['Pañales (Simulado)', 'Toallitas (Simulado)'],
      rawHeaders: [
        'Periodo',
        'Categoria',
        'Fabricante',
        'Brand',
        'Subbrand',
        'Canal',
        'Volumen',
        'Vol_Convertido',
        'SOM',
        'SOV',
      ],
      mapping: {
        period: 'Periodo',
        category: 'Categoria',
        manufacturer: 'Fabricante',
        brand: 'Brand',
        subbrand: 'Subbrand',
        channel: 'Canal',
        volumen: 'Volumen',
        volConvertido: 'Vol_Convertido',
        som: 'SOM',
        sov: 'SOV',
      },
      periods: SAMPLE_PERIODS,
      unmappedChannels: [],
      unmappedSubbrands: [],
      loadedAt: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    },
  };
}
