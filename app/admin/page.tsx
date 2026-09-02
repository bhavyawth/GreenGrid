'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import AdminDashboard from '../../components/AdminDashboard';
import { RequireAuthPage } from '../../components/RequireAuthPage';

export default function AdminRoute() {
  const router = useRouter();

  return (
    <RequireAuthPage adminOnly>
      {({ token, logout }) => (
        <div className="min-h-screen bg-slate-950">
          <AdminDashboard token={token!} />
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </RequireAuthPage>
  );
}
