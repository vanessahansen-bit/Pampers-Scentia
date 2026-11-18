import { ArrowRight } from 'lucide-react';
import {
  computeBrandComparisonTable,
  computeConsumptionSeries,
  computePeriodDeltaSummary,
  formatNumberCompact,
} from '../lib/analytics';
import { formatPeriodLabel } from '../lib/mappings';
import { ScentiaRow } from '../types/scentia';
import { DeltaText } from './DeltaText';
import { DashboardIndexId, IndexIcon, SIDEBAR_INDICES } from './Sidebar';

interface SectionPortadaProps {
  rows: ScentiaRow[];
  periods: string[];
  sourceName: string;
  isLinkedRemote: boolean;
  rebaseTo100: boolean;
  onSelectIndex: (id: DashboardIndexId) => void;
}

const INDEX_DETAILS: Record<
  Exclude<DashboardIndexId, 'home' | 'config'>,
  { highlight: string; scope: string }
> = {
  resumen: {
    highlight: 'Consolidado del último mes',
    scope:
      'Total Canales, Top 3 mayores aumentos/caídas por canal, matriz comparativa y liderazgo #1–#6 con motores y retractores por Sub-brand.',
  },
  consumo: {
    highlight: 'MSUs & Unidades',
    scope:
      'Evolución mensual para Argentina Total y P&G por canal (RDs, DPP, WHS, HSM, ECOMM) con cuadros comparativos PM, vs P3M y vs P6M.',
  },
  'value-share': {
    highlight: 'SOV competitivo',
    scope:
      'Evolución mensual de Value Share por marca (Pampers, Kimberly Clark, BabySec, Estrella, Duffy, M.Propias), PM/P3M/P6M y ponderación CYTD / FYTD.',
  },
  canales: {
    highlight: '5 canales agrupados',
    scope:
      'Desempeño mensual de Value Share y ranking de liderazgo (#1, #2, #3...) en RDs, DPP, WHS, HSM y ECOMM.',
  },
  tiers: {
    highlight: 'Sub-brands & Tiers',
    scope:
      'Liderazgo competitivo en Pants, Tier 1, Tier 2, Tier 2.5, Tier 3, Wipes (Top 10 + Otras marcas), Tier 0 y Summer.',
  },
  'raw-data': {
    highlight: 'Explorador tabular',
    scope:
      'Acceso completo a la data cruda con desplegables múltiples por Brand, Sub-brand, Categoría, Canal y rango de meses, en MSUs o Share.',
  },
};

export function SectionPortada({
  rows,
  periods,
  sourceName,
  isLinkedRemote,
  rebaseTo100,
  onSelectIndex,
}: SectionPortadaProps) {
  const diaperRows = rows.filter((r) => r.category === 'Pañales');
  const wipesRows = rows.filter((r) => r.category === 'Toallitas Húmedas');

  const diaperConsDelta = computePeriodDeltaSummary(
    computeConsumptionSeries(diaperRows, periods, 'volConvertido')
  );
  const wipesConsDelta = computePeriodDeltaSummary(
    computeConsumptionSeries(wipesRows, periods, 'volConvertido')
  );

  const diaperShareTable = computeBrandComparisonTable(diaperRows, periods, 'Pañales', rebaseTo100);
  const wipesShareTable = computeBrandComparisonTable(
    wipesRows,
    periods,
    'Toallitas Húmedas',
    rebaseTo100
  );

  const pampersDiaper = diaperShareTable.find((r) => r.brand === 'Pampers');
  const pampersWipes = wipesShareTable.find((r) => r.brand === 'Pampers');

  const periodRangeText =
    periods.length > 0
      ? `${formatPeriodLabel(periods[0])} – ${formatPeriodLabel(periods[periods.length - 1])}`
      : 'Sin períodos';
  const latestLabel = periods.length > 0 ? formatPeriodLabel(periods[periods.length - 1]) : '—';

  const resumenItem = SIDEBAR_INDICES.find((i) => i.id === 'resumen')!;
  const rawDataItem = SIDEBAR_INDICES.find((i) => i.id === 'raw-data')!;
  const otherItems = SIDEBAR_INDICES.filter((i) => i.id !== 'resumen' && i.id !== 'raw-data');

  return (
    <section className="space-y-8">
      {/* Executive Cover Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="space-y-2 max-w-3xl">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B3B60] tracking-tight text-balance">
            Pampers Scentia — Panel Ejecutivo Argentina
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Seguimiento mensual de Consumo (MSUs y Unidades), Value Share, desempeño por canal y liderazgo por segmento Tier para Pañales y Toallitas Húmedas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Período: <strong className="font-medium text-slate-700">{periodRangeText}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Último mes: <strong className="font-medium text-slate-700">{latestLabel}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Origen:{' '}
            <strong className="font-medium text-slate-700">
              {isLinkedRemote ? 'Google Apps Script' : sourceName}
            </strong>
          </span>
        </div>
      </div>

      {/* Latest Month Snapshot KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
          <div className="text-xs font-medium text-slate-500">
            Consumo Pañales ({latestLabel})
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-xl font-bold text-[#0B3B60]">
              {formatNumberCompact(diaperConsDelta.pmValue)}
            </span>
            <span className="text-[11px] font-medium text-slate-400">MSUs</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>vs P3M:</span>
            <DeltaText value={diaperConsDelta.vsP3M} unit="%" compact />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
          <div className="text-xs font-medium text-slate-500">
            Value Share Pampers Pañales ({latestLabel})
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-xl font-bold text-[#0099A8]">
              {pampersDiaper ? `${pampersDiaper.pmSov.toFixed(1)}%` : '—'}
            </span>
            {pampersDiaper && (
              <span className="font-mono-num text-[11px] font-semibold text-slate-500">
                #{pampersDiaper.rank} país
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>vs P3M:</span>
            <DeltaText value={pampersDiaper?.vsP3Mpp ?? null} unit="pp" compact />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
          <div className="text-xs font-medium text-slate-500">
            Consumo Toallitas ({latestLabel})
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-xl font-bold text-[#0B3B60]">
              {formatNumberCompact(wipesConsDelta.pmValue)}
            </span>
            <span className="text-[11px] font-medium text-slate-400">MSUs</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>vs P3M:</span>
            <DeltaText value={wipesConsDelta.vsP3M} unit="%" compact />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
          <div className="text-xs font-medium text-slate-500">
            Value Share Pampers Toallitas ({latestLabel})
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-num text-xl font-bold text-[#0099A8]">
              {pampersWipes ? `${pampersWipes.pmSov.toFixed(1)}%` : '—'}
            </span>
            {pampersWipes && (
              <span className="font-mono-num text-[11px] font-semibold text-slate-500">
                #{pampersWipes.rank} país
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>vs P3M:</span>
            <DeltaText value={pampersWipes?.vsP3Mpp ?? null} unit="pp" compact />
          </div>
        </div>
      </div>

      {/* Dashboard Sections Navigation (mirrors Sidebar indices) */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B3B60]">
            Módulos del Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Seleccioná un índice para explorar gráficos evolutivos, cuadros comparativos y exportar vistas a presentaciones.
          </p>
        </div>

        {/* Featured Card: Resumen Último Mes */}
        <button
          type="button"
          onClick={() => onSelectIndex('resumen')}
          className="w-full text-left bg-white border border-slate-200 hover:border-[#0099A8] rounded-xl p-6 transition-colors group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0099A8]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-[#0099A8]/10 text-[#0099A8] shrink-0">
                <IndexIcon id="resumen" active className="w-5 h-5 text-[#0099A8]" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-[#0099A8]">
                    {INDEX_DETAILS.resumen.highlight}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{latestLabel}</span>
                </div>
                <div className="font-display text-lg font-bold text-[#0B3B60] group-hover:text-[#0099A8] transition-colors">
                  {resumenItem.label}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                  {INDEX_DETAILS.resumen.scope}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0099A8] shrink-0">
              <span>Abrir módulo</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </button>

        {/* 2x2 Grid: A, B, C, D */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherItems.map((item) => {
            const detail = INDEX_DETAILS[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectIndex(item.id)}
                className="text-left bg-white border border-slate-200 hover:border-[#0099A8] rounded-xl p-5 transition-colors group flex flex-col justify-between gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0099A8]"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-slate-100 group-hover:bg-[#0099A8]/10 text-slate-600 group-hover:text-[#0099A8] transition-colors shrink-0">
                    <IndexIcon
                      id={item.id}
                      className="w-5 h-5 text-slate-600 group-hover:text-[#0099A8] transition-colors"
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="text-[11px] font-medium text-slate-500">
                      {detail.highlight}
                    </div>
                    <div className="font-display text-base font-bold text-[#0B3B60] group-hover:text-[#0099A8] transition-colors">
                      {item.label}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {detail.scope}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end text-xs font-semibold text-[#0099A8] pt-2 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1.5">
                    <span>Explorar</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Full-width Card: RAW DATA */}
        <button
          type="button"
          onClick={() => onSelectIndex('raw-data')}
          className="w-full text-left bg-white border border-slate-200 hover:border-[#0099A8] rounded-xl p-5 transition-colors group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0099A8]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-slate-100 group-hover:bg-[#0099A8]/10 text-slate-600 group-hover:text-[#0099A8] transition-colors shrink-0">
                <IndexIcon
                  id="raw-data"
                  className="w-5 h-5 text-slate-600 group-hover:text-[#0099A8] transition-colors"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-500">
                  {INDEX_DETAILS['raw-data'].highlight}
                </div>
                <div className="font-display text-base font-bold text-[#0B3B60] group-hover:text-[#0099A8] transition-colors">
                  {rawDataItem.label}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  {INDEX_DETAILS['raw-data'].scope}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0099A8] shrink-0">
              <span>Explorar tabla</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}
