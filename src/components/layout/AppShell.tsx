import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
        <Navbar />
        <main className="flex-1 w-full px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
