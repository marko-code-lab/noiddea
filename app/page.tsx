import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return <div className="h-dvh flex items-center justify-center">
    <div className="flex items-center gap-2">
      <Link href="/signup">
        <Button size='lg' >
          Unirse ahora
        </Button>
      </Link>
      <Link href="/login">
        <Button variant="outline" size='lg' >
          Ingresar
        </Button>
      </Link>
    </div>
  </div>;
}