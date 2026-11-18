import {
  BrandCytdFytdRow,
  BrandShareComparisonRow,
  CategoryType,
  ChannelKey,
  PeriodDeltaSummary,
  ScentiaRow,
  TierKey,
} from '../types/scentia';
import {
  DIAPER_FOCUS_BRANDS,
  PRIMARY_CHANNELS,
  formatPeriodLabel,
  getBrandColor,
} from './mappings';

export function getSortedPeriods(rows: ScentiaRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.period))).sort();
}

export function filterRowsByPeriodWindow(
  rows: ScentiaRow[],
  periods: string[],
  windowSize: number | 'all'
): { filteredRows: ScentiaRow[]; activePeriods: string[] } {
  if (windowSize === 'all' || periods.length <= windowSize) {
    return { filteredRows: rows, activePeriods: periods };
  }
  const activePeriods = periods.slice(-windowSize);
  const set = new Set(activePeriods);
  return {
    filteredRows: rows.filter((r) => set.has(r.period)),
    activePeriods,
  };
}

export function computeConsumptionSeries(
  rows: ScentiaRow[],
  periods: string[],
  metric: 'volConvertido' | 'volumen'
): { period: string; label: string; value: number }[] {
  const byPeriod = new Map<string, number>();
  for (const p of periods) byPeriod.set(p, 0);
  for (const r of rows) {
    byPeriod.set(r.period, (byPeriod.get(r.period) ?? 0) + r[metric]);
  }
  return periods.map((p) => ({
    period: p,
    label: formatPeriodLabel(p),
    value: byPeriod.get(p) ?? 0,
  }));
}

export function computeConsumptionByChannelSeries(
  rows: ScentiaRow[],
  periods: string[],
  metric: 'volConvertido' | 'volumen'
): Record<string, string | number>[] {
  const map = new Map<string, Record<ChannelKey, number>>();
  for (const p of periods) {
    map.set(p, { RDs: 0, DPP: 0, WHS: 0, HSM: 0, ECOMM: 0, Otros: 0 });
  }
  for (const r of rows) {
    const entry = map.get(r.period);
    if (entry) {
      entry[r.channelGroup] += r[metric];
    }
  }
  return periods.map((p) => {
    const entry = map.get(p)!;
    return {
      period: p,
      label: formatPeriodLabel(p),
      RDs: entry.RDs,
      DPP: entry.DPP,
      WHS: entry.WHS,
      HSM: entry.HSM,
      ECOMM: entry.ECOMM,
    };
  });
}

export function computePeriodDeltaSummary(
  series: { period: string; label: string; value: number }[]
): PeriodDeltaSummary {
  if (series.length === 0) {
    return {
      pmValue: 0,
      pmLabel: '-',
      prevValue: null,
      prevLabel: null,
      vsPM: null,
      vsP3M: null,
      vsP6M: null,
      p3mAvg: null,
      p6mAvg: null,
    };
  }
  const latest = series[series.length - 1];
  const prevItem = series.length >= 2 ? series[series.length - 2] : null;
  const prev1 = prevItem ? prevItem.value : null;

  const p3mSlice = series.slice(Math.max(0, series.length - 4), series.length - 1);
  const p6mSlice = series.slice(Math.max(0, series.length - 7), series.length - 1);

  const p3mAvg =
    p3mSlice.length > 0
      ? p3mSlice.reduce((acc, x) => acc + x.value, 0) / p3mSlice.length
      : null;
  const p6mAvg =
    p6mSlice.length > 0
      ? p6mSlice.reduce((acc, x) => acc + x.value, 0) / p6mSlice.length
      : null;

  const pct = (curr: number, base: number | null) =>
    base !== null && base > 0 ? ((curr - base) / base) * 100 : null;

  return {
    pmValue: latest.value,
    pmLabel: latest.label,
    prevValue: prev1,
    prevLabel: prevItem ? prevItem.label : null,
    vsPM: pct(latest.value, prev1),
    vsP3M: pct(latest.value, p3mAvg),
    vsP6M: pct(latest.value, p6mAvg),
    p3mAvg,
    p6mAvg,
  };
}

/**
 * Computes Share of Value (%) per brand per period for a filtered slice of rows.
 * Uses explicit valueSales if available; otherwise aggregates SOV and normalizes within the slice
 * when slice totals deviate from 100% (or keeps direct when slice sums to ~100%).
 */
export function computeBrandShareSeries(
  sliceRows: ScentiaRow[],
  periods: string[],
  brandsOrder: string[],
  rebaseTo100 = true
): {
  chartData: Record<string, string | number>[];
  brands: string[];
  monthlyWeights: Map<string, number>;
} {
  const hasValueSales = sliceRows.some((r) => (r.valueSales ?? 0) > 0);

  // Determine brands present
  const brandTotals = new Map<string, number>();
  for (const r of sliceRows) {
    const score = hasValueSales ? (r.valueSales ?? 0) : r.sov > 0 ? r.sov : r.volConvertido;
    brandTotals.set(r.brandGroup, (brandTotals.get(r.brandGroup) ?? 0) + score);
  }

  let brands: string[];
  if (brandsOrder.length > 0) {
    // Keep canonical focus brands order, filtering to those present or all 6 focus brands
    brands = brandsOrder.filter((b) => brandTotals.has(b) || b === 'Pampers');
    if (brands.length === 0) brands = [...brandsOrder];
  } else {
    brands = Array.from(brandTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([b]) => b);
  }

  const monthlyWeights = new Map<string, number>();

  const chartData = periods.map((p) => {
    const pRows = sliceRows.filter((r) => r.period === p);
    const point: Record<string, string | number> = {
      period: p,
      label: formatPeriodLabel(p),
    };

    if (hasValueSales) {
      const totalVal = pRows.reduce((acc, r) => acc + (r.valueSales ?? 0), 0);
      monthlyWeights.set(p, totalVal);
      for (const b of brands) {
        const bVal = pRows
          .filter((r) => r.brandGroup === b)
          .reduce((acc, r) => acc + (r.valueSales ?? 0), 0);
        point[b] = totalVal > 0 ? (bVal / totalVal) * 100 : 0;
      }
      return point;
    }

    const totalSov = pRows.reduce((acc, r) => acc + r.sov, 0);
    const totalMsu = pRows.reduce((acc, r) => acc + r.volConvertido, 0);
    monthlyWeights.set(p, totalMsu > 0 ? totalMsu : totalSov);

    if (totalSov > 0) {
      const denom = rebaseTo100 || Math.abs(totalSov - 100) > 2 ? totalSov : 100;
      for (const b of brands) {
        const bSov = pRows
          .filter((r) => r.brandGroup === b)
          .reduce((acc, r) => acc + r.sov, 0);
        point[b] = denom > 0 ? (bSov / denom) * 100 : 0;
      }
    } else if (totalMsu > 0) {
      // Fallback to MSU share if SOV column wasn't provided
      for (const b of brands) {
        const bMsu = pRows
          .filter((r) => r.brandGroup === b)
          .reduce((acc, r) => acc + r.volConvertido, 0);
        point[b] = (bMsu / totalMsu) * 100;
      }
    } else {
      for (const b of brands) point[b] = 0;
    }

    return point;
  });

  return { chartData, brands, monthlyWeights };
}

export function computeBrandComparisonTable(
  sliceRows: ScentiaRow[],
  periods: string[],
  category: CategoryType | 'All',
  rebaseTo100 = true
): BrandShareComparisonRow[] {
  const focusOrder = category === 'Toallitas Húmedas' ? [] : DIAPER_FOCUS_BRANDS;
  const { chartData, brands } = computeBrandShareSeries(sliceRows, periods, focusOrder, rebaseTo100);

  if (chartData.length === 0) return [];
  const latest = chartData[chartData.length - 1];
  const latestPeriod = String(latest.period);

  const p3mSlice = chartData.slice(Math.max(0, chartData.length - 4), chartData.length - 1);
  const p6mSlice = chartData.slice(Math.max(0, chartData.length - 7), chartData.length - 1);

  const latestRows = sliceRows.filter((r) => r.period === latestPeriod);
  const totalLatestSom = latestRows.reduce((acc, r) => acc + r.som, 0);

  const rawList = brands.map((brand, idx) => {
    const pmSov = Number(latest[brand] ?? 0);
    const p3mSov =
      p3mSlice.length > 0
        ? p3mSlice.reduce((acc, pt) => acc + Number(pt[brand] ?? 0), 0) / p3mSlice.length
        : null;
    const p6mSov =
      p6mSlice.length > 0
        ? p6mSlice.reduce((acc, pt) => acc + Number(pt[brand] ?? 0), 0) / p6mSlice.length
        : null;

    const brandLatestRows = latestRows.filter((r) => r.brandGroup === brand);
    const msus = brandLatestRows.reduce((acc, r) => acc + r.volConvertido, 0);
    const bSom = brandLatestRows.reduce((acc, r) => acc + r.som, 0);
    const pmSom = totalLatestSom > 0 ? (bSom / totalLatestSom) * 100 : undefined;

    return {
      rank: 0,
      brand,
      color: getBrandColor(brand, idx),
      pmSov,
      p3mSov,
      p6mSov,
      vsP3Mpp: p3mSov !== null ? pmSov - p3mSov : null,
      vsP6Mpp: p6mSov !== null ? pmSov - p6mSov : null,
      pmSom,
      msus,
    };
  });

  // Sort by PM Value Share descending to assign #1, #2, #3 leadership ranking
  rawList.sort((a, b) => b.pmSov - a.pmSov);
  return rawList.map((row, idx) => ({ ...row, rank: idx + 1 }));
}

export function computeCytdFytdTable(
  sliceRows: ScentiaRow[],
  allPeriods: string[],
  category: CategoryType | 'All',
  fiscalStartMonth = 7, // July = P&G standard Fiscal Year start
  rebaseTo100 = true
): {
  rows: BrandCytdFytdRow[];
  cytdLabel: string;
  fytdLabel: string;
} {
  if (allPeriods.length === 0) {
    return { rows: [], cytdLabel: '-', fytdLabel: '-' };
  }

  const latestPeriod = allPeriods[allPeriods.length - 1];
  const [latestYStr, latestMStr] = latestPeriod.split('-');
  const latestY = parseInt(latestYStr, 10);
  const latestM = parseInt(latestMStr, 10);

  // CYTD: Jan..latestM of latestY
  const cytdStart = `${latestY}-01`;
  const cytdPeriods = allPeriods.filter((p) => p >= cytdStart && p <= latestPeriod);

  // FYTD: fiscalStartMonth..latestPeriod
  const fyStartYear = latestM >= fiscalStartMonth ? latestY : latestY - 1;
  const fytdStart = `${fyStartYear}-${String(fiscalStartMonth).padStart(2, '0')}`;
  const fytdPeriods = allPeriods.filter((p) => p >= fytdStart && p <= latestPeriod);

  const focusOrder = category === 'Toallitas Húmedas' ? [] : DIAPER_FOCUS_BRANDS;
  const { chartData, brands, monthlyWeights } = computeBrandShareSeries(
    sliceRows,
    allPeriods,
    focusOrder,
    rebaseTo100
  );

  const chartByPeriod = new Map(chartData.map((d) => [String(d.period), d]));

  const calcWeighted = (brand: string, targetPeriods: string[]): number | null => {
    if (targetPeriods.length === 0) return null;
    let sumWeighted = 0;
    let sumW = 0;
    for (const p of targetPeriods) {
      const point = chartByPeriod.get(p);
      if (!point) continue;
      const sovVal = Number(point[brand] ?? 0);
      const w = monthlyWeights.get(p) ?? 1;
      const effectiveW = w > 0 ? w : 1;
      sumWeighted += sovVal * effectiveW;
      sumW += effectiveW;
    }
    return sumW > 0 ? sumWeighted / sumW : null;
  };

  const rows: BrandCytdFytdRow[] = brands.map((brand, idx) => {
    const cytd = calcWeighted(brand, cytdPeriods);
    const fytd = calcWeighted(brand, fytdPeriods);
    return {
      rank: 0,
      brand,
      color: getBrandColor(brand, idx),
      cytdWeightedSov: cytd,
      fytdWeightedSov: fytd,
      diffCytdVsFytdPp: cytd !== null && fytd !== null ? cytd - fytd : null,
      cytdMonthsCount: cytdPeriods.length,
      fytdMonthsCount: fytdPeriods.length,
    };
  });

  rows.sort((a, b) => (b.fytdWeightedSov ?? 0) - (a.fytdWeightedSov ?? 0));
  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));

  const cytdLabel =
    cytdPeriods.length > 0
      ? `${formatPeriodLabel(cytdPeriods[0])} – ${formatPeriodLabel(cytdPeriods[cytdPeriods.length - 1])}`
      : '-';
  const fytdLabel =
    fytdPeriods.length > 0
      ? `${formatPeriodLabel(fytdPeriods[0])} – ${formatPeriodLabel(fytdPeriods[fytdPeriods.length - 1])}`
      : '-';

  return { rows: ranked, cytdLabel, fytdLabel };
}

export function getChannelSliceAnalytics(
  allRows: ScentiaRow[],
  periods: string[],
  channel: Exclude<ChannelKey, 'Otros'>,
  category: CategoryType | 'All',
  rebaseTo100 = true
) {
  const filtered = allRows.filter(
    (r) => r.channelGroup === channel && (category === 'All' || r.category === category)
  );
  const focusOrder = category === 'Toallitas Húmedas' ? [] : DIAPER_FOCUS_BRANDS;
  const { chartData, brands } = computeBrandShareSeries(filtered, periods, focusOrder, rebaseTo100);
  const leadership = computeBrandComparisonTable(filtered, periods, category, rebaseTo100);
  const totalMsus = filtered
    .filter((r) => r.period === periods[periods.length - 1])
    .reduce((acc, r) => acc + r.volConvertido, 0);

  return { chartData, brands, leadership, totalMsus };
}

export function getTierLeadership(
  allRows: ScentiaRow[],
  periods: string[],
  tier: TierKey,
  rebaseTo100 = true
) {
  const filtered = allRows.filter((r) => r.tier === tier);
  const category: CategoryType | 'All' = tier === 'Wipes' ? 'Toallitas Húmedas' : 'Pañales';
  let leadership = computeBrandComparisonTable(filtered, periods, category, rebaseTo100);

  if (tier === 'Wipes' && leadership.length > 10) {
    const isOtherBucket = (name: string) => {
      const n = name.trim().toLowerCase();
      return n === 'otras marcas' || n === 'otros' || n === 'other';
    };

    const namedBrands = leadership.filter((r) => !isOtherBucket(r.brand));
    const existingOthers = leadership.filter((r) => isOtherBucket(r.brand));

    const top10 = namedBrands.slice(0, 10).map((row, idx) => ({
      ...row,
      rank: idx + 1,
    }));
    const remainder = [...namedBrands.slice(10), ...existingOthers];

    if (remainder.length > 0) {
      const pmSov = remainder.reduce((acc, r) => acc + r.pmSov, 0);
      const hasP3m = remainder.some((r) => r.p3mSov !== null);
      const hasP6m = remainder.some((r) => r.p6mSov !== null);
      const p3mSov = hasP3m
        ? remainder.reduce((acc, r) => acc + (r.p3mSov ?? 0), 0)
        : null;
      const p6mSov = hasP6m
        ? remainder.reduce((acc, r) => acc + (r.p6mSov ?? 0), 0)
        : null;
      const msus = remainder.reduce((acc, r) => acc + (r.msus ?? 0), 0);
      const pmSom = remainder.some((r) => r.pmSom !== undefined)
        ? remainder.reduce((acc, r) => acc + (r.pmSom ?? 0), 0)
        : undefined;

      leadership = [
        ...top10,
        {
          rank: top10.length + 1,
          brand: 'Otras marcas',
          color: '#94A3B8',
          pmSov,
          p3mSov,
          p6mSov,
          vsP3Mpp: p3mSov !== null ? pmSov - p3mSov : null,
          vsP6Mpp: p6mSov !== null ? pmSov - p6mSov : null,
          pmSom,
          msus,
        },
      ];
    } else {
      leadership = top10;
    }
  }

  const latestPeriod = periods[periods.length - 1];
  const pmMsus = filtered
    .filter((r) => r.period === latestPeriod)
    .reduce((acc, r) => acc + r.volConvertido, 0);

  return { leadership, pmMsus, rowCount: filtered.length };
}

export function formatNumberCompact(val: number): string {
  if (!Number.isFinite(val)) return '0';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${(val / 1_000).toFixed(1)}K`;
  }
  if (abs >= 100) {
    return Math.abs(val % 1) < 0.05 ? val.toFixed(0) : val.toFixed(1);
  }
  if (abs >= 10) {
    return Math.abs(val % 1) < 0.05 ? val.toFixed(0) : val.toFixed(1);
  }
  if (abs > 0) {
    return Math.abs(val % 1) < 0.005 ? val.toFixed(0) : val.toFixed(2);
  }
  return '0';
}

export function formatSignedPct(val: number | null, suffix = '%'): string {
  if (val === null || !Number.isFinite(val)) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}${suffix}`;
}

export function formatSignedPp(val: number | null): string {
  if (val === null || !Number.isFinite(val)) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)} pp`;
}

export function exportAnalyticsToCsv(rows: ScentiaRow[], filename = 'pampers_scentia_procesado.csv') {
  const header = [
    'Periodo',
    'Categoria',
    'Fabricante',
    'Brand_Original',
    'Brand_Agrupada',
    'Subbrand',
    'Tier',
    'Canal_Original',
    'Canal_Agrupado',
    'Volumen_Unidades',
    'Vol_Convertido_MSU',
    'SOM_Pct',
    'SOV_Pct',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.period,
        `"${r.category}"`,
        `"${r.manufacturer}"`,
        `"${r.brandRaw}"`,
        `"${r.brandGroup}"`,
        `"${r.subbrand}"`,
        `"${r.tier}"`,
        `"${r.channelRaw}"`,
        `"${r.channelGroup}"`,
        r.volumen.toFixed(2),
        r.volConvertido.toFixed(2),
        r.som.toFixed(3),
        r.sov.toFixed(3),
      ].join(',')
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { PRIMARY_CHANNELS };
