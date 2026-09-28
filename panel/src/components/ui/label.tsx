import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-muted', className)}
      {...props}
    />
  );
}
