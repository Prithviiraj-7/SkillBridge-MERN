import React from 'react';

const ROLE_STYLES = {
  learner: 'bg-blue-50 text-blue-700 border-blue-200',
  teacher: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  both: 'bg-teal-50 text-teal-700 border-teal-200',
};

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function RoleBadge({ role = 'both', className = '' }) {
  const normalized = (role || 'both').toLowerCase();
  const style = ROLE_STYLES[normalized] || ROLE_STYLES.both;
  const label =
    normalized === 'learner'
      ? 'Learner'
      : normalized === 'teacher'
      ? 'Teacher'
      : 'Teacher & Learner';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status = 'pending', className = '' }) {
  const normalized = (status || 'pending').toLowerCase();
  const style = STATUS_STYLES[normalized] || STATUS_STYLES.pending;
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      {label}
    </span>
  );
}
