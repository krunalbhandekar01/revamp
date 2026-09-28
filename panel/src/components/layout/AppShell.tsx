import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('bf-sidebar') === 'collapsed';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem('bf-sidebar', collapsed ? 'collapsed' : 'expanded');
    } catch {
      /* non-fatal */
    }
  }, [collapsed]);

  // Close the drawer on navigation; scroll the content region to the top.
  useEffect(() => {
    setMobileOpen(false);
    document.getElementById('bf-content')?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex h-full overflow-hidden bg-surface-1">
      {/* Desktop rail */}
      <div className="hidden shrink-0 lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full animate-in-soft">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 text-white hover:bg-white/10 hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </Button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenCommand={() => setCommandOpen(true)} onOpenMobileNav={() => setMobileOpen(true)} />
        <main id="bf-content" className={cn('flex-1 overflow-y-auto')}>
          <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
