import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const AppLayout: React.FC<{ isLoading?: boolean }> = ({ isLoading }) => {
  const location = useLocation();
  const [navOpen, setNavOpen] = React.useState(false);
  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => { setNavOpen(false); }, [location.pathname]);

  return (
    <div
      style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: 'var(--bg-app)' }}
      className="antialiased"
    >
      <Sidebar open={navOpen} />
      {navOpen && (
        <div className="app-nav-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}

      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar onMenuClick={() => setNavOpen(v => !v)} />

        <main
          className="app-main"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 32, backgroundColor: 'var(--bg-app)' }}
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
