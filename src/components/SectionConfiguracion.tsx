import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Code2,
  Download,
  FileCode2,
  Link2,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Unlink,
} from 'lucide-react';
import { useState } from 'react';
import {
  buildParsedResult,
  parseAppsScriptPayload,
  parseCsvOrTsvText,
  parseWorkbookArrayBuffer,
} from '../lib/parser';
import { ColumnMapping, ParsedWorkbookResult } from '../types/scentia';

export const LINKED_URL_STORAGE_KEY = 'pampers_scentia_linked_url_v1';
export const LINKED_SHEET_STORAGE_KEY = 'pampers_scentia_linked_sheet_v1';

export const APPS_SCRIPT_CODE = `function getScentiaData(requestedSheet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = requestedSheet ? ss.getSheetByName(requestedSheet) : ss.getSheets()[0];

  if (!sheet) {
    return { error: 'Solapa no encontrada: ' + requestedSheet };
  }

  return {
    spreadsheetName: ss.getName(),
    sheetName: sheet.getName(),
    sheets: ss.getSheets().map(function(s) { return s.getName(); }),
    values: sheet.getDataRange().getDisplayValues()
  };
}

function doGet(e) {
  if (e && e.parameter && e.parameter.view === 'html') {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Pampers Scentia · Conector Google Sheets');
  }

  var requestedSheet = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : null;
  var payload = getScentiaData(requestedSheet);

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const APPS_SCRIPT_HTML = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pampers Scentia · Conector</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        margin: 0;
        padding: 24px;
        background: #f8fafc;
        color: #0f172a;
      }
      .card {
        max-width: 960px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 24px;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 20px;
        color: #0b3b60;
      }
      p.meta {
        margin: 0 0 16px;
        font-size: 13px;
        color: #64748b;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        margin-bottom: 16px;
      }
      select, button {
        font-size: 13px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
      }
      button {
        background: #0099a8;
        color: #ffffff;
        border-color: #0099a8;
        font-weight: 600;
        cursor: pointer;
      }
      .table-wrap {
        overflow-x: auto;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      th, td {
        padding: 6px 10px;
        border-bottom: 1px solid #f1f5f9;
        text-align: left;
        white-space: nowrap;
      }
      th {
        background: #f8fafc;
        color: #475569;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Pampers Scentia — Conector Google Sheets</h1>
      <p id="status" class="meta">Cargando datos de la planilla...</p>

      <div class="toolbar">
        <select id="sheetSelect" onchange="loadSheet(this.value)"></select>
        <button type="button" onclick="loadSheet(document.getElementById('sheetSelect').value)">
          Actualizar vista
        </button>
      </div>

      <div class="table-wrap">
        <table id="previewTable"></table>
      </div>
    </div>

    <script>
      function loadSheet(sheetName) {
        document.getElementById('status').textContent = 'Sincronizando...';
        google.script.run
          .withSuccessHandler(renderSheet)
          .withFailureHandler(function(err) {
            document.getElementById('status').textContent = 'Error: ' + (err.message || err);
          })
          .getScentiaData(sheetName || null);
      }

      function renderSheet(data) {
        if (!data || data.error) {
          document.getElementById('status').textContent = (data && data.error) || 'Sin datos.';
          return;
        }
        var select = document.getElementById('sheetSelect');
        select.innerHTML = '';
        (data.sheets || []).forEach(function(name) {
          var opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          if (name === data.sheetName) opt.selected = true;
          select.appendChild(opt);
        });

        var rows = data.values || [];
        document.getElementById('status').textContent =
          data.spreadsheetName + ' · Solapa "' + data.sheetName + '" · ' + rows.length + ' filas';

        var table = document.getElementById('previewTable');
        table.innerHTML = '';
        rows.slice(0, 20).forEach(function(row, idx) {
          var tr = document.createElement('tr');
          row.slice(0, 12).forEach(function(cell) {
            var el = document.createElement(idx < 2 ? 'th' : 'td');
            el.textContent = cell;
            tr.appendChild(el);
          });
          table.appendChild(tr);
        });
      }

      loadSheet(null);
    </script>
  </body>
</html>`;

export async function fetchAndParseRemoteSheet(
  url: string,
  sheetName?: string
): Promise<ParsedWorkbookResult> {
  const resp = await fetch('/api/fetch-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim(), sheetName: sheetName?.trim() || undefined }),
  });
  const payload = await resp.json();
  if (!resp.ok) {
    throw new Error(payload.error || 'No se pudo leer el enlace de Google Sheets / Apps Script.');
  }

  if (payload.format === 'apps-script' && payload.payload) {
    return parseAppsScriptPayload(payload.payload, 'Google Apps Script (Pampers Scentia)');
  }

  if (payload.format === 'xlsx' && payload.base64) {
    const binary = atob(payload.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return parseWorkbookArrayBuffer(
      bytes.buffer,
      `Google Sheets (${String(payload.spreadsheetId || '').slice(0, 8)}…)`,
      'sheets-url'
    );
  }

  if (payload.format === 'csv' && payload.text) {
    return parseCsvOrTsvText(
      payload.text,
      `Google Sheets (${String(payload.spreadsheetId || 'AppsScript').slice(0, 12)})`,
      'sheets-url'
    );
  }

  throw new Error('Formato de respuesta no reconocido desde Google Sheets.');
}

const MAPPING_FIELDS: { key: keyof ColumnMapping; label: string; hint: string }[] = [
  { key: 'period', label: 'Período / Mes', hint: 'Ej: Periodo, Mes, Fecha (YYYY-MM)' },
  { key: 'category', label: 'Categoría', hint: 'Pañales vs Toallitas Húmedas' },
  { key: 'manufacturer', label: 'Fabricante', hint: 'Ej: P&G, Kimberly Clark' },
  { key: 'brand', label: 'Brand / Marca', hint: 'Ej: Pampers, Huggies, BabySec' },
  { key: 'subbrand', label: 'Sub-brand / Submarca', hint: 'Ej: Premium Care, Baby Dry, Pants' },
  { key: 'channel', label: 'Canal', hint: 'Ej: Farmacias, Almacenes y kioscos' },
  { key: 'volConvertido', label: 'Vol_Convertido (SU → MSUs)', hint: 'SU dividido por 1.000 = MSUs' },
  { key: 'volumen', label: 'Volumen (Unidades)', hint: 'Cantidad de unidades físicas' },
  { key: 'sov', label: 'SOV (Value Share)', hint: 'Share of Value (%)' },
  { key: 'som', label: 'SOM (Market Share)', hint: 'Share of Market (%)' },
  { key: 'valueSales', label: 'Valor / Facturación (Opc.)', hint: 'Opcional para ponderación exacta' },
];

interface SectionConfiguracionProps {
  currentData: ParsedWorkbookResult;
  linkedUrl: string;
  linkedSheetName: string;
  fiscalStartMonth: number;
  rebaseSov: boolean;
  onChangeFiscalStartMonth: (val: number) => void;
  onToggleRebaseSov: () => void;
  onExportCsv: () => void;
  onDataLoaded: (result: ParsedWorkbookResult, savedUrl?: string, savedSheet?: string) => void;
  onUnlinkUrl: () => void;
  onReloadBundledData: () => Promise<void>;
  onBackHome?: () => void;
}

export function SectionConfiguracion({
  currentData,
  linkedUrl,
  linkedSheetName,
  fiscalStartMonth,
  rebaseSov,
  onChangeFiscalStartMonth,
  onToggleRebaseSov,
  onExportCsv,
  onDataLoaded,
  onUnlinkUrl,
  onReloadBundledData,
  onBackHome,
}: SectionConfiguracionProps) {
  const [urlInput, setUrlInput] = useState(linkedUrl);
  const [sheetNameInput, setSheetNameInput] = useState(linkedSheetName);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [draftMapping, setDraftMapping] = useState<ColumnMapping>(currentData.meta.mapping);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  const handleLinkAndSync = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!urlInput.trim()) {
      setErrorMsg('Pegá la URL de Google Apps Script (/exec) o el enlace de tu Google Sheet.');
      return;
    }
    setIsLoading(true);
    try {
      const parsed = await fetchAndParseRemoteSheet(urlInput, sheetNameInput);
      onDataLoaded(parsed, urlInput.trim(), sheetNameInput.trim());
      setDraftMapping(parsed.meta.mapping);
      setSuccessMsg(
        `Sincronizado correctamente: ${parsed.meta.sourceName} (${parsed.meta.rowCount.toLocaleString('es-AR')} registros).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al conectar con Google Apps Script / Sheets.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReloadBase = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      await onReloadBundledData();
      setSuccessMsg('Se recargó el archivo base "Pampers Scentia".');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo recargar el archivo base.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyMapping = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (currentData.rawTables.length === 0) {
      setErrorMsg(
        'La estructura dinámica de Pampers Scentia ya detecta automáticamente las columnas y bloques de períodos.'
      );
      return;
    }
    try {
      const rebuilt = buildParsedResult(
        currentData.rawTables,
        currentData.meta.sourceName,
        currentData.meta.sourceType,
        draftMapping
      );
      onDataLoaded(rebuilt);
      setSuccessMsg('Mapeo aplicado y datos re-procesados.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al aplicar el mapeo.');
    }
  };

  const handleCopyScript = async () => {
    await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyHtml = async () => {
    await navigator.clipboard.writeText(APPS_SCRIPT_HTML);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B3B60] text-balance">
            Configuración — Vinculación Google Sheets &amp; Parámetros
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Conectá tu archivo &ldquo;Pampers Scentia&rdquo; mediante Google Apps Script, ajustá el cálculo de métricas (Vol_Convertido SU ÷ 1.000 = MSUs) y auditá las categorías.
          </p>
        </div>

        {onBackHome && (
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B3B60] bg-white border border-slate-200 hover:border-[#0099A8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#0099A8]" />
            <span>Volver al inicio</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          {successMsg}
        </div>
      )}

      {/* 1. Google Sheets & Apps Script Link Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0B3B60]">
            <Link2 className="w-4 h-4 text-[#0099A8]" />
            <span>1. Vincular archivo Google Sheets mediante Apps Script</span>
          </div>
          <p className="text-xs text-slate-600">
            Pegá la URL de implementación de tu Web App de Apps Script (
            <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
              https://script.google.com/macros/s/.../exec
            </code>
            ) o un enlace compartido de Google Sheets para sincronizar los datos en vivo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              URL del Web App (Apps Script) o enlace de Google Sheets
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0099A8]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Nombre de solapa (opcional)
            </label>
            <input
              type="text"
              value={sheetNameInput}
              onChange={(e) => setSheetNameInput(e.target.value)}
              placeholder="Ej: Hoja 1 (auto)"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0099A8]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-4">
            {linkedUrl && (
              <button
                type="button"
                onClick={() => {
                  onUnlinkUrl();
                  setUrlInput('');
                  setSheetNameInput('');
                  setSuccessMsg('Se desvinculó la URL remota.');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Desvincular URL</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleReloadBase}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#0B3B60] underline underline-offset-4 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recargar archivo base &ldquo;Pampers Scentia&rdquo;</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleLinkAndSync}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0099A8] hover:bg-[#007F8C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Sincronizando...' : 'Vincular y Sincronizar'}</span>
          </button>
        </div>

        {/* Apps Script guide: Code.gs + index.html */}
        <div className="border-t border-slate-200 pt-5 space-y-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Archivos para Google Apps Script (Code.gs + index.html)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pasos: Extensiones → Apps Script → Pegar <code className="font-mono text-[11px]">Code.gs</code> y crear el archivo HTML <code className="font-mono text-[11px]">index.html</code> (Archivo → Nuevo → Archivo HTML → <code className="font-mono text-[11px]">index</code>) → Implementar → Nueva implementación → Aplicación web → Quién tiene acceso: Cualquier usuario.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Code.gs */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3B60]">
                  <Code2 className="w-4 h-4 text-[#0099A8]" />
                  <span>Code.gs</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B3B60] hover:bg-[#082B47] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedScript ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <ClipboardCopy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedScript ? 'Copiado' : 'Copiar Code.gs'}</span>
                </button>
              </div>
              <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono leading-relaxed overflow-auto max-h-80">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>

            {/* index.html */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3B60]">
                  <FileCode2 className="w-4 h-4 text-[#0099A8]" />
                  <span>index.html</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0099A8] hover:bg-[#007F8C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedHtml ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <ClipboardCopy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedHtml ? 'Copiado' : 'Copiar index.html'}</span>
                </button>
              </div>
              <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono leading-relaxed overflow-auto max-h-80">
                {APPS_SCRIPT_HTML}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Calculation & Display Parameters */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-[#0B3B60] flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0099A8]" />
              <span>2. Parámetros de Cálculo y Visualización</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Conversión aplicada: Vol_Convertido (SU) ÷ 1.000 = MSUs.
            </p>
          </div>

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV procesado</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="fiscal-start-select" className="block text-xs font-medium text-slate-700">
              Año Fiscal (FYTD)
            </label>
            <select
              id="fiscal-start-select"
              value={fiscalStartMonth}
              onChange={(e) => onChangeFiscalStartMonth(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#0099A8] cursor-pointer"
            >
              <option value={7}>FY: Jul–Jun (P&amp;G)</option>
              <option value={1}>FY: Ene–Dic</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-700">Cálculo Share of Value</div>
            <button
              type="button"
              onClick={onToggleRebaseSov}
              className="w-full text-left px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 transition-colors cursor-pointer"
            >
              {rebaseSov ? 'SOV Segmento: 100% (Re-baseado)' : 'SOV Directo del archivo'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Columns & Taxonomy Audit */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h3 className="font-display text-sm font-semibold text-[#0B3B60] flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#0099A8]" />
            <span>3. Columnas Detectadas y Auditoría de Agrupaciones</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Verificación automática de columnas Scentia, canales (RDs, DPP, WHS, HSM, ECOMM) y Sub-brands por Tier.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MAPPING_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                {field.label}
              </label>
              <select
                value={draftMapping[field.key] ?? ''}
                onChange={(e) =>
                  setDraftMapping((prev) => ({
                    ...prev,
                    [field.key]: e.target.value || undefined,
                  }))
                }
                disabled={currentData.rawTables.length === 0}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0099A8] disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">(Auto / Formato dinámico)</option>
                {currentData.meta.rawHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">{field.hint}</p>
            </div>
          ))}
        </div>

        {currentData.rawTables.length > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleApplyMapping}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0099A8] hover:bg-[#007F8C] rounded-lg transition-colors cursor-pointer"
            >
              Re-procesar con este mapeo
            </button>
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-semibold text-slate-800 mb-1">
              Canales no agrupados ({currentData.meta.unmappedChannels.length})
            </div>
            {currentData.meta.unmappedChannels.length === 0 ? (
              <p className="text-slate-500">
                Todos los canales mapearon a RDs, DPP, WHS, HSM o ECOMM.
              </p>
            ) : (
              <p className="text-amber-700">
                {currentData.meta.unmappedChannels.join(' · ')}
              </p>
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-800 mb-1">
              Sub-brands en &ldquo;Otros&rdquo; ({currentData.meta.unmappedSubbrands.length})
            </div>
            {currentData.meta.unmappedSubbrands.length === 0 ? (
              <p className="text-slate-500">
                Todas las Sub-brands mapearon a Tier 0–3, Pants, Wipes o Summer.
              </p>
            ) : (
              <p className="text-amber-700 max-h-24 overflow-y-auto">
                {currentData.meta.unmappedSubbrands.join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>

    </section>
  );
}
