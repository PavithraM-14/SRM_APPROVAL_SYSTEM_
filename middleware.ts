import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { UserRole } from './lib/types';

// Define protected routes and their required roles
const protectedRoutes = {
  '/dashboard/requests/create': [UserRole.REQUESTER],
  '/api/requests': {
    POST: [UserRole.REQUESTER], // Only requesters can create requests
    GET: Object.values(UserRole), // All authenticated users can view (filtered by role in API)
  },
} as const;

function getJwtSecret(): Uint8Array {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Check if this is a protected route
  const routeConfig = protectedRoutes[pathname as keyof typeof protectedRoutes];
  if (!routeConfig) {
    return NextResponse.next();
  }

  // Get required roles for this route and method
  let requiredRoles: UserRole[];
  if (Array.isArray(routeConfig)) {
    requiredRoles = routeConfig;
  } else if (typeof routeConfig === 'object' && method in routeConfig) {
    requiredRoles = routeConfig[method as keyof typeof routeConfig] as UserRole[];
  } else {
    return NextResponse.next();
  }

  // Get auth token from cookies
  const authToken = request.cookies.get('auth-token');
  if (!authToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify JWT token
    const secret = getJwtSecret();
    
    const { payload } = await jwtVerify(authToken.value, secret);
    const userRole = payload.role as UserRole;

    // Check if user has required role
    if (!requiredRoles.includes(userRole)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // JWT verification failed
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/requests/create',
    '/api/requests/:path*',
  ],
};