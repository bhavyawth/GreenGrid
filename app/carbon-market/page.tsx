'use client';

import { AppShell } from '../../components/AppShell';
import { CarbonMarket } from '../../components/CarbonMarket';
import { RequireAuthPage } from '../../components/RequireAuthPage';

export default function CarbonMarketRoute() {
  return (
    <RequireAuthPage>
      {({ user, token }) => (
        <AppShell>
          <CarbonMarket userId={user!.id} token={token!} />
        </AppShell>
      )}
    </RequireAuthPage>
  );
}
