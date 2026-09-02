'use client';

import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

export function RequireAuthPage({
  children,
  adminOnly = false
}: {
  children: (auth: ReturnType<typeof useAuth>) => React.ReactNode;
  adminOnly?: boolean;
}) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) {
      router.replace('/login');
      return;
    }
    if (adminOnly && auth.user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [adminOnly, auth.loading, auth.user, router]);

  if (auth.loading || !auth.user || (adminOnly && auth.user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-sm text-zinc-500">
        Loading application...
      </div>
    );
  }

  return <>{children(auth)}</>;
}
