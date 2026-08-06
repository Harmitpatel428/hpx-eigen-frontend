import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const AppLayout: React.FC<{ isLoading?: boolean }> = ({ isLoading }) => {
  return (
    <div
      style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: 'var(--bg-app)' }}
      className="antialiased"
    >
      <Sidebar />

      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />

        <main
          style={{ flex: 1, overflowY: 'auto', padding: 32, backgroundColor: 'var(--bg-app)' }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ height: 32, borderRadius: 12, backgroundColor: 'var(--bg-muted)', animation: 'pulse 1.5s infinite', width: '25%' }} />
              <div style={{ height: 256, borderRadius: 12, backgroundColor: 'var(--bg-muted)', animation: 'pulse 1.5s infinite' }} />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};
