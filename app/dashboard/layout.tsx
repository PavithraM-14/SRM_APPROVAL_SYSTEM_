 'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { UserRole } from '../../lib/types';
import { AuthUser } from '../../lib/auth';
import Image from "next/image";
import SRMRMP_Logo from "../assets/SRMRMP_LOGO.png"; 

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: UserRole[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: Object.values(UserRole) },
  { name: 'My Requests', href: '/dashboard/requests', icon: ClipboardDocumentListIcon, roles: [UserRole.REQUESTER] },
  { name: 'Create Request', href: '/dashboard/requests/create', icon: DocumentPlusIcon, roles: [UserRole.REQUESTER] },
  {
    name: 'Pending Approvals',
    href: '/dashboard/approvals',
    icon: ClipboardDocumentListIcon,
    roles: Object.values(UserRole)
  }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        setUser(await res.json());
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/');
  };

  const filteredNavigation = navigation.filter(
    item => user && item.roles.includes(user.role)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-blue-600 pt-5 pb-4">
          <div className="px-4 text-white text-lg font-semibold">
            SRM-RMP 
          </div>
          <nav className="mt-6 px-2 space-y-1">
            {filteredNavigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-2 py-2 text-sm rounded-md text-blue-200 hover:text-white hover:bg-blue-700"
              >
                <item.icon className="h-6 w-6 mr-4 text-blue-300" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main */}
<div className="lg:pl-64 flex flex-col flex-1">
  {/* HEADER */}
  <div className="flex h-14 sm:h-16 bg-white border-b border-gray-200 items-center justify-between px-4">

    {/* LEFT : Logo + Title */}
    <div className="flex items-center gap-3">
      <Image
        src={SRMRMP_Logo}
        alt="SRM Logo"
        width={50}
        height={50}
        priority
      />

      <span className="text-lg font-semibold text-gray-800 hidden sm:block">
        SRM-RMP Approval System
      </span>
    </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user?.name}</span>
              </div>
              <div className="text-xs text-gray-500">({user?.role})</div>
            </div>

            {/* LOGOUT BUTTON – RIGHT CORNER */}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-md"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
