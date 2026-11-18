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
  computeConsumptionByChannelSeries,
  computeConsumptionSeries,
  computePeriodDeltaSummary,
  formatNumberCompact,
} from '../lib/analytics';
import { CHANNEL_COLORS, CHANNEL_DESCRIPTIONS, PRIMARY_CHANNELS } from '../lib/mappings';
import { PeriodDeltaSummary, ScentiaRow } from '../types/scentia';
import { DeltaText } from './DeltaText';
import { PresentationCard } from './PresentationCard';

interface SectionConsumoProps {
  rows: ScentiaRow[];
  periods: string[];
  metric: 'volConvertido' | 'volumen';
  onChangeMetric: (metric: 'volConvertido' | 'volumen') => void;
}

interface SingleSeriesMeta {
  cardId: string;
  tableCardId: string;
  title: string;
  subtitle: string;
  tableTitle: string;
  tableSubtitle: string;
  series: { period: string; label: string; value: number }[];
  summary: PeriodDeltaSummary;
  lineColor: string;
  metricUnit: string;
}

function SingleSeriesRow({ meta }: { meta: SingleSeriesMeta }) {
  const compareRows = [
    {
      periodLabel: `Último mes (${meta.summary.pmLabel})`,
      baseValue: meta.summary.pmValue,
      delta: null as number | null,
      isCurrent: true,
    },
    {
      periodLabel: meta.summary.prevLabel ? `vs PM (${meta.summary.prevLabel})` : 'vs PM',
      baseValue: meta.summary.prevValue,
      delta: meta.summary.vsPM,
      isCurrent: false,
    },
    {
      periodLabel: 'vs P3M (Prom. 3M)',
      baseValue: meta.summary.p3mAvg,
      delta: meta.summary.vsP3M,
      isCurrent: false,
    },
    {
      periodLabel: 'vs P6M (Prom. 6M)',
      baseValue: meta.summary.p6mAvg,
      delta: meta.summary.vsP6M,
      isCurrent: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left: Pure Monthly Evolution Chart */}
      <PresentationCard
        cardId={meta.cardId}
        defaultTitle={meta.title}
        defaultSubtitle={meta.subtitle}
        rightSlot={
          <div>
            <div className="font-mono-num text-lg font-semibold text-[#0B3B60]">
              {formatNumberCompact(meta.summary.pmValue)}
            </div>
            <div className="text-[11px] text-slate-500">
              {meta.metricUnit} · {meta.summary.pmLabel}
            </div>
          </div>
        }
        className="lg:col-span-7"
      >
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={meta.series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                tickFormatter={(v) => formatNumberCompact(Number(v))}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                formatter={(value: unknown) => [
                  `${Number(value).toLocaleString('es-AR', {
                    maximumFractionDigits: meta.metricUnit === 'MSUs' ? 2 : 0,
                  })} ${meta.metricUnit}`,
                  meta.title,
                ]}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={meta.lineColor}
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: meta.lineColor }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </PresentationCard>

      {/* Right: Separate Copyable Comparative Table (PM, vs P3M, vs P6M) */}
      <PresentationCard
        cardId={meta.tableCardId}
        defaultTitle={meta.tableTitle}
        defaultSubtitle={meta.tableSubtitle}
        className="lg:col-span-5"
      >
        <div className="overflow-x-auto flex-1 flex flex-col justify-center">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2 pr-3">Referencia</th>
                <th className="py-2 px-3 text-right">Volumen ({meta.metricUnit})</th>
                <th className="py-2 pl-3 text-right">Variación %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compareRows.map((row) => (
                <tr
                  key={row.periodLabel}
                  className={row.isCurrent ? 'bg-slate-50/70' : 'hover:bg-slate-50/60'}
                >
                  <td className="py-3 pr-3 font-medium text-slate-800">{row.periodLabel}</td>
                  <td className="py-3 px-3 text-right font-mono-num font-semibold text-slate-900">
                    {row.baseValue !== null ? formatNumberCompact(row.baseValue) : '—'}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    {row.isCurrent ? (
                      <span className="text-[11px] font-medium text-slate-400">Base PM</span>
                    ) : (
                      <DeltaText value={row.delta} compact />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PresentationCard>
    </div>
  );
}

function MultiChannelRow({
  chartCardId,
  tableCardId,
  title,
  subtitle,
  tableTitle,
  tableSubtitle,
  data,
  metricUnit,
}: {
  chartCardId: string;
  tableCardId: string;
  title: string;
  subtitle: string;
  tableTitle: string;
  tableSubtitle: string;
  data: Record<string, string | number>[];
  metricUnit: string;
}) {
  const latest = data[data.length - 1];
  const latestLabel = latest ? String(latest.label) : '-';

  const channelSummaries = PRIMARY_CHANNELS.map((ch) => {
    const channelSeries = data.map((pt) => ({
      period: String(pt.period),
      label: String(pt.label),
      value: Number(pt[ch] ?? 0),
    }));
    return {
      channel: ch,
      summary: computePeriodDeltaSummary(channelSeries),
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left: Pure Channel Evolution Chart */}
      <PresentationCard
        cardId={chartCardId}
        defaultTitle={title}
        defaultSubtitle={subtitle}
        rightSlot={
          latest ? (
            <div className="text-[11px] text-slate-500 pt-1">
              Último mes · {latestLabel}
            </div>
          ) : undefined
        }
        className="lg:col-span-7"
      >
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                tickFormatter={(v) => formatNumberCompact(Number(v))}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [
                  `${Number(value).toLocaleString('es-AR', {
                    maximumFractionDigits: metricUnit === 'MSUs' ? 2 : 0,
                  })} ${metricUnit}`,
                  String(name),
                ]}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              {PRIMARY_CHANNELS.map((ch) => (
                <Line
                  key={ch}
                  type="monotone"
                  dataKey={ch}
                  name={ch}
                  stroke={CHANNEL_COLORS[ch]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </PresentationCard>

      {/* Right: Separate Copyable Comparative Table by Channel (PM, vs PM, vs P3M, vs P6M) */}
      <PresentationCard
        cardId={tableCardId}
        defaultTitle={tableTitle}
        defaultSubtitle={tableSubtitle}
        className="lg:col-span-5"
      >
        <div className="overflow-x-auto flex-1 flex flex-col justify-center">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2 pr-2">Canal</th>
                <th className="py-2 px-2 text-right">PM ({latestLabel})</th>
                <th className="py-2 px-2 text-right">vs PM</th>
                <th className="py-2 px-2 text-right">vs P3M</th>
                <th className="py-2 pl-2 text-right">vs P6M</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {channelSummaries.map(({ channel, summary }) => (
                <tr key={channel} className="hover:bg-slate-50/70" title={CHANNEL_DESCRIPTIONS[channel]}>
                  <td className="py-2.5 pr-2 font-medium text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-1 rounded-xs shrink-0"
                        style={{ backgroundColor: CHANNEL_COLORS[channel] }}
                        aria-hidden="true"
                      />
                      <span>{channel}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono-num font-semibold text-slate-900">
                    {formatNumberCompact(summary.pmValue)}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <DeltaText value={summary.vsPM} compact />
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <DeltaText value={summary.vsP3M} compact />
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    <DeltaText value={summary.vsP6M} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PresentationCard>
    </div>
  );
}

export function SectionConsumo({
  rows,
  periods,
  metric,
  onChangeMetric,
}: SectionConsumoProps) {
  const metricUnit = metric === 'volConvertido' ? 'MSUs' : 'Unidades';
  const metricDesc =
    metric === 'volConvertido' ? 'Volumen Convertido (MSUs)' : 'Volumen físico (Unidades)';

  const diapersAll = rows.filter((r) => r.category === 'Pañales');
  const wipesAll = rows.filter((r) => r.category === 'Toallitas Húmedas');
  const diapersPG = diapersAll.filter((r) => r.isPG);
  const wipesPG = wipesAll.filter((r) => r.isPG);

  const s1 = computeConsumptionSeries(diapersAll, periods, metric);
  const s2 = computeConsumptionSeries(wipesAll, periods, metric);
  const s3 = computeConsumptionSeries(diapersPG, periods, metric);
  const s4 = computeConsumptionByChannelSeries(diapersPG, periods, metric);
  const s5 = computeConsumptionSeries(wipesPG, periods, metric);
  const s6 = computeConsumptionByChannelSeries(wipesPG, periods, metric);

  const sum1 = computePeriodDeltaSummary(s1);
  const sum2 = computePeriodDeltaSummary(s2);
  const sum3 = computePeriodDeltaSummary(s3);
  const sum5 = computePeriodDeltaSummary(s5);

  const card1: SingleSeriesMeta = {
    cardId: 'consumo-total-panales',
    tableCardId: 'consumo-tabla-total-panales',
    title: '1. Consumo Total Argentina — Pañales',
    subtitle: `Mercado total categoría Pañales · ${metricDesc}`,
    tableTitle: 'Comparativo Pañales Total País',
    tableSubtitle: `PM, vs P3M y vs P6M · ${metricUnit}`,
    series: s1,
    summary: sum1,
    lineColor: '#0B3B60',
    metricUnit,
  };

  const card2: SingleSeriesMeta = {
    cardId: 'consumo-total-toallitas',
    tableCardId: 'consumo-tabla-total-toallitas',
    title: '2. Consumo Total Argentina — Toallitas Húmedas',
    subtitle: `Mercado total categoría Toallitas · ${metricDesc}`,
    tableTitle: 'Comparativo Toallitas Total País',
    tableSubtitle: `PM, vs P3M y vs P6M · ${metricUnit}`,
    series: s2,
    summary: sum2,
    lineColor: '#0B3B60',
    metricUnit,
  };

  const card3: SingleSeriesMeta = {
    cardId: 'consumo-pg-panales',
    tableCardId: 'consumo-tabla-pg-panales',
    title: '3. Consumo Total Argentina — Pañales P&G',
    subtitle: `Pampers Pañales Total País · ${metricDesc}`,
    tableTitle: 'Comparativo Pañales P&G',
    tableSubtitle: `PM, vs P3M y vs P6M · ${metricUnit}`,
    series: s3,
    summary: sum3,
    lineColor: '#0099A8',
    metricUnit,
  };

  const card5: SingleSeriesMeta = {
    cardId: 'consumo-pg-toallitas',
    tableCardId: 'consumo-tabla-pg-toallitas',
    title: '5. Consumo Total Argentina — Toallitas Húmedas P&G',
    subtitle: `Pampers Toallitas Total País · ${metricDesc}`,
    tableTitle: 'Comparativo Toallitas P&G',
    tableSubtitle: `PM, vs P3M y vs P6M · ${metricUnit}`,
    series: s5,
    summary: sum5,
    lineColor: '#0099A8',
    metricUnit,
  };

  return (
    <section id="consumo" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B3B60] text-balance">
            A. Consumo &amp; Sell Out
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Evolución mensual de consumo en {metricDesc} y cuadros comparativos independientes frente a PM, P3M y P6M.
          </p>
        </div>

        {/* MSUs / Unidades toggle kept exclusively in Consumo */}
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onChangeMetric('volConvertido')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              metric === 'volConvertido'
                ? 'bg-[#0099A8] text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            MSUs
          </button>
          <button
            type="button"
            onClick={() => onChangeMetric('volumen')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              metric === 'volumen'
                ? 'bg-[#0099A8] text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unidades
          </button>
        </div>
      </div>

      {/* Consumo-only 4-card KPI summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="text-xs text-slate-500">
            Total Argentina Pañales · {sum1.pmLabel}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-2xl font-bold text-slate-900">
              {formatNumberCompact(sum1.pmValue)}
            </span>
            <span className="text-xs text-slate-400">{metricUnit}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">vs P3M</span>
            <DeltaText value={sum1.vsP3M} compact />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="text-xs text-slate-500">
            Pañales P&amp;G (Pampers) · {sum3.pmLabel}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-2xl font-bold text-[#0099A8]">
              {formatNumberCompact(sum3.pmValue)}
            </span>
            <span className="text-xs text-slate-400">{metricUnit}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">vs P3M</span>
            <DeltaText value={sum3.vsP3M} compact />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="text-xs text-slate-500">
            Total Argentina Toallitas · {sum2.pmLabel}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-2xl font-bold text-slate-900">
              {formatNumberCompact(sum2.pmValue)}
            </span>
            <span className="text-xs text-slate-400">{metricUnit}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">vs P3M</span>
            <DeltaText value={sum2.vsP3M} compact />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="text-xs text-slate-500">
            Toallitas Húmedas P&amp;G · {sum5.pmLabel}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-2xl font-bold text-[#0099A8]">
              {formatNumberCompact(sum5.pmValue)}
            </span>
            <span className="text-xs text-slate-400">{metricUnit}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">vs P3M</span>
            <DeltaText value={sum5.vsP3M} compact />
          </div>
        </div>
      </div>

      {/* 6 Chart + Separate Comparative Card Pairs */}
      <div className="space-y-6">
        <SingleSeriesRow meta={card1} />
        <SingleSeriesRow meta={card2} />
        <SingleSeriesRow meta={card3} />
        <MultiChannelRow
          chartCardId="consumo-pg-panales-canal"
          tableCardId="consumo-tabla-pg-panales-canal"
          title="4. Consumo Argentina — Pañales P&G por Canal"
          subtitle={`Desglose Pampers Pañales por canal agrupado · ${metricDesc}`}
          tableTitle="Comparativo Pañales P&G por Canal"
          tableSubtitle={`PM, vs PM, vs P3M y vs P6M · ${metricUnit}`}
          data={s4}
          metricUnit={metricUnit}
        />
        <SingleSeriesRow meta={card5} />
        <MultiChannelRow
          chartCardId="consumo-pg-toallitas-canal"
          tableCardId="consumo-tabla-pg-toallitas-canal"
          title="6. Consumo Argentina — Toallitas Húmedas P&G por Canal"
          subtitle={`Desglose Pampers Toallitas por canal agrupado · ${metricDesc}`}
          tableTitle="Comparativo Toallitas P&G por Canal"
          tableSubtitle={`PM, vs PM, vs P3M y vs P6M · ${metricUnit}`}
          data={s6}
          metricUnit={metricUnit}
        />
      </div>
    </section>
  );
}
