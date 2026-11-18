import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  computeBrandComparisonTable,
  computeBrandShareSeries,
  computeCytdFytdTable,
} from '../lib/analytics';
import { DIAPER_FOCUS_BRANDS, getBrandColor } from '../lib/mappings';
import { CategoryType, ScentiaRow } from '../types/scentia';
import { DeltaText } from './DeltaText';
import { PresentationCard } from './PresentationCard';

interface SectionShareOfValueProps {
  allRows: ScentiaRow[];
  windowRows: ScentiaRow[];
  allPeriods: string[];
  windowPeriods: string[];
  fiscalStartMonth: number;
  rebaseTo100: boolean;
}

export function SectionShareOfValue({
  allRows,
  windowRows,
  allPeriods,
  windowPeriods,
  fiscalStartMonth,
  rebaseTo100,
}: SectionShareOfValueProps) {
  const [categoryScope, setCategoryScope] = useState<CategoryType>('Pañales');

  const scopedWindow = windowRows.filter((r) => r.category === categoryScope);
  const scopedAll = allRows.filter((r) => r.category === categoryScope);

  const focusOrder = categoryScope === 'Pañales' ? DIAPER_FOCUS_BRANDS : [];
  const { chartData, brands } = computeBrandShareSeries(
    scopedWindow,
    windowPeriods,
    focusOrder,
    rebaseTo100
  );

  const comparisonRows = computeBrandComparisonTable(
    scopedWindow,
    windowPeriods,
    categoryScope,
    rebaseTo100
  );

  const { rows: cytdFytdRows, cytdLabel, fytdLabel } = computeCytdFytdTable(
    scopedAll,
    allPeriods,
    categoryScope,
    fiscalStartMonth,
    rebaseTo100
  );

  const latestLabel = chartData.length > 0 ? String(chartData[chartData.length - 1].label) : '-';
  const scopeSlug = categoryScope === 'Pañales' ? 'panales' : 'toallitas';

  const pampersRow = comparisonRows.find((r) => r.brand === 'Pampers');
  const leaderRow = comparisonRows[0];
  const pampersCytdRow = cytdFytdRows.find((r) => r.brand === 'Pampers');

  return (
    <section id="value-share" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B3B60] text-balance">
            B. Share of Value (SOV)
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Evolución mensual de participación en valor, comparativo móvil (PM, P3M, P6M) y acumulados ponderados CYTD / FYTD.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          {(['Pañales', 'Toallitas Húmedas'] as CategoryType[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryScope(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryScope === cat
                  ? 'bg-white text-[#0B3B60] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Value Share-only 4-card summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="text-xs text-slate-500">
            Value Share Pampers ({categoryScope}) · {latestLabel}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-2xl font-bold text-[#0099A8]">
              {pampersRow ? `${pampersRow.pmSov.toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs text-slate-400">
              {pampersRow ? `Pos #${pampersRow.rank}` : ''}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">vs P3M</span>
            <DeltaText value={pampersRow?.vsP3Mpp ?? null} unit="pp" compact />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="text-xs text-slate-500">
            Líder #1 ({categoryScope}) · {latestLabel}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-2xl font-bold text-[#0B3B60]">
              {leaderRow ? `${leaderRow.pmSov.toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]">
              {leaderRow?.brand ?? '—'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">vs P3M</span>
            <DeltaText value={leaderRow?.vsP3Mpp ?? null} unit="pp" compact />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="text-xs text-slate-500">
            Pampers CYTD Pond. ({cytdLabel})
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-2xl font-bold text-slate-900">
              {pampersCytdRow?.cytdWeightedSov !== null && pampersCytdRow?.cytdWeightedSov !== undefined
                ? `${pampersCytdRow.cytdWeightedSov.toFixed(1)}%`
                : '—'}
            </span>
            <span className="text-xs text-slate-400">
              {pampersCytdRow ? `${pampersCytdRow.cytdMonthsCount}m` : ''}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">CYTD vs FYTD</span>
            <DeltaText value={pampersCytdRow?.diffCytdVsFytdPp ?? null} unit="pp" compact />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="text-xs text-slate-500">
            Pampers FYTD Pond. ({fytdLabel})
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-2xl font-bold text-[#0B3B60]">
              {pampersCytdRow?.fytdWeightedSov !== null && pampersCytdRow?.fytdWeightedSov !== undefined
                ? `${pampersCytdRow.fytdWeightedSov.toFixed(1)}%`
                : '—'}
            </span>
            <span className="text-xs text-slate-400">
              {pampersCytdRow ? `${pampersCytdRow.fytdMonthsCount}m` : ''}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">vs P6M</span>
            <DeltaText value={pampersRow?.vsP6Mpp ?? null} unit="pp" compact />
          </div>
        </div>
      </div>

      {/* 1. Monthly Value Share Evolution Chart */}
      <PresentationCard
        cardId={`sov-evolucion-${scopeSlug}`}
        defaultTitle={`1. Evolución Mensual de Value Share — ${categoryScope}`}
        defaultSubtitle={
          categoryScope === 'Pañales'
            ? 'Foco: Pampers, Kimberly Clark, BabySec, Estrella, Duffy y M.Propias'
            : 'Todos los players activos en Toallitas Húmedas'
        }
        rightSlot={<div className="text-xs text-slate-500 pt-1">Último mes: {latestLabel}</div>}
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [
                  `${Number(value).toFixed(2)}%`,
                  String(name),
                ]}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
              {brands.map((brand, idx) => (
                <Line
                  key={brand}
                  type="monotone"
                  dataKey={brand}
                  stroke={getBrandColor(brand, idx)}
                  strokeWidth={brand === 'Pampers' ? 3 : 2}
                  dot={false}
                  activeDot={{ r: 4.5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </PresentationCard>

      {/* 2 & 3. Comparative Tables Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 2. PM, vs P3M, vs P6M */}
        <PresentationCard
          cardId={`sov-comparativo-pm-p3m-p6m-${scopeSlug}`}
          defaultTitle="2. Cuadro Comparativo — PM vs P3M y P6M"
          defaultSubtitle={`Share of Value del último mes (${latestLabel}) y variación en puntos porcentuales (pp)`}
          className="lg:col-span-7"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-4">Marca</th>
                  <th className="py-2 px-3 text-right">PM ({latestLabel})</th>
                  <th className="py-2 px-3 text-right">P3M Prom.</th>
                  <th className="py-2 px-3 text-right">vs P3M</th>
                  <th className="py-2 px-3 text-right">P6M Prom.</th>
                  <th className="py-2 pl-3 text-right">vs P6M</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonRows.map((row) => (
                  <tr key={row.brand} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pr-3 font-mono-num text-xs text-slate-500">
                      #{row.rank}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-1 rounded-xs shrink-0"
                          style={{ backgroundColor: row.color }}
                          aria-hidden="true"
                        />
                        <span>{row.brand}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                      {row.pmSov.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-slate-600">
                      {row.p3mSov !== null ? `${row.p3mSov.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <DeltaText value={row.vsP3Mpp} unit="pp" compact />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-slate-600">
                      {row.p6mSov !== null ? `${row.p6mSov.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <DeltaText value={row.vsP6Mpp} unit="pp" compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PresentationCard>

        {/* 3. Weighted CYTD & FYTD */}
        <PresentationCard
          cardId={`sov-cytd-fytd-${scopeSlug}`}
          defaultTitle="3. Ponderación CYTD & FYTD"
          defaultSubtitle={`CYTD (${cytdLabel}) · FYTD (${fytdLabel})`}
          className="lg:col-span-5"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2 pr-3">Marca</th>
                  <th className="py-2 px-3 text-right">CYTD Pond.</th>
                  <th className="py-2 px-3 text-right">FYTD Pond.</th>
                  <th className="py-2 pl-3 text-right">CYTD vs FYTD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cytdFytdRows.map((row) => (
                  <tr key={row.brand} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pr-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-1 rounded-xs shrink-0"
                          style={{ backgroundColor: row.color }}
                          aria-hidden="true"
                        />
                        <span>{row.brand}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                      {row.cytdWeightedSov !== null ? `${row.cytdWeightedSov.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-[#0B3B60]">
                      {row.fytdWeightedSov !== null ? `${row.fytdWeightedSov.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <DeltaText value={row.diffCytdVsFytdPp} unit="pp" compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PresentationCard>
      </div>
    </section>
  );
}
