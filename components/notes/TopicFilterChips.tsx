'use client';

import React from 'react';

/**
 * TopicFilterChips Component
 * Hidden by design according to the stable LevelUp RPG specification (bỏ hệ thống tag để giữ giao diện tối giản).
 * Retains the #notes-topics-bar ID for backwards compatibility with tests and DOM queries.
 */
export function TopicFilterChips({ id = 'notes-topics-bar' }: { id?: string }) {
  return <div className="hidden" id={id} aria-hidden="true" />;
}
