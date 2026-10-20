'use client';

import React from 'react';

interface LegacyViewsBridgeProps {
  content: string;
  className?: string;
  id?: string;
}

export function LegacyViewsBridge({
  content,
  className = 'contents',
  id,
}: LegacyViewsBridgeProps) {
  if (!content) return null;

  return (
    <div
      id={id}
      className={className}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
