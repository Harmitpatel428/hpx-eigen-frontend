import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { subscribeActiveCount, getActiveCount } from './notify';

const VISIBLE = 3;

/**
 * The single global notification stack, mounted once at the app root so it
 * covers every route. One fixed position everywhere: top-right on desktop
 * (below the app header), a full-width top column on mobile. Toasts slide in
 * from above. Appearance is owned by AppToast; this configures placement,
 * stacking, z-index (above modals) and the "+N" queue chip shown when more
 * toasts are waiting than the visible cap.
 */
export function AppToaster() {
  const [count, setCount] = useState(0);
  useEffect(() => subscribeActiveCount(() => setCount(getActiveCount())), []);
  const overflow = Math.max(0, count - VISIBLE);
  return (
    <>
      <Toaster
        position="top-right"
        expand
        offset={{ top: '72px', right: '24px' }}
        mobileOffset={{ top: '72px', right: '16px', left: '16px' }}
        gap={10}
        visibleToasts={VISIBLE}
        className="app-toaster"
        style={{ zIndex: 'var(--z-toast)' }}
      />
      {overflow > 0 && <div className="app-toast-more" aria-hidden="true">+{overflow} more</div>}
    </>
  );
}
