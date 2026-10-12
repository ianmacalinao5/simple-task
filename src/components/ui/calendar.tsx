'use client';

import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'relative',
        months: 'flex flex-col gap-4',
        month: 'space-y-3',
        month_caption: 'relative flex h-8 items-center justify-center',
        caption_label: 'text-sm font-semibold text-slate-900',
        nav: 'flex items-center gap-1',
        button_previous:
          'absolute left-0 top-0 grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30',
        button_next:
          'absolute right-0 top-0 grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 rounded-md text-center text-[0.7rem] font-medium text-slate-500',
        weeks: 'mt-1 flex flex-col',
        week: 'mt-1 flex w-full',
        day: 'relative size-9 p-0 text-center text-sm',
        day_button:
          'grid size-9 place-items-center rounded-md font-normal text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30',
        selected:
          '[&>button]:bg-emerald-800 [&>button]:font-semibold [&>button]:text-white [&>button]:hover:bg-emerald-700 [&>button]:hover:text-white',
        today: '[&>button]:font-semibold [&>button]:text-emerald-800',
        outside: '[&>button]:text-slate-400 [&>button]:opacity-50',
        disabled: '[&>button]:cursor-not-allowed [&>button]:opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) =>
          orientation === 'left' ? (
            <ChevronLeft size={16} {...props} />
          ) : orientation === 'right' ? (
            <ChevronRight size={16} {...props} />
          ) : orientation === 'up' ? (
            <ChevronUp size={16} {...props} />
          ) : (
            <ChevronDown size={16} {...props} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
