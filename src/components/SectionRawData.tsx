import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  Download,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { exportAnalyticsToCsv, formatNumberCompact } from '../lib/analytics';
import { formatPeriodLabel, PRIMARY_CHANNELS } from '../lib/mappings';
import { ScentiaRow } from '../types/scentia';
import { DeltaText } from './DeltaText';
import { PresentationCard } from './PresentationCard';

interface SectionRawDataProps {
  rows: ScentiaRow[];
  periods: string[];
}

type RawMetricMode = 'msus' | 'share';
type SortField = 'period' | 'brandRaw' | 'subbrand' | 'channelRaw' | 'msus' | 'volumen' | 'sov' | 'som';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 100;

interface MultiOption {
  value: string;
  label: string;
  group?: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: MultiOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  allLabel?: string;
  pluralUnit?: string;
  searchable?: boolean;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  allLabel = 'Todas',
  pluralUnit = 'seleccionados',
  searchable,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const showSearch = searchable ?? options.length > 6;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleOption = (val: string) => {
    if (selectedSet.has(val)) {
      onChange(selected.filter((item) => item !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const summaryText = useMemo(() => {
    if (selected.length === 0) return allLabel;
    if (selected.length === 1) {
      const hit = options.find((o) => o.value === selected[0]);
      return hit ? hit.label : selected[0];
    }
    return `${selected.length} ${pluralUnit}`;
  }, [selected, options, allLabel, pluralUnit]);

  // Preserve optional grouping order
  const groupedSections = useMemo(() => {
    const groups: { title: string | null; items: MultiOption[] }[] = [];
    for (const opt of filteredOptions) {
      const gName = opt.group ?? null;
      const existing = groups.find((g) => g.title === gName);
      if (existing) {
        existing.items.push(opt);
      } else {
        groups.push({ title: gName, items: [opt] });
      }
    }
    return groups;
  }, [filteredOptions]);

  return (
    <div ref={containerRef} className="relative space-y-1">
      <span className="text-[11px] font-medium text-slate-500 block">{label}</span>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery('');
        }}
        aria-expanded={open}
        className={`w-full px-2.5 py-2 text-xs font-medium rounded-lg border flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
          selected.length > 0
            ? 'bg-[#0099A8]/[0.06] border-[#0099A8]/50 text-[#0B3B60]'
            : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
        }`}
      >
        <span className="truncate">{summaryText}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 sm:min-w-[230px] z-40 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-2">
          {showSearch && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#0099A8]"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-1.5 pb-1 border-b border-slate-100 text-[11px]">
            <span className="text-slate-400">
              {selected.length === 0 ? 'Sin filtro' : `${selected.length} sel.`}
            </span>
            <div className="flex items-center gap-2">
              {filteredOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = Array.from(
                      new Set([...selected, ...filteredOptions.map((o) => o.value)])
                    );
                    onChange(next);
                  }}
                  className="font-medium text-[#0099A8] hover:underline cursor-pointer"
                >
                  Selec. visibles
                </button>
              )}
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-0.5">
            {groupedSections.length > 0 ? (
              groupedSections.map((grp, gIdx) => (
                <div key={grp.title ?? `g-${gIdx}`} className="space-y-0.5">
                  {grp.title && (
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {grp.title}
                    </div>
                  )}
                  {grp.items.map((opt) => {
                    const checked = selectedSet.has(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleOption(opt.value)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer ${
                          checked
                            ? 'bg-[#0099A8]/10 text-[#0B3B60] font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            checked
                              ? 'bg-[#0099A8] border-[#0099A8] text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {checked && <Check className="w-2.5 h-2.5" />}
                        </span>
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">Sin coincidencias</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SectionRawData({ rows, periods }: SectionRawDataProps) {
  const firstPeriod = periods[0] ?? '';
  const latestPeriod = periods[periods.length - 1] ?? '';

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startPeriod, setStartPeriod] = useState<string>(firstPeriod);
  const [endPeriod, setEndPeriod] = useState<string>(latestPeriod);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSubbrands, setSelectedSubbrands] = useState<string[]>([]);
  const [metricMode, setMetricMode] = useState<RawMetricMode>('msus');

  const [sortField, setSortField] = useState<SortField>('msus');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState<number>(1);

  // Sync period range if dataset reloads
  useEffect(() => {
    if (periods.length === 0) return;
    if (!periods.includes(startPeriod)) setStartPeriod(periods[0]);
    if (!periods.includes(endPeriod)) setEndPeriod(periods[periods.length - 1]);
  }, [periods, startPeriod, endPeriod]);

  const handleChangeStartPeriod = (nextStart: string) => {
    setStartPeriod(nextStart);
    if (endPeriod && nextStart > endPeriod) {
      setEndPeriod(nextStart);
    }
    setPage(1);
  };

  const handleChangeEndPeriod = (nextEnd: string) => {
    setEndPeriod(nextEnd);
    if (startPeriod && nextEnd < startPeriod) {
      setStartPeriod(nextEnd);
    }
    setPage(1);
  };

  const handleChangeMetricMode = (mode: RawMetricMode) => {
    setMetricMode(mode);
    if (mode === 'msus' && (sortField === 'sov' || sortField === 'som')) {
      setSortField('msus');
      setSortDir('desc');
    } else if (mode === 'share' && (sortField === 'msus' || sortField === 'volumen')) {
      setSortField('sov');
      setSortDir('desc');
    }
    setPage(1);
  };

  const categoryOptions: MultiOption[] = [
    { value: 'Pañales', label: 'Pañales' },
    { value: 'Toallitas Húmedas', label: 'Toallitas Húmedas' },
  ];

  const channelOptions = useMemo<MultiOption[]>(() => {
    const rawChannels = Array.from(new Set(rows.map((r) => r.channelRaw).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, 'es')
    );
    return [
      ...PRIMARY_CHANNELS.map((ch) => ({
        value: `GROUP:${ch}`,
        label: `Grupo: ${ch}`,
        group: 'Grupos de Canal',
      })),
      ...rawChannels.map((ch) => ({
        value: ch,
        label: ch,
        group: 'Canales Crudos',
      })),
    ];
  }, [rows]);

  const brandOptions = useMemo<MultiOption[]>(() => {
    const scoped =
      selectedCategories.length === 0
        ? rows
        : rows.filter((r) => selectedCategories.includes(r.category));
    const list = Array.from(new Set(scoped.map((r) => r.brandRaw).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
    return list.map((b) => ({ value: b, label: b }));
  }, [rows, selectedCategories]);

  const subbrandOptions = useMemo<MultiOption[]>(() => {
    let scoped = rows;
    if (selectedCategories.length > 0) {
      scoped = scoped.filter((r) => selectedCategories.includes(r.category));
    }
    if (selectedBrands.length > 0) {
      scoped = scoped.filter((r) => selectedBrands.includes(r.brandRaw));
    }
    const list = Array.from(new Set(scoped.map((r) => r.subbrand).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
    return list.map((s) => ({ value: s, label: s }));
  }, [rows, selectedCategories, selectedBrands]);

  // Clean up child multi-selections when parent filters invalidate options
  useEffect(() => {
    if (selectedBrands.length === 0) return;
    const valid = new Set(brandOptions.map((o) => o.value));
    const next = selectedBrands.filter((b) => valid.has(b));
    if (next.length !== selectedBrands.length) setSelectedBrands(next);
  }, [brandOptions, selectedBrands]);

  useEffect(() => {
    if (selectedSubbrands.length === 0) return;
    const valid = new Set(subbrandOptions.map((o) => o.value));
    const next = selectedSubbrands.filter((s) => valid.has(s));
    if (next.length !== selectedSubbrands.length) setSelectedSubbrands(next);
  }, [subbrandOptions, selectedSubbrands]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategories, startPeriod, endPeriod, selectedChannels, selectedBrands, selectedSubbrands]);

  const matchesCategoryAndChannel = (r: ScentiaRow): boolean => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(r.category)) {
      return false;
    }
    if (selectedChannels.length > 0) {
      const hit = selectedChannels.some((sel) => {
        if (sel.startsWith('GROUP:')) {
          return r.channelGroup === sel.slice('GROUP:'.length);
        }
        return r.channelRaw === sel;
      });
      if (!hit) return false;
    }
    return true;
  };

  const matchesAllExceptPeriod = (r: ScentiaRow): boolean => {
    if (!matchesCategoryAndChannel(r)) return false;
    if (selectedBrands.length > 0 && !selectedBrands.includes(r.brandRaw)) return false;
    if (selectedSubbrands.length > 0 && !selectedSubbrands.includes(r.subbrand)) return false;
    return true;
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (startPeriod && r.period < startPeriod) return false;
      if (endPeriod && r.period > endPeriod) return false;
      return matchesAllExceptPeriod(r);
    });
  }, [rows, startPeriod, endPeriod, selectedCategories, selectedChannels, selectedBrands, selectedSubbrands]);

  const totals = useMemo(() => {
    let msus = 0;
    let volumen = 0;
    let sov = 0;
    let som = 0;
    for (const r of filteredRows) {
      msus += r.volConvertido;
      volumen += r.volumen;
      sov += r.sov;
      som += r.som;
    }
    return { msus, volumen, sov, som };
  }, [filteredRows]);

  // Period Start vs Period End Variation Analysis
  const periodVariation = useMemo(() => {
    if (!startPeriod || !endPeriod || startPeriod === endPeriod) return null;

    const startFiltered = rows.filter((r) => r.period === startPeriod && matchesAllExceptPeriod(r));
    const endFiltered = rows.filter((r) => r.period === endPeriod && matchesAllExceptPeriod(r));

    const sumMetrics = (arr: ScentiaRow[]) =>
      arr.reduce(
        (acc, r) => ({
          msus: acc.msus + r.volConvertido,
          volumen: acc.volumen + r.volumen,
          sov: acc.sov + r.sov,
          som: acc.som + r.som,
        }),
        { msus: 0, volumen: 0, sov: 0, som: 0 }
      );

    const sStats = sumMetrics(startFiltered);
    const eStats = sumMetrics(endFiltered);

    const msusPct =
      sStats.msus > 0 ? ((eStats.msus - sStats.msus) / sStats.msus) * 100 : null;
    const volumenPct =
      sStats.volumen > 0 ? ((eStats.volumen - sStats.volumen) / sStats.volumen) * 100 : null;

    // Universe share (Category + Channel scope) when Brand or Sub-brand filter is active
    const hasBrandOrSubbrandFilter = selectedBrands.length > 0 || selectedSubbrands.length > 0;
    const startUniverse = sumMetrics(
      rows.filter((r) => r.period === startPeriod && matchesCategoryAndChannel(r))
    );
    const endUniverse = sumMetrics(
      rows.filter((r) => r.period === endPeriod && matchesCategoryAndChannel(r))
    );

    const startShareSov = hasBrandOrSubbrandFilter
      ? startUniverse.sov > 0
        ? (sStats.sov / startUniverse.sov) * 100
        : startUniverse.msus > 0
          ? (sStats.msus / startUniverse.msus) * 100
          : 0
      : sStats.sov;

    const endShareSov = hasBrandOrSubbrandFilter
      ? endUniverse.sov > 0
        ? (eStats.sov / endUniverse.sov) * 100
        : endUniverse.msus > 0
          ? (eStats.msus / endUniverse.msus) * 100
          : 0
      : eStats.sov;

    const startShareSom = hasBrandOrSubbrandFilter
      ? startUniverse.som > 0
        ? (sStats.som / startUniverse.som) * 100
        : startUniverse.msus > 0
          ? (sStats.msus / startUniverse.msus) * 100
          : 0
      : sStats.som;

    const endShareSom = hasBrandOrSubbrandFilter
      ? endUniverse.som > 0
        ? (eStats.som / endUniverse.som) * 100
        : endUniverse.msus > 0
          ? (eStats.msus / endUniverse.msus) * 100
          : 0
      : eStats.som;

    return {
      startLabel: formatPeriodLabel(startPeriod),
      endLabel: formatPeriodLabel(endPeriod),
      startMsus: sStats.msus,
      endMsus: eStats.msus,
      msusDiff: eStats.msus - sStats.msus,
      msusPct,
      startVolumen: sStats.volumen,
      endVolumen: eStats.volumen,
      volumenPct,
      hasBrandOrSubbrandFilter,
      startShareSov,
      endShareSov,
      sovDeltaPp: endShareSov - startShareSov,
      startShareSom,
      endShareSom,
      somDeltaPp: endShareSom - startShareSom,
    };
  }, [rows, startPeriod, endPeriod, selectedCategories, selectedChannels, selectedBrands, selectedSubbrands]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    const dir = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortField) {
        case 'period':
          return a.period.localeCompare(b.period) * dir;
        case 'brandRaw':
          return a.brandRaw.localeCompare(b.brandRaw, 'es') * dir;
        case 'subbrand':
          return a.subbrand.localeCompare(b.subbrand, 'es') * dir;
        case 'channelRaw':
          return a.channelRaw.localeCompare(b.channelRaw, 'es') * dir;
        case 'msus':
          return (a.volConvertido - b.volConvertido) * dir;
        case 'volumen':
          return (a.volumen - b.volumen) * dir;
        case 'sov':
          return (a.sov - b.sov) * dir;
        case 'som':
          return (a.som - b.som) * dir;
      }
    });
    return copy;
  }, [filteredRows, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = sortedRows.slice(pageStart, pageStart + PAGE_SIZE);

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedChannels.length > 0 ||
    selectedBrands.length > 0 ||
    selectedSubbrands.length > 0 ||
    (firstPeriod !== '' && startPeriod !== firstPeriod) ||
    (latestPeriod !== '' && endPeriod !== latestPeriod);

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedChannels([]);
    setSelectedBrands([]);
    setSelectedSubbrands([]);
    setStartPeriod(firstPeriod);
    setEndPeriod(latestPeriod);
    setPage(1);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'brandRaw' || field === 'subbrand' || field === 'channelRaw' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#0099A8] inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#0099A8] inline ml-1" />
    );
  };

  return (
    <section id="raw-data" className="scroll-mt-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B3B60] text-balance">
            RAW DATA — Base Cruda Pampers Scentia
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Consultá registros sin agrupar con selección múltiple por Categoría, Canal, Brand y Sub-brand, rango de meses (Inicio – Fin) y vista en MSUs o Share.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => exportAnalyticsToCsv(sortedRows, 'pampers_scentia_raw_filtrado.csv')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0099A8] hover:bg-[#007F8C] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV filtrado</span>
          </button>
        </div>
      </div>

      {/* Multi-select Filters & Period Range Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* Categoría (Multi) */}
          <MultiSelectDropdown
            label="Categoría"
            options={categoryOptions}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            allLabel="Todas"
            pluralUnit="seleccionadas"
          />

          {/* Mes Inicio */}
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-500 block">Mes Inicio</span>
            <select
              value={startPeriod}
              onChange={(e) => handleChangeStartPeriod(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0099A8] cursor-pointer"
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLabel(p)}
                </option>
              ))}
            </select>
          </label>

          {/* Mes Fin */}
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-500 block">Mes Fin</span>
            <select
              value={endPeriod}
              onChange={(e) => handleChangeEndPeriod(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0099A8] cursor-pointer"
            >
              {[...periods].reverse().map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLabel(p)}
                </option>
              ))}
            </select>
          </label>

          {/* Canal (Multi) */}
          <MultiSelectDropdown
            label="Canal"
            options={channelOptions}
            selected={selectedChannels}
            onChange={setSelectedChannels}
            allLabel="Todos"
            pluralUnit="seleccionados"
          />

          {/* Brand (Multi) */}
          <MultiSelectDropdown
            label="Brand"
            options={brandOptions}
            selected={selectedBrands}
            onChange={setSelectedBrands}
            allLabel={`Todas (${brandOptions.length})`}
            pluralUnit="seleccionadas"
          />

          {/* Sub-brand (Multi) */}
          <MultiSelectDropdown
            label="Sub-brand"
            options={subbrandOptions}
            selected={selectedSubbrands}
            onChange={setSelectedSubbrands}
            allLabel={`Todos (${subbrandOptions.length})`}
            pluralUnit="seleccionados"
          />

          {/* Métrica: MSUs o Share */}
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-500 block">Métrica</span>
            <select
              value={metricMode}
              onChange={(e) => handleChangeMetricMode(e.target.value as RawMetricMode)}
              className="w-full px-2.5 py-2 text-xs font-semibold bg-[#0099A8]/10 border border-[#0099A8]/40 rounded-lg text-[#0B3B60] focus:outline-none focus:border-[#0099A8] cursor-pointer"
            >
              <option value="msus">MSUs (Volumen)</option>
              <option value="share">Share (SOV / SOM %)</option>
            </select>
          </label>
        </div>

        {/* Period Variation Comparison Strip (Mes Inicio -> Mes Fin) */}
        {periodVariation && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {metricMode === 'msus' ? (
              <>
                <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">
                    Mes Inicio ({periodVariation.startLabel})
                  </div>
                  <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                    {formatNumberCompact(periodVariation.startMsus)} MSUs
                  </div>
                  <div className="font-mono-num text-[11px] text-slate-400">
                    {formatNumberCompact(periodVariation.startVolumen)} u.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">
                    Mes Fin ({periodVariation.endLabel})
                  </div>
                  <div className="font-mono-num text-base font-bold text-[#0B3B60] mt-0.5">
                    {formatNumberCompact(periodVariation.endMsus)} MSUs
                  </div>
                  <div className="font-mono-num text-[11px] text-slate-400">
                    {formatNumberCompact(periodVariation.endVolumen)} u.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0099A8]/[0.05] border border-[#0099A8]/25">
                  <div className="text-[11px] font-medium text-[#0B3B60]">
                    Variación ({periodVariation.startLabel} → {periodVariation.endLabel})
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <DeltaText value={periodVariation.msusPct} unit="%" />
                    <span className="font-mono-num text-[11px] text-slate-500">
                      ({periodVariation.msusDiff >= 0 ? '+' : ''}
                      {formatNumberCompact(periodVariation.msusDiff)} MSUs)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <span>Unidades:</span>
                    <DeltaText value={periodVariation.volumenPct} unit="%" compact />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">Acumulado del rango</div>
                  <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                    {formatNumberCompact(totals.msus)} MSUs
                  </div>
                  <div className="font-mono-num text-[11px] text-slate-400">
                    {filteredRows.length.toLocaleString('es-AR')} registros
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">
                    {periodVariation.hasBrandOrSubbrandFilter
                      ? `Share SOV (${periodVariation.startLabel})`
                      : `SOV crudo (${periodVariation.startLabel})`}
                  </div>
                  <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                    {periodVariation.startShareSov.toFixed(1)}%
                  </div>
                  <div className="font-mono-num text-[11px] text-slate-400">
                    SOM: {periodVariation.startShareSom.toFixed(1)}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">
                    {periodVariation.hasBrandOrSubbrandFilter
                      ? `Share SOV (${periodVariation.endLabel})`
                      : `SOV crudo (${periodVariation.endLabel})`}
                  </div>
                  <div className="font-mono-num text-base font-bold text-[#0099A8] mt-0.5">
                    {periodVariation.endShareSov.toFixed(1)}%
                  </div>
                  <div className="font-mono-num text-[11px] text-slate-400">
                    SOM: {periodVariation.endShareSom.toFixed(1)}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0099A8]/[0.05] border border-[#0099A8]/25">
                  <div className="text-[11px] font-medium text-[#0B3B60]">
                    Variación SOV ({periodVariation.startLabel} → {periodVariation.endLabel})
                  </div>
                  <div className="mt-0.5">
                    <DeltaText value={periodVariation.sovDeltaPp} unit="pp" />
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <span>Var. SOM:</span>
                    <DeltaText value={periodVariation.somDeltaPp} unit="pp" compact />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">Base evaluada</div>
                  <div className="font-mono-num text-base font-bold text-slate-900 mt-0.5">
                    {filteredRows.length.toLocaleString('es-AR')} reg.
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {periodVariation.hasBrandOrSubbrandFilter
                      ? 'Sobre universo Categoría/Canal'
                      : 'Seleccioná Brand/Sub-brand para Share'}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Single-month / Base Totals Bar */}
        {!periodVariation && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
            <div className="text-slate-600">
              Registros:{' '}
              <strong className="font-mono-num text-slate-900">
                {filteredRows.length.toLocaleString('es-AR')}
              </strong>{' '}
              <span className="text-slate-400">(de {rows.length.toLocaleString('es-AR')})</span>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              {metricMode === 'msus' ? (
                <>
                  <div>
                    <span className="text-slate-500">Total MSUs: </span>
                    <strong className="font-mono-num text-[#0B3B60]">
                      {formatNumberCompact(totals.msus)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Unidades: </span>
                    <strong className="font-mono-num text-slate-900">
                      {formatNumberCompact(totals.volumen)}
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-slate-500">SOV acumulado: </span>
                    <strong className="font-mono-num text-[#0099A8]">{totals.sov.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">SOM acumulado: </span>
                    <strong className="font-mono-num text-slate-900">{totals.som.toFixed(1)}%</strong>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <PresentationCard
        cardId={`raw-data-table-${metricMode}`}
        defaultTitle={`Tabla RAW DATA — ${metricMode === 'msus' ? 'MSUs & Unidades' : 'Share (SOV & SOM)'}`}
        defaultSubtitle={`Rango: ${startPeriod ? formatPeriodLabel(startPeriod) : '—'} a ${endPeriod ? formatPeriodLabel(endPeriod) : '—'} · ${filteredRows.length.toLocaleString('es-AR')} registros filtrados`}
      >
        {pageRows.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2 pr-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('period')}
                        className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
                      >
                        Mes {renderSortIcon('period')}
                      </button>
                    </th>
                    <th className="py-2 px-2 whitespace-nowrap">Categoría</th>
                    <th className="py-2 px-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('brandRaw')}
                        className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
                      >
                        Brand {renderSortIcon('brandRaw')}
                      </button>
                    </th>
                    <th className="py-2 px-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('subbrand')}
                        className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
                      >
                        Sub-brand {renderSortIcon('subbrand')}
                      </button>
                    </th>
                    <th className="py-2 px-2 whitespace-nowrap">Tier</th>
                    <th className="py-2 px-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('channelRaw')}
                        className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
                      >
                        Canal {renderSortIcon('channelRaw')}
                      </button>
                    </th>
                    {metricMode === 'msus' ? (
                      <>
                        <th className="py-2 px-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSort('msus')}
                            className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
                          >
                            MSUs {renderSortIcon('msus')}
                          </button>
                        </th>
                        <th className="py-2 pl-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSort('volumen')}
                            className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
                          >
                            Unidades {renderSortIcon('volumen')}
                          </button>
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 px-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSort('sov')}
                            className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
                          >
                            SOV (%) {renderSortIcon('sov')}
                          </button>
                        </th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSort('som')}
                            className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
                          >
                            SOM (%) {renderSortIcon('som')}
                          </button>
                        </th>
                        <th className="py-2 pl-2 text-right whitespace-nowrap">
                          Share s/ Filtro
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.map((r, idx) => {
                    const shareOfFilter =
                      totals.sov > 0
                        ? (r.sov / totals.sov) * 100
                        : totals.msus > 0
                          ? (r.volConvertido / totals.msus) * 100
                          : 0;
                    return (
                      <tr
                        key={`${r.period}-${r.brandRaw}-${r.subbrand}-${r.channelRaw}-${pageStart + idx}`}
                        className={`hover:bg-slate-50/80 ${
                          r.isPG ? 'bg-[#0099A8]/[0.03]' : ''
                        }`}
                      >
                        <td className="py-2 pr-3 font-mono-num text-slate-700 whitespace-nowrap">
                          {r.periodLabel}
                        </td>
                        <td className="py-2 px-2 text-slate-600 whitespace-nowrap">
                          {r.category}
                        </td>
                        <td className="py-2 px-2 font-medium text-slate-900 whitespace-nowrap">
                          {r.brandRaw}
                        </td>
                        <td className="py-2 px-2 text-slate-700 whitespace-nowrap">
                          {r.subbrand}
                        </td>
                        <td className="py-2 px-2 text-slate-500 whitespace-nowrap">
                          {r.tier}
                        </td>
                        <td className="py-2 px-2 text-slate-700 whitespace-nowrap">
                          <span>{r.channelRaw}</span>
                          <span className="text-slate-400 ml-1">({r.channelGroup})</span>
                        </td>
                        {metricMode === 'msus' ? (
                          <>
                            <td className="py-2 px-2 text-right font-mono-num font-semibold text-[#0B3B60] whitespace-nowrap">
                              {r.volConvertido.toLocaleString('es-AR', {
                                minimumFractionDigits: 3,
                                maximumFractionDigits: 3,
                              })}
                            </td>
                            <td className="py-2 pl-2 text-right font-mono-num text-slate-600 whitespace-nowrap">
                              {Math.round(r.volumen).toLocaleString('es-AR')}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-2 text-right font-mono-num font-semibold text-[#0099A8] whitespace-nowrap">
                              {r.sov.toFixed(2)}%
                            </td>
                            <td className="py-2 px-2 text-right font-mono-num text-slate-700 whitespace-nowrap">
                              {r.som.toFixed(2)}%
                            </td>
                            <td className="py-2 pl-2 text-right font-mono-num text-slate-500 whitespace-nowrap">
                              {shareOfFilter.toFixed(2)}%
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500"
              data-export-ignore="true"
            >
              <div className="font-mono-num">
                Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, sortedRows.length)} de{' '}
                {sortedRows.length.toLocaleString('es-AR')} registros
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Anterior
                </button>
                <span className="font-mono-num px-2">
                  Página {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
            No se encontraron registros para la combinación de filtros seleccionada.
          </div>
        )}
      </PresentationCard>
    </section>
  );
}
