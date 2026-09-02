import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../components/AuthContext';

export const metadata: Metadata = {
  title: 'CarbonCredit.AI - Carbon Credit Platform',
  description: 'AI-Driven Electricity Monitoring and Blockchain-Based Carbon Credit Platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
