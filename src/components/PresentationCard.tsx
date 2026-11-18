import { toBlob } from 'html-to-image';
import { Check, Copy, Download, Pencil, RotateCcw } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'pampers_scentia_custom_titles_v1';

interface StoredTitleEntry {
  title?: string;
  subtitle?: string;
}

function readStoredEntry(cardId: string): StoredTitleEntry {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredTitleEntry>;
    return parsed[cardId] ?? {};
  } catch {
    return {};
  }
}

function writeStoredEntry(cardId: string, entry: StoredTitleEntry | null) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: Record<string, StoredTitleEntry> = raw ? JSON.parse(raw) : {};
    if (!entry || (!entry.title && !entry.subtitle)) {
      delete parsed[cardId];
    } else {
      parsed[cardId] = entry;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage quota errors
  }
}

interface PresentationCardProps {
  cardId: string;
  defaultTitle: string;
  defaultSubtitle: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PresentationCard({
  cardId,
  defaultTitle,
  defaultSubtitle,
  rightSlot,
  children,
  className = '',
}: PresentationCardProps) {
  const cardRef = useRef<HTMLElement>(null);

  const [customTitle, setCustomTitle] = useState<string | undefined>(() => readStoredEntry(cardId).title);
  const [customSubtitle, setCustomSubtitle] = useState<string | undefined>(
    () => readStoredEntry(cardId).subtitle
  );

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSubtitle, setDraftSubtitle] = useState('');

  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'downloaded' | 'error'>('idle');

  const displayTitle = customTitle ?? defaultTitle;
  const displaySubtitle = customSubtitle ?? defaultSubtitle;
  const isCustomized = customTitle !== undefined || customSubtitle !== undefined;

  useEffect(() => {
    const entry = readStoredEntry(cardId);
    setCustomTitle(entry.title);
    setCustomSubtitle(entry.subtitle);
  }, [cardId]);

  const startEditing = () => {
    setDraftTitle(displayTitle);
    setDraftSubtitle(displaySubtitle);
    setIsEditing(true);
  };

  const commitEdits = () => {
    const nextTitle = draftTitle.trim();
    const nextSubtitle = draftSubtitle.trim();

    const storedTitle = nextTitle && nextTitle !== defaultTitle ? nextTitle : undefined;
    const storedSubtitle =
      nextSubtitle !== defaultSubtitle ? nextSubtitle : undefined;

    setCustomTitle(storedTitle);
    setCustomSubtitle(storedSubtitle);
    writeStoredEntry(cardId, { title: storedTitle, subtitle: storedSubtitle });
    setIsEditing(false);
  };

  const cancelEdits = () => {
    setIsEditing(false);
  };

  const resetToDefault = () => {
    setCustomTitle(undefined);
    setCustomSubtitle(undefined);
    writeStoredEntry(cardId, null);
    setIsEditing(false);
  };

  const handleCopyAsImage = async () => {
    if (!cardRef.current || copyState === 'copying') return;
    if (isEditing) commitEdits();

    setCopyState('copying');
    try {
      // Wait a tick if editing just committed so the DOM settles without inputs
      await new Promise((r) => setTimeout(r, 40));

      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        filter: (node) => {
          if (node instanceof HTMLElement && node.dataset.exportIgnore === 'true') {
            return false;
          }
          return true;
        },
      });

      if (!blob) {
        throw new Error('No se pudo generar la imagen.');
      }

      let copiedToClipboard = false;
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof ClipboardItem !== 'undefined'
      ) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          copiedToClipboard = true;
        } catch {
          copiedToClipboard = false;
        }
      }

      if (copiedToClipboard) {
        setCopyState('copied');
      } else {
        // Fallback: download PNG so the user still gets the slide-ready image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cardId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setCopyState('downloaded');
      }

      setTimeout(() => setCopyState('idle'), 2200);
    } catch (err) {
      console.error('Error exporting card image:', err);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2500);
    }
  };

  return (
    <article
      ref={cardRef}
      className={`bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-start gap-4 ${className}`}
    >
      {/* Header Row: Editable Title/Subtitle + Optional Right Metric + Export/Edit Actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-1.5" data-export-ignore="true">
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdits();
                  if (e.key === 'Escape') cancelEdits();
                }}
                autoFocus
                aria-label="Editar título"
                className="w-full px-2.5 py-1 font-display text-base font-semibold text-slate-900 bg-slate-50 border border-[#0099A8] rounded-md focus:outline-none"
              />
              <input
                type="text"
                value={draftSubtitle}
                onChange={(e) => setDraftSubtitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdits();
                  if (e.key === 'Escape') cancelEdits();
                }}
                aria-label="Editar subtítulo"
                placeholder="Subtítulo opcional..."
                className="w-full px-2.5 py-1 text-xs text-slate-600 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-[#0099A8]"
              />
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={commitEdits}
                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#0099A8] hover:bg-[#007F8C] rounded transition-colors cursor-pointer"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={cancelEdits}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                {isCustomized && (
                  <button
                    type="button"
                    onClick={resetToDefault}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="group">
              <h3
                onClick={startEditing}
                title="Clic para editar el título"
                className="font-display text-base font-semibold text-slate-900 cursor-text hover:text-[#0B3B60] transition-colors"
              >
                {displayTitle}
              </h3>
              {displaySubtitle && (
                <p
                  onClick={startEditing}
                  title="Clic para editar el subtítulo"
                  className="text-xs text-slate-500 mt-0.5 leading-relaxed cursor-text hover:text-slate-700 transition-colors"
                >
                  {displaySubtitle}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 shrink-0">
          {rightSlot && <div className="text-right">{rightSlot}</div>}

          {/* Action Toolbar — excluded from copied presentation image */}
          <div className="flex items-center gap-1" data-export-ignore="true">
            {!isEditing && (
              <button
                type="button"
                onClick={startEditing}
                title="Editar título y subtítulo"
                aria-label="Editar título y subtítulo"
                className="p-1.5 text-slate-400 hover:text-[#0B3B60] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyAsImage}
              disabled={copyState === 'copying'}
              title="Copiar gráfico o cuadro como imagen para presentación"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                copyState === 'copied' || copyState === 'downloaded'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : copyState === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-[#0B3B60] hover:border-slate-300'
              }`}
            >
              {copyState === 'copied' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado</span>
                </>
              ) : copyState === 'downloaded' ? (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG guardado</span>
                </>
              ) : copyState === 'error' ? (
                <span>Reintentar</span>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copyState === 'copying' ? 'Copiando...' : 'Copiar'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Card Content */}
      {children}
    </article>
  );
}
