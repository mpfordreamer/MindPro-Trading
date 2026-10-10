import type { HTMLAttributes } from 'react';

// motion-reduce: hormati preferensi "kurangi gerakan" (WCAG 2.3.3).
export const Skeleton = ({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div aria-hidden={rest.role ? undefined : true} {...rest} className={`animate-pulse rounded-lg bg-slate-800 motion-reduce:animate-none ${className}`} />
);
