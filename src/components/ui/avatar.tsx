import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Avatar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar"
      className={cn('relative flex size-9 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-900',
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback };
