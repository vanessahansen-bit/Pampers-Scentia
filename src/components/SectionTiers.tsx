import { useState } from 'react';
import { formatNumberCompact, getTierLeadership } from '../lib/analytics';
import { ScentiaRow, TierKey } from '../types/scentia';
import { DeltaText } from './DeltaText';
import { PresentationCard } from './PresentationCard';

interface SectionTiersProps {
  rows: ScentiaRow[];
  periods: string[];
  rebaseTo100: boolean;
}

const CORE_TIERS: { tier: TierKey; label: string; subbrandsHint: string }[] = [
  {
    tier: 'Pants',
    label: 'PANTS',
    subbrandsHint: 'Todos los pañales formato Pants de todas las marcas',
  },
  {
    tier: 'Tier 1',
    label: 'TIER 1',
    subbrandsHint:
      'Pampers Premium Care / Deluxe Protection · Huggies Natural Care / Supreme / Ultra Confort · BabySec Super Premium · Estrella Premium',
  },
  {
    tier: 'Tier 2',
    label: 'TIER 2',
    subbrandsHint:
      'Pampers Baby Dry · Huggies FlexiComfort · Babysec Premium · Estrella · Duffy Premium Cotton',
  },
  {
    tier: 'Tier 2.5',
    label: 'TIER 2.5',
    subbrandsHint:
      'Pampers Babysan · Huggies Protect Plus · Babysec Ultra / Classic · Duffy Cotton',
  },
  {
    tier: 'Tier 3',
    label: 'TIER 3',
    subbrandsHint: 'Pampers Supersec · Huggies Classic · Huggies Maxi Protect',
  },
  {
    tier: 'Wipes',
    label: 'WIPES',
    subbrandsHint: 'Toallitas húmedas — Top 10 marcas y resto agrupado en Otras marcas',
  },
];

const EXTRA_TIERS: { tier: TierKey; label: string; subbrandsHint: string }[] = [
  {
    tier: 'Tier 0',
    label: 'TIER 0',
    subbrandsHint: 'Huggies Dermacare',
  },
  {
    tier: 'Summer',
    label: 'SUMMER',
    subbrandsHint: 'Pampers Splashers · Huggies Little Swimmers',
  },
];

export function SectionTiers({ rows, periods, rebaseTo100 }: SectionTiersProps) {
  const [showExtraTiers, setShowExtraTiers] = useState(false);

  const visibleTiers = showExtraTiers ? [...CORE_TIERS, ...EXTRA_TIERS] : CORE_TIERS;
  const latestPeriod = periods[periods.length - 1] ?? '';

  return (
    <section id="tiers" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B3B60] text-balance">
            D. Segmento Tiers — Liderazgo por Categoría
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Cuadros comparativos de liderazgo (#1, #2, #3...) por segmento con Value Share PM, vs P3M y vs P6M.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowExtraTiers((v) => !v)}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
        >
          {showExtraTiers ? 'Ocultar Tier 0 y Summer' : 'Mostrar Tier 0 y Summer'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleTiers.map(({ tier, label, subbrandsHint }) => {
          const { leadership, pmMsus, rowCount } = getTierLeadership(
            rows,
            periods,
            tier,
            rebaseTo100
          );

          return (
            <PresentationCard
              key={tier}
              cardId={`tier-${tier.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              defaultTitle={label}
              defaultSubtitle={subbrandsHint}
              rightSlot={
                <div>
                  <div className="font-mono-num text-sm font-semibold text-slate-900">
                    {formatNumberCompact(pmMsus)} MSUs
                  </div>
                  <div className="text-[11px] text-slate-500">PM ({latestPeriod || '-'})</div>
                </div>
              }
            >
              {rowCount > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2 pr-2">Pos</th>
                        <th className="py-2 pr-3">Marca</th>
                        <th className="py-2 px-2 text-right">PM SOV</th>
                        <th className="py-2 px-2 text-right">vs P3M</th>
                        <th className="py-2 pl-2 text-right">vs P6M</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leadership.map((item) => (
                        <tr
                          key={item.brand}
                          className={`hover:bg-slate-50/80 ${
                            item.brand === 'Pampers' ? 'bg-[#0099A8]/[0.04]' : ''
                          }`}
                        >
                          <td className="py-2.5 pr-2 font-mono-num font-semibold text-slate-600">
                            #{item.rank}
                          </td>
                          <td className="py-2.5 pr-3 font-medium text-slate-900">
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
                          <td className="py-2.5 px-2 text-right">
                            <DeltaText value={item.vsP3Mpp} unit="pp" compact />
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <DeltaText value={item.vsP6Mpp} unit="pp" compact />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  No se detectaron Sub-brands asignadas a {label} en los datos cargados.
                </div>
              )}
            </PresentationCard>
          );
        })}
      </div>
    </section>
  );
}
