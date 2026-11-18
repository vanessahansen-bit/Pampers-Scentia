import { Download, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionCanales } from './components/SectionCanales';
import {
  LINKED_SHEET_STORAGE_KEY,
  LINKED_URL_STORAGE_KEY,
  SectionConfiguracion,
  fetchAndParseRemoteSheet,
} from './components/SectionConfiguracion';
import { SectionConsumo } from './components/SectionConsumo';
import { SectionPortada } from './components/SectionPortada';
import { SectionRawData } from './components/SectionRawData';
import { SectionResumen } from './components/SectionResumen';
import { SectionShareOfValue } from './components/SectionShareOfValue';
import { SectionTiers } from './components/SectionTiers';
import { DashboardIndexId, Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { exportAnalyticsToCsv, getSortedPeriods } from './lib/analytics';
import { formatPeriodLabel } from './lib/mappings';
import { parseCsvOrTsvText } from './lib/parser';
import { buildSampleDataset } from './lib/sampleData';
import { ParsedWorkbookResult } from './types/scentia';

const BUNDLED_SCENTIA_PATH = '/assets/aistudio/Pampers_Scentia_ace43089';

export default function App() {
  const [activeIndex, setActiveIndex] = useState<DashboardIndexId>('home');
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dataset, setDataset] = useState<ParsedWorkbookResult>(() => buildSampleDataset());
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [linkedUrl, setLinkedUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(LINKED_URL_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [linkedSheetName, setLinkedSheetName] = useState<string>(() => {
    try {
      return localStorage.getItem(LINKED_SHEET_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const [consumptionMetric, setConsumptionMetric] = useState<'volConvertido' | 'volumen'>('volConvertido');
  const [fiscalStartMonth, setFiscalStartMonth] = useState<number>(7);
  const [rebaseSov, setRebaseSov] = useState<boolean>(true);

  const loadBundledDataset = useCallback(async () => {
    const resp = await fetch(BUNDLED_SCENTIA_PATH);
    if (!resp.ok) {
      throw new Error('No se pudo cargar el archivo base Pampers Scentia.');
    }
    const text = await resp.text();
    const parsed = parseCsvOrTsvText(text, 'Pampers Scentia (Google Sheets)', 'file');
    setDataset(parsed);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (linkedUrl) {
          try {
            const remote = await fetchAndParseRemoteSheet(linkedUrl, linkedSheetName);
            if (active) {
              setDataset(remote);
              setSyncWarning(null);
            }
            return;
          } catch (err) {
            if (active) {
              setSyncWarning(
                err instanceof Error
                  ? `No se pudo actualizar desde Apps Script (${err.message}). Mostrando datos locales de Pampers Scentia.`
                  : 'Mostrando datos locales de Pampers Scentia.'
              );
            }
          }
        }
        await loadBundledDataset();
      } catch {
        // Keeps fallback sample dataset if bundled fetch unexpectedly fails
      } finally {
        if (active) setIsInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [linkedUrl, linkedSheetName, loadBundledDataset]);

  const handleManualSync = async () => {
    if (!linkedUrl) {
      setActiveIndex('config');
      return;
    }
    setIsSyncing(true);
    setSyncWarning(null);
    try {
      const remote = await fetchAndParseRemoteSheet(linkedUrl, linkedSheetName);
      setDataset(remote);
    } catch (err) {
      setSyncWarning(
        err instanceof Error ? err.message : 'Error al sincronizar con Google Apps Script.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDataLoaded = (
    parsed: ParsedWorkbookResult,
    savedUrl?: string,
    savedSheet?: string
  ) => {
    setDataset(parsed);
    setSyncWarning(null);
    if (savedUrl !== undefined) {
      setLinkedUrl(savedUrl);
      setLinkedSheetName(savedSheet ?? '');
      try {
        localStorage.setItem(LINKED_URL_STORAGE_KEY, savedUrl);
        localStorage.setItem(LINKED_SHEET_STORAGE_KEY, savedSheet ?? '');
      } catch {
        // ignore storage quota errors
      }
    }
  };

  const handleUnlinkUrl = () => {
    setLinkedUrl('');
    setLinkedSheetName('');
    setSyncWarning(null);
    try {
      localStorage.removeItem(LINKED_URL_STORAGE_KEY);
      localStorage.removeItem(LINKED_SHEET_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const allPeriods = useMemo(() => getSortedPeriods(dataset.rows), [dataset.rows]);

  const periodRangeText =
    allPeriods.length > 0
      ? `${formatPeriodLabel(allPeriods[0])} – ${formatPeriodLabel(allPeriods[allPeriods.length - 1])}`
      : 'Sin períodos';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeIndex={activeIndex}
        onSelectIndex={setActiveIndex}
        sourceName={isInitializing ? 'Cargando Pampers Scentia…' : dataset.meta.sourceName}
        rowCount={dataset.meta.rowCount}
        periodCount={allPeriods.length}
        isLinkedRemote={Boolean(linkedUrl)}
        desktopVisible={desktopSidebarVisible}
        onHideDesktop={() => setDesktopSidebarVisible(false)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Right Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeIndex={activeIndex}
          periodRangeText={periodRangeText}
          desktopSidebarVisible={desktopSidebarVisible}
          onToggleDesktopSidebar={() => setDesktopSidebarVisible((v) => !v)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onSelectHome={() => setActiveIndex('home')}
          onSelectConfig={() => setActiveIndex('config')}
        />

        <main
          className={`flex-1 w-full mx-auto px-6 py-8 space-y-8 ${
            desktopSidebarVisible ? 'max-w-[1360px]' : 'max-w-[1600px]'
          }`}
        >
          {activeIndex !== 'config' && activeIndex !== 'home' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-medium text-slate-500 flex flex-wrap items-center gap-2">
                <span>Pampers Argentina</span>
                <span aria-hidden="true">·</span>
                <span>{periodRangeText}</span>
                <span aria-hidden="true">·</span>
                <span>{isInitializing ? 'Cargando datos…' : dataset.meta.sourceName}</span>
              </div>

              <div className="flex items-center gap-2">
                {linkedUrl && (
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-[#0099A8] ${isSyncing ? 'animate-spin' : ''}`}
                    />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => exportAnalyticsToCsv(dataset.rows)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          )}

          {activeIndex !== 'config' && syncWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
              <span>{syncWarning}</span>
              <button
                type="button"
                onClick={() => setActiveIndex('config')}
                className="font-semibold underline underline-offset-4 whitespace-nowrap cursor-pointer"
              >
                Ir a Configuración
              </button>
            </div>
          )}

          {/* Active View */}
          {activeIndex === 'home' && (
            <SectionPortada
              rows={dataset.rows}
              periods={allPeriods}
              sourceName={isInitializing ? 'Cargando Pampers Scentia…' : dataset.meta.sourceName}
              isLinkedRemote={Boolean(linkedUrl)}
              rebaseTo100={rebaseSov}
              onSelectIndex={setActiveIndex}
            />
          )}

          {activeIndex === 'config' && (
            <SectionConfiguracion
              currentData={dataset}
              linkedUrl={linkedUrl}
              linkedSheetName={linkedSheetName}
              fiscalStartMonth={fiscalStartMonth}
              rebaseSov={rebaseSov}
              onChangeFiscalStartMonth={setFiscalStartMonth}
              onToggleRebaseSov={() => setRebaseSov((v) => !v)}
              onExportCsv={() => exportAnalyticsToCsv(dataset.rows)}
              onDataLoaded={handleDataLoaded}
              onUnlinkUrl={handleUnlinkUrl}
              onReloadBundledData={loadBundledDataset}
              onBackHome={() => setActiveIndex('home')}
            />
          )}

          {activeIndex === 'resumen' && (
            <SectionResumen
              rows={dataset.rows}
              periods={allPeriods}
              rebaseTo100={rebaseSov}
            />
          )}

          {activeIndex === 'consumo' && (
            <SectionConsumo
              rows={dataset.rows}
              periods={allPeriods}
              metric={consumptionMetric}
              onChangeMetric={setConsumptionMetric}
            />
          )}

          {activeIndex === 'value-share' && (
            <SectionShareOfValue
              allRows={dataset.rows}
              windowRows={dataset.rows}
              allPeriods={allPeriods}
              windowPeriods={allPeriods}
              fiscalStartMonth={fiscalStartMonth}
              rebaseTo100={rebaseSov}
            />
          )}

          {activeIndex === 'canales' && (
            <SectionCanales
              rows={dataset.rows}
              periods={allPeriods}
              rebaseTo100={rebaseSov}
            />
          )}

          {activeIndex === 'tiers' && (
            <SectionTiers
              rows={dataset.rows}
              periods={allPeriods}
              rebaseTo100={rebaseSov}
            />
          )}

          {activeIndex === 'raw-data' && (
            <SectionRawData rows={dataset.rows} periods={allPeriods} />
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white mt-auto">
          <div className="max-w-[1360px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>Pampers Scentia Analytics · Pañales y Toallitas Húmedas Argentina</span>
            <span>
              {linkedUrl
                ? 'Sincronización activa vía Google Apps Script'
                : 'Canales RDs, DPP, WHS, HSM, ECOMM · Vol_Convertido en MSUs (SU ÷ 1.000)'}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
