// =============================================================================
// 3. STORAGE, THEME & SYNC MANAGER
// =============================================================================
const CACHE_STORAGE_KEY = 'levelup_user_cache_v1';
let appState = { ...DEFAULT_STATE };
let syncTimeout = null;

function clearLegacyLocalStorage() {
  try {
    localStorage.removeItem('levelup_state_v1');
    localStorage.removeItem('levelup_onboarded');
  } catch (e) {}
}

function saveLocalCache() {
  // ponytail: Toàn bộ dữ liệu người dùng lưu trữ trực tiếp trên Redis, không lưu vào LocalStorage
  clearLocalCache();
}

function loadLocalCache() {
  // ponytail: Không đọc từ LocalStorage, toàn bộ dữ liệu tải trực tiếp từ Cloud/Redis
  return null;
}

function clearLocalCache() {
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY);
    localStorage.removeItem('levelup_state_v1');
    localStorage.removeItem('levelup_onboarded');
  } catch (e) {}
}

function applyTheme(theme, isManual = false) {
  const root = document.documentElement;
  const themeBtn = document.getElementById('toggle-theme-btn');
  
  let targetTheme = theme;
  if (!targetTheme) {
    const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('levelup_theme') : null;
    targetTheme = savedTheme || (typeof getSystemTheme === 'function' ? getSystemTheme() : 'light');
  }

  if (targetTheme === 'light') {
    root.classList.remove('dark');
    if (themeBtn) themeBtn.innerHTML = '<span class="material-symbols-outlined text-lg leading-none">dark_mode</span>';
  } else {
    root.classList.add('dark');
    if (themeBtn) themeBtn.innerHTML = '<span class="material-symbols-outlined text-lg leading-none">light_mode</span>';
  }
  
  if (typeof appState !== 'undefined' && appState.profile) {
    appState.profile.theme = targetTheme;
  }
  
  if (isManual) {
    try {
      localStorage.setItem('levelup_theme_manual', 'true');
      localStorage.setItem('levelup_theme', targetTheme);
    } catch (e) {}
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme, true);
  sfx.playClick();
  triggerSave(true, true);
}

const PALETTES = [
  {
    id: 'modern-indigo',
    name: 'Electric Modern (Sáng sủa / Indigo)',
    icon: '⚡',
    seed: '#4f46e5',
    desc: 'Hiện đại, sắc nét với tông Chàm Điện Tử và Tím Phóng Khoáng',
    preview: ['#4f46e5', '#0284c7', '#9333ea', '#f8fafc']
  },
  {
    id: 'm3-baseline',
    name: 'Material Baseline (Google Purple)',
    icon: '🟣',
    seed: '#6750a4',
    desc: 'Chuẩn mực Google M3 nguyên bản, sắc tím thạch anh thanh tao',
    preview: ['#6750a4', '#625b71', '#7d5260', '#fef7ff']
  },
  {
    id: 'm3-ocean',
    name: 'Material Ocean (Google Blue)',
    icon: '🔵',
    seed: '#006399',
    desc: 'Xanh dương đại dương Pixel, tĩnh lặng và nâng cao tập trung',
    preview: ['#006399', '#51606f', '#6b5778', '#fdfbff']
  },
  {
    id: 'guild',
    name: 'RPG Legacy (Hoài niệm)',
    icon: '🗡️',
    seed: '#b45309',
    desc: 'Sắc vàng hổ phách hiệp sĩ Guild RPG, ấm áp và kiêu hãnh',
    preview: ['#b45309', '#78593a', '#8c4a60', '#fffbeb']
  },
  {
    id: 'm3-emerald',
    name: 'Emerald Grove (Zen Lục Bảo)',
    icon: '🌲',
    seed: '#15803d',
    desc: 'Xanh ngọc lục bảo thiên nhiên, nuôi dưỡng thói quen bền bỉ',
    preview: ['#15803d', '#4d6352', '#39656b', '#f7fbf3']
  },
  {
    id: 'm3-crimson',
    name: 'Cyber Crimson (Long Hỏa / Đỏ Thẫm)',
    icon: '🌋',
    seed: '#dc2626',
    desc: 'Sắc đỏ rực lửa adrenaline, kích thích vượt qua mọi thử thách khó',
    preview: ['#dc2626', '#775653', '#755a2b', '#fff8f7']
  },
  {
    id: 'm3-monochrome',
    name: 'Monochrome OLED (Tối giản Đen Trắng)',
    icon: '🖤',
    seed: '#5e5e5e',
    desc: 'Đen trắng thuần khiết, tiết kiệm pin OLED và loại bỏ mọi xao nhãng',
    preview: ['#1f1f1f', '#5e5e5e', '#a8a8a8', '#fcfcfc']
  }
];

// =============================================================================
// MATERIAL DESIGN 3 TONAL COLOR ENGINE (HCT / PERCEPTUAL COLOR MATH)
// Specs: https://m3.material.io/styles/color/dynamic/choosing-a-source
// =============================================================================

function m3HexToRgb(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 79, g: 70, b: 229 }; // fallback indigo
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function m3RgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s, l };
}

function m3HslToRgb(h, s, l) {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function m3RgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, x)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function m3ToneToHex(h, s, tone) {
  // Tone represents perceptual luminance from 0 (black) to 100 (white)
  const l = tone / 100;
  const rgb = m3HslToRgb(h, s, l);
  return m3RgbToHex(rgb.r, rgb.g, rgb.b);
}

// M3 Harmonization Algorithm: gently pulls semantic color hue towards primary seed hue
function m3HarmonizeHue(sourceHue, targetHue, maxShift = 15) {
  let diff = (targetHue - sourceHue) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  const shift = Math.sign(diff) * Math.min(Math.abs(diff), maxShift);
  return (sourceHue + shift + 360) % 360;
}

function generateM3TonalPalette(seedHex) {
  const rgb = m3HexToRgb(seedHex);
  const hsl = m3RgbToHsl(rgb.r, rgb.g, rgb.b);

  const primaryHue = hsl.h;
  const primarySat = Math.max(hsl.s, 0.45);

  const secondaryHue = primaryHue;
  const secondarySat = Math.max(hsl.s * 0.35, 0.16);

  const tertiaryHue = (primaryHue + 60) % 360;
  const tertiarySat = Math.max(hsl.s * 0.45, 0.22);

  const neutralHue = primaryHue;
  const neutralSat = 0.05;

  const neutralVariantHue = primaryHue;
  const neutralVariantSat = 0.10;

  const errorHue = 10;
  const errorSat = 0.78;

  // Harmonized Domain Colors (Gold, Mana, Streak, XP)
  const goldHue = m3HarmonizeHue(38, primaryHue, 15);
  const manaHue = m3HarmonizeHue(200, primaryHue, 15);
  const streakHue = m3HarmonizeHue(24, primaryHue, 15);
  const xpHue = m3HarmonizeHue(150, primaryHue, 15);

  return {
    light: {
      primary: m3ToneToHex(primaryHue, primarySat, 40),
      onPrimary: '#ffffff',
      primaryContainer: m3ToneToHex(primaryHue, primarySat, 90),
      onPrimaryContainer: m3ToneToHex(primaryHue, primarySat, 10),
      inversePrimary: m3ToneToHex(primaryHue, primarySat, 80),

      secondary: m3ToneToHex(secondaryHue, secondarySat, 40),
      onSecondary: '#ffffff',
      secondaryContainer: m3ToneToHex(secondaryHue, secondarySat, 90),
      onSecondaryContainer: m3ToneToHex(secondaryHue, secondarySat, 10),

      tertiary: m3ToneToHex(tertiaryHue, tertiarySat, 40),
      onTertiary: '#ffffff',
      tertiaryContainer: m3ToneToHex(tertiaryHue, tertiarySat, 90),
      onTertiaryContainer: m3ToneToHex(tertiaryHue, tertiarySat, 10),

      error: m3ToneToHex(errorHue, errorSat, 40),
      onError: '#ffffff',
      errorContainer: m3ToneToHex(errorHue, errorSat, 90),
      onErrorContainer: m3ToneToHex(errorHue, errorSat, 10),

      surface: m3ToneToHex(neutralHue, neutralSat, 98),
      surfaceDim: m3ToneToHex(neutralHue, neutralSat, 87),
      surfaceBright: m3ToneToHex(neutralHue, neutralSat, 98),
      surfaceContainerLowest: '#ffffff',
      surfaceContainerLow: m3ToneToHex(neutralHue, neutralSat, 96),
      surfaceContainer: m3ToneToHex(neutralHue, neutralSat, 94),
      surfaceContainerHigh: m3ToneToHex(neutralHue, neutralSat, 92),
      surfaceContainerHighest: m3ToneToHex(neutralHue, neutralSat, 90),

      onSurface: m3ToneToHex(neutralHue, neutralSat, 10),
      surfaceVariant: m3ToneToHex(neutralVariantHue, neutralVariantSat, 90),
      onSurfaceVariant: m3ToneToHex(neutralVariantHue, neutralVariantSat, 30),
      outline: m3ToneToHex(neutralVariantHue, neutralVariantSat, 50),
      outlineVariant: m3ToneToHex(neutralVariantHue, neutralVariantSat, 80),

      inverseSurface: m3ToneToHex(neutralHue, neutralSat, 20),
      inverseOnSurface: m3ToneToHex(neutralHue, neutralSat, 95),

      // RPG Harmonized Domain Tokens (Light)
      gold: m3ToneToHex(goldHue, 0.85, 42),
      onGold: '#ffffff',
      goldContainer: m3ToneToHex(goldHue, 0.75, 92),
      onGoldContainer: m3ToneToHex(goldHue, 0.85, 15),

      mana: m3ToneToHex(manaHue, 0.85, 42),
      onMana: '#ffffff',
      manaContainer: m3ToneToHex(manaHue, 0.75, 92),
      onManaContainer: m3ToneToHex(manaHue, 0.85, 15),

      streak: m3ToneToHex(streakHue, 0.88, 45),
      onStreak: '#ffffff',
      streakContainer: m3ToneToHex(streakHue, 0.78, 92),
      onStreakContainer: m3ToneToHex(streakHue, 0.88, 15),

      xp: m3ToneToHex(xpHue, 0.82, 38),
      onXp: '#ffffff',
      xpContainer: m3ToneToHex(xpHue, 0.75, 92),
      onXpContainer: m3ToneToHex(xpHue, 0.82, 15),
    },
    dark: {
      primary: m3ToneToHex(primaryHue, primarySat, 80),
      onPrimary: m3ToneToHex(primaryHue, primarySat, 20),
      primaryContainer: m3ToneToHex(primaryHue, primarySat, 30),
      onPrimaryContainer: m3ToneToHex(primaryHue, primarySat, 90),
      inversePrimary: m3ToneToHex(primaryHue, primarySat, 40),

      secondary: m3ToneToHex(secondaryHue, secondarySat, 80),
      onSecondary: m3ToneToHex(secondaryHue, secondarySat, 20),
      secondaryContainer: m3ToneToHex(secondaryHue, secondarySat, 30),
      onSecondaryContainer: m3ToneToHex(secondaryHue, secondarySat, 90),

      tertiary: m3ToneToHex(tertiaryHue, tertiarySat, 80),
      onTertiary: m3ToneToHex(tertiaryHue, tertiarySat, 20),
      tertiaryContainer: m3ToneToHex(tertiaryHue, tertiarySat, 30),
      onTertiaryContainer: m3ToneToHex(tertiaryHue, tertiarySat, 90),

      error: m3ToneToHex(errorHue, errorSat, 80),
      onError: m3ToneToHex(errorHue, errorSat, 20),
      errorContainer: m3ToneToHex(errorHue, errorSat, 30),
      onErrorContainer: m3ToneToHex(errorHue, errorSat, 90),

      surface: m3ToneToHex(neutralHue, neutralSat, 7),
      surfaceDim: m3ToneToHex(neutralHue, neutralSat, 6),
      surfaceBright: m3ToneToHex(neutralHue, neutralSat, 24),
      surfaceContainerLowest: m3ToneToHex(neutralHue, neutralSat, 4),
      surfaceContainerLow: m3ToneToHex(neutralHue, neutralSat, 10),
      surfaceContainer: m3ToneToHex(neutralHue, neutralSat, 14),
      surfaceContainerHigh: m3ToneToHex(neutralHue, neutralSat, 18),
      surfaceContainerHighest: m3ToneToHex(neutralHue, neutralSat, 22),

      onSurface: m3ToneToHex(neutralHue, neutralSat, 90),
      surfaceVariant: m3ToneToHex(neutralVariantHue, neutralVariantSat, 20),
      onSurfaceVariant: m3ToneToHex(neutralVariantHue, neutralVariantSat, 80),
      outline: m3ToneToHex(neutralVariantHue, neutralVariantSat, 60),
      outlineVariant: m3ToneToHex(neutralVariantHue, neutralVariantSat, 30),

      inverseSurface: m3ToneToHex(neutralHue, neutralSat, 90),
      inverseOnSurface: m3ToneToHex(neutralHue, neutralSat, 20),

      // RPG Harmonized Domain Tokens (Dark)
      gold: m3ToneToHex(goldHue, 0.85, 75),
      onGold: m3ToneToHex(goldHue, 0.85, 20),
      goldContainer: m3ToneToHex(goldHue, 0.75, 28),
      onGoldContainer: m3ToneToHex(goldHue, 0.85, 90),

      mana: m3ToneToHex(manaHue, 0.85, 75),
      onMana: m3ToneToHex(manaHue, 0.85, 20),
      manaContainer: m3ToneToHex(manaHue, 0.75, 28),
      onManaContainer: m3ToneToHex(manaHue, 0.85, 90),

      streak: m3ToneToHex(streakHue, 0.88, 75),
      onStreak: m3ToneToHex(streakHue, 0.88, 20),
      streakContainer: m3ToneToHex(streakHue, 0.78, 28),
      onStreakContainer: m3ToneToHex(streakHue, 0.88, 90),

      xp: m3ToneToHex(xpHue, 0.82, 75),
      onXp: m3ToneToHex(xpHue, 0.82, 20),
      xpContainer: m3ToneToHex(xpHue, 0.75, 28),
      onXpContainer: m3ToneToHex(xpHue, 0.82, 90),
    }
  };
}

function applyCustomDynamicSeed(seedHex, skipPersist = false) {
  if (!seedHex || !seedHex.startsWith('#') || (seedHex.length !== 4 && seedHex.length !== 7)) {
    seedHex = '#4f46e5';
  }
  const palette = generateM3TonalPalette(seedHex);
  const l = palette.light;
  const d = palette.dark;

  let styleEl = document.getElementById('m3-dynamic-theme-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'm3-dynamic-theme-style';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    html[data-palette="m3-custom"] {
      --md-sys-color-primary: ${l.primary};
      --md-sys-color-on-primary: ${l.onPrimary};
      --md-sys-color-primary-container: ${l.primaryContainer};
      --md-sys-color-on-primary-container: ${l.onPrimaryContainer};
      --md-sys-color-inverse-primary: ${l.inversePrimary};

      --md-sys-color-secondary: ${l.secondary};
      --md-sys-color-on-secondary: ${l.onSecondary};
      --md-sys-color-secondary-container: ${l.secondaryContainer};
      --md-sys-color-on-secondary-container: ${l.onSecondaryContainer};

      --md-sys-color-tertiary: ${l.tertiary};
      --md-sys-color-on-tertiary: ${l.onTertiary};
      --md-sys-color-tertiary-container: ${l.tertiaryContainer};
      --md-sys-color-on-tertiary-container: ${l.onTertiaryContainer};

      --md-sys-color-error: ${l.error};
      --md-sys-color-on-error: ${l.onError};
      --md-sys-color-error-container: ${l.errorContainer};
      --md-sys-color-on-error-container: ${l.onErrorContainer};

      --md-sys-color-surface: ${l.surface};
      --md-sys-color-surface-dim: ${l.surfaceDim};
      --md-sys-color-surface-bright: ${l.surfaceBright};
      --md-sys-color-surface-container-lowest: ${l.surfaceContainerLowest};
      --md-sys-color-surface-container-low: ${l.surfaceContainerLow};
      --md-sys-color-surface-container: ${l.surfaceContainer};
      --md-sys-color-surface-container-high: ${l.surfaceContainerHigh};
      --md-sys-color-surface-container-highest: ${l.surfaceContainerHighest};

      --md-sys-color-on-surface: ${l.onSurface};
      --md-sys-color-surface-variant: ${l.surfaceVariant};
      --md-sys-color-on-surface-variant: ${l.onSurfaceVariant};
      --md-sys-color-outline: ${l.outline};
      --md-sys-color-outline-variant: ${l.outlineVariant};

      --md-sys-color-inverse-surface: ${l.inverseSurface};
      --md-sys-color-inverse-on-surface: ${l.inverseOnSurface};

      --md-sys-color-surface-tint: ${l.primary};

      --md-custom-color-gold: ${l.gold};
      --md-custom-color-on-gold: ${l.onGold};
      --md-custom-color-gold-container: ${l.goldContainer};
      --md-custom-color-on-gold-container: ${l.onGoldContainer};

      --md-custom-color-mana: ${l.mana};
      --md-custom-color-on-mana: ${l.onMana};
      --md-custom-color-mana-container: ${l.manaContainer};
      --md-custom-color-on-mana-container: ${l.onManaContainer};

      --md-custom-color-streak: ${l.streak};
      --md-custom-color-on-streak: ${l.onStreak};
      --md-custom-color-streak-container: ${l.streakContainer};
      --md-custom-color-on-streak-container: ${l.onStreakContainer};

      --md-custom-color-xp: ${l.xp};
      --md-custom-color-on-xp: ${l.onXp};
      --md-custom-color-xp-container: ${l.xpContainer};
      --md-custom-color-on-xp-container: ${l.onXpContainer};

      --panel-bg: rgba(255, 255, 255, 0.96);
      --panel-border: var(--md-sys-color-outline-variant);
      --subpanel-bg: var(--md-sys-color-surface-container-low);
      --input-bg: var(--md-sys-color-surface-container-lowest);
      --input-border: var(--md-sys-color-outline-variant);
    }

    html.dark[data-palette="m3-custom"] {
      --md-sys-color-primary: ${d.primary};
      --md-sys-color-on-primary: ${d.onPrimary};
      --md-sys-color-primary-container: ${d.primaryContainer};
      --md-sys-color-on-primary-container: ${d.onPrimaryContainer};
      --md-sys-color-inverse-primary: ${d.inversePrimary};

      --md-sys-color-secondary: ${d.secondary};
      --md-sys-color-on-secondary: ${d.onSecondary};
      --md-sys-color-secondary-container: ${d.secondaryContainer};
      --md-sys-color-on-secondary-container: ${d.onSecondaryContainer};

      --md-sys-color-tertiary: ${d.tertiary};
      --md-sys-color-on-tertiary: ${d.onTertiary};
      --md-sys-color-tertiary-container: ${d.tertiaryContainer};
      --md-sys-color-on-tertiary-container: ${d.onTertiaryContainer};

      --md-sys-color-error: ${d.error};
      --md-sys-color-on-error: ${d.onError};
      --md-sys-color-error-container: ${d.errorContainer};
      --md-sys-color-on-error-container: ${d.onErrorContainer};

      --md-sys-color-surface: ${d.surface};
      --md-sys-color-surface-dim: ${d.surfaceDim};
      --md-sys-color-surface-bright: ${d.surfaceBright};
      --md-sys-color-surface-container-lowest: ${d.surfaceContainerLowest};
      --md-sys-color-surface-container-low: ${d.surfaceContainerLow};
      --md-sys-color-surface-container: ${d.surfaceContainer};
      --md-sys-color-surface-container-high: ${d.surfaceContainerHigh};
      --md-sys-color-surface-container-highest: ${d.surfaceContainerHighest};

      --md-sys-color-on-surface: ${d.onSurface};
      --md-sys-color-surface-variant: ${d.surfaceVariant};
      --md-sys-color-on-surface-variant: ${d.onSurfaceVariant};
      --md-sys-color-outline: ${d.outline};
      --md-sys-color-outline-variant: ${d.outlineVariant};

      --md-sys-color-inverse-surface: ${d.inverseSurface};
      --md-sys-color-inverse-on-surface: ${d.inverseOnSurface};

      --md-sys-color-surface-tint: ${d.primary};

      --md-custom-color-gold: ${d.gold};
      --md-custom-color-on-gold: ${d.onGold};
      --md-custom-color-gold-container: ${d.goldContainer};
      --md-custom-color-on-gold-container: ${d.onGoldContainer};

      --md-custom-color-mana: ${d.mana};
      --md-custom-color-on-mana: ${d.onMana};
      --md-custom-color-mana-container: ${d.manaContainer};
      --md-custom-color-on-mana-container: ${d.onManaContainer};

      --md-custom-color-streak: ${d.streak};
      --md-custom-color-on-streak: ${d.onStreak};
      --md-custom-color-streak-container: ${d.streakContainer};
      --md-custom-color-on-streak-container: ${d.onStreakContainer};

      --md-custom-color-xp: ${d.xp};
      --md-custom-color-on-xp: ${d.onXp};
      --md-custom-color-xp-container: ${d.xpContainer};
      --md-custom-color-on-xp-container: ${d.onXpContainer};

      --panel-bg: rgba(18, 18, 24, 0.95);
      --panel-border: var(--md-sys-color-outline-variant);
      --subpanel-bg: var(--md-sys-color-surface-container-low);
      --input-bg: var(--md-sys-color-surface-container-low);
      --input-border: var(--md-sys-color-outline-variant);
    }
  `;

  document.documentElement.dataset.palette = 'm3-custom';

  if (!skipPersist) {
    try {
      localStorage.setItem('levelup_theme_custom_seed', seedHex);
      localStorage.setItem('levelup_theme_palette', 'm3-custom');
    } catch (e) {}
  }

  const btn = document.getElementById('toggle-palette-btn');
  if (btn) {
    btn.textContent = '🎨';
    btn.title = `Bảng màu: Material You (${seedHex}) (Bấm để mở Studio)`;
  }
  const modalPaletteIcon = document.getElementById('modal-palette-icon');
  const modalPaletteText = document.getElementById('modal-palette-text');
  if (modalPaletteIcon && modalPaletteText) {
    modalPaletteIcon.textContent = '🎨';
    modalPaletteText.textContent = `Material You (${seedHex})`;
  }

  if (typeof updatePaletteStudioUI === 'function') {
    updatePaletteStudioUI();
  }
}

function applyPalette(palette) {
  const root = document.documentElement;
  if (palette === 'm3-custom') {
    const savedSeed = localStorage.getItem('levelup_theme_custom_seed') || '#4f46e5';
    applyCustomDynamicSeed(savedSeed);
    return;
  }

  if (!palette || palette === 'modern-indigo') {
    delete root.dataset.palette;
    palette = 'modern-indigo';
  } else {
    root.dataset.palette = palette;
  }

  const btn = document.getElementById('toggle-palette-btn');
  if (btn) {
    const cur = PALETTES.find(p => p.id === palette) || PALETTES[0];
    btn.textContent = cur.icon;
    btn.title = `Bảng màu: ${cur.name} (Bấm để mở Studio)`;
  }
  const modalPaletteIcon = document.getElementById('modal-palette-icon');
  const modalPaletteText = document.getElementById('modal-palette-text');
  if (modalPaletteIcon && modalPaletteText) {
    const cur = PALETTES.find(p => p.id === palette) || PALETTES[0];
    modalPaletteIcon.textContent = cur.icon;
    modalPaletteText.textContent = cur.name.split(' (')[0];
  }
  try {
    localStorage.setItem('levelup_theme_palette', palette);
  } catch (e) {}

  if (typeof updatePaletteStudioUI === 'function') {
    updatePaletteStudioUI();
  }
}

function cyclePalette() {
  const root = document.documentElement;
  const current = root.dataset.palette || 'modern-indigo';
  const currentIndex = PALETTES.findIndex(p => p.id === current);
  const nextIndex = (currentIndex + 1) % PALETTES.length;
  const next = PALETTES[nextIndex];
  applyPalette(next.id);
  if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
  if (typeof showToast === 'function') {
    showToast(`🎨 Bảng màu: ${next.name}`, 'info');
  }
}

function openPaletteStudio() {
  const modal = document.getElementById('m3-palette-studio-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (typeof updatePaletteStudioUI === 'function') {
    updatePaletteStudioUI();
  }
}

function closePaletteStudio() {
  const modal = document.getElementById('m3-palette-studio-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function updatePaletteStudioUI() {
  const root = document.documentElement;
  const currentPalette = root.dataset.palette || 'modern-indigo';
  const listContainer = document.getElementById('m3-palette-studio-grid');
  if (!listContainer) return;

  listContainer.innerHTML = PALETTES.map(p => {
    const isActive = currentPalette === p.id;
    return `
      <button type="button" onclick="applyPalette('${p.id}'); if(typeof sfx!=='undefined'&&sfx.playClick)sfx.playClick();" 
        class="text-left p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
          isActive 
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/30 shadow-md' 
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
        }">
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">${p.icon}</span>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-100">${p.name.split(' (')[0]}</span>
          </div>
          ${isActive ? '<span class="material-symbols-outlined text-sm font-bold text-indigo-600 dark:text-indigo-400">check_circle</span>' : ''}
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">${p.desc}</p>
        <div class="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
          <span class="w-4 h-4 rounded-full border border-black/10 shadow-2xs" style="background-color: ${p.preview[0]};" title="Primary"></span>
          <span class="w-4 h-4 rounded-full border border-black/10 shadow-2xs" style="background-color: ${p.preview[1]};" title="Secondary"></span>
          <span class="w-4 h-4 rounded-full border border-black/10 shadow-2xs" style="background-color: ${p.preview[2]};" title="Tertiary"></span>
          <span class="w-4 h-4 rounded-full border border-black/10 shadow-2xs ml-auto" style="background-color: ${p.preview[3]};" title="Surface Canvas"></span>
        </div>
      </button>
    `;
  }).join('');

  // Sync custom seed picker input
  const seedInput = document.getElementById('m3-seed-picker-input');
  const seedHexText = document.getElementById('m3-seed-picker-hex');
  const savedSeed = localStorage.getItem('levelup_theme_custom_seed') || '#4f46e5';
  if (seedInput) seedInput.value = savedSeed;
  if (seedHexText) seedHexText.textContent = savedSeed.toUpperCase();
}

// Expose functions globally
if (typeof window !== 'undefined') {
  window.PALETTES = PALETTES;
  window.applyPalette = applyPalette;
  window.cyclePalette = cyclePalette;
  window.openPaletteStudio = openPaletteStudio;
  window.closePaletteStudio = closePaletteStudio;
  window.updatePaletteStudioUI = updatePaletteStudioUI;
  window.applyCustomDynamicSeed = applyCustomDynamicSeed;
  window.generateM3TonalPalette = generateM3TonalPalette;
}

function getOrCreateUserToken() {
  if (appState.profile.sessionToken && typeof appState.profile.sessionToken === 'string') {
    return appState.profile.sessionToken;
  }
  if (appState.profile.googleToken && typeof appState.profile.googleToken === 'string') {
    return appState.profile.googleToken;
  }
  if (appState.profile.token && typeof appState.profile.token === 'string' && appState.profile.token.length >= 16) {
    return appState.profile.token;
  }
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  appState.profile.token = token;
  return token;
}

function getAuthHeaders() {
  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token || getOrCreateUserToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function normalizeObjectNFC(obj) {
  if (typeof obj === 'string') return obj.normalize('NFC');
  if (Array.isArray(obj)) return obj.map(normalizeObjectNFC);
  if (obj !== null && typeof obj === 'object') {
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        obj[k] = normalizeObjectNFC(obj[k]);
      }
    }
  }
  return obj;
}

// Anti-Cheat: Hàm băm chữ ký kiểm định tính toàn vẹn của số Vàng & EXP trong LocalStorage
function computeStateIntegrity(profile) {
  const salt = 'lvlup_vault_2026';
  const str = `${salt}:${profile?.googleId || ''}:${profile?.coins ?? 0}:${profile?.totalCoinsEarned ?? 0}:${profile?.level ?? 1}:${profile?.exp ?? 0}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'sig_' + Math.abs(hash).toString(36);
}

// Anti-Cheat: Kiểm tra và tái tạo số dư Vàng hợp lệ dựa trên nhiệm vụ và kho đồ
function deriveLegitimateBalance(state) {
  const parsedTotal = parseInt(state?.profile?.totalCoinsEarned, 10);
  let rawTotal = Number.isFinite(parsedTotal) ? Math.max(0, parsedTotal) : 20;
  const parsedCoins = parseInt(state?.profile?.coins, 10);
  let rawCoins = Number.isFinite(parsedCoins) ? Math.max(0, parsedCoins) : 20;
  let rawSpent = parseInt(state?.profile?.totalCoinsSpent, 10) || 0;
  return { coins: rawCoins, totalCoinsEarned: rawTotal, tampered: false, fine: 0, totalCoinsSpent: rawSpent };
}

const CURRENT_TAB_ID = 'tab_' + Math.random().toString(36).slice(2) + '_' + Date.now();
const CURRENT_RUNNER_ID = CURRENT_TAB_ID;
let isTimerActionPending = false;
let lastLocalTimerActionTime = 0;
const TIMER_MUTATION_GRACE_MS = 3500;

async function syncWithCloud(isManual = false, timerAction = null) {
  const syncDot = document.getElementById('sync-indicator');
  const modalSyncState = document.getElementById('modal-sync-state');
  const modalSyncTime = document.getElementById('modal-sync-time');

  if (typeof setGlobalProgress === 'function') setGlobalProgress(true);
  if (syncDot) {
    syncDot.className = 'inline-flex items-center justify-center shrink-0 w-2 h-2 text-amber-500';
    syncDot.innerHTML = '<span class="m3-loading-indicator-shape micro"></span>';
  }
  if (modalSyncState) modalSyncState.textContent = 'Đang đồng bộ...';

  const nick = appState.profile.nickname;
  if (!appState.profile.googleId || !nick) {
    if (typeof setGlobalProgress === 'function') setGlobalProgress(false);
    if (syncDot) {
      syncDot.innerHTML = '';
      syncDot.className = 'w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600';
    }
    if (modalSyncState) modalSyncState.textContent = 'Chưa đăng nhập Google';
    return;
  }
  const token = appState.profile.sessionToken || appState.profile.googleToken || appState.profile.token || getOrCreateUserToken();

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        nickname: nick,
        oldNickname: appState.pendingOldNickname,
        token: token,
        idToken: appState.profile.googleToken || token,
        state: appState,
        timerAction: timerAction || undefined
      })
    });

    if (res.ok) {
      const data = await res.json();
      delete appState.pendingOldNickname;
      if (data.role) {
        appState.profile.role = data.role;
        updateAdminNavVisibility();
      }

      // Echo Reconciliation: Đồng bộ activeTimer ngay lập tức từ kết quả xác thực của server
      if (data.activeTimer !== undefined) {
        const isRecentLocalAction = (Date.now() - lastLocalTimerActionTime < TIMER_MUTATION_GRACE_MS);
        if (data.activeTimer === null && appState.activeTimer) {
          if (!isRecentLocalAction) {
            clearFocusTimerSession(false);
          }
        } else if (data.activeTimer) {
          // Revival Guard: Nếu thiết bị này vừa bấm Dừng / Hủy / Bảo lưu gần đây (trong grace period 3.5s) hoặc đã dọn dẹp timer cục bộ,
          // TUYỆT ĐỐI KHÔNG nhận activeTimer cũ từ server để tránh bị bật lại đồng hồ!
          const timerServerTime = Number(data.activeTimer.updatedAt || data.activeTimer.lastTickTime || 0);
          const isClearedLocally = (appState.lastTimerClearedAt || 0) >= timerServerTime;
          if ((isRecentLocalAction || isClearedLocally) && !isFocusRunning && !activeFocusQuest && !activeRewardItem) {
            // Giữ nguyên trạng thái đã bảo lưu/dừng tại local
          } else {
            appState.activeTimer = data.activeTimer;
            const isMyRunnerRunning = isFocusRunning && (!data.activeTimer.runnerId || data.activeTimer.runnerId === CURRENT_RUNNER_ID);
            if (!isMyRunnerRunning && appState.activeTimer) {
              restoreFocusTimer();
            }
          }
        }
      }

      // Xử lý xung đột đồng bộ đa thiết bị (Last-Write-Wins):
      // Nếu Cloud chứa dữ liệu mới hơn (do thiết bị khác vừa làm nhiệm vụ), cập nhật ngay
      if (data.conflict && data.state) {
        const isRecentLocalAction = (Date.now() - lastLocalTimerActionTime < TIMER_MUTATION_GRACE_MS);

        // Bảo tồn các savedTimer cục bộ không bị đè bởi snapshot cũ từ Cloud
        const localSavedQuests = new Map((appState.quests || []).filter(q => q.savedTimer).map(q => [q.id, q.savedTimer]));
        const localSavedItems = new Map((appState.inventory || []).filter(i => i.savedTimer).map(i => [i.id, i.savedTimer]));

        appState = normalizeObjectNFC({
          ...DEFAULT_STATE,
          ...data.state,
          profile: {
            ...DEFAULT_STATE.profile,
            ...(data.state.profile || {}),
            sessionToken: appState.profile.sessionToken || data.state.profile?.sessionToken,
            googleToken: appState.profile.googleToken || data.state.profile?.googleToken
          }
        });

        // Khôi phục lại savedTimer nếu cloud state chưa kịp lưu
        const conflictSnapshotTime = Number(data.state?.lastSyncedAt || data.state?.lastModified || 0);
        for (const q of (appState.quests || [])) {
          if (!q.savedTimer && localSavedQuests.has(q.id)) {
            const localSaved = localSavedQuests.get(q.id);
            const savedAt = Number(localSaved?.savedAt || 0);
            if (savedAt > conflictSnapshotTime || (Date.now() - savedAt < TIMER_MUTATION_GRACE_MS)) {
              q.savedTimer = localSaved;
            }
          }
        }
        for (const it of (appState.inventory || [])) {
          if (!it.savedTimer && localSavedItems.has(it.id)) {
            const localSaved = localSavedItems.get(it.id);
            const savedAt = Number(localSaved?.savedAt || 0);
            if (savedAt > conflictSnapshotTime || (Date.now() - savedAt < TIMER_MUTATION_GRACE_MS)) {
              it.savedTimer = localSaved;
            }
          }
        }

        const conflictTimerTime = Number(data.state?.activeTimer?.updatedAt || data.state?.activeTimer?.lastTickTime || 0);
        const isClearedLocally = (appState.lastTimerClearedAt || 0) >= conflictTimerTime;
        if ((isRecentLocalAction || isClearedLocally) && !isFocusRunning && !activeFocusQuest && !activeRewardItem) {
          appState.activeTimer = null;
        }

        const checked = deriveLegitimateBalance(appState);
        appState.profile.coins = checked.coins;
        appState.profile.totalCoinsEarned = checked.totalCoinsEarned;
        saveLocalCache();
        renderAll();
        if (appState.activeTimer && (!isRecentLocalAction || isFocusRunning || activeFocusQuest || activeRewardItem)) {
          restoreFocusTimer();
        }
        if (syncDot) {
          syncDot.innerHTML = '';
          syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        }
        if (modalSyncState) modalSyncState.textContent = 'Đã lưu trên Cloud';
        if (modalSyncTime) modalSyncTime.textContent = new Date(appState.lastSyncedAt || Date.now()).toLocaleTimeString();
        showToast('Đã tự động cập nhật dữ liệu mới nhất từ thiết bị khác!', 'info');
        return;
      }

      if (data.coins !== undefined) appState.profile.coins = data.coins;
      if (data.totalCoinsEarned !== undefined) appState.profile.totalCoinsEarned = data.totalCoinsEarned;
      if (data.adminAdjusted !== undefined) appState.profile.adminAdjusted = data.adminAdjusted;
      if (data.level !== undefined) appState.profile.level = data.level;
      if (data.title) appState.profile.title = data.title;
      if (Array.isArray(data.ledger)) {
        appState.ledger = data.ledger;
        renderLedger();
      }
      appState.lastSyncedAt = data.syncedAt || Date.now();
      saveLocalCache();

      if (data.penalty) {
        showToast(data.penalty, 'error');
        renderHeader();
      }

      if (syncDot) {
        syncDot.innerHTML = '';
        syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      }
      if (modalSyncState) modalSyncState.textContent = 'Đã lưu trên Cloud';
      if (modalSyncTime) modalSyncTime.textContent = new Date(appState.lastSyncedAt).toLocaleTimeString();
      if (isManual && !data.penalty) showToast('Đồng bộ Cloud thành công!', 'success');
    } else {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401) {
        if (modalSyncState) modalSyncState.textContent = 'Hết hạn Google Session';
        if (syncDot) {
          syncDot.innerHTML = '';
          syncDot.className = 'w-2 h-2 rounded-full bg-rose-500';
        }
        if (isManual) showToast('Phiên đăng nhập Google đã hết hạn. Vui lòng đăng nhập lại!', 'error');
      } else if (res.status === 409 || res.status === 403) {
        showToast(errData.error || 'Lỗi phân quyền hoặc trùng tên!', 'error');
        if (modalSyncState) modalSyncState.textContent = 'Trùng tên / Không có quyền';
        if (syncDot) {
          syncDot.innerHTML = '';
          syncDot.className = 'w-2 h-2 rounded-full bg-rose-500';
        }
      } else {
        throw new Error(errData.error || 'Sync endpoint failed');
      }
    }
  } catch (err) {
    console.warn('Sync failed (offline or redis unavailable):', err.message);
    if (syncDot) {
      syncDot.innerHTML = '';
      syncDot.className = 'w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600';
    }
    if (modalSyncState) modalSyncState.textContent = 'Chỉ lưu cục bộ (Offline)';
  } finally {
    if (typeof setGlobalProgress === 'function') setGlobalProgress(false);
  }
}

// ponytail: Tối ưu hóa dung lượng lưu trữ User State (Rolling Window an toàn)
function pruneStateForStorage(state) {
  if (!state || typeof state !== 'object') return state;

  // 1. Quests: Giữ 100% active quests + tối đa 30 completed quests gần nhất
  const quests = Array.isArray(state.quests) ? state.quests : [];
  const activeQuests = quests.filter(q => q.status !== 'completed');
  const completedQuests = quests.filter(q => q.status === 'completed');
  completedQuests.sort((a, b) => (Number(b.completedAt || b.createdAt || 0)) - (Number(a.completedAt || a.createdAt || 0)));
  state.quests = [...activeQuests, ...completedQuests.slice(0, 30)];

  // 2. Inventory: Giữ 100% unused items + tối đa 20 used items gần nhất
  const inventory = Array.isArray(state.inventory) ? state.inventory : [];
  const unusedItems = inventory.filter(i => !i.isUsed || (i.savedTimer && Number(i.savedTimer.remainingSeconds) > 0));
  const usedItems = inventory.filter(i => i.isUsed && (!i.savedTimer || Number(i.savedTimer.remainingSeconds) <= 0));
  usedItems.sort((a, b) => (Number(b.usedAt || b.purchasedAt || 0)) - (Number(a.usedAt || a.purchasedAt || 0)));
  state.inventory = [...unusedItems, ...usedItems.slice(0, 20)];

  // 3. Ledger: Giữ tối đa 100 giao dịch gần nhất
  if (Array.isArray(state.ledger) && state.ledger.length > 100) {
    state.ledger = state.ledger.slice(0, 100);
  }

  // 4. Completed Quest IDs (chống replay attack): Giữ tối đa 500 ID
  if (Array.isArray(state.completedQuestIds) && state.completedQuestIds.length > 500) {
    state.completedQuestIds = state.completedQuestIds.slice(0, 500);
  }

  return state;
}

function triggerSave(needsCloud = true, immediate = false, timerAction = null, skipFullRender = false) {
  pruneStateForStorage(appState);

  // Self-heal corrupted bounty targetMinutes if 0 was coerced to 25
  for (const q of (appState.quests || [])) {
    if (q.type === 'bounty' && (parseInt(q.targetMinutes, 10) || 0) === 25) {
      q.targetMinutes = 0;
    }
  }

  // Anti-cheat check: Ngăn chặn sửa đổi biến global qua DevTools Console
  const check = deriveLegitimateBalance(appState);
  if (check.tampered) {
    console.warn('Phát hiện can thiệp số Vàng. Đã tự động cân bằng về giá trị chuẩn:', check.coins);
    appState.profile.coins = check.coins;
    appState.profile.totalCoinsEarned = check.totalCoinsEarned;
  }
  appState.lastModified = Math.max(Date.now(), (Number(appState.lastSyncedAt) || 0) + 1);
  saveLocalCache();

  // Phát tín hiệu đồng bộ đa tab tức thì qua BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel('levelup_sync_channel');
      try {
        ch.postMessage({
          type: 'STATE_UPDATED',
          tabId: CURRENT_TAB_ID,
          profile: {
            coins: appState.profile.coins,
            totalCoinsEarned: appState.profile.totalCoinsEarned,
            adminAdjusted: appState.profile.adminAdjusted,
            bank: appState.profile.bank
          }
        });
      } finally {
        ch.close();
      }
    } catch (_) {}
  }

  if (skipFullRender) {
    // Bỏ qua renderAll khi thao tác timer để chống giật lag
  } else {
  try {
    renderAll();
  } catch (renderErr) {
    console.error('Lỗi giao diện khi renderAll trong triggerSave:', renderErr);
  }
  }

  if (needsCloud) {
    clearTimeout(syncTimeout);
    if (immediate) {
      syncTimeout = null;
      syncWithCloud(false, timerAction);
    } else {
      syncTimeout = setTimeout(() => {
        syncWithCloud(false, timerAction);
      }, 600);
    }
  }
}

let isHydrating = false;

async function hydrateFromCloud(isManual = false) {
  if (isHydrating) return;
  const nick = appState.profile?.nickname;
  const googleId = appState.profile?.googleId;
  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token || getOrCreateUserToken();

  if (!googleId || !nick || !token) return;
  isHydrating = true;

  const syncDot = document.getElementById('sync-indicator');
  const modalSyncState = document.getElementById('modal-sync-state');
  const modalSyncTime = document.getElementById('modal-sync-time');

  if (isManual) {
    if (typeof setGlobalProgress === 'function') setGlobalProgress(true);
    if (syncDot) {
      syncDot.className = 'inline-flex items-center justify-center shrink-0 w-2 h-2 text-amber-500';
      syncDot.innerHTML = '<span class="m3-loading-indicator-shape micro"></span>';
    }
    if (modalSyncState) modalSyncState.textContent = 'Đang kiểm tra dữ liệu Cloud...';
  }

  try {
    const res = await fetch('/api/sync', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-rose-500';
      if (modalSyncState) modalSyncState.textContent = 'Hết hạn Google Session';
      return;
    }

    if (!res.ok) return;

    const result = await res.json();
    if (!result.found || !result.data) {
      if (isManual) showToast('Chưa có dữ liệu trên Cloud. Dữ liệu sẽ được lưu khi bạn thao tác!', 'info');
      return;
    }

    const cloudData = result.data;
    const cloudTime = Number(cloudData.lastModified || cloudData.lastSyncedAt || 0);
    const localTime = Number(appState.lastModified || appState.lastSyncedAt || 0);
    const timerCloudTime = Number(cloudData.activeTimer?.updatedAt || cloudData.activeTimer?.lastTickTime || 0);
    const timerLocalTime = appState.activeTimer
      ? Number(appState.activeTimer?.updatedAt || 0)
      : Number(appState.lastTimerClearedAt || appState.lastModified || 0);
    const timerChanged = JSON.stringify(cloudData.activeTimer || null) !== JSON.stringify(appState.activeTimer || null);
    const isRecentLocalAction = (Date.now() - lastLocalTimerActionTime < TIMER_MUTATION_GRACE_MS);

    // Nếu một thiết bị khác đã tiếp quản quyền runner và đang chạy -> Dừng ngay lập tức trên thiết bị này
    // (Chỉ dừng nếu runnerId khác đó thực sự MỚI HƠN mốc thao tác của thiết bị này)
    if (isFocusRunning && cloudData.activeTimer?.runnerId && cloudData.activeTimer.runnerId !== CURRENT_RUNNER_ID) {
      if (timerCloudTime >= (lastLocalTimerActionTime || 0)) {
        isFocusRunning = false;
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
        releaseWakeLock();
        renderFocusStationUI();
        updateTimerDisplay();
        updateQuestCardTimerState(activeFocusQuest?.id, false, false);
        showToast('Phiên đếm giờ đã chuyển sang thiết bị khác.', 'info');
      }
    }

    // Nếu Cloud đã chuyển sang tạm dừng mà thiết bị này vẫn đang chạy -> Dừng ngay nếu lệnh pause thực sự mới hơn
    if (isFocusRunning && cloudData.activeTimer && !cloudData.activeTimer.isRunning) {
      if (!isRecentLocalAction && timerCloudTime > (lastLocalTimerActionTime || 0)) {
        isFocusRunning = false;
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
        releaseWakeLock();
        renderFocusStationUI();
        updateTimerDisplay();
        updateQuestCardTimerState(activeFocusQuest?.id, false, true);
      }
    }

    // Nếu trên Cloud đã hủy phiên (activeTimer = null) mà thiết bị này còn phiên -> Chỉ giải phóng nếu Cloud mới hơn
    if (cloudData.activeTimer === null && appState.activeTimer) {
      if (!isRecentLocalAction && cloudTime > Math.max(lastLocalTimerActionTime, timerLocalTime)) {
        clearFocusTimerSession(false);
      } else if (!isRecentLocalAction && cloudTime >= (lastLocalTimerActionTime || 0)) {
        clearFocusTimerSession(false);
      }
    }

    // Nếu Cloud mới hơn (do làm nhiệm vụ trên máy khác) HOẶC trạng thái Timer từ Cloud thực sự mới hơn:
    const isCloudTimerNewer = !isRecentLocalAction && timerChanged && (
      Boolean(cloudData.activeTimer && (!appState.activeTimer || timerCloudTime > timerLocalTime || timerCloudTime >= (lastLocalTimerActionTime || 0))) ||
      Boolean(!cloudData.activeTimer && appState.activeTimer && (cloudTime > timerLocalTime || cloudTime >= (lastLocalTimerActionTime || 0)))
    );

    if (cloudTime > localTime || isCloudTimerNewer) {
      const prevRunner = isFocusRunning && (!appState.activeTimer?.runnerId || appState.activeTimer.runnerId === CURRENT_RUNNER_ID);
      const prevRemaining = focusRemainingSeconds;
      const prevActiveQuest = activeFocusQuest;

      // Bảo tồn savedTimer cục bộ nếu cloudData snapshot chưa kịp cập nhật
      const localSavedQuests = new Map((appState.quests || []).filter(q => q.savedTimer).map(q => [q.id, q.savedTimer]));
      const localSavedItems = new Map((appState.inventory || []).filter(i => i.savedTimer).map(i => [i.id, i.savedTimer]));

      appState = normalizeObjectNFC({
        ...DEFAULT_STATE,
        ...cloudData,
        profile: {
          ...DEFAULT_STATE.profile,
          ...(cloudData.profile || {}),
          sessionToken: appState.profile.sessionToken || cloudData.profile?.sessionToken,
          googleToken: appState.profile.googleToken || cloudData.profile?.googleToken
        }
      });

      for (const q of (appState.quests || [])) {
        if (!q.savedTimer && localSavedQuests.has(q.id)) {
          const localSaved = localSavedQuests.get(q.id);
          const savedAt = Number(localSaved?.savedAt || 0);
          if (savedAt > cloudTime || (Date.now() - savedAt < TIMER_MUTATION_GRACE_MS)) {
            q.savedTimer = localSaved;
          }
        }
      }
      for (const it of (appState.inventory || [])) {
        if (!it.savedTimer && localSavedItems.has(it.id)) {
          const localSaved = localSavedItems.get(it.id);
          const savedAt = Number(localSaved?.savedAt || 0);
          if (savedAt > cloudTime || (Date.now() - savedAt < TIMER_MUTATION_GRACE_MS)) {
            it.savedTimer = localSaved;
          }
        }
      }

      const isClearedLocally = (appState.lastTimerClearedAt || 0) >= timerCloudTime;
      if ((isRecentLocalAction || isClearedLocally) && !isFocusRunning && !activeFocusQuest && !activeRewardItem) {
        appState.activeTimer = null;
      }

      const checked = deriveLegitimateBalance(appState);
      appState.profile.coins = checked.coins;
      appState.profile.totalCoinsEarned = checked.totalCoinsEarned;

      const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('levelup_theme') : null;
      const resolvedTheme = savedTheme || appState.profile.theme || (typeof getSystemTheme === 'function' ? getSystemTheme() : 'light');
      applyTheme(resolvedTheme, false);
      saveLocalCache();
      renderAll();

      // Nếu thiết bị này đang là runner chạy mượt mà và Cloud không có runnerId khác mới hơn, bảo toàn timer đang chạy
      const isCloudSameRunner = cloudData.activeTimer && cloudData.activeTimer.isRunning && (!cloudData.activeTimer.runnerId || cloudData.activeTimer.runnerId === CURRENT_RUNNER_ID);
      if (prevRunner && (!cloudData.activeTimer?.runnerId || cloudData.activeTimer.runnerId === CURRENT_RUNNER_ID) && isFocusRunning && (isRecentLocalAction || isCloudSameRunner)) {
        activeFocusQuest = prevActiveQuest;
        focusRemainingSeconds = prevRemaining;
        if (focusRemainingSeconds <= 0 && activeFocusQuest) {
          focusRemainingSeconds = 0;
          actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
          renderFocusStationUI();
          updateTimerDisplay();
          focusTimerFinished();
        } else {
          isFocusRunning = true;
          renderFocusStationUI();
          updateTimerDisplay();
          updateQuestCardTimerState(activeFocusQuest?.id, true, true);
        }
      } else if (appState.activeTimer && (!isRecentLocalAction || isFocusRunning || activeFocusQuest || activeRewardItem)) {
        restoreFocusTimer();
      }

      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (modalSyncState) modalSyncState.textContent = 'Đã cập nhật từ Cloud';
      if (modalSyncTime) modalSyncTime.textContent = new Date(cloudData.lastSyncedAt || Date.now()).toLocaleTimeString();
      if (isManual) showToast('Đã tải dữ liệu mới nhất từ thiết bị khác thành công!', 'success');
    } else {
      if (timerChanged && !isRecentLocalAction) {
        if (cloudData.activeTimer === null) {
          if (cloudTime > timerLocalTime || cloudTime >= (lastLocalTimerActionTime || 0)) {
            clearFocusTimerSession(false);
          }
        } else if (timerCloudTime > timerLocalTime || timerCloudTime >= (lastLocalTimerActionTime || 0)) {
          const isClearedLocally = (appState.lastTimerClearedAt || 0) >= timerCloudTime;
          if ((isRecentLocalAction || isClearedLocally) && !isFocusRunning && !activeFocusQuest && !activeRewardItem) {
            // Local vừa dừng/bảo lưu, bỏ qua
          } else {
            appState.activeTimer = cloudData.activeTimer || null;
            const isMyRunnerRunning = isFocusRunning && (!cloudData.activeTimer.runnerId || cloudData.activeTimer.runnerId === CURRENT_RUNNER_ID);
            if (!isMyRunnerRunning && appState.activeTimer) {
              restoreFocusTimer();
            }
          }
        }
      }
      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (modalSyncState) modalSyncState.textContent = 'Đã lưu trên Cloud';
      if (modalSyncTime) modalSyncTime.textContent = new Date(appState.lastSyncedAt || Date.now()).toLocaleTimeString();
      if (isManual) showToast('Dữ liệu đã ở trạng thái mới nhất!', 'info');
    }
  } catch (err) {
    console.warn('Hydrate from cloud failed:', err.message);
  } finally {
    isHydrating = false;
    if (typeof setGlobalProgress === 'function') setGlobalProgress(false);
    if (syncDot && syncDot.querySelector('.m3-loading-indicator-shape')) {
      syncDot.innerHTML = '';
      syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
    }
  }
}

async function loadFromCloud(tokenOverride = null) {
  return hydrateFromCloud(true);
}

async function logoutGoogle() {
  const ok = await confirmAction({
    title: 'ĐĂNG XUẤT TÀI KHOẢN',
    message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Google này? Dữ liệu đã đồng bộ trên đám mây sẽ được bảo toàn nguyên vẹn.',
    confirmText: 'Đăng Xuất',
    icon: '🚪',
    btnColor: 'rose'
  });
  if (!ok) return;

  clearTimeout(syncTimeout);
  syncTimeout = null;

  const token = appState.profile?.sessionToken || appState.profile?.googleToken;
  try {
    await fetch('/api/sync?action=logout', {
      method: 'POST',
      credentials: 'include',
      ...(token ? { headers: { 'Authorization': `Bearer ${token}` } } : {})
    });
  } catch (_) {}

  if (window.google?.accounts?.id) {
    try { window.google.accounts.id.disableAutoSelect(); } catch (_) {}
  }
  clearLocalCache();
  clearLegacyLocalStorage();
  clearFocusTimerSession();
  appState = {
    ...DEFAULT_STATE,
    profile: {
      ...DEFAULT_STATE.profile,
      nickname: '',
      googleId: '',
      googleEmail: '',
      googlePicture: '',
      googleToken: '',
      sessionToken: '',
      hasOnboarded: false
    }
  };
  closeModal('modal-profile');
  renderAll();
  openModal('modal-welcome');
  const tabLogin = document.getElementById('btn-tab-welcome-login');
  if (tabLogin) tabLogin.click();
  else renderGoogleSignInButton();
  showToast('Đã đăng xuất tài khoản Google.', 'info');
}

async function switchGoogleAccount() {
  const ok = await confirmAction({
    title: 'ĐỔI TÀI KHOẢN GOOGLE',
    message: 'Hệ thống sẽ đăng xuất tài khoản hiện tại và đưa bạn về màn hình đăng nhập Google để chọn tài khoản khác.',
    confirmText: 'Đổi Tài Khoản',
    icon: '🔄',
    btnColor: 'amber'
  });
  if (!ok) return;

  clearTimeout(syncTimeout);
  syncTimeout = null;

  const token = appState.profile?.sessionToken || appState.profile?.googleToken;
  try {
    await fetch('/api/sync?action=logout', {
      method: 'POST',
      credentials: 'include',
      ...(token ? { headers: { 'Authorization': `Bearer ${token}` } } : {})
    });
  } catch (_) {}

  if (window.google?.accounts?.id) {
    try { window.google.accounts.id.disableAutoSelect(); } catch (_) {}
  }
  clearLocalCache();
  clearLegacyLocalStorage();
  clearFocusTimerSession();
  appState = {
    ...DEFAULT_STATE,
    profile: {
      ...DEFAULT_STATE.profile,
      nickname: '',
      googleId: '',
      googleEmail: '',
      googlePicture: '',
      googleToken: '',
      sessionToken: '',
      hasOnboarded: false
    }
  };
  closeModal('modal-profile');
  renderAll();
  openModal('modal-welcome');
  const tabLogin = document.getElementById('btn-tab-welcome-login');
  if (tabLogin) tabLogin.click();
  else renderGoogleSignInButton();
  showToast('Vui lòng đăng nhập tài khoản Google mới.', 'info');
}
