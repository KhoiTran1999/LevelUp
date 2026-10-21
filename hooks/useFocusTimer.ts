'use client';

import { useCallback, useEffect } from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';
import type { Quest } from '@/types/levelup';

export function useFocusTimer() {
  const {
    state,
    startFocusTimer,
    startBreakTimer,
    pauseFocusTimer,
    resumeFocusTimer,
    holdFocusTimer,
    resetFocusTimer,
    adjustFocusTimer,
    setFocusTimerRemaining,
  } = useLevelUp();

  const activeTimer = state.activeTimer;
  const isRunning = activeTimer?.status === 'running';
  const isPaused = activeTimer?.status === 'paused' || activeTimer?.status === 'held';
  const isHeld = activeTimer?.status === 'held' || activeTimer?.status === 'paused';
  const isVisible = Boolean(activeTimer && activeTimer.status !== 'idle');

  const remainingSeconds = activeTimer?.remainingSeconds ?? 1500;
  const totalSeconds = activeTimer?.totalSeconds || 1500;

  const minutes = Math.floor(Math.max(0, remainingSeconds) / 60);
  const seconds = Math.floor(Math.max(0, remainingSeconds) % 60);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // SVG dash offset calculation (circumference = 2 * PI * 20 = ~125.66 for banner)
  const bannerCircumference = 125.66;
  const zenCircumference = 659.73;
  const progressRatio = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0;
  const bannerDashOffset = bannerCircumference * (1 - progressRatio);
  const zenDashOffset = zenCircumference * (1 - progressRatio);

  const toggle = useCallback(() => {
    if (isRunning) {
      pauseFocusTimer();
    } else {
      resumeFocusTimer();
    }
  }, [isRunning, pauseFocusTimer, resumeFocusTimer]);

  const toggleZen = useCallback((show?: boolean) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('levelup:toggle-zen', { detail: { show } }));
  }, []);

  const openAdjustmentModal = useCallback(() => {
    if (typeof window === 'undefined') return;
    const isReward = Boolean(activeTimer?.isReward);
    window.dispatchEvent(
      new CustomEvent('levelup:open-timer-adjustment', {
        detail: {
          remainingSeconds,
          isReward,
          minMinutes: isReward ? 0 : 5,
          maxMinutes: isReward ? Math.ceil(remainingSeconds / 60) : 180,
          targetMinutes: activeTimer?.totalSeconds ? Math.round(activeTimer.totalSeconds / 60) : 25,
        },
      })
    );
  }, [activeTimer, remainingSeconds]);

  // Expose global window actions for legacy event bridge & unit tests
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      toggleZenMode?: (show?: boolean) => void;
      toggleFocusTimer?: () => void;
      holdFocusTimer?: () => void;
      resetFocusTimer?: () => void;
      openEditTimerModal?: () => void;
      saveEditTimer?: (mins: number, secs: number) => boolean;
      startBreakTimer?: (mins?: number) => void;
      __reactToggleZenMode?: (show?: boolean) => void;
      __reactToggleFocusTimer?: () => void;
      __reactHoldFocusTimer?: () => void;
      __reactResetFocusTimer?: () => void;
    };

    win.toggleZenMode = toggleZen;
    win.toggleFocusTimer = toggle;
    win.holdFocusTimer = holdFocusTimer;
    win.resetFocusTimer = resetFocusTimer;
    win.openEditTimerModal = openAdjustmentModal;
    win.__reactToggleZenMode = toggleZen;
    win.__reactToggleFocusTimer = toggle;
    win.__reactHoldFocusTimer = holdFocusTimer;
    win.__reactResetFocusTimer = resetFocusTimer;

    win.saveEditTimer = (newMins: number, newSecs: number) => {
      const newTotal = newMins * 60 + newSecs;
      if (newTotal <= 0) return false;
      setFocusTimerRemaining(newTotal);
      return true;
    };

    win.startBreakTimer = (breakMins = 5) => {
      startBreakTimer(breakMins);
    };
  }, [toggle, toggleZen, holdFocusTimer, resetFocusTimer, openAdjustmentModal, setFocusTimerRemaining, startBreakTimer]);

  return {
    activeTimer,
    isRunning,
    isPaused,
    isHeld,
    isVisible,
    remainingSeconds,
    totalSeconds,
    formattedTime,
    progressRatio,
    bannerDashOffset,
    zenDashOffset,
    start: startFocusTimer,
    startBreak: startBreakTimer,
    pause: pauseFocusTimer,
    resume: resumeFocusTimer,
    hold: holdFocusTimer,
    reset: resetFocusTimer,
    adjust: adjustFocusTimer,
    toggle,
    toggleZen,
    openAdjustmentModal,
  };
}
