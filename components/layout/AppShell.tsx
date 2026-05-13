'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import FeedbackWidget from '@/components/FeedbackWidget';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublic = pathname === '/' || pathname === '/login' || pathname.startsWith('/signup');
  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <FeedbackWidget />
    </div>
  );
}
