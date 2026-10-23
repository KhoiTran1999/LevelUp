import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('Legacy bridge is completely removed and all remaining overlays are React 19 components', () => {
  const root = process.cwd();
  const pagePath = path.join(root, 'app', 'page.tsx');
  const pageCode = fs.readFileSync(pagePath, 'utf8');

  // 1. Verify LegacyViewsBridge and runtime file reads are completely removed
  assert.ok(!pageCode.includes('LegacyViewsBridge'), 'app/page.tsx must not import or render LegacyViewsBridge');
  assert.ok(!pageCode.includes("from 'node:fs'"), 'app/page.tsx must not import node:fs');
  assert.ok(!pageCode.includes('fs.readFileSync'), 'app/page.tsx must not execute synchronous template reads');
  assert.ok(!fs.existsSync(path.join(root, 'components', 'bridge', 'LegacyViewsBridge.tsx')), 'LegacyViewsBridge.tsx must be deleted');

  const layoutPath = path.join(root, 'app', 'layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');
  assert.ok(!layoutCode.includes('src="/app.js'), 'app/layout.tsx must not load the legacy runtime bundle');

  // 2. Verify new React 19 components are mounted in page.tsx
  assert.ok(pageCode.includes('<FocusZenOverlay />'), 'app/page.tsx must mount FocusZenOverlay');
  assert.ok(pageCode.includes('<ToastContainer />'), 'app/page.tsx must mount ToastContainer');

  // 3. Verify FocusZenOverlay contains all expected IDs and controls
  const zenCode = fs.readFileSync(path.join(root, 'components', 'timer', 'FocusZenOverlay.tsx'), 'utf8');
  assert.ok(zenCode.includes('id="focus-zen-overlay"'), 'FocusZenOverlay must contain #focus-zen-overlay');
  assert.ok(zenCode.includes('id="zen-quest-rank"'), 'FocusZenOverlay must contain #zen-quest-rank');
  assert.ok(zenCode.includes('id="zen-quest-title"'), 'FocusZenOverlay must contain #zen-quest-title');
  assert.ok(zenCode.includes('id="zen-progress-ring"'), 'FocusZenOverlay must contain #zen-progress-ring');
  assert.ok(zenCode.includes('id="zen-timer-display"'), 'FocusZenOverlay must contain #zen-timer-display');
  assert.ok(zenCode.includes('id="btn-zen-toggle"'), 'FocusZenOverlay must contain #btn-zen-toggle');
  assert.ok(zenCode.includes('id="btn-zen-brain-dump"'), 'FocusZenOverlay must contain #btn-zen-brain-dump');
  assert.ok(zenCode.includes('id="btn-zen-dopamine-guide"'), 'FocusZenOverlay must contain #btn-zen-dopamine-guide');
  assert.ok(zenCode.includes('id="btn-zen-hold"'), 'FocusZenOverlay must contain #btn-zen-hold');
  assert.ok(zenCode.includes('id="btn-zen-exit"'), 'FocusZenOverlay must contain #btn-zen-exit');

  // 4. Verify MobileBottomNav contains integrated bottom sheet and backdrop
  const navCode = fs.readFileSync(path.join(root, 'components', 'navigation', 'MobileBottomNav.tsx'), 'utf8');
  assert.ok(navCode.includes('id="mobile-more-backdrop"'), 'MobileBottomNav must contain #mobile-more-backdrop');
  assert.ok(navCode.includes('id="mobile-more-menu"'), 'MobileBottomNav must contain #mobile-more-menu');
  assert.ok(navCode.includes('data-tab="tracker"'), 'MobileBottomNav must contain tracker navigation');
  assert.ok(navCode.includes('data-tab="leaderboard"'), 'MobileBottomNav must contain leaderboard navigation');
  assert.ok(navCode.includes('data-tab="ledger"'), 'MobileBottomNav must contain ledger navigation');
  assert.ok(navCode.includes('data-tab="bank"'), 'MobileBottomNav must contain bank navigation');
  assert.ok(navCode.includes('id="mobile-nav-admin"'), 'MobileBottomNav must contain #mobile-nav-admin');
  assert.ok(navCode.includes('id="btn-mobile-about"'), 'MobileBottomNav must contain #btn-mobile-about');

  // 5. Verify ToastContainer contains global notification and tooltip roots
  const toastCode = fs.readFileSync(path.join(root, 'components', 'ui', 'ToastContainer.tsx'), 'utf8');
  assert.ok(toastCode.includes('id="toast-container"'), 'ToastContainer must contain #toast-container');
  assert.ok(toastCode.includes('id="heatmap-floating-tooltip"'), 'ToastContainer must contain #heatmap-floating-tooltip');
});
