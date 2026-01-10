'use client';

import { Toaster } from 'sonner';

import TrpcProvider from '../trpc/provider';
import { ThemeProvider } from '../context/theme-context';

function GlobalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <TrpcProvider>
        <Toaster />
        {children}
      </TrpcProvider>
    </ThemeProvider>
  );
}

export default GlobalProvider;
