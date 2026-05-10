import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/auth/SessionProvider';
import AppShell from '@/components/layout/AppShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GovernanceOS — Corporate Governance Platform',
  description: 'Centralized entity management for regulated financial institutions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased font-sans">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
