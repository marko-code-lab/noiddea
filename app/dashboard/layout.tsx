'use client';

import { CreateBranchDialog } from "@/components/business";
import { DashLoading } from "@/components/dashboard/dash-loading";
import { DashSidebar } from "@/components/dashboard/dash-sidebar";
import { Providers } from "@/components/providers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useBranches } from "@/src/hooks/use-branches";
import Image from "next/image";


export default function Layout({ children }: { children: React.ReactNode }) {
  const { branches, isLoading, error } = useBranches();

  if (isLoading) {
    return <DashLoading />;
  }

  if (error) {
    return <div className="flex items-center justify-center h-dvh absolute inset-0">
      <p>Error: {error.message}</p>
    </div>;
  }

  if (!branches.length) {
    return <div className="flex items-center justify-center h-dvh inset-0 relative">
      <Image src="/map.svg" alt="Business" fill className="object-cover" />
      <CreateBranchDialog />
    </div>;
  }

  return <Providers>
    <SidebarProvider>
      <DashSidebar />
      <SidebarInset className="overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  </Providers>;
}