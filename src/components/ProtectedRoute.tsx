'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'warehouse' | 'delivery'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login if not authenticated
      router.push('/login')
    } else if (user && requiredRole && user.role !== requiredRole) {
      // Redirect to unauthorized page if role doesn't match
      router.push('/unauthorized')
    }
  }, [user, loading, router, requiredRole])

  // If we're in a server environment or Supabase is not configured, render children
  // This prevents build errors when environment variables are not set
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Render children if user is authenticated and has required role
  if (user && (!requiredRole || user.role === requiredRole)) {
    return <>{children}</>
  }

  // Render nothing while redirecting
  return null
}