'use client';

import { useRouter } from 'next/navigation';
import Login from './Login';
import { useAuth } from './AuthContext';

export function LoginPage({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const router = useRouter();
  const { login } = useAuth();

  return (
    <Login
      initialMode={mode}
      onLoginSuccess={(user, token) => {
        login(user, token);
        router.replace(user.role === 'admin' ? '/admin' : '/dashboard');
      }}
    />
  );
}
