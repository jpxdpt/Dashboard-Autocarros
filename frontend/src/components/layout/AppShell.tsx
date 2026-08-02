import { ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { authService } from '../../services/auth';

export default function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = authService.getUser();
  const company = authService.getCompany();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4">
        <div className="headline">{company?.name || 'Frota'}</div>
        <div className="footnote">Gestão de autocarros</div>
      </div>
      <Sidebar onNavigate={() => setMobileOpen(false)} />
      <div className="mt-auto px-3 pb-5">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-fill flex items-center justify-center text-[13px] font-semibold text-label-secondary">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-label truncate">{user?.name}</div>
          </div>
          <ThemeToggle />
          <button
            onClick={() => authService.logout()}
            aria-label="Sair"
            className="w-9 h-9 flex items-center justify-center rounded-full text-label-secondary hover:bg-fill active:scale-95 transition-all duration-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-app text-label">
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-separator z-30"
        style={{ background: 'var(--sidebar)', backdropFilter: 'var(--blur-material)', WebkitBackdropFilter: 'var(--blur-material)' }}
      >
        {sidebarContent}
      </aside>

      {/* Drawer mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'var(--scrim)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              className="absolute inset-y-0 left-0 w-72 glass flex flex-col"
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conteúdo */}
      <div className="lg:pl-64">
        {/* Toolbar móvel de vidro */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-separator">
          <div className="flex items-center gap-2 px-4 h-14">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-fill active:scale-95 transition-all duration-100"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <span className="headline">{company?.name || 'Frota'}</span>
          </div>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
