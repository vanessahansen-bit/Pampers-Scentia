import { FileText, Home, Layers, PanelLeftClose, PieChart, Store, Table2, TrendingUp, X } from 'lucide-react';

export type DashboardIndexId = 'home' | 'config' | 'resumen' | 'consumo' | 'value-share' | 'canales' | 'tiers' | 'raw-data';

export interface SidebarNavItem {
  id: Exclude<DashboardIndexId, 'home' | 'config'>;
  label: string;
  subtitle: string;
}

export const SIDEBAR_INDICES: SidebarNavItem[] = [
  {
    id: 'resumen',
    label: 'Resumen Último Mes',
    subtitle: 'Consolidado shares & productos motores',
  },
  {
    id: 'consumo',
    label: 'A. Consumo & Sell Out',
    subtitle: 'Evolución mensual y canales P&G',
  },
  {
    id: 'value-share',
    label: 'B. Share of Value',
    subtitle: 'SOV, PM/P3M/P6M, CYTD y FYTD',
  },
  {
    id: 'canales',
    label: 'C. Canales',
    subtitle: 'RDs, DPP, WHS, HSM y ECOMM',
  },
  {
    id: 'tiers',
    label: 'D. Segmento Tiers',
    subtitle: 'Pants, Tiers 1–3 y Wipes',
  },
  {
    id: 'raw-data',
    label: 'RAW DATA',
    subtitle: 'Base cruda y filtros dinámicos',
  },
];

export function IndexIcon({
  id,
  active,
  className,
}: {
  id: DashboardIndexId;
  active?: boolean;
  className?: string;
}) {
  const cls = className ?? `w-4 h-4 shrink-0 ${active ? 'text-[#0099A8]' : 'text-slate-400'}`;
  switch (id) {
    case 'home':
      return <Home className={cls} />;
    case 'resumen':
      return <FileText className={cls} />;
    case 'consumo':
      return <TrendingUp className={cls} />;
    case 'value-share':
      return <PieChart className={cls} />;
    case 'canales':
      return <Store className={cls} />;
    case 'tiers':
      return <Layers className={cls} />;
    case 'raw-data':
      return <Table2 className={cls} />;
    default:
      return <Home className={cls} />;
  }
}

interface SidebarProps {
  activeIndex: DashboardIndexId;
  onSelectIndex: (id: DashboardIndexId) => void;
  sourceName: string;
  rowCount: number;
  periodCount: number;
  isLinkedRemote: boolean;
  desktopVisible: boolean;
  onHideDesktop: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeIndex,
  onSelectIndex,
  sourceName,
  rowCount,
  periodCount,
  isLinkedRemote,
  desktopVisible,
  onHideDesktop,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handlePick = (id: DashboardIndexId) => {
    onSelectIndex(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center justify-between border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => handlePick('home')}
          className="text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0099A8] rounded-md"
          title="Ir a la portada"
        >
          <div className="font-display text-base font-bold tracking-tight text-[#0B3B60] group-hover:text-[#0099A8] transition-colors">
            Pampers Scentia
          </div>
          <div className="text-[11px] text-slate-500">Argentina · Analytics</div>
        </button>
        <button
          type="button"
          onClick={onHideDesktop}
          className="hidden lg:inline-flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          title="Ocultar menú lateral"
          aria-label="Ocultar menú lateral"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          aria-label="Cerrar menú"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 pt-4 pb-2 space-y-4">
        {/* Inicio / Portada */}
        <div>
          <button
            type="button"
            onClick={() => handlePick('home')}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-3 cursor-pointer ${
              activeIndex === 'home'
                ? 'bg-[#0099A8]/10 text-[#0B3B60]'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <IndexIcon id="home" active={activeIndex === 'home'} />
            <span className={`text-xs ${activeIndex === 'home' ? 'font-semibold' : 'font-medium'}`}>
              Inicio · Portada
            </span>
          </button>
        </div>

        {/* Índices analíticos */}
        <div>
          <div className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Índices
          </div>
          <nav className="space-y-1" aria-label="Índices del dashboard">
            {SIDEBAR_INDICES.map((item) => {
              const active = activeIndex === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePick(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-3 cursor-pointer ${
                    active
                      ? 'bg-[#0099A8]/10 text-[#0B3B60]'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <div className="mt-0.5">
                    <IndexIcon id={item.id} active={active} />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs leading-snug ${active ? 'font-semibold' : 'font-medium'}`}>
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-auto p-4 border-t border-slate-200 bg-slate-50/70 space-y-1.5 text-[11px] text-slate-500">
        <div className="font-medium text-slate-700 truncate" title={sourceName}>
          {sourceName}
        </div>
        <div className="flex items-center justify-between font-mono-num">
          <span>{rowCount.toLocaleString('es-AR')} reg.</span>
          <span>{periodCount} meses</span>
        </div>
        <div className="text-[10px] text-slate-400">
          {isLinkedRemote ? 'Origen: Google Apps Script' : 'Origen: Snapshot Scentia'}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop collapsible left sidebar */}
      {desktopVisible && (
        <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
          {navContent}
        </aside>
      )}

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full border-r border-slate-200 shadow-xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
