import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from './UI';

interface MainLayoutProps { children: React.ReactNode; }

const navItems = [
  { path: '/', label: 'Overview', icon: '◫', section: 'Workspace' },
  { path: '/positions', label: 'Open positions', icon: '↗', section: 'Workspace' },
  { path: '/history', label: 'Trade history', icon: '⌁', section: 'Workspace' },
  { path: '/analysis', label: 'Market analysis', icon: '⌇', section: 'Workspace' },
  { path: '/activity', label: 'Activity', icon: '◷', section: 'Workspace' },
  { path: '/control', label: 'Bot control', icon: '◉', section: 'System' },
  { path: '/settings', label: 'Settings', icon: '⚙', section: 'System' },
  { path: '/ea', label: 'EA instances', icon: '⌘', section: 'System' },
];

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activePage = navItems.find((item) => item.path === location.pathname)?.label ?? 'Overview';
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen lg:flex">
      <button
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#111721] text-white lg:hidden"
        onClick={() => setMobileNavOpen((open) => !open)}
        aria-label="Toggle navigation"
      >{mobileNavOpen ? '×' : '☰'}</button>

      {mobileNavOpen && <button aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-white/[.07] bg-[#0b0f15]/95 px-4 py-5 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/" className="mb-9 flex items-center gap-3 px-2" onClick={() => setMobileNavOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200/20 bg-emerald-200/[.08] text-lg text-[#9af0cc] shadow-[0_8px_28px_rgba(107,218,177,.12)]">◈</span>
          <span><span className="block font-[Manrope] text-sm font-extrabold tracking-wide text-white">NORTHSTAR</span><span className="eyebrow mt-1 block !text-[9px] !tracking-[.2em]">TRADING TERMINAL</span></span>
        </Link>

        <div className="mb-3 px-3 eyebrow">Navigation</div>
        <nav className="flex-1 space-y-6 overflow-y-auto">
          {['Workspace', 'System'].map((section) => (
            <div key={section}>
              <p className="mb-2 px-3 eyebrow">{section}</p>
              <div className="space-y-1">
                {navItems.filter((item) => item.section === section).map((item) => {
                  const active = location.pathname === item.path || (item.path === '/' && location.pathname === '/dashboard');
                  return <Link key={item.path} to={item.path} onClick={() => setMobileNavOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-[11px] text-[13px] transition-all duration-200 ${active ? 'border border-emerald-200/[.13] bg-emerald-200/[.075] text-[#a6f0d0]' : 'border border-transparent text-[#98a3b3] hover:bg-white/[.035] hover:text-white'}`}>
                    <span className={`flex h-5 w-5 items-center justify-center text-base ${active ? 'text-[#a6f0d0]' : 'text-[#748196] group-hover:text-white'}`}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-[#91edc6] shadow-[0_0_9px_#91edc6]" />}
                  </Link>;
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="app-surface mt-5 rounded-2xl p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#202b38] font-semibold text-[#a9f1d1]">{user?.username?.charAt(0).toUpperCase() || 'T'}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{user?.username || 'Trader'}</p><p className="truncate text-[10px] text-[#7f8b9c]">{user?.email}</p></div>
            <button aria-label="Log out" onClick={handleLogout} className="rounded-lg px-2 py-1.5 text-xs text-[#778397] transition hover:bg-white/[.06] hover:text-white">↗</button>
          </div>
        </div>
        <p className="mt-4 px-2 text-[9px] text-[#596579] mono-data">TERMINAL BUILD 1.2.0</p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-white/[.06] bg-[#080b10]/75 px-5 py-4 backdrop-blur-xl md:px-9">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
            <div className="pl-12 lg:pl-0"><p className="eyebrow">Workspace / {activePage}</p><p className="mt-1 text-xs text-[#687587]">Market operations · live environment</p></div>
            <div className="hidden items-center gap-2 rounded-full border border-white/[.08] bg-white/[.025] px-3 py-2 sm:flex"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span><span className="eyebrow !text-[9px] !tracking-[.12em]">Terminal ready</span></div>
          </div>
        </header>
        <div className="terminal-content mx-auto max-w-[1500px] p-5 pb-12 md:p-9 page-enter">{children}</div>
      </main>
    </div>
  );
};
