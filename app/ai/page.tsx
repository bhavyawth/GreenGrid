  'use client';

import { AIForecasting } from '../../components/AIForecasting';
import { AppShell } from '../../components/AppShell';
import { RequireAuthPage } from '../../components/RequireAuthPage';

export default function AIRoute() {
  return (
    <RequireAuthPage>
      {() => (
        <AppShell>
          <AIForecasting />
        </AppShell>
      )}
    </RequireAuthPage>
  );
}
