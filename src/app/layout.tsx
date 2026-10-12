import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
export const metadata: Metadata = {
  title: 'Taskboard — simple team planning',
  description: 'A simple shared Kanban task board.',
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="bottom-right" richColors closeButton duration={4200} />
      </body>
    </html>
  );
}
