import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('Step 2: Client Logic Modernization (useSoundFX & useFocusTimer)', () => {
  const root = process.cwd();

  // 1. Audio Sound Effects Synthesizer & Hook
  const sfxPath = path.join(root, 'lib', 'audio', 'sound-effects.ts');
  const hookSfxPath = path.join(root, 'hooks', 'useSoundFX.ts');
  assert.ok(fs.existsSync(sfxPath), 'lib/audio/sound-effects.ts must exist');
  assert.ok(fs.existsSync(hookSfxPath), 'hooks/useSoundFX.ts must exist');

  const sfxCode = fs.readFileSync(sfxPath, 'utf8');
  assert.ok(sfxCode.includes('playCoin'), 'sound-effects must implement playCoin');
  assert.ok(sfxCode.includes('playFanfare'), 'sound-effects must implement playFanfare');
  assert.ok(sfxCode.includes('playGong'), 'sound-effects must implement playGong');
  assert.ok(sfxCode.includes('playClick'), 'sound-effects must implement playClick');
  assert.ok(sfxCode.includes('window.sfx = soundFX'), 'sound-effects must bind window.sfx for legacy interoperability');

  // 2. Focus Timer Hook
  const hookTimerPath = path.join(root, 'hooks', 'useFocusTimer.ts');
  assert.ok(fs.existsSync(hookTimerPath), 'hooks/useFocusTimer.ts must exist');

  const timerHookCode = fs.readFileSync(hookTimerPath, 'utf8');
  assert.ok(timerHookCode.includes('function useFocusTimer'), 'useFocusTimer must be exported');
  assert.ok(timerHookCode.includes('bannerDashOffset'), 'useFocusTimer must calculate bannerDashOffset');
  assert.ok(timerHookCode.includes('zenDashOffset'), 'useFocusTimer must calculate zenDashOffset');
  assert.ok(timerHookCode.includes('openAdjustmentModal'), 'useFocusTimer must support opening adjustment modal');
  assert.ok(timerHookCode.includes('win.saveEditTimer'), 'useFocusTimer must bridge saveEditTimer for tests');

  // 3. Components integration
  const bannerCode = fs.readFileSync(path.join(root, 'components', 'timer', 'FocusTimerBanner.tsx'), 'utf8');
  assert.ok(bannerCode.includes('useFocusTimer()'), 'FocusTimerBanner must use useFocusTimer hook');

  const zenCode = fs.readFileSync(path.join(root, 'components', 'timer', 'FocusZenOverlay.tsx'), 'utf8');
  assert.ok(zenCode.includes('useFocusTimer()'), 'FocusZenOverlay must use useFocusTimer hook');

  // 4. Provider delta-time ticker integration
  const providerCode = fs.readFileSync(path.join(root, 'components', 'providers', 'LevelUpProvider.tsx'), 'utf8');
  assert.ok(providerCode.includes("state.activeTimer?.status !== 'running'"), 'LevelUpProvider must check running timer status');
  assert.ok(providerCode.includes('soundFX.playFanfare()'), 'LevelUpProvider must invoke soundFX on timer completion');
});
