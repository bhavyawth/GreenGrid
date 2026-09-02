'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, BarChart3, Lock, LogOut, Menu, TrendingUp, X, Zap } from 'lucide-react';
import { useAuth } from './AuthContext';

const tabs = [
  { href: '/dashboard', label: 'Dashboard', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
  { href: '/ai', label: 'AI Forecasting', icon: <Zap className="w-[18px] h-[18px]" /> },
  { href: '/carbon-ledger', label: 'Blockchain Ledger', icon: <Lock className="w-[18px] h-[18px]" /> },
  { href: '/carbon-market', label: 'Market', icon: <TrendingUp className="w-[18px] h-[18px]" /> },
  { href: '/nft', label: 'Green Certificates', icon: <Award className="w-[18px] h-[18px]" /> }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-sm text-zinc-500">
        Loading application...
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="mesh-bg" />

      <header className="sticky top-0 z-50 border-b border-white/[0.06]" style={{ background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-glow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">CarbonCredit</h1>
                <span className="text-xs font-semibold text-accent-400 bg-accent-500/10 px-1.5 py-0.5 rounded">.AI</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active ? 'text-accent-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {active && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-lg bg-accent-500/10 border border-accent-500/20"
                        transition={{ type: 'spring', duration: 0.5 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2">
                <div className="glow-indicator" />
                <span className="text-xs text-zinc-500 font-medium">Live</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-zinc-300">{user.name}</p>
                <p className="text-xs text-zinc-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-red-500/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-white/[0.06] overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {tabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      pathname === tab.href ? 'text-accent-400 bg-accent-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      <footer className="border-t border-white/[0.06] mt-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-600">
              &copy; 2026 CarbonCredit.AI - AI-Driven Electricity Monitoring & Blockchain-Based Carbon Credit Platform
            </p>
            <div className="flex items-center gap-1.5">
              <div className="glow-indicator" style={{ width: 6, height: 6 }} />
              <span className="text-xs text-zinc-600">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
