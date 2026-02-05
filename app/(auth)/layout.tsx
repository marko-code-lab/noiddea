import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth/auth-guard";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="h-dvh bg-muted flex flex-col relative">
        <header className="w-full px-6 flex items-center justify-between h-16 container mx-auto z-10">
          <Link href="/">
            <Image src="/iso-light.svg" className="dark:block hidden" alt="ApeDash Logo" width={30} height={25} />
            <Image src="/iso.svg" className="block dark:hidden" alt="ApeDash Logo" width={30} height={25} />
          </Link>
          <Button variant="outline">Soporte</Button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          {children}
        </div>
        <Image src="/map.svg" alt="ApeDash Logo" fill objectFit="cover" />
      </div>
    </AuthGuard>
  );
}