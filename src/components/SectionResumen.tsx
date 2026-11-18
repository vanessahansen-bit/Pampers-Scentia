import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatNumberCompact } from '../lib/analytics';
import { formatPeriodLabel } from '../lib/mappings';
import { computeConsolidatedMonthlySummary } from '../lib/summaryAnalytics';
import { CategoryType, ScentiaRow } from '../types/scentia';
import { DeltaText } from './DeltaText';
import { PresentationCard } from './PresentationCard';

interface SectionResumenProps {
  rows: ScentiaRow[];
  periods: string[];
  rebaseTo100: boolean;
}

export function SectionResumen({ rows, periods, rebaseTo100 }: SectionResumenProps) {
  const latestPeriod = periods[periods.length - 1] ?? '';
  const [targetPeriod, setTargetPeriod] = useState<string>(latestPeriod);
  const [categoryScope, setCategoryScope] = useState<CategoryType>('Pañales');
  const [detailedEcomm, setDetailedEcomm] = useState<boolean>(false);

  useEffect(() => {
    if (latestPeriod && !periods.includes(targetPeriod)) {
      setTargetPeriod(latestPeriod);
    }
  }, [latestPeriod, periods, targetPeriod]);

  const effectivePeriod = periods.includes(targetPeriod) ? targetPeriod : latestPeriod;

  const summary = computeConsolidatedMonthlySummary(
    rows,
    periods,
    effectivePeriod,
    categoryScope,
    detailedEcomm,
    rebaseTo100
  );

  const scopeSlug = categoryScope === 'Pañales' ? 'panales' : 'toallitas';
  const prevText = summary.prevLabel ? `vs ${summary.prevLabel}` : '(sin mes previo)';

  return (
    <section id="resumen" className="scroll-mt-20 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B3B60] text-balance">
            Resumen Ejecutivo — {summary.targetLabel} {prevText}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Consolidado de variaciones de Value Share por canal y desglose de productos (Sub-brands) que explican cada movimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month selector */}
          <select
            aria-label="Mes de análisis"
            value={effectivePeriod}
            onChange={(e) => setTargetPeriod(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#0099A8] cursor-pointer"
          >
            {[...periods].reverse().map((p) => (
              <option key={p} value={p}>
                Mes: {formatPeriodLabel(p)}
              </option>
            ))}
          </select>

          {/* Channel grouping mode */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setDetailedEcomm(false)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                !detailedEcomm
                  ? 'bg-white text-[#0B3B60] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5 Canales
            </button>
            <button
              type="button"
              onClick={() => setDetailedEcomm(true)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                detailedEcomm
                  ? 'bg-white text-[#0B3B60] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Separar Rappi / Pedidos Ya
            </button>
          </div>

          {/* Category toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['Pañales', 'Toallitas Húmedas'] as CategoryType[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryScope(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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
      </div>

      {/* 1. Resumen General: Total Canales + Top 3 Aumentos & Caídas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <PresentationCard
          cardId={`resumen-total-canales-${scopeSlug}-${effectivePeriod}`}
          defaultTitle={`1. Total Canales — ${categoryScope} (${summary.targetLabel})`}
          defaultSubtitle={`Participación de Value Share total país y variación ${prevText}`}
          className="lg:col-span-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2 pr-2">Pos</th>
                  <th className="py-2 pr-3">Marca</th>
                  <th className="py-2 px-2 text-right">{summary.targetLabel}</th>
                  <th className="py-2 px-2 text-right">{summary.prevLabel ?? 'Mes Ant.'}</th>
                  <th className="py-2 px-2 text-right">Var. (pp)</th>
                  <th className="py-2 pl-3">Motor / Retractor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.totalCountryBrands.slice(0, 10).map((item) => (
                  <tr
                    key={item.brand}
                    className={`hover:bg-slate-50/80 ${
                      item.brand === 'Pampers' ? 'bg-[#0099A8]/[0.05]' : ''
                    }`}
                  >
                    <td className="py-2.5 pr-2 font-mono-num font-semibold text-slate-600">
                      #{item.rank}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-1 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <span>{item.brand}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num font-semibold text-slate-900">
                      {item.pmSov.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num text-slate-500">
                      {summary.prevLabel ? `${item.prevSov.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <DeltaText
                        value={summary.prevLabel ? item.deltaPp : null}
                        unit="pp"
                        compact
                      />
                    </td>
                    <td className="py-2.5 pl-3 text-[11px] leading-snug">
                      {summary.prevLabel ? (
                        <div className="space-y-0.5">
                          {item.topMotor && (
                            <div>
                              <span className="font-semibold text-emerald-700">Motor:</span>{' '}
                              <span className="text-slate-700">{item.topMotor.subbrand}</span>{' '}
                              <span className="font-mono-num text-emerald-700">
                                (+{item.topMotor.deltaPp.toFixed(1)})
                              </span>
                            </div>
                          )}
                          {item.topRetractor && (
                            <div>
                              <span className="font-semibold text-rose-700">Retractor:</span>{' '}
                              <span className="text-slate-700">{item.topRetractor.subbrand}</span>{' '}
                              <span className="font-mono-num text-rose-700">
                                ({item.topRetractor.deltaPp.toFixed(1)})
                              </span>
                            </div>
                          )}
                          {!item.topMotor && !item.topRetractor && (
                            <span className="text-slate-400">Sin variación relevante</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PresentationCard>

        <PresentationCard
          cardId={`resumen-top-movimientos-${scopeSlug}-${effectivePeriod}`}
          defaultTitle="2. Top 3 Mayores Aumentos y Caídas por Canal"
          defaultSubtitle={`Movimientos destacados Marca × Canal (${summary.targetLabel} ${prevText}) con Motor (+pp) y Retractor (-pp)`}
          className="lg:col-span-6"
        >
          {summary.prevLabel ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {/* Top 3 Gains */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 pb-1 border-b border-emerald-100">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Top 3 Aumentos del Mes</span>
                </div>
                {summary.topGains.length > 0 ? (
                  <div className="space-y-2.5">
                    {summary.topGains.map((move, i) => (
                      <div
                        key={`${move.brand}-${move.channelKey}`}
                        className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {i + 1}. {move.brand} en {move.channelTitle}
                          </span>
                          <span className="font-mono-num text-xs font-bold text-emerald-700 shrink-0">
                            +{move.deltaPp.toFixed(1)} pp
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2">
                          <span>
                            {move.pmSov.toFixed(1)}% (ant. {move.prevSov.toFixed(1)}%)
                          </span>
                        </div>
                        {move.mainDriver && (
                          <div className="text-[11px] text-slate-600 pt-0.5">
                            <span className="font-semibold text-emerald-700">Motor:</span>{' '}
                            <strong className="font-medium text-slate-800">{move.mainDriver.subbrand}</strong>{' '}
                            (<span className="font-mono-num text-emerald-700">+{move.mainDriver.deltaPp.toFixed(1)} pp</span>)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4">Sin aumentos significativos.</p>
                )}
              </div>

              {/* Top 3 Drops */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 pb-1 border-b border-rose-100">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Top 3 Caídas del Mes</span>
                </div>
                {summary.topDrops.length > 0 ? (
                  <div className="space-y-2.5">
                    {summary.topDrops.map((move, i) => (
                      <div
                        key={`${move.brand}-${move.channelKey}`}
                        className="p-3 rounded-lg bg-rose-50/50 border border-rose-100 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {i + 1}. {move.brand} en {move.channelTitle}
                          </span>
                          <span className="font-mono-num text-xs font-bold text-rose-700 shrink-0">
                            {move.deltaPp.toFixed(1)} pp
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2">
                          <span>
                            {move.pmSov.toFixed(1)}% (ant. {move.prevSov.toFixed(1)}%)
                          </span>
                        </div>
                        {move.mainDriver && (
                          <div className="text-[11px] text-slate-600 pt-0.5">
                            <span className="font-semibold text-rose-700">Retractor:</span>{' '}
                            <strong className="font-medium text-slate-800">{move.mainDriver.subbrand}</strong>{' '}
                            (<span className="font-mono-num text-rose-700">{move.mainDriver.deltaPp.toFixed(1)} pp</span>)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4">Sin caídas significativas.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">
              Seleccioná un mes con período anterior disponible para ver variaciones Top 3.
            </div>
          )}
        </PresentationCard>
      </div>

      {/* 2. Cuadro Matriz Consolidado de Variaciones por Canal vs Mes Anterior */}
      <PresentationCard
        cardId={`resumen-matriz-canales-${scopeSlug}-${effectivePeriod}`}
        defaultTitle={`3. Cuadro Consolidado por Canal — ${categoryScope} (${summary.targetLabel} ${prevText})`}
        defaultSubtitle="Value Share del último mes y variación en puntos porcentuales (pp) por marca en cada canal"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2 pr-3">Marca</th>
                <th className="py-2 px-3 text-right bg-slate-50/80">Total País</th>
                {summary.channelList.map((ch) => (
                  <th key={ch.key} className="py-2 px-3 text-right">
                    {ch.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.matrixRows.map((row) => (
                <tr
                  key={row.brand}
                  className={`hover:bg-slate-50/80 ${
                    row.brand === 'Pampers' ? 'bg-[#0099A8]/[0.05]' : ''
                  }`}
                >
                  <td className="py-2.5 pr-3 font-medium text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-1 rounded-xs shrink-0"
                        style={{ backgroundColor: row.color }}
                        aria-hidden="true"
                      />
                      <span>{row.brand}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right bg-slate-50/50">
                    <div className="font-mono-num font-semibold text-slate-900">
                      {row.totalCountry.pmSov.toFixed(1)}%
                    </div>
                    {summary.prevLabel && (
                      <DeltaText value={row.totalCountry.deltaPp} unit="pp" compact />
                    )}
                  </td>
                  {summary.channelList.map((ch) => {
                    const cell = row.byChannel[ch.key];
                    return (
                      <td key={ch.key} className="py-2.5 px-3 text-right">
                        <div className="font-mono-num font-semibold text-slate-900">
                          {cell ? `${cell.pmSov.toFixed(1)}%` : '—'}
                        </div>
                        {summary.prevLabel && cell && (
                          <DeltaText value={cell.deltaPp} unit="pp" compact />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PresentationCard>

      {/* 4. Análisis por Canal — Liderazgo # con Motor / Retractor */}
      <div className="space-y-4 pt-2">
        <div>
          <h3 className="font-display text-lg font-bold text-[#0B3B60]">
            4. Análisis por Canal — Liderazgo y Drivers (Motor / Retractor)
          </h3>
          <p className="text-xs text-slate-500">
            Liderazgo por marca (#1, #2, #3...) con el detalle de los productos Motor (+pp) y Retractor (-pp) relevantes (≥ 0.1 pp).
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {summary.channels.map((ch) => (
            <PresentationCard
              key={ch.channelKey}
              cardId={`resumen-canal-${ch.channelKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${scopeSlug}-${effectivePeriod}`}
              defaultTitle={`${ch.channelTitle} — Liderazgo & Drivers (${summary.targetLabel})`}
              defaultSubtitle={`${ch.channelDescription} · ${formatNumberCompact(ch.totalPmMsus)} MSUs`}
            >
              {/* Leadership # cards inside channel */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ch.brands.slice(0, 6).map((b) => (
                  <div
                    key={b.brand}
                    className={`p-2.5 rounded-lg border flex flex-col gap-2 ${
                      b.brand === 'Pampers'
                        ? 'bg-[#0099A8]/[0.05] border-[#0099A8]/30'
                        : 'bg-slate-50/70 border-slate-200/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                        <span className="font-mono-num font-semibold text-slate-700">#{b.rank}</span>
                        <span className="truncate font-medium text-slate-800">{b.brand}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2 mt-1">
                        <span className="font-mono-num text-sm font-bold text-slate-900">
                          {b.pmSov.toFixed(1)}%
                        </span>
                        {summary.prevLabel && (
                          <DeltaText value={b.deltaPp} unit="pp" compact />
                        )}
                      </div>
                    </div>

                    {summary.prevLabel && (
                      <div className="pt-1.5 border-t border-slate-200/70 space-y-1.5 text-[10.5px] leading-tight">
                        {b.motors.length > 0 && (
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-semibold text-emerald-700">Motor:</div>
                            <ul className="space-y-0.5">
                              {b.motors.map((m) => (
                                <li
                                  key={m.subbrand}
                                  className="flex items-center justify-between gap-1.5"
                                >
                                  <span className="text-slate-600 truncate min-w-0">
                                    <span className="text-emerald-600 mr-1" aria-hidden="true">
                                      •
                                    </span>
                                    {m.subbrand}
                                  </span>
                                  <span className="font-mono-num font-semibold text-emerald-700 shrink-0">
                                    +{m.deltaPp.toFixed(1)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {b.retractors.length > 0 && (
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-semibold text-rose-700">Retractor:</div>
                            <ul className="space-y-0.5">
                              {b.retractors.map((r) => (
                                <li
                                  key={r.subbrand}
                                  className="flex items-center justify-between gap-1.5"
                                >
                                  <span className="text-slate-600 truncate min-w-0">
                                    <span className="text-rose-600 mr-1" aria-hidden="true">
                                      •
                                    </span>
                                    {r.subbrand}
                                  </span>
                                  <span className="font-mono-num font-semibold text-rose-700 shrink-0">
                                    {r.deltaPp.toFixed(1)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {b.motors.length === 0 && b.retractors.length === 0 && (
                          <span className="text-[10px] text-slate-400 block">
                            Sin variación relevante
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </PresentationCard>
          ))}
        </div>
      </div>
    </section>
  );
}
