import { Home, Menu, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { DashboardIndexId, SIDEBAR_INDICES } from './Sidebar';

interface TopBarProps {
  activeIndex: DashboardIndexId;
  periodRangeText: string;
  desktopSidebarVisible: boolean;
  onToggleDesktopSidebar: () => void;
  onOpenMobileMenu: () => void;
  onSelectHome: () => void;
  onSelectConfig: () => void;
}

export function TopBar({
  activeIndex,
  periodRangeText,
  desktopSidebarVisible,
  onToggleDesktopSidebar,
  onOpenMobileMenu,
  onSelectHome,
  onSelectConfig,
}: TopBarProps) {
  const activeItem = SIDEBAR_INDICES.find((i) => i.id === activeIndex);

  const headerTitle =
    activeIndex === 'home'
      ? 'Portada · Inicio'
      : activeIndex === 'config'
        ? 'Configuración'
        : activeItem?.label ?? 'Pampers Scentia';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Sidebar toggle + Active section title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            aria-label="Abrir menú lateral"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onToggleDesktopSidebar}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 -ml-2 text-xs font-medium text-slate-600 hover:text-[#0B3B60] hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title={desktopSidebarVisible ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
            aria-label={desktopSidebarVisible ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
          >
            {desktopSidebarVisible ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 text-[#0099A8]" />
            )}
            <span>{desktopSidebarVisible ? 'Ocultar menú' : 'Mostrar menú'}</span>
          </button>

          <div className="min-w-0">
            <div className="font-display text-sm sm:text-base font-bold text-[#0B3B60] truncate">
              {headerTitle}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              Pañales y Toallitas Húmedas · {periodRangeText}
            </div>
          </div>
        </div>

        {/* Right: Back to Inicio (Portada) + Top-right Gear (Configuración) */}
        <div className="flex items-center gap-2 shrink-0">
          {activeIndex !== 'home' && (
            <button
              type="button"
              onClick={onSelectHome}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-[#0099A8]/50 hover:text-[#0B3B60] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0099A8]"
            >
              <Home className="w-3.5 h-3.5 text-[#0099A8]" />
              <span>Volver al inicio</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (activeIndex === 'config') {
                onSelectHome();
              } else {
                onSelectConfig();
              }
            }}
            title={activeIndex === 'config' ? 'Volver al inicio' : 'Configuración'}
            aria-label={activeIndex === 'config' ? 'Configuración activa (clic para volver al inicio)' : 'Abrir configuración'}
            className={`p-2 rounded-lg border transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0099A8] ${
              activeIndex === 'config'
                ? 'bg-[#0099A8]/10 border-[#0099A8]/40 text-[#0099A8]'
                : 'bg-white border-slate-200 text-slate-600 hover:text-[#0B3B60] hover:border-slate-300'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
