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
import { formatNumberCompact, getChannelSliceAnalytics } from '../lib/analytics';
import { CHANNEL_DESCRIPTIONS, PRIMARY_CHANNELS, getBrandColor } from '../lib/mappings';
import { CategoryType, ScentiaRow } from '../types/scentia';
import { DeltaText } from './DeltaText';
import { PresentationCard } from './PresentationCard';

interface SectionCanalesProps {
  rows: ScentiaRow[];
  periods: string[];
  rebaseTo100: boolean;
}

export function SectionCanales({ rows, periods, rebaseTo100 }: SectionCanalesProps) {
  const [categoryScope, setCategoryScope] = useState<CategoryType>('Pañales');
  const scopeSlug = categoryScope === 'Pañales' ? 'panales' : 'toallitas';

  return (
    <section id="canales" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B3B60] text-balance">
            C. Canales — Value Share & Liderazgo
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Evolución mensual de SOV por canal agrupado con ranking de liderazgo (#1, #2, #3...) y detalle PM, vs P3M y vs P6M.
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

      <div className="space-y-6">
        {PRIMARY_CHANNELS.map((channel) => {
          const { chartData, brands, leadership, totalMsus } = getChannelSliceAnalytics(
            rows,
            periods,
            channel,
            categoryScope,
            rebaseTo100
          );
          const latestLabel =
            chartData.length > 0 ? String(chartData[chartData.length - 1].label) : '-';

          return (
            <div
              key={channel}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
            >
              {/* Left: Monthly SOV Evolution Chart */}
              <PresentationCard
                cardId={`canal-chart-${channel.toLowerCase()}-${scopeSlug}`}
                defaultTitle={`Canal ${channel} — Value Share (${categoryScope})`}
                defaultSubtitle={`${CHANNEL_DESCRIPTIONS[channel]} · ${formatNumberCompact(totalMsus)} MSUs (${latestLabel})`}
                className="lg:col-span-7"
              >
                {chartData.length > 0 ? (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                      >
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
                          width={42}
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
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                        {brands.map((brand, idx) => (
                          <Line
                            key={brand}
                            type="monotone"
                            dataKey={brand}
                            stroke={getBrandColor(brand, idx)}
                            strokeWidth={brand === 'Pampers' ? 2.8 : 1.8}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-60 flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Sin registros para el canal {channel} en {categoryScope}.
                  </div>
                )}
              </PresentationCard>

              {/* Right: Mini Channel Leadership Comparative Table */}
              <PresentationCard
                cardId={`canal-tabla-${channel.toLowerCase()}-${scopeSlug}`}
                defaultTitle={`Liderazgo ${channel} (${latestLabel})`}
                defaultSubtitle={`Ranking SOV · ${categoryScope}`}
                className="lg:col-span-5"
              >
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-1.5 pr-2">Pos</th>
                        <th className="py-1.5 pr-3">Marca</th>
                        <th className="py-1.5 px-2 text-right">PM</th>
                        <th className="py-1.5 px-2 text-right">vs P3M</th>
                        <th className="py-1.5 pl-2 text-right">vs P6M</th>
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
                          <td className="py-2 pr-2 font-mono-num font-semibold text-slate-600">
                            #{item.rank}
                          </td>
                          <td className="py-2 pr-3 font-medium text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-1 rounded-xs shrink-0"
                                style={{ backgroundColor: item.color }}
                                aria-hidden="true"
                              />
                              <span className="truncate max-w-[120px]">{item.brand}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right font-mono-num font-semibold text-slate-900">
                            {item.pmSov.toFixed(1)}%
                          </td>
                          <td className="py-2 px-2 text-right">
                            <DeltaText value={item.vsP3Mpp} unit="pp" compact />
                          </td>
                          <td className="py-2 pl-2 text-right">
                            <DeltaText value={item.vsP6Mpp} unit="pp" compact />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PresentationCard>
            </div>
          );
        })}
      </div>
    </section>
  );
}
