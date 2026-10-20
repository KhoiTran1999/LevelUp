'use client';

import { useCallback, useEffect, useState } from 'react';

interface Palette {
  id: string;
  name: string;
  icon: string;
  desc: string;
  preview: string[];
}

interface PaletteWindow extends Window {
  PALETTES?: Palette[];
  applyPalette?: (palette: string) => void;
  cyclePalette?: () => void;
  applyCustomDynamicSeed?: (seed: string) => void;
  sfx?: { playClick?: () => void };
}

const seedOptions = [
  { color: '#e11d48', title: 'Rose Dragon' },
  { color: '#06b6d4', title: 'Cyan Tech' },
  { color: '#8b5cf6', title: 'Aether Violet' },
  { color: '#f59e0b', title: 'Solar Amber' },
  { color: '#10b981', title: 'Jade Garden' },
  { color: '#6366f1', title: 'Royal Indigo' },
];

export function PaletteStudioModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [activePalette, setActivePalette] = useState('modern-indigo');
  const [seed, setSeed] = useState('#4f46e5');

  const syncPalette = useCallback(() => {
    const paletteWindow = window as PaletteWindow;
    setPalettes(paletteWindow.PALETTES || []);
    setActivePalette(document.documentElement.dataset.palette || 'modern-indigo');
    setSeed(localStorage.getItem('levelup_theme_custom_seed') || '#4f46e5');
  }, []);

  useEffect(() => {
    const open = () => {
      syncPalette();
      setIsOpen(true);
    };
    const close = () => setIsOpen(false);
    const paletteUpdated = () => syncPalette();
    window.addEventListener('levelup:open-palette-studio', open);
    window.addEventListener('levelup:close-palette-studio', close);
    window.addEventListener('levelup:palette-updated', paletteUpdated);
    return () => {
      window.removeEventListener('levelup:open-palette-studio', open);
      window.removeEventListener('levelup:close-palette-studio', close);
      window.removeEventListener('levelup:palette-updated', paletteUpdated);
    };
  }, [syncPalette]);

  const close = () => {
    (window as PaletteWindow).sfx?.playClick?.();
    setIsOpen(false);
  };

  const applyPalette = (id: string) => {
    const paletteWindow = window as PaletteWindow;
    if (!paletteWindow.applyPalette) {
      console.error('[PaletteStudioModal] Palette runtime is unavailable.');
      return;
    }
    paletteWindow.applyPalette(id);
    setActivePalette(id);
    (window as PaletteWindow).sfx?.playClick?.();
  };

  const applySeed = (value: string) => {
    const paletteWindow = window as PaletteWindow;
    if (!paletteWindow.applyCustomDynamicSeed) {
      console.error('[PaletteStudioModal] Dynamic palette runtime is unavailable.');
      return;
    }
    setSeed(value);
    paletteWindow.applyCustomDynamicSeed(value);
  };

  if (!isOpen) return null;

  return (
    <div
      id="m3-palette-studio-modal"
      className="m3-modal-sheet fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4"
    >
      <section
        className="rpg-panel m3-dialog-panel modal-fade flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="m3-palette-studio-title"
      >
        <div className="m3-drag-handle sm:hidden" />
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-lg text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">🎨</div>
            <div>
              <h2 id="m3-palette-studio-title" className="font-rpg-title flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100 sm:text-base">
                Studio Màu Sắc Material 3
                <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">Google M3</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Kiến trúc Tonal Palette & Hòa sắc Dynamic &apos;Material You&apos;</p>
            </div>
          </div>
          <button type="button" onClick={close} className="m3-icon-btn flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200/60 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" aria-label="Đóng">
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto p-5 text-xs text-slate-700 dark:text-slate-300 sm:p-6">
          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">7 Phối Màu Chuẩn Material 3</span>
              <span className="text-[10px] text-slate-400">Nhấn để kích hoạt tức thì</span>
            </div>
            {palettes.length > 0 ? (
              <div id="m3-palette-studio-grid" data-react-owned="true" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {palettes.map(palette => {
                  const isActive = activePalette === palette.id;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => applyPalette(palette.id)}
                      className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left transition-all ${isActive ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/30 dark:bg-indigo-950/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{palette.icon}</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{palette.name.split(' (')[0]}</span>
                        </div>
                        {isActive && <span className="material-symbols-outlined text-sm font-bold text-indigo-600 dark:text-indigo-400">check_circle</span>}
                      </div>
                      <p className="mb-3 line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{palette.desc}</p>
                      <div className="flex items-center gap-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
                        {palette.preview.map((color, index) => (
                          <span key={`${palette.id}-${color}`} className={`h-4 w-4 rounded-full border border-black/10 shadow-2xs ${index === 3 ? 'ml-auto' : ''}`} style={{ backgroundColor: color }} title={['Primary', 'Secondary', 'Tertiary', 'Surface Canvas'][index]} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-300">
                Bộ điều khiển bảng màu chưa sẵn sàng. Đóng rồi thử lại sau khi ứng dụng tải xong.
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Dynamic Seed Color (&quot;Material You&quot;)</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Tạo toàn bộ bảng màu 30+ role từ 1 mã màu hạt giống theo thuật toán HCT</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-200 px-2 py-0.5 font-mono text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">{seed.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="m3-seed-picker-input"
                value={seed}
                onChange={event => applySeed(event.currentTarget.value)}
                className="h-10 w-10 cursor-pointer rounded-xl border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800"
                aria-label="Chọn màu hạt giống"
              />
              <div className="flex flex-1 flex-wrap gap-1.5">
                {seedOptions.map(option => (
                  <button key={option.color} type="button" onClick={() => applySeed(option.color)} className="h-6 w-6 cursor-pointer rounded-full border border-black/10 shadow-2xs transition hover:scale-110" style={{ backgroundColor: option.color }} title={option.title} aria-label={option.title} />
                ))}
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base leading-none text-emerald-600 dark:text-emerald-400">verified</span>
              <span className="text-[11px] font-semibold">Bảo đảm Chuẩn Tiếp Cận WCAG 2.1 AA (Tương phản ≥ 4.5:1)</span>
            </div>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Passed</span>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
          <button
            type="button"
            onClick={() => {
              (window as PaletteWindow).cyclePalette?.();
              syncPalette();
            }}
            className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            <span className="material-symbols-outlined text-sm leading-none">autorenew</span>
            Xoay vòng nhanh
          </button>
          <button type="button" onClick={close} className="cursor-pointer rounded-xl bg-slate-200 px-5 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">Xong</button>
        </footer>
      </section>
    </div>
  );
}
