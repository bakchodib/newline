"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  HandCoins,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  Receipt,
  FilePenLine,
  Calculator,
  CheckSquare,
  Banknote,
  Users2,
  ChevronDown
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from "@/components/icons/logo";
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';


type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: ('admin' | 'agent' | 'customer')[];
  subItems?: NavItem[];
};

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'agent', 'customer'] },
  { href: '/dashboard/customers', icon: Users, label: 'Customers', roles: ['admin', 'agent'] },
  { 
    href: '/dashboard/loans', 
    icon: HandCoins, 
    label: 'Loans', 
    roles: ['admin', 'agent'],
    subItems: [
        { href: '/dashboard/loans/applications', icon: FilePenLine, label: 'Applications', roles: ['admin', 'agent'] },
        { href: '/dashboard/loans/approvals', icon: CheckSquare, label: 'Approvals', roles: ['admin'] },
        { href: '/dashboard/loans/disbursal', icon: Banknote, label: 'Disbursal', roles: ['admin', 'agent'] },
        { href: '/dashboard/loans/all', icon: HandCoins, label: 'All Loans', roles: ['admin', 'agent'] },
    ]
  },
  { 
    href: '/dashboard/collections', 
    icon: Receipt, 
    label: 'Collections', 
    roles: ['admin', 'agent'],
    subItems: [
      { href: '/dashboard/collections/emi', icon: Receipt, label: 'EMI Collection', roles: ['admin', 'agent'] },
      { href: '/dashboard/collections/receipts', icon: FileText, label: 'Receipts', roles: ['admin', 'agent'] },
    ]
  },
  { href: '/dashboard/emi-calculator', icon: Calculator, label: 'EMI Calculator', roles: ['admin', 'agent', 'customer'] },
  { href: '/dashboard/reports', icon: FileText, label: 'Reports', roles: ['admin'] },
  { href: '/dashboard/user-management', icon: Users2, label: 'User Management', roles: ['admin'] },
];

function SidebarNav({ userRole, onLinkClick }: { userRole: string | undefined, onLinkClick: () => void }) {
  const pathname = usePathname();
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(() => {
    const activeParent = navItems.find(item => item.subItems?.some(sub => pathname.startsWith(sub.href)));
    return activeParent?.href || null;
  });

  return (
    <nav className="flex flex-col gap-1">
      {navItems.filter(item => userRole && item.roles.includes(userRole as any)).map((item) => (
        item.subItems ? (
          <Collapsible 
            key={item.href} 
            open={openCollapsible === item.href} 
            onOpenChange={(isOpen) => setOpenCollapsible(isOpen ? item.href : null)}
          >
            <CollapsibleTrigger asChild>
              <button
                className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", {
                    'text-primary bg-accent': item.subItems.some(sub => pathname.startsWith(sub.href))
                })}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
                <ChevronDown className={cn("h-5 w-5 transition-transform", { 'rotate-180': openCollapsible === item.href })} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6">
                <div className="flex flex-col gap-1 py-1 border-l ml-[10px]">
                {item.subItems.map(subItem => (
                    <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={onLinkClick}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary -ml-px border-l-2 ${pathname === subItem.href ? 'border-primary text-primary' : 'border-transparent'}`}
                    >
                        <subItem.icon className="h-4 w-4" />
                        {subItem.label}
                    </Link>
                ))}
                </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname === item.href ? 'bg-accent text-primary' : ''}`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        )
      ))}
    </nav>
  );
}


function UserMenu({ onLogout, userName, userEmail }: { onLogout: () => void; userName?: string, userEmail?: string }) {
  const getInitials = (name: string = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={`https://placehold.co/100x100.png`} alt={userName || ''} data-ai-hint="user avatar" />
            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const AppSkeleton = () => (
    <div className="flex min-h-screen w-full bg-background">
        <div className="hidden md:block md:w-64 border-r bg-card p-4">
            <div className="flex items-center gap-2 font-semibold mb-6 h-16 border-b">
               <Skeleton className="h-8 w-32" />
            </div>
            <div className="flex flex-col gap-4 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
        </div>
        <div className="flex-1 flex flex-col">
            <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
                <Skeleton className="h-8 w-8 md:hidden" />
                <div className="flex-1" />
                <Skeleton className="h-10 w-10 rounded-full" />
            </header>
            <main className="flex-1 p-6">
                <Skeleton className="h-8 w-48 mb-6" />
                <Skeleton className="h-64 w-full" />
            </main>
        </div>
      </div>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('SW registered: ', registration);
            }).catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
        });
    }
  }, []);

  if (loading) {
    return <AppSkeleton />;
  }

  if (!user) {
    return null; // or a redirect component, though useAuth handles it.
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const SidebarContent = () => (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2 px-4">
        <SidebarNav userRole={user?.role} onLinkClick={closeSidebar} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden md:block w-64 border-r bg-card">
        <SidebarContent />
      </aside>

      <div className={`fixed inset-0 z-40 bg-black/60 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={toggleSidebar} />
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:hidden`}>
        <SidebarContent />
      </aside>
      

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <div className="flex-1">
            {/* Can add search or other header elements here */}
          </div>
          <UserMenu onLogout={logout} userName={user?.name} userEmail={user?.email} />
        </header>
        <main className="flex-1 p-4 sm:p-6 bg-background overflow-y-auto">
            {children}
        </main>
      </div>
    </div>
  );
}
