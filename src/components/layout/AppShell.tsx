import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ImpersonationBanner } from './ImpersonationBanner';
import { useAuth } from '../../auth/public';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();
  const isImpersonated = user?.isImpersonated ?? false;
  const impersonatedName = isImpersonated
    ? [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Unknown'
    : '';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)]">
      {isImpersonated && <ImpersonationBanner impersonatedUserName={impersonatedName} />}
      <Sidebar />
      <div
        className="flex-1 flex flex-col min-w-0 overflow-y-auto relative"
        style={isImpersonated ? { marginTop: 40 } : undefined}
      >
        <Navbar />
        <main className="flex-1 w-full px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
