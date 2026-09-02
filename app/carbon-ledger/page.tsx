'use client';

import { AppShell } from '../../components/AppShell';
import { CarbonLedger } from '../../components/CarbonLedger';
import { RequireAuthPage } from '../../components/RequireAuthPage';

export default function CarbonLedgerRoute() {
  return (
    <RequireAuthPage>
      {({ user, token }) => (
        <AppShell>
          <CarbonLedger userId={user!.id} token={token!} userName={user!.name} />
        </AppShell>
      )}
    </RequireAuthPage>
  );
}
