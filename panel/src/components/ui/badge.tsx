import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      tone: {
        neutral: 'border-transparent bg-neutral-soft text-ink-secondary',
        good: 'border-transparent bg-good-soft text-good',
        warning: 'border-transparent bg-warning-soft text-warning',
        serious: 'border-transparent bg-serious-soft text-serious',
        critical: 'border-transparent bg-critical-soft text-critical',
        primary: 'border-transparent bg-primary-soft text-primary',
        outline: 'border-line bg-transparent text-ink-secondary',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
