import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number | string;
  className?: string;
}

export function Icon({ name, size, className = '', style, ...props }: IconProps) {
  const customStyle: React.CSSProperties = {
    ...(size ? { fontSize: typeof size === 'number' ? `${size}px` : size } : {}),
    ...style,
  };

  return (
    <span
      className={`material-symbols-outlined shrink-0 select-none ${className}`}
      style={customStyle}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
