import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div id="root">
      <div className="workspace">
        <Sidebar />
        <div className="workspace-main">
          <Navbar />
          <div className="workspace-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
