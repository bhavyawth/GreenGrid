'use client';

import { AppShell } from '../../components/AppShell';
import { Dashboard } from '../../components/Dashboard';
import { RequireAuthPage } from '../../components/RequireAuthPage';

export default function DashboardRoute() {
  return (
    <RequireAuthPage>
      {({ user, token }) => (
        <AppShell>
          <Dashboard userId={user!.id} token={token!} />
        </AppShell>
      )}
    </RequireAuthPage>
  );
}
