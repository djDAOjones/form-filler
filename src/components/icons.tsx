/** Inline SVG icons (Carbon-style line icons). No icon-library dependency. */
import React from 'react';

type IconProps = { className?: string };

const base = (children: React.ReactNode, className?: string) => (
  <svg
    className={className ?? 'aff-btn__icon'}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const PlayIcon = ({ className }: IconProps) =>
  base(<path d="M4 2.5l9 5.5-9 5.5z" fill="currentColor" stroke="none" />, className);

export const RefreshIcon = ({ className }: IconProps) =>
  base(
    <>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
      <path d="M13.5 2v3h-3" />
    </>,
    className,
  );

export const DiceIcon = ({ className }: IconProps) =>
  base(
    <>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <circle cx="5.5" cy="5.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </>,
    className,
  );

export const DownloadIcon = ({ className }: IconProps) =>
  base(
    <>
      <path d="M8 2v8" />
      <path d="M4.5 7L8 10.5 11.5 7" />
      <path d="M2.5 13.5h11" />
    </>,
    className,
  );

export const UploadIcon = ({ className }: IconProps) =>
  base(
    <>
      <path d="M8 11V3" />
      <path d="M4.5 6L8 2.5 11.5 6" />
      <path d="M2.5 13.5h11" />
    </>,
    className,
  );

export const CloseIcon = ({ className }: IconProps) =>
  base(
    <>
      <path d="M3.5 3.5l9 9" />
      <path d="M12.5 3.5l-9 9" />
    </>,
    className,
  );

export const StopIcon = ({ className }: IconProps) =>
  base(<rect x="3.5" y="3.5" width="9" height="9" fill="currentColor" stroke="none" />, className);
