'use client';

import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, ClockIcon, CreditCardIcon, LayoutIcon, MoreVerticalCircle01Icon, LockIcon, LogoutIcon, PackageIcon, PlusSignIcon, SearchIcon, SettingsIcon, ShieldIcon, ShoppingCartIcon, SparklesIcon, TruckIcon, UserIcon, SunIcon, UserGroupIcon, UserMultiple02Icon, UnfoldMoreIcon, Store01Icon, BookOpen01Icon } from "@hugeicons/core-free-icons";
import { useAuth, useBusiness, useSelectedBranch, useUser } from "@/src/hooks";
import { Kbd, KbdGroup } from "../ui/kbd";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";

const sidebarItems = {
  home: [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <HugeiconsIcon icon={LayoutIcon} strokeWidth={2} />,
    },
    {
      label: 'Asistente',
      href: '/dashboard/assistant',
      icon: <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />,
    },
    {
      label: 'Configuración',
      href: '/dashboard/settings',
      icon: <HugeiconsIcon icon={SettingsIcon} strokeWidth={2} />,
    },
  ],
  company: [
    {
      label: 'Productos',
      href: '/dashboard/products',
      icon: <HugeiconsIcon icon={PackageIcon} strokeWidth={2} />,
    },
    {
      label: 'Proveedores',
      href: '/dashboard/suppliers',
      icon: <HugeiconsIcon icon={TruckIcon} strokeWidth={2} />,
    },
    {
      label: 'Equipo',
      href: '/dashboard/team',
      icon: <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} />,
    },
    {
      label: 'Sesiones',
      href: '/dashboard/sessions',
      icon: <HugeiconsIcon icon={ClockIcon} strokeWidth={2} />,
    },
    {
      label: 'Clientes',
      href: '/dashboard/customers',
      icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
    },
  ],
  more: [
    {
      label: 'Documentación',
      href: '/dashboard/docs',
      icon: <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />,
    },
    {
      label: 'Configuraciones',
      href: '/dashboard/business',
      icon: <HugeiconsIcon icon={SettingsIcon} strokeWidth={2} />,
    },
    {
      label: 'Busqueda',
      href: '/dashboard/search',
      icon: <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />,
    },
  ]
}

export function DashSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { business } = useBusiness();
  const { user } = useUser();
  const { signOut } = useAuth();
  const [openSearchCommand, setOpenSearchCommand] = useState(false);
  const { selectedBranch, branches, selectBranch, isLoading, isManager } = useSelectedBranch();

  return <Sidebar>
    <SidebarHeader>
      <SidebarMenu>
        {!isManager ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <SidebarMenuButton size="lg">
                <Avatar className={'size-6'}>
                  <AvatarImage src="/avatar/1.svg" />
                  <AvatarFallback>
                    {selectedBranch?.name?.charAt(0) || ''}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{business?.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{selectedBranch?.name}</span>
                </div>
                <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} />
              </SidebarMenuButton>
            } />
            <DropdownMenuContent side="bottom" align="start" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Sucursales</DropdownMenuLabel>
                {branches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.id}
                    onClick={() => selectBranch(branch)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Avatar className={'size-6'}>
                          <AvatarImage src="/avatar/1.svg" />
                          <AvatarFallback>
                            {branch.name?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{branch.name}</span>
                          {branch.location && (
                            <span className="text-xs text-muted-foreground">{branch.location}</span>
                          )}
                        </div>
                      </div>
                      {selectedBranch?.id === branch.id && (
                        <HugeiconsIcon icon={Tick02Icon} className="size-4 text-primary" strokeWidth={2} />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                {branches.length === 0 && !isLoading && (
                  <DropdownMenuItem disabled>
                    No hay sucursales disponibles
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <Link href="/business">
                  <DropdownMenuItem>
                    Agregar sucursal
                    <DropdownMenuShortcut>
                      <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton size="lg">
            <Avatar className="rounded-lg grayscale">
              <AvatarImage src="/avatar/1.svg" />
              <AvatarFallback>
                {selectedBranch?.name?.charAt(0) || ''}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{business?.name}</span>
              <span className="truncate text-xs text-muted-foreground">{selectedBranch?.name}</span>
            </div>
            <HugeiconsIcon icon={MoreVerticalCircle01Icon} className="ml-auto" strokeWidth={2} />
          </SidebarMenuButton>
        )}
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {sidebarItems.home.map(item => (
              <Link href={item.href} key={item.href}>
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton isActive={pathname === item.href}>
                    {item.icon}
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Link>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Sucursal</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {sidebarItems.company.map(item => (
              <Link href={item.href} key={item.href}>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={pathname.includes(item.href)}>
                    {item.icon}
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Link>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup className="mt-auto">
        <SidebarGroupContent>
          <SidebarMenu>
            {sidebarItems.more.map(item => (
              <Link href={item.href} key={item.href}>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={pathname.includes(item.href)}>
                    {item.icon}
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Link>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <SidebarMenuButton size='lg'>
              <Avatar className={'size-6'}>
                <AvatarImage src="/avatar/2.svg" />
                <AvatarFallback>
                  {user?.user_metadata.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.user_metadata.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="ml-auto" />
            </SidebarMenuButton>
          } />
          <DropdownMenuContent side="right" align="end" className={'w-max'}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src="/avatar/2.svg" />
                    <AvatarFallback>
                      {user?.user_metadata.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="font-medium text-sm text-foreground">{user?.user_metadata.name}</p>
                    <p className="text-muted-foreground text-xs">{user?.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <HugeiconsIcon icon={UserIcon} strokeWidth={2} />
                Cuenta
              </DropdownMenuItem>
              {!isManager && (
                <DropdownMenuItem>
                  <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} />
                  Suscripción
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                <HugeiconsIcon icon={SunIcon} strokeWidth={2} />
                Apariencia
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()} variant='destructive'>
                <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
                Cerrar sesión
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Button className='w-full'>Subscribirse a online</Button>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>;
}