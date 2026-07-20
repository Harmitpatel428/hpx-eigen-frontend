import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
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
