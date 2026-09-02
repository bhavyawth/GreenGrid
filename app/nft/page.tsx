'use client';

import { AppShell } from '../../components/AppShell';
import { NFTViewer } from '../../components/NFTViewer';
import { RequireAuthPage } from '../../components/RequireAuthPage';

export default function NFTRoute() {
  return (
    <RequireAuthPage>
      {({ user, token }) => (
        <AppShell>
          <NFTViewer userId={user!.id} token={token!} />
        </AppShell>
      )}
    </RequireAuthPage>
  );
}
