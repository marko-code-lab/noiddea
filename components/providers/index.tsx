import { Toaster } from '../ui/sonner';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { BranchProvider } from './branch-provider';

export { BranchProvider, useSelectedBranch } from './branch-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute='class'
        defaultTheme='dark'
        enableSystem
        disableTransitionOnChange
      >
        <BranchProvider>
          {children}
          <Toaster />
        </BranchProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
