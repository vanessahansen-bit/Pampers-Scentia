import {
  DIAPER_FOCUS_BRANDS,
  PRIMARY_CHANNELS,
  formatPeriodLabel,
  getBrandColor,
  normalizeText,
} from './mappings';
import { CategoryType, ScentiaRow } from '../types/scentia';

export interface SubbrandDriver {
  brand: string;
  brandColor: string;
  subbrand: string;
  pmSov: number;
  prevSov: number;
  deltaPp: number;
  pmMsus: number;
}

export interface ChannelBrandSummary {
  rank: number;
  brand: string;
  color: string;
  pmSov: number;
  prevSov: number;
  deltaPp: number;
  topDrivers: SubbrandDriver[];
  topMotor: SubbrandDriver | null;
  topRetractor: SubbrandDriver | null;
  motors: SubbrandDriver[];
  retractors: SubbrandDriver[];
}

export interface ChannelStructuredBullet {
  brand: string;
  color: string;
  rank: number;
  pmSov: number;
  deltaPp: number;
  motors: SubbrandDriver[];
  retractors: SubbrandDriver[];
}

export interface ChannelNarrativeBlock {
  channelKey: string;
  channelTitle: string;
  channelDescription: string;
  totalPmMsus: number;
  brands: ChannelBrandSummary[];
  allSubbrandDrivers: SubbrandDriver[];
  narrativeBullets: string[];
  structuredBullets: ChannelStructuredBullet[];
}

export interface BrandChannelMove {
  brand: string;
  brandColor: string;
  channelKey: string;
  channelTitle: string;
  pmSov: number;
  prevSov: number;
  deltaPp: number;
  mainDriver: SubbrandDriver | null;
}

export interface MatrixRow {
  brand: string;
  color: string;
  totalCountry: { pmSov: number; prevSov: number; deltaPp: number };
  byChannel: Record<string, { pmSov: number; prevSov: number; deltaPp: number }>;
}

export interface ConsolidatedMonthlySummary {
  targetPeriod: string;
  targetLabel: string;
  prevPeriod: string | null;
  prevLabel: string | null;
  category: CategoryType;
  channelList: { key: string; title: string; description: string }[];
  totalCountryBrands: ChannelBrandSummary[];
  totalCountryDrivers: SubbrandDriver[];
  topGains: BrandChannelMove[];
  topDrops: BrandChannelMove[];
  matrixRows: MatrixRow[];
  channels: ChannelNarrativeBlock[];
}

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b([a-záéíóúñü])/gi, (m) => m.toUpperCase())
    .replace(/\bP&g\b/gi, 'P&G')
    .replace(/\bS\.?\b/gi, (m) => m.toUpperCase());
}

const CORE_DIAPER_BRANDS = DIAPER_FOCUS_BRANDS.filter((b) => b !== 'M.Propias');

function resolveSummaryBrand(row: ScentiaRow): string {
  if (row.brandGroup !== 'M.Propias') {
    return row.brandGroup;
  }
  const rawNorm = normalizeText(row.brandRaw || row.subbrand || '');
  if (
    !rawNorm ||
    rawNorm.includes('marca propia') ||
    rawNorm.includes('marcas propias') ||
    rawNorm === 'm propia' ||
    rawNorm === 'm propias' ||
    rawNorm.includes('private label')
  ) {
    return 'M.Propias';
  }
  return toTitleCase(row.brandRaw.trim());
}

function getChannelBucket(
  row: ScentiaRow,
  detailedEcomm: boolean
): { key: string; title: string; description: string } {
  if (!detailedEcomm) {
    const descMap: Record<string, string> = {
      RDs: 'Almacenes y kioscos + Self Independientes',
      DPP: 'Farmacias',
      WHS: 'Mayoristas - CF',
      HSM: 'Self Cadenas',
      ECOMM: 'Pedidos Ya + Rappi',
      Otros: 'Otros canales',
    };
    return {
      key: row.channelGroup,
      title: row.channelGroup,
      description: descMap[row.channelGroup] ?? row.channelRaw,
    };
  }

  const rawNorm = normalizeText(row.channelRaw);
  if (rawNorm.includes('pedidos ya') || rawNorm.includes('pedidosya')) {
    return { key: 'Pedidos Ya', title: 'Pedidos Ya', description: 'Quick-Commerce · Pedidos Ya' };
  }
  if (rawNorm.includes('rappi')) {
    return { key: 'Rappi', title: 'Rappi', description: 'Quick-Commerce · Rappi' };
  }
  if (row.channelGroup === 'HSM') {
    return { key: 'HSM', title: 'HSM', description: 'Self Cadenas (Hiper & Supermercados)' };
  }
  if (row.channelGroup === 'DPP') {
    return { key: 'Farmacias', title: 'Farmacias (DPP)', description: 'Farmacias y Perfumerías' };
  }
  if (row.channelGroup === 'WHS') {
    return { key: 'Mayoristas', title: 'Mayoristas (WHS)', description: 'Mayoristas - CF' };
  }
  if (row.channelGroup === 'RDs') {
    return {
      key: 'RDs',
      title: 'RDs / HFS',
      description: 'Almacenes y kioscos + Self Independientes',
    };
  }
  return { key: 'Otros', title: 'Otros', description: row.channelRaw };
}

function computeSliceShares(
  targetRows: ScentiaRow[],
  prevRows: ScentiaRow[],
  category: CategoryType,
  rebaseTo100: boolean
): {
  brands: ChannelBrandSummary[];
  drivers: SubbrandDriver[];
  totalPmMsus: number;
} {
  const hasValTarget = targetRows.some((r) => (r.valueSales ?? 0) > 0);
  const hasValPrev = prevRows.some((r) => (r.valueSales ?? 0) > 0);
  const useVal = hasValTarget && (prevRows.length === 0 || hasValPrev);

  const getWeight = (r: ScentiaRow) =>
    useVal ? (r.valueSales ?? 0) : r.sov > 0 ? r.sov : r.volConvertido;

  const targetTotal = targetRows.reduce((acc, r) => acc + getWeight(r), 0);
  const prevTotal = prevRows.reduce((acc, r) => acc + getWeight(r), 0);

  const targetDenom =
    useVal || rebaseTo100 || Math.abs(targetTotal - 100) > 2 ? targetTotal : 100;
  const prevDenom =
    useVal || rebaseTo100 || Math.abs(prevTotal - 100) > 2 ? prevTotal : 100;

  const targetBrandMap = new Map<string, number>();
  const prevBrandMap = new Map<string, number>();
  const subbrandTargetMap = new Map<string, { brand: string; sub: string; w: number; msu: number }>();
  const subbrandPrevMap = new Map<string, { brand: string; sub: string; w: number }>();

  for (const r of targetRows) {
    const w = getWeight(r);
    const brandName = resolveSummaryBrand(r);
    targetBrandMap.set(brandName, (targetBrandMap.get(brandName) ?? 0) + w);
    const subLabel = toTitleCase(r.subbrand || r.brandRaw || 'General');
    const subKey = `${brandName}||${subLabel}`;
    const existing = subbrandTargetMap.get(subKey);
    if (existing) {
      existing.w += w;
      existing.msu += r.volConvertido;
    } else {
      subbrandTargetMap.set(subKey, {
        brand: brandName,
        sub: subLabel,
        w,
        msu: r.volConvertido,
      });
    }
  }

  for (const r of prevRows) {
    const w = getWeight(r);
    const brandName = resolveSummaryBrand(r);
    prevBrandMap.set(brandName, (prevBrandMap.get(brandName) ?? 0) + w);
    const subLabel = toTitleCase(r.subbrand || r.brandRaw || 'General');
    const subKey = `${brandName}||${subLabel}`;
    const existing = subbrandPrevMap.get(subKey);
    if (existing) {
      existing.w += w;
    } else {
      subbrandPrevMap.set(subKey, { brand: brandName, sub: subLabel, w });
    }
  }

  const allBrandSet = new Set<string>([
    ...targetBrandMap.keys(),
    ...prevBrandMap.keys(),
    ...(category === 'Pañales' ? CORE_DIAPER_BRANDS : []),
  ]);

  const allSubKeys = new Set<string>([
    ...subbrandTargetMap.keys(),
    ...subbrandPrevMap.keys(),
  ]);

  const drivers: SubbrandDriver[] = [];
  for (const subKey of allSubKeys) {
    const tEntry = subbrandTargetMap.get(subKey);
    const pEntry = subbrandPrevMap.get(subKey);
    const brand = tEntry?.brand ?? pEntry?.brand ?? '';
    const subbrand = tEntry?.sub ?? pEntry?.sub ?? '';
    const pmSov = targetDenom > 0 && tEntry ? (tEntry.w / targetDenom) * 100 : 0;
    const prevSov = prevDenom > 0 && pEntry ? (pEntry.w / prevDenom) * 100 : 0;
    const deltaPp = prevRows.length > 0 ? pmSov - prevSov : 0;
    if (pmSov < 0.01 && prevSov < 0.01) continue;
    drivers.push({
      brand,
      brandColor: getBrandColor(brand),
      subbrand,
      pmSov,
      prevSov,
      deltaPp,
      pmMsus: tEntry?.msu ?? 0,
    });
  }

  drivers.sort((a, b) => Math.abs(b.deltaPp) - Math.abs(a.deltaPp) || b.pmSov - a.pmSov);

  const brandList: ChannelBrandSummary[] = Array.from(allBrandSet)
    .map((brand, idx) => {
      const pmSov = targetDenom > 0 ? ((targetBrandMap.get(brand) ?? 0) / targetDenom) * 100 : 0;
      const prevSov = prevDenom > 0 ? ((prevBrandMap.get(brand) ?? 0) / prevDenom) * 100 : 0;
      const brandDrivers = drivers
        .filter((d) => d.brand === brand)
        .sort((a, b) => Math.abs(b.deltaPp) - Math.abs(a.deltaPp) || b.pmSov - a.pmSov);

      const motors = brandDrivers
        .filter((d) => d.deltaPp >= 0.1)
        .sort((a, b) => b.deltaPp - a.deltaPp)
        .slice(0, 4);
      const retractors = brandDrivers
        .filter((d) => d.deltaPp <= -0.1)
        .sort((a, b) => a.deltaPp - b.deltaPp)
        .slice(0, 4);

      const topMotor =
        motors[0] ??
        brandDrivers.filter((d) => d.deltaPp >= 0.05).sort((a, b) => b.deltaPp - a.deltaPp)[0] ??
        null;
      const topRetractor =
        retractors[0] ??
        brandDrivers.filter((d) => d.deltaPp <= -0.05).sort((a, b) => a.deltaPp - b.deltaPp)[0] ??
        null;

      return {
        rank: 0,
        brand,
        color: getBrandColor(brand, idx),
        pmSov,
        prevSov,
        deltaPp: prevRows.length > 0 ? pmSov - prevSov : 0,
        topDrivers: brandDrivers,
        topMotor,
        topRetractor,
        motors,
        retractors,
      };
    })
    .filter(
      (b) =>
        (category === 'Pañales' && CORE_DIAPER_BRANDS.includes(b.brand as typeof CORE_DIAPER_BRANDS[number])) ||
        b.pmSov > 0.05 ||
        b.prevSov > 0.05
    )
    .sort((a, b) => b.pmSov - a.pmSov)
    .map((b, idx) => ({ ...b, rank: idx + 1 }));

  const totalPmMsus = targetRows.reduce((acc, r) => acc + r.volConvertido, 0);

  return { brands: brandList, drivers, totalPmMsus };
}

function buildStructuredBullets(
  brands: ChannelBrandSummary[],
  hasPrev: boolean
): { narrativeBullets: string[]; structuredBullets: ChannelStructuredBullet[] } {
  if (!hasPrev || brands.length === 0) {
    return { narrativeBullets: [], structuredBullets: [] };
  }

  const fmtSign = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} pp`;

  // Strictly ordered by leadership rank (#1, #2, #3...)
  const picked = brands
    .filter((b, idx) => idx < 6 || b.brand === 'Pampers' || Math.abs(b.deltaPp) >= 0.3)
    .filter((b) => b.pmSov >= 0.1 || Math.abs(b.deltaPp) >= 0.1)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 6);

  const structuredBullets: ChannelStructuredBullet[] = [];
  const narrativeBullets: string[] = [];

  for (const b of picked) {
    const motors = b.topDrivers
      .filter((d) => d.deltaPp >= 0.1)
      .sort((a, b2) => b2.deltaPp - a.deltaPp)
      .slice(0, 2);
    const retractors = b.topDrivers
      .filter((d) => d.deltaPp <= -0.1)
      .sort((a, b2) => a.deltaPp - b2.deltaPp)
      .slice(0, 2);

    structuredBullets.push({
      brand: b.brand,
      color: b.color,
      rank: b.rank,
      pmSov: b.pmSov,
      deltaPp: b.deltaPp,
      motors,
      retractors,
    });

    const parts = [`#${b.rank} ${b.brand} (${b.pmSov.toFixed(1)}%, ${fmtSign(b.deltaPp)})`];
    if (motors.length > 0) {
      parts.push(
        `Motor: ${motors.map((d) => `${d.subbrand} (${fmtSign(d.deltaPp)})`).join(', ')}`
      );
    }
    if (retractors.length > 0) {
      parts.push(
        `Retractor: ${retractors.map((d) => `${d.subbrand} (${fmtSign(d.deltaPp)})`).join(', ')}`
      );
    }
    narrativeBullets.push(parts.join(' · '));
  }

  return { narrativeBullets, structuredBullets };
}

export function computeConsolidatedMonthlySummary(
  allRows: ScentiaRow[],
  periods: string[],
  targetPeriod: string,
  category: CategoryType,
  detailedEcomm = false,
  rebaseTo100 = true
): ConsolidatedMonthlySummary {
  const sortedPeriods = [...periods].sort();
  const targetIdx = sortedPeriods.indexOf(targetPeriod);
  const resolvedTarget =
    targetIdx >= 0 ? targetPeriod : sortedPeriods[sortedPeriods.length - 1] ?? '';
  const prevPeriod =
    targetIdx > 0
      ? sortedPeriods[targetIdx - 1]
      : targetIdx === -1 && sortedPeriods.length >= 2
        ? sortedPeriods[sortedPeriods.length - 2]
        : null;

  const scopedRows = allRows.filter((r) => r.category === category);
  const targetRows = scopedRows.filter((r) => r.period === resolvedTarget);
  const prevRows = prevPeriod ? scopedRows.filter((r) => r.period === prevPeriod) : [];

  const totalCountry = computeSliceShares(targetRows, prevRows, category, rebaseTo100);

  const channelList = detailedEcomm
    ? [
        { key: 'HSM', title: 'HSM', description: 'Self Cadenas (Hiper & Supermercados)' },
        { key: 'Farmacias', title: 'Farmacias (DPP)', description: 'Farmacias y Perfumerías' },
        { key: 'Mayoristas', title: 'Mayoristas (WHS)', description: 'Mayoristas - CF' },
        { key: 'RDs', title: 'RDs / HFS', description: 'Almacenes y kioscos + Self Independientes' },
        { key: 'Rappi', title: 'Rappi', description: 'Quick-Commerce · Rappi' },
        { key: 'Pedidos Ya', title: 'Pedidos Ya', description: 'Quick-Commerce · Pedidos Ya' },
      ]
    : PRIMARY_CHANNELS.map((ch) => ({
        key: ch,
        title: ch,
        description:
          ch === 'RDs'
            ? 'Almacenes y kioscos + Self Independientes'
            : ch === 'DPP'
              ? 'Farmacias'
              : ch === 'WHS'
                ? 'Mayoristas - CF'
                : ch === 'HSM'
                  ? 'Self Cadenas'
                  : 'Pedidos Ya + Rappi',
      }));

  const channels: ChannelNarrativeBlock[] = channelList.map((ch) => {
    const chTarget = targetRows.filter((r) => getChannelBucket(r, detailedEcomm).key === ch.key);
    const chPrev = prevRows.filter((r) => getChannelBucket(r, detailedEcomm).key === ch.key);
    const slice = computeSliceShares(chTarget, chPrev, category, rebaseTo100);
    const { narrativeBullets, structuredBullets } = buildStructuredBullets(
      slice.brands,
      prevRows.length > 0
    );
    return {
      channelKey: ch.key,
      channelTitle: ch.title,
      channelDescription: ch.description,
      totalPmMsus: slice.totalPmMsus,
      brands: slice.brands,
      allSubbrandDrivers: slice.drivers,
      narrativeBullets,
      structuredBullets,
    };
  });

  // Top 3 Gains & Top 3 Drops (Brand x Channel)
  const allMoves: BrandChannelMove[] = [];
  for (const ch of channels) {
    for (const b of ch.brands) {
      if (b.pmSov < 0.1 && b.prevSov < 0.1) continue;
      const sameSignDrivers = b.topDrivers.filter((d) =>
        b.deltaPp >= 0 ? d.deltaPp > 0 : d.deltaPp < 0
      );
      sameSignDrivers.sort((a, b2) =>
        b.deltaPp >= 0 ? b2.deltaPp - a.deltaPp : a.deltaPp - b2.deltaPp
      );
      allMoves.push({
        brand: b.brand,
        brandColor: b.color,
        channelKey: ch.channelKey,
        channelTitle: ch.channelTitle,
        pmSov: b.pmSov,
        prevSov: b.prevSov,
        deltaPp: b.deltaPp,
        mainDriver: sameSignDrivers[0] ?? b.topDrivers[0] ?? null,
      });
    }
  }

  const topGains = allMoves
    .filter((m) => m.deltaPp > 0.05)
    .sort((a, b) => b.deltaPp - a.deltaPp)
    .slice(0, 3);

  const topDrops = allMoves
    .filter((m) => m.deltaPp < -0.05)
    .sort((a, b) => a.deltaPp - b.deltaPp)
    .slice(0, 3);

  // Matrix rows: Top brands (Diaper focus + any Top-6 channel entrants; or Top 10 Wipes)
  const top6AnyChannel = new Set<string>();
  for (const ch of channels) {
    for (const b of ch.brands.slice(0, 6)) {
      top6AnyChannel.add(b.brand);
    }
  }

  const matrixBrands =
    category === 'Pañales'
      ? totalCountry.brands.filter(
          (b) =>
            CORE_DIAPER_BRANDS.includes(b.brand as typeof CORE_DIAPER_BRANDS[number]) ||
            b.rank <= 6 ||
            top6AnyChannel.has(b.brand)
        )
      : totalCountry.brands.slice(0, 10);

  const matrixRows: MatrixRow[] = matrixBrands.map((b) => {
    const byChannel: Record<string, { pmSov: number; prevSov: number; deltaPp: number }> = {};
    for (const ch of channels) {
      const hit = ch.brands.find((cb) => cb.brand === b.brand);
      byChannel[ch.channelKey] = hit
        ? { pmSov: hit.pmSov, prevSov: hit.prevSov, deltaPp: hit.deltaPp }
        : { pmSov: 0, prevSov: 0, deltaPp: 0 };
    }
    return {
      brand: b.brand,
      color: b.color,
      totalCountry: { pmSov: b.pmSov, prevSov: b.prevSov, deltaPp: b.deltaPp },
      byChannel,
    };
  });

  return {
    targetPeriod: resolvedTarget,
    targetLabel: resolvedTarget ? formatPeriodLabel(resolvedTarget) : '-',
    prevPeriod,
    prevLabel: prevPeriod ? formatPeriodLabel(prevPeriod) : null,
    category,
    channelList,
    totalCountryBrands: totalCountry.brands,
    totalCountryDrivers: totalCountry.drivers,
    topGains,
    topDrops,
    matrixRows,
    channels,
  };
}
