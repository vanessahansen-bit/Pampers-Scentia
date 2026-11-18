import * as XLSX from 'xlsx';
import {
  ColumnMapping,
  DatasetMetadata,
  ParsedWorkbookResult,
  ScentiaRow,
} from '../types/scentia';
import {
  formatPeriodLabel,
  mapBrand,
  mapCategory,
  mapChannel,
  mapIsPG,
  mapTier,
  normalizeText,
  parseLocaleNumber,
  parsePeriod,
} from './mappings';

interface RawTable {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

function detectColumnMapping(headers: string[]): ColumnMapping {
  const norm = headers.map((h) => ({ raw: h, n: normalizeText(h) }));

  const findHeader = (patterns: RegExp[]): string | undefined => {
    for (const pat of patterns) {
      const hit = norm.find((h) => pat.test(h.n));
      if (hit) return hit.raw;
    }
    return undefined;
  };

  return {
    period: findHeader([/^(periodo|period|mes|month|fecha|date|año mes|ano mes)$/, /periodo|fecha|mes/]),
    category: findHeader([/^(categoria|category|mercado|market|segmento cat|rubro)$/, /categ|mercado/]),
    manufacturer: findHeader([/^(fabricante|manufacturer|empresa|company|compania|laboratorio)$/, /fabricante|empresa/]),
    brand: findHeader([/^(brand|marca)$/, /brand|marca(?!.*sub)/]),
    subbrand: findHeader([/^(subbrand|sub brand|submarca|sub marca|variedad|linea)$/, /subbrand|submarca|sub brand|sub marca/]),
    channel: findHeader([/^(canal|channel|canales)$/, /canal|channel/]),
    volConvertido: findHeader([/^(vol convertido|vol_convertido|volumen convertido|consumo|msu|msus)$/, /convertido|msu|consumo/]),
    volumen: findHeader([/^(volumen|volume|unidades|units|u)$/, /volumen(?!.*conv)|unidades/]),
    sov: findHeader([/^(sov|share of value|value share|share valor|vsov)$/, /\bsov\b|value share|share of value|share.*valor/]),
    som: findHeader([/^(som|share of market|volume share|share volumen)$/, /\bsom\b|share of market|volume share/]),
    valueSales: findHeader([/^(valor|value|facturacion|venta valor|sales value|pesos)$/, /facturacion|venta.*valor/]),
  };
}

function normalizeShareScale(rows: ScentiaRow[]): ScentiaRow[] {
  const nonZeroSov = rows.map((r) => r.sov).filter((v) => v > 0);
  const nonZeroSom = rows.map((r) => r.som).filter((v) => v > 0);

  const sovIsFraction = nonZeroSov.length > 0 && Math.max(...nonZeroSov) <= 1.0001;
  const somIsFraction = nonZeroSom.length > 0 && Math.max(...nonZeroSom) <= 1.0001;

  if (!sovIsFraction && !somIsFraction) return rows;

  return rows.map((r) => ({
    ...r,
    sov: sovIsFraction ? r.sov * 100 : r.sov,
    som: somIsFraction ? r.som * 100 : r.som,
  }));
}

function parseTableWithMapping(
  table: RawTable,
  mapping: ColumnMapping
): ScentiaRow[] {
  const { headers, rows, sheetName } = table;

  // Check if wide/pivoted period columns exist (e.g. headers like "Ene-25", "2025-07", etc.)
  const periodHeaders = headers
    .map((h) => ({ header: h, period: parsePeriod(h) }))
    .filter((x): x is { header: string; period: string } => x.period !== null);

  const isWideFormat = !mapping.period && periodHeaders.length >= 2;

  const out: ScentiaRow[] = [];

  if (isWideFormat) {
    // Check if there is a "Variable" / "Metrica" / "Indicador" column
    const metricCol = headers.find((h) =>
      /^(variable|metrica|indicador|measure|kpi|dato)$/i.test(normalizeText(h))
    );

    // Group pivoted rows by entity key + period if metricCol exists
    const grouped = new Map<string, ScentiaRow>();

    for (const rawRow of rows) {
      const catRaw = mapping.category ? String(rawRow[mapping.category] ?? '') : '';
      const brandRaw = mapping.brand ? String(rawRow[mapping.brand] ?? '').trim() : '';
      const mfgRaw = mapping.manufacturer ? String(rawRow[mapping.manufacturer] ?? '').trim() : '';
      const subRaw = mapping.subbrand ? String(rawRow[mapping.subbrand] ?? '').trim() : '';
      const chanRaw = mapping.channel ? String(rawRow[mapping.channel] ?? '').trim() : '';
      const metricName = metricCol ? normalizeText(String(rawRow[metricCol] ?? '')) : 'vol_convertido';

      if (!brandRaw && !subRaw && !chanRaw) continue;

      const category = mapCategory(catRaw, subRaw, sheetName);
      const brandGroup = mapBrand(brandRaw || mfgRaw, mfgRaw, category);
      const channelGroup = mapChannel(chanRaw);
      const tier = mapTier(subRaw, brandRaw, category);
      const isPG = mapIsPG(mfgRaw, brandRaw);

      for (const { header, period } of periodHeaders) {
        const val = parseLocaleNumber(rawRow[header]);
        const key = `${period}|${category}|${brandGroup}|${subRaw}|${chanRaw}`;
        let item = grouped.get(key);
        if (!item) {
          item = {
            period,
            periodLabel: formatPeriodLabel(period),
            category,
            manufacturer: mfgRaw || (isPG ? 'P&G' : brandGroup),
            brandRaw: brandRaw || brandGroup,
            brandGroup,
            isPG,
            subbrand: subRaw || brandRaw || 'General',
            tier,
            channelRaw: chanRaw || 'Total',
            channelGroup,
            volumen: 0,
            volConvertido: 0,
            som: 0,
            sov: 0,
          };
          grouped.set(key, item);
        }

        if (metricName.includes('convertido') || metricName.includes('msu') || metricName.includes('consumo')) {
          item.volConvertido += val / 1000;
        } else if (metricName.includes('volumen') || metricName.includes('unidad')) {
          item.volumen += val;
        } else if (metricName.includes('sov') || metricName.includes('value share') || metricName.includes('valor')) {
          item.sov += val;
        } else if (metricName.includes('som') || metricName.includes('market')) {
          item.som += val;
        } else {
          item.volConvertido += val / 1000;
        }
      }
    }

    return Array.from(grouped.values());
  }

  // Standard tidy/long format
  for (const rawRow of rows) {
    const rawPeriod = mapping.period ? rawRow[mapping.period] : undefined;
    const period = parsePeriod(rawPeriod);
    if (!period) continue;

    const catRaw = mapping.category ? String(rawRow[mapping.category] ?? '') : '';
    const mfgRaw = mapping.manufacturer ? String(rawRow[mapping.manufacturer] ?? '').trim() : '';
    const brandRaw = mapping.brand ? String(rawRow[mapping.brand] ?? '').trim() : '';
    const subRaw = mapping.subbrand ? String(rawRow[mapping.subbrand] ?? '').trim() : '';
    const chanRaw = mapping.channel ? String(rawRow[mapping.channel] ?? '').trim() : '';

    if (!brandRaw && !mfgRaw && !subRaw && !chanRaw) continue;

    const category = mapCategory(catRaw, subRaw, sheetName);
    const brandGroup = mapBrand(brandRaw || mfgRaw, mfgRaw, category);
    const channelGroup = mapChannel(chanRaw);
    const tier = mapTier(subRaw, brandRaw || mfgRaw, category);
    const isPG = mapIsPG(mfgRaw, brandRaw);

    const volumen = mapping.volumen ? parseLocaleNumber(rawRow[mapping.volumen]) : 0;
    const volConvertido = mapping.volConvertido
      ? parseLocaleNumber(rawRow[mapping.volConvertido]) / 1000
      : volumen / 1000;
    const som = mapping.som ? parseLocaleNumber(rawRow[mapping.som]) : 0;
    const sov = mapping.sov ? parseLocaleNumber(rawRow[mapping.sov]) : 0;
    const valueSales = mapping.valueSales ? parseLocaleNumber(rawRow[mapping.valueSales]) : undefined;

    out.push({
      period,
      periodLabel: formatPeriodLabel(period),
      category,
      manufacturer: mfgRaw || (isPG ? 'P&G' : brandGroup),
      brandRaw: brandRaw || mfgRaw || brandGroup,
      brandGroup,
      isPG,
      subbrand: subRaw || brandRaw || 'General',
      tier,
      channelRaw: chanRaw || 'General',
      channelGroup,
      volumen,
      volConvertido,
      som,
      sov,
      valueSales,
    });
  }

  return out;
}

export function buildParsedResult(
  rawTables: RawTable[],
  sourceName: string,
  sourceType: DatasetMetadata['sourceType'],
  customMapping?: ColumnMapping
): ParsedWorkbookResult {
  const validTables = rawTables.filter((t) => t.headers.length > 0 && t.rows.length > 0);
  if (validTables.length === 0) {
    throw new Error('No se encontraron filas con datos en el archivo.');
  }

  // Merge headers from all tabs for detection
  const allHeaders = Array.from(new Set(validTables.flatMap((t) => t.headers)));
  const mapping = customMapping ?? detectColumnMapping(allHeaders);

  const allRows: ScentiaRow[] = [];
  for (const table of validTables) {
    const tableMapping = customMapping ?? detectColumnMapping(table.headers);
    const parsed = parseTableWithMapping(table, tableMapping);
    allRows.push(...parsed);
  }

  const normalizedRows = normalizeShareScale(allRows);
  if (normalizedRows.length === 0) {
    throw new Error(
      'No se pudieron interpretar períodos o métricas válidas. Verificá el mapeo de columnas en "Configurar columnas".'
    );
  }

  const periods = Array.from(new Set(normalizedRows.map((r) => r.period))).sort();
  const unmappedChannels = Array.from(
    new Set(normalizedRows.filter((r) => r.channelGroup === 'Otros').map((r) => r.channelRaw))
  ).filter(Boolean);
  const unmappedSubbrands = Array.from(
    new Set(normalizedRows.filter((r) => r.tier === 'Otros').map((r) => `${r.brandRaw} · ${r.subbrand}`))
  ).filter(Boolean);

  return {
    rows: normalizedRows,
    rawTables: validTables,
    meta: {
      sourceName,
      sourceType,
      isSample: false,
      rowCount: normalizedRows.length,
      sheetNames: validTables.map((t) => t.sheetName),
      rawHeaders: allHeaders,
      mapping,
      periods,
      unmappedChannels,
      unmappedSubbrands,
      loadedAt: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    },
  };
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const res: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      res.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  res.push(cur);
  return res;
}

export function parseDelimitedGrid(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const sample = lines.slice(0, 5).join('\n');
  const commaCount = (sample.match(/,/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  const delimiter =
    tabCount > commaCount && tabCount >= semiCount
      ? '\t'
      : semiCount > commaCount
        ? ';'
        : ',';
  return lines.map((line) => parseDelimitedLine(line, delimiter));
}

function parsePivotVolumeNumber(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (raw === null || raw === undefined) return 0;
  let str = String(raw).trim();
  if (!str || str === '-' || str === 'N/A' || str === '#N/A') return 0;
  str = str.replace(/[$\s]/g, '');

  // Scentia CSV/Sheets dot-thousands format where Excel/Sheets may strip trailing zeros (e.g., "1.72" = 1720, "19.2" = 19200, "164.751.974" = 164751974)
  if (/^\d+(\.\d+)+$/.test(str)) {
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length < 3) {
      const n = Number(parts[0] + parts[1].padEnd(3, '0'));
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(parts.join(''));
    return Number.isFinite(n) ? n : 0;
  }

  return parseLocaleNumber(str);
}

function parsePivotShareNumber(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (raw === null || raw === undefined) return 0;
  let str = String(raw).trim();
  if (!str || str === '-' || str === 'N/A' || str === '#N/A') return 0;
  str = str.replace(/[%\s]/g, '');
  if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.');
  }
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : 0;
}

type PivotMetricKind = 'volumen' | 'som' | 'volConvertido' | 'sov';

function classifyPivotMetricHeader(headerCell: string): PivotMetricKind | null {
  const n = normalizeText(headerCell);
  if (!n) return null;
  if (n.includes('convertido') || n.includes('msu') || n.includes('consumo')) return 'volConvertido';
  if (n === 'sov' || n.includes('value share') || n.includes('share of value')) return 'sov';
  if (n === 'som' || n.includes('share of market') || n.includes('volume share')) return 'som';
  if (n === 'volumen' || n === 'volume' || n.includes('unidades')) return 'volumen';
  return null;
}

function tryParseScentiaPivotGrid(
  grid: unknown[][],
  sheetName: string,
  sourceName: string,
  sourceType: DatasetMetadata['sourceType']
): ParsedWorkbookResult | null {
  if (grid.length < 4) return null;

  // Locate header row within first 8 rows that contains period columns and dimension headers
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(8, grid.length); r++) {
    const row = grid[r].map((c) => String(c ?? '').trim());
    const periodHits = row.filter((c) => parsePeriod(c) !== null).length;
    const normJoined = normalizeText(row.join(' '));
    const hasDimHeaders =
      (normJoined.includes('brand') || normJoined.includes('marca')) &&
      (normJoined.includes('canal') || normJoined.includes('channel'));
    if (periodHits >= 2 && hasDimHeaders) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx < 1) return null;

  const headerRow = grid[headerRowIdx].map((c) => String(c ?? '').trim());
  const metricRow = grid[headerRowIdx - 1].map((c) => String(c ?? '').trim());

  // Check if metricRow above has block labels like Volumen, SOM, Vol_Convertido, SOV
  const metricBlocks: { col: number; kind: PivotMetricKind }[] = [];
  for (let c = 0; c < metricRow.length; c++) {
    const kind = classifyPivotMetricHeader(metricRow[c]);
    if (kind) metricBlocks.push({ col: c, kind });
  }
  if (metricBlocks.length === 0) return null;

  // Map dimension column indices
  const findCol = (patterns: RegExp[]): number => {
    const norms = headerRow.map((h) => normalizeText(h));
    for (const pat of patterns) {
      const idx = norms.findIndex((n) => pat.test(n));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colManuf = findCol([/^(manuf|fabricante|manufacturer|empresa)$/]);
  const colBrand = findCol([/^(brand|marca)$/]);
  const colSubbrand = findCol([/^(subbrand|sub brand|submarca|sub marca)$/]);
  const colChannel = findCol([/^(canal|channel|canales)$/]);
  const colCategory = findCol([/^(categoria|category|mercado)$/]);

  // Build column -> { period, kind } assignments across all period columns
  const colAssignments: { col: number; period: string; kind: PivotMetricKind }[] = [];
  let activeKind: PivotMetricKind = metricBlocks[0].kind;
  let blockCursor = 0;

  for (let c = 0; c < headerRow.length; c++) {
    while (blockCursor < metricBlocks.length && c >= metricBlocks[blockCursor].col) {
      activeKind = metricBlocks[blockCursor].kind;
      blockCursor++;
    }
    const period = parsePeriod(headerRow[c]);
    if (period) {
      colAssignments.push({ col: c, period, kind: activeKind });
    }
  }

  if (colAssignments.length === 0) return null;

  const uniquePeriods = Array.from(new Set(colAssignments.map((a) => a.period))).sort();
  const parsedRows: ScentiaRow[] = [];

  for (let r = headerRowIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row || row.length === 0) continue;

    const firstCell = normalizeText(String(row[0] ?? ''));
    if (
      firstCell.startsWith('total general') ||
      firstCell === 'total' ||
      firstCell.startsWith('gran total') ||
      firstCell.startsWith('subtotal')
    ) {
      continue;
    }

    const mfgRaw = colManuf >= 0 ? String(row[colManuf] ?? '').trim() : '';
    const brandRaw = colBrand >= 0 ? String(row[colBrand] ?? '').trim() : '';
    const subRaw = colSubbrand >= 0 ? String(row[colSubbrand] ?? '').trim() : '';
    const chanRaw = colChannel >= 0 ? String(row[colChannel] ?? '').trim() : '';
    const catRaw = colCategory >= 0 ? String(row[colCategory] ?? '').trim() : '';

    if (!mfgRaw && !brandRaw && !subRaw && !chanRaw) continue;
    if (
      normalizeText(brandRaw).startsWith('total') ||
      normalizeText(chanRaw).startsWith('total')
    ) {
      continue;
    }

    const category = mapCategory(catRaw, subRaw, sheetName);
    const brandGroup = mapBrand(brandRaw || mfgRaw, mfgRaw, category);
    const channelGroup = mapChannel(chanRaw);
    const tier = mapTier(subRaw, brandRaw || mfgRaw, category);
    const isPG = mapIsPG(mfgRaw, brandRaw);

    const byPeriod = new Map<
      string,
      { volumen: number; volConvertido: number; som: number; sov: number }
    >();

    for (const assign of colAssignments) {
      const rawCell = row[assign.col];
      if (rawCell === undefined || rawCell === null || String(rawCell).trim() === '') continue;

      let bucket = byPeriod.get(assign.period);
      if (!bucket) {
        bucket = { volumen: 0, volConvertido: 0, som: 0, sov: 0 };
        byPeriod.set(assign.period, bucket);
      }

      if (assign.kind === 'volumen') {
        bucket.volumen += parsePivotVolumeNumber(rawCell);
      } else if (assign.kind === 'volConvertido') {
        bucket.volConvertido += parsePivotVolumeNumber(rawCell) / 1000;
      } else if (assign.kind === 'som') {
        bucket.som += parsePivotShareNumber(rawCell);
      } else if (assign.kind === 'sov') {
        bucket.sov += parsePivotShareNumber(rawCell);
      }
    }

    for (const [period, metrics] of byPeriod.entries()) {
      if (
        metrics.volumen === 0 &&
        metrics.volConvertido === 0 &&
        metrics.som === 0 &&
        metrics.sov === 0
      ) {
        continue;
      }

      parsedRows.push({
        period,
        periodLabel: formatPeriodLabel(period),
        category,
        manufacturer: mfgRaw || (isPG ? 'P&G' : brandGroup),
        brandRaw: brandRaw || mfgRaw || brandGroup,
        brandGroup,
        isPG,
        subbrand: subRaw || brandRaw || 'General',
        tier,
        channelRaw: chanRaw || 'General',
        channelGroup,
        volumen: metrics.volumen,
        volConvertido: metrics.volConvertido,
        som: metrics.som,
        sov: metrics.sov,
      });
    }
  }

  if (parsedRows.length === 0) return null;

  const normalizedRows = normalizeShareScale(parsedRows);
  const dimHeaders = headerRow.filter((h, idx) => h && !parsePeriod(h) && idx < 12);
  const detectedMapping = detectColumnMapping(dimHeaders);
  detectedMapping.volumen = 'Volumen';
  detectedMapping.volConvertido = 'Vol_Convertido';
  detectedMapping.som = 'SOM';
  detectedMapping.sov = 'SOV';
  detectedMapping.period = 'PERIODO (Columnas)';

  const unmappedChannels = Array.from(
    new Set(normalizedRows.filter((r) => r.channelGroup === 'Otros').map((r) => r.channelRaw))
  ).filter(Boolean);
  const unmappedSubbrands = Array.from(
    new Set(
      normalizedRows
        .filter((r) => r.tier === 'Otros')
        .map((r) => `${r.brandRaw} · ${r.subbrand}`)
    )
  ).filter(Boolean);

  return {
    rows: normalizedRows,
    rawTables: [],
    meta: {
      sourceName,
      sourceType,
      isSample: false,
      rowCount: normalizedRows.length,
      sheetNames: [sheetName],
      rawHeaders: Array.from(
        new Set([...dimHeaders, 'Volumen', 'SOM', 'Vol_Convertido', 'SOV'])
      ),
      mapping: detectedMapping,
      periods: uniquePeriods,
      unmappedChannels,
      unmappedSubbrands,
      loadedAt: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    },
  };
}

export function parseWorkbookArrayBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  sourceType: DatasetMetadata['sourceType'] = 'file'
): ParsedWorkbookResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

  // Try Scentia pivot format on first matching sheet
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });
    const pivotResult = tryParseScentiaPivotGrid(grid, sheetName, fileName, sourceType);
    if (pivotResult) return pivotResult;
  }

  const rawTables: RawTable[] = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const headers = jsonRows.length > 0 ? Object.keys(jsonRows[0]) : [];
    return { sheetName, headers, rows: jsonRows };
  });

  return buildParsedResult(rawTables, fileName, sourceType);
}

export function parseCsvOrTsvText(
  text: string,
  sourceName: string,
  sourceType: DatasetMetadata['sourceType'] = 'pasted'
): ParsedWorkbookResult {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('El contenido está vacío.');
  }

  // Try direct Scentia multi-header pivot CSV grid first (preserves exact numeric strings like "19.2" & "164.751.974")
  const grid = parseDelimitedGrid(trimmed);
  const pivotResult = tryParseScentiaPivotGrid(grid, 'Pampers Scentia', sourceName, sourceType);
  if (pivotResult) {
    return pivotResult;
  }

  const workbook = XLSX.read(trimmed, { type: 'string' });
  const rawTables: RawTable[] = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const headers = jsonRows.length > 0 ? Object.keys(jsonRows[0]) : [];
    return { sheetName, headers, rows: jsonRows };
  });

  return buildParsedResult(rawTables, sourceName, sourceType);
}

export function parseAppsScriptPayload(
  payload: unknown,
  fallbackSourceName = 'Google Apps Script'
): ParsedWorkbookResult {
  if (!payload || typeof payload !== 'object') {
    throw new Error('La respuesta de Google Apps Script no tiene un formato JSON válido.');
  }

  const obj = payload as {
    error?: string;
    spreadsheetName?: string;
    sheetName?: string;
    values?: unknown[][];
    rows?: Record<string, unknown>[];
  };

  if (obj.error) {
    throw new Error(`Google Apps Script: ${obj.error}`);
  }

  const sourceName = obj.spreadsheetName
    ? `${obj.spreadsheetName}${obj.sheetName ? ` (${obj.sheetName})` : ''}`
    : fallbackSourceName;

  if (Array.isArray(obj.values) && obj.values.length > 0) {
    const sheetLabel = obj.sheetName || 'Pampers Scentia';
    const pivotResult = tryParseScentiaPivotGrid(
      obj.values,
      sheetLabel,
      sourceName,
      'sheets-url'
    );
    if (pivotResult) return pivotResult;

    // Fallback: flat table where row 0 is headers
    const headers = obj.values[0].map((h) => String(h ?? '').trim());
    const jsonRows: Record<string, unknown>[] = [];
    for (let i = 1; i < obj.values.length; i++) {
      const rowArr = obj.values[i];
      if (!rowArr || rowArr.every((v) => String(v ?? '').trim() === '')) continue;
      const rec: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        if (h) rec[h] = rowArr[idx] ?? '';
      });
      jsonRows.push(rec);
    }
    return buildParsedResult(
      [{ sheetName: sheetLabel, headers: headers.filter(Boolean), rows: jsonRows }],
      sourceName,
      'sheets-url'
    );
  }

  if (Array.isArray(obj.rows) && obj.rows.length > 0) {
    const headers = Object.keys(obj.rows[0]);
    return buildParsedResult(
      [{ sheetName: obj.sheetName || 'Pampers Scentia', headers, rows: obj.rows }],
      sourceName,
      'sheets-url'
    );
  }

  throw new Error(
    'El Web App de Apps Script respondió sin filas ("values" o "rows" vacío).'
  );
}

export function generateAiStudioPrompt(meta: DatasetMetadata, rows: ScentiaRow[]): string {
  const channels = Array.from(new Set(rows.map((r) => r.channelRaw))).slice(0, 12).join(', ');
  const brands = Array.from(new Set(rows.map((r) => r.brandRaw))).slice(0, 12).join(', ');
  const periodsRange =
    meta.periods.length > 0
      ? `${formatPeriodLabel(meta.periods[0])} a ${formatPeriodLabel(meta.periods[meta.periods.length - 1])} (${meta.periods.length} meses)`
      : 'Evolución mensual';

  return `Actuá como Senior Frontend & Data Engineer. Creá un dashboard ejecutivo minimalista en Google AI Studio para Pampers Argentina (Pañales y Toallitas Húmedas) conectado al Google Sheets "${meta.sourceName}".

1. ESTRUCTURA DETECTADA EN EL ARCHIVO:
- Solapas detectadas: ${meta.sheetNames.join(', ')}
- Columnas originales: ${meta.rawHeaders.join(', ')}
- Rango temporal: ${periodsRange}
- Métricas base: Volumen (unidades), SOM (Share of Market), Vol_Convertido (MSUs / Consumo) y SOV (Share of Value).
- Canales detectados en origen: ${channels}
- Marcas detectadas en origen: ${brands}

2. REGLAS DE AGRUPACIÓN DE CANALES:
- RDs = Almacenes y kioscos + Self Independientes
- DPP = Farmacias
- WHS = Mayoristas - CF
- HSM = Self Cadenas
- ECOMM = Pedidos Ya + Rappi

3. TAXONOMÍA DE TIERS POR SUBBRAND:
- Tier 0: Huggies Dermacare
- Tier 1: Pampers Premium Care, Pampers Deluxe Protection, Huggies Natural Care, Huggies Supreme Care, Huggies Ultra Confort, BabySec Super Premium, Estrella Premium
- Tier 2: Pampers Baby Dry, Huggies FlexiComfort, Babysec Premium, Estrella, Duffy Premium Cotton
- Tier 2.5: Pampers Babysan, Huggies Protect Plus, Babysec Ultra, Babysec Classic, Duffy Cotton
- Tier 3: Pampers Supersec, Huggies Classic, Huggies Maxi Protect
- Pants: Todos los pañales Pants de cualquier marca
- Wipes: Toallitas húmedas de todos los players
- Summer: Pampers Splashers, Huggies Little Swimmers

4. FOCO DE MARCAS:
- En Pañales: Pampers (#0099A8), Kimberly Clark (#D61F2C), BabySec (#2563EB), Estrella (#D97706), Duffy (#16A34A), y el remanente agrupado en M.Propias (#64748B).
- En Toallitas Húmedas: mostrar todos los players.

5. SECCIONES OBLIGATORIAS DEL DASHBOARD:
A. CONSUMO & SELL OUT: 6 gráficos de evolución mensual (Pañales Total, Toallitas Total, Pañales P&G, Pañales P&G por canal, Toallitas P&G, Toallitas P&G por canal) con tarjetas KPI de variación (vs PM, vs P3M, vs P6M).
B. SHARE OF VALUE: Evolución mensual de SOV por marca + tabla comparativa PM, vs P3M y vs P6M + tabla ponderada CYTD y FYTD (año fiscal jul-jun).
C. CANALES: Evolución mensual de SOV para RDs, DPP, WHS, HSM y ECOMM, cada uno acompañado de un mini cuadro de liderazgo (#1, #2, #3...) con PM, vs P3M y vs P6M.
D. SEGMENTO TIERS: Cuadros comparativos de liderazgo (#1, #2, #3...) con PM, vs P3M y vs P6M para PANTS, TIER 1, TIER 2, TIER 2.5, TIER 3 y WIPES.

6. ESTÉTICA:
Diseño limpio y minimalista, fondo neutro claro (#F8FAFC / #FFFFFF), tipografía con numerales tabulares, colores primarios de Pampers (Teal #0099A8 y Navy #0B3B60) y colores propios de cada marca en las líneas.`;
}
