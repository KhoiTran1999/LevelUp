import React from 'react';

export interface ProgressBarProps {
  id?: string;
  isIndeterminate?: boolean;
  value?: number; // 0 to 100
  visible?: boolean;
  className?: string;
  label?: string;
}

export function ProgressBar({
  id = 'global-progress-bar',
  isIndeterminate = true,
  value = 0,
  visible = true,
  className = '',
  label = 'Đang tải dữ liệu...',
}: ProgressBarProps) {
  return (
    <div
      id={id}
      className={`m3-linear-progress ${isIndeterminate ? 'is-indeterminate' : ''} ${
        visible ? '' : 'hidden opacity-0'
      } ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : value}
    >
      <div
        className="m3-linear-progress-bar-primary"
        style={!isIndeterminate ? { transform: `scaleX(${Math.min(100, Math.max(0, value)) / 100})` } : undefined}
      />
      <div className="m3-linear-progress-bar-secondary" />
      <div className="m3-linear-progress-stop" />
    </div>
  );
}
