import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const roles = [
  {
    name: 'call centre',
    path: ['/dashboard', '/profile', '/login', '/signup', '/', '/ccenter', '/logout', 'jobs'],
  },
  {
    name: 'fc',
    path: ['/fleetManager', '/jobsFleet', '/dashboard', '/drivers', '/vehicles', '/technician', '/profile', '/logs', '/login', '/signup', '/', '/logout', '/qoutation'],
  },
  {
    name: 'fleet manager',
    path: ['/fleetManager', '/jobsFleet', '/dashboard', '/drivers', '/vehicles',
      '/technician', '/profile', '/logs', '/login', '/signup', '/', '/logout',
      '/qoutation', '/fleetManager/trips', '/fleetManager/inspections',
      "/dashboard",
      "/statistics",
      "/jobsFleet",

      "/fleetManager/inspections",
      "/drivers",
      "/vehicles",
      "/fleetManager/clients",
      "/fleetManager/stop-points",
      "/load-plan",
      "/fuel",
      "/audit",
      "/settings",
      "/userManagement",
      "/workshop/jobWorkShop",
      "/workshop/callcenter/technician"],
  },
  {
    name: 'fleet_manager',
    path: ['/fleetManager', '/jobsFleet', '/dashboard', '/drivers', '/vehicles',
      '/technician', '/profile', '/logs', '/login', '/signup', '/', '/logout',
      '/qoutation', '/fleetManager/trips', '/fleetManager/inspections',
      "/dashboard",
      "/statistics",
      "/jobsFleet",

      "/fleetManager/inspections",
      "/drivers",
      "/vehicles",
      "/fleetManager/clients",
      "/fleetManager/stop-points",
      "/load-plan",
      "/fuel",
      "/audit",
      "/settings",
      "/userManagement",
      "/workshop/jobWorkShop",
      "/workshop/callcenter/technician"],
  },
  {
    name: 'customer',
    path: ['/dashboard', '/profile', '/editCustomer', '/customer', '/login', '/signup', '/', '/logout', '/ccenter', '/exvehicles', '/extechnicians'],
  },
  {
    name: 'cost centre',
    path: ['/dashboard', '/ccenter', '/jobs', '/profile', '/quotation', '/notification', '/login', '/signup', '/', '/logout', '/userManagement'],
  },
  {
    name: 'admin',
    path: ['/workshop/dashboard'
      , '/workshop/admin/sublets', '/workshop/admin/suppliers', '/workshop/jobs',
      '/workshop/profile', '/quotation', '/notification', '/login',
      '/signup', '/', '/logout', '/userManagement', '/workshop/inspections', '/workshop/clients', '/workshop/stop-points', '/workshop/load-plan',
      '/workshop/fuel', '/workshop/audit', '/workshop/settings', '/workshop/callcenter', '/workshop/technicians',
      '/workshop/vehicles', '/workshop/drivers', '/workshop/callcenter/technicians', '/workshop/sublets', '/workshop/inventory', '/workshop/inventory/stock-levels'
    ],
  },
  {
    name: 'office',
    path: ['/jobsFleet', '/fleetManager', '/dashboard', '/drivers', '/vehicles', '/technician',
      '/profile', '/logs', '/login', '/signup', '/', '/logout', '/load-plan',
      '/fleetManager/inspections', '/fleetManager/clients', '/fleetManager/stop-points',
      '/settings', '/userManagement', '/audit', '/workshop/callcenter/technician'],
  },
  {
    name: 'senior-mechanic',
    path: ['/workshop/jobWorkShop', '/workshop/dashboard', '/workshop/jobs', '/workshop/profile',
      '/workshop/inspections', '/workshop/clients', '/workshop/vehicles', '/workshop/drivers',
      '/workshop/stop-points', '/workshop/load-plan', '/workshop/fuel', '/workshop/audit',
      '/workshop/settings', '/workshop/technicians', '/workshop/callcenter', '/workshop/callcenter/technicians',
      '/vehicles', '/vehicles/[id]',
      '/login', '/signup', '/', '/logout'],
  },
  {
    name: 'mechanic',
    path: ['/workshop/jobWorkShop', '/workshop/dashboard', '/workshop/jobs', '/workshop/profile',
      '/workshop/inspections', '/workshop/clients', '/workshop/vehicles', '/workshop/drivers',
      '/workshop/stop-points', '/workshop/load-plan', '/workshop/fuel', '/workshop/audit',
      '/workshop/settings', '/workshop/technicians', '/workshop/callcenter', '/workshop/callcenter/technicians',
      '/vehicles', '/vehicles/[id]',
      '/login', '/signup', '/', '/logout'],
  },
  {
    name: 'technician',
    path: ['/workshop/jobWorkShop', '/workshop/dashboard', '/workshop/jobs', '/workshop/profile',
      '/workshop/inspections', '/workshop/clients', '/workshop/vehicles', '/workshop/drivers',
      '/workshop/stop-points', '/workshop/load-plan', '/workshop/fuel', '/workshop/audit',
      '/workshop/settings', '/workshop/technicians', '/workshop/callcenter', '/workshop/callcenter/technicians',
      '/vehicles', '/vehicles/[id]',
      '/login', '/signup', '/', '/logout'],
  },
]

const publicRoutes = ['/login', '/signup', '/', '/logout', '/register',
  '/register/company', '/register/workshop',
  '/register/workshop/jobCard', '/register/onboarding',
  '/register/success', '/register/workshop/success',
  '/register/workshop/fileUpload']

function getAllowedPaths(role: string): string[] {
  return roles.find(r => r.name === role)?.path || []
}

export async function middleware(req: NextRequest) {

  //Thsi is new section If the user is accessing the /logout page, clear cookies and redirect
  if (req.nextUrl.pathname === '/logout') {
    const response = NextResponse.redirect(new URL('/login', req.url))
    // List all cookies you want to clear
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    response.cookies.delete('role')
    // Add more cookies here if needed
    return response
  }



  const path = req.nextUrl.pathname
  // Check for Supabase session cookies
  const accessToken = req.cookies.get('access_token')?.value
  const isAuthenticated = !!accessToken
  const isPublicRoute = publicRoutes.includes(path)

  // Redirect unauthenticated users trying to access protected routes
  if (!isAuthenticated && !isPublicRoute) {
    console.log('Not authenticated — redirecting to /login')
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // If authenticated, resolve the role from the cookie set at login.
  // This avoids an auth.getUser() + users table query on EVERY request,
  // which was the main source of Supabase API gateway traffic.
  if (isAuthenticated) {
    const roleCookie = req.cookies.get('role')?.value
    let role = roleCookie ? decodeURIComponent(roleCookie) : ''
    let response: NextResponse | null = null

    // Fallback only for sessions that predate the role cookie.
    if (!role) {
      try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          return NextResponse.redirect(new URL('/login', req.url))
        }

        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (userError || !userRecord?.role) {
          return NextResponse.redirect(new URL('/login', req.url))
        }

        role = decodeURIComponent(userRecord.role)
        response = NextResponse.next()
        response.cookies.set('role', role, { path: '/', sameSite: 'lax' })
      } catch (error) {
        console.error('Error in middleware:', error)
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    if (!role) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const allowedPaths = getAllowedPaths(role)
    const isAllowed = allowedPaths.some(p => path.startsWith(p))
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return response ?? NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next|.*\\.(?:png|jpg|jpeg|svg|ico|css|js)).*)'
  ],
}
