import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Be_Vietnam_Pro, Roboto_Flex } from 'next/font/google';
import '@/src/tailwind.css';

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
});

const robotoFlex = Roboto_Flex({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-roboto-flex',
});

export const metadata: Metadata = {
  title: 'LevelUp — Biến Công Việc & Thói Quen Thành Trò Chơi',
  description: 'Gamified Productivity & Habit RPG with Strict AI Arbiter',
  applicationName: 'LevelUp',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
      { url: '/apple-touch-icon.png', sizes: '180x180' }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LevelUp'
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'referrer': 'no-referrer'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' }
  ]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${beVietnamPro.variable} ${robotoFlex.variable}`}>
      <head>
        {/* Preconnect & Material Symbols Outlined font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />

        {/* Global Custom Stylesheet */}
        <link rel="stylesheet" href="/style.css?v=1.0.3" />

        {/* Critical Anti-FOUT: lock icon dimensions and hide ligature text until font is active */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .material-symbols-outlined {
              font-family: 'Material Symbols Outlined' !important;
              font-weight: normal;
              font-style: normal;
              font-size: 20px;
              line-height: 1;
              letter-spacing: normal;
              text-transform: none;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              white-space: nowrap;
              word-wrap: normal;
              direction: ltr;
              -webkit-font-feature-settings: 'liga';
              -webkit-font-smoothing: antialiased;
              font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
              vertical-align: middle;
              user-select: none;
              width: 1em;
              height: 1em;
              overflow: hidden;
            }
            html:not(.wf-symbols-active) .material-symbols-outlined {
              color: transparent !important;
            }
          `
          }}
        />

        {/* Early script for font-active class, theme palette and dark mode before paint */}
        <Script
          id="early-theme-font-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              if (document.fonts) {
                document.fonts.load('24px "Material Symbols Outlined"').then(function() {
                  document.documentElement.classList.add('wf-symbols-active');
                }).catch(function() {
                  document.documentElement.classList.add('wf-symbols-active');
                });
                setTimeout(function() {
                  document.documentElement.classList.add('wf-symbols-active');
                }, 1200);
              } else {
                document.documentElement.classList.add('wf-symbols-active');
              }

              try {
                localStorage.removeItem('levelup_state_v1');
                localStorage.removeItem('levelup_onboarded');
                const savedPalette = localStorage.getItem('levelup_theme_palette') || 'modern-indigo';
                if (savedPalette && savedPalette !== 'modern-indigo') {
                  document.documentElement.dataset.palette = savedPalette;
                } else {
                  delete document.documentElement.dataset.palette;
                }
                
                const savedTheme = localStorage.getItem('levelup_theme');
                const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (err) {}
            })();
          `
          }}
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-indigo-500 selection:text-white pb-24 md:pb-12 overflow-x-hidden">
        {children}

        {/* Google Identity Services SDK */}
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />

        {/* Confetti Celebration VFX */}
        <Script src="/vendor/confetti.browser.min.js" strategy="afterInteractive" />

        {/* Main LevelUp Client Application Bundle */}
        <Script src="/app.js?v=1.0.5" strategy="afterInteractive" />

        {/* PWA Service Worker Registration */}
        <Script id="pwa-sw-registration" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then((reg) => {
                  reg.update().catch(() => {});
                }).catch(() => {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
