'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { useSupabase } from "@/hooks/use-supabase";
import { HugeiconsIcon } from "@hugeicons/react";
import { BirthdayCakeIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const navigationItems = [
  {
    label: 'Overview',
    href: '/',
  },
  {
    label: 'Funciones',
    href: '/',
  },
  {
    label: 'Precios',
    href: '/',
  },
  {
    label: 'Descargar',
    href: '/',
  },
  {
    label: 'Contacto',
    href: '/',
  },
]

export function HomeHeader() {
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const { user } = useAuth();
  const { role: businessRole } = useBusiness();
  const supabase = useSupabase();
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const checkManagerRole = async () => {
      if (!user) {
        setIsLoadingRole(false);
        return;
      }

      try {
        const { data: branchUser } = await supabase
          .from('branches_users')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('role', 'manager')
          .maybeSingle();

        setIsManager(!!branchUser);
      } catch (error) {
        console.error('Error checking manager role:', error);
        setIsManager(false);
      } finally {
        setIsLoadingRole(false);
      }
    };

    checkManagerRole();
  }, [user, supabase]);

  const getDashboardRoute = () => {
    // Si es admin u owner de business_users, redirigir a /business
    if (businessRole === 'admin' || businessRole === 'owner') {
      return '/business';
    }
    // Si es manager de branches_users, redirigir a /dashboard
    if (isManager) {
      return '/dashboard';
    }
    // Por defecto, no redirigir (o redirigir a /business si tiene negocio)
    return businessRole ? '/business' : '#';
  };

  return (
    <header className="h-16 w-full bg-background">
      <div className="h-full grid grid-cols-3 items-center container mx-auto">
        <div>
          <Button variant="ghost">
            <HugeiconsIcon icon={BirthdayCakeIcon} className="size-6" strokeWidth={2} />
            <span className="text-base font-semibold">ApeControl</span>
          </Button>
        </div>
        <NavigationMenu>
          <NavigationMenuList>
            {navigationItems.map((item) => (
              <NavigationMenuItem key={item.label}>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href={item.href}>{item.label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="flex items-center gap-2 justify-end">
          {user && !isLoadingRole ? (
            <Link href={getDashboardRoute()}>
              <Avatar>
                <AvatarImage src="/avatar.svg" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <React.Fragment>
              <Link href="/auth/login">
                <Button variant="outline" size="sm">Ingresar</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">Empezar ahora</Button>
              </Link>
            </React.Fragment>
          )}
        </div>
      </div>
    </header>
  );
}