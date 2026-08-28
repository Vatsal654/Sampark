/**
 * Purpose: Root layout for the scanner portal.
 * Related: components/LocaleProvider.tsx, app/globals.css.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../components/LocaleProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sampark — Contact a vehicle owner',
  description: 'Safely contact a vehicle owner without seeing their phone number.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
