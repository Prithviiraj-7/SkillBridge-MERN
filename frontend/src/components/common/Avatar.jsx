import React, { useState } from 'react';

const COLOR_PALETTE = [
  'bg-teal-600 text-white',
  'bg-emerald-600 text-white',
  'bg-amber-600 text-white',
  'bg-indigo-600 text-white',
  'bg-rose-600 text-white',
  'bg-cyan-600 text-white',
  'bg-orange-600 text-white',
  'bg-violet-600 text-white',
];

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getColorClass = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};

const SIZE_CLASSES = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm font-semibold',
  lg: 'w-16 h-16 text-lg font-bold',
  xl: 'w-24 h-24 text-2xl font-bold',
};

export default function Avatar({ src, name = 'User', size = 'md', className = '' }) {
  const [imageError, setImageError] = useState(false);

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const initials = getInitials(name);
  const colorClass = getColorClass(name);

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImageError(true)}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white shadow-sm shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      role="img"
      className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 tracking-wider shadow-sm select-none ${colorClass} ${className}`}
    >
      {initials}
    </div>
  );
}
