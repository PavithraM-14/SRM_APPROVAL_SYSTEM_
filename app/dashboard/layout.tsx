 'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ArrowRightStartOnRectangleIcon
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
  { name: 'Queries', href: '/dashboard/queries', icon: ClockIcon, roles: [UserRole.REQUESTER, UserRole.DEAN] },
  {
    name: 'Pending Approvals',
    href: '/dashboard/requests?status=pending', // Redirect requesters to their pending requests
    icon: ClipboardDocumentListIcon,
    roles: [UserRole.REQUESTER] // Only for requesters
  },
  {
    name: 'Pending Approvals',
    href: '/dashboard/approvals',
    icon: ClipboardDocumentListIcon,
    roles: [UserRole.INSTITUTION_MANAGER, UserRole.SOP_VERIFIER, UserRole.ACCOUNTANT, UserRole.VP, UserRole.HEAD_OF_INSTITUTION, UserRole.DEAN, UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT, UserRole.CHIEF_DIRECTOR, UserRole.CHAIRMAN] // All non-requester roles
  }
];

const rolesWithDepartments = new Set<UserRole>([
  UserRole.REQUESTER,
  UserRole.INSTITUTION_MANAGER,
]);

const formatLabel = (value?: string | UserRole) => {
  if (!value) return '';
  return value
    .toString()
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [queryCount, setClarificationCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldShowDepartment = !!(user?.department && user?.role && rolesWithDepartments.has(user.role));
  const formattedDepartment = shouldShowDepartment ? formatLabel(user?.department).toUpperCase() : '';
  const formattedRole = user?.role ? formatLabel(user.role).toUpperCase() : '';

  // Function to check if navigation item is active
  const isActiveRoute = (href: string) => {
    const [hrefPath, hrefQuery] = href.split('?');

    const matchesPath = () => {
      if (hrefPath === '/dashboard') {
        return pathname === '/dashboard';
      }

      if (hrefPath === '/dashboard/requests' && !hrefQuery) {
        return pathname === '/dashboard/requests' && !searchParams.get('status');
      }

      if (hrefPath === '/dashboard/requests/create') {
        return pathname === '/dashboard/requests/create';
      }

      return pathname.startsWith(hrefPath);
    };

    if (!matchesPath()) {
      return false;
    }

    if (!hrefQuery) {
      return true;
    }

    const params = new URLSearchParams(hrefQuery);
    for (const [key, value] of params.entries()) {
      if (searchParams.get(key) !== value) {
        return false;
      }
    }

    return true;
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && (user.role === 'requester' || user.role === 'dean')) {
      fetchClarificationCount();
      // Set up interval to refresh count every 30 seconds
      const interval = setInterval(fetchClarificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

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

  const fetchClarificationCount = async () => {
    try {
      const response = await fetch('/api/requests', { credentials: 'include' });
      if (!response.ok) return;
      
      const data = await response.json();
      
      // Filter for requests that need query from current user
      const queryRequests = data.requests.filter((request: any) => 
        request.pendingQuery && request.queryLevel === user?.role
      );

      setClarificationCount(queryRequests.length);
    } catch (err) {
      console.error('Error fetching query count:', err);
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
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 shadow-sm">
          <div className="px-6 mb-8">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              SRM-RMP
            </h1>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            {filteredNavigation.map(item => {
              const isActive = isActiveRoute(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`h-5 w-5 mr-3 ${
                    isActive ? 'text-blue-700' : 'text-gray-400'
                  }`} />
                  <span className="flex-1">{item.name}</span>
                  {item.name === 'Queries' && queryCount > 0 && (
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full min-w-[20px] text-center">
                      {queryCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main */}
<div className="lg:pl-64 flex flex-col flex-1">
  {/* HEADER */}
  <div className="flex h-14 sm:h-16 bg-white border-b border-gray-200 items-center justify-between px-4">

    {/* LEFT : Logo + Title - Clickable for Logout */}
    <button 
      onClick={handleLogout}
      className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
      title="Click to logout"
    >
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
    </button>

          {/* RIGHT */}
          <div className="flex items-center gap-3">
            <div className="text-center sm:text-right">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user?.name}</span>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1 justify-center sm:justify-end">
                {formattedDepartment && <span>{formattedDepartment}</span>}
                {formattedDepartment && formattedRole && <span>•</span>}
                {formattedRole && <span>{formattedRole}</span>}
              </div>
            </div>

            {/* LOGOUT BUTTON – RIGHT CORNER */}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-md"
              title="Logout"
            >
              <ArrowRightStartOnRectangleIcon className="h-6 w-6" />
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
