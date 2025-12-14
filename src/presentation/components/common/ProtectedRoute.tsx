import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect based on user role
    if (user.role === 'CUSTOMER') {
      return <Navigate to="/client/home" replace />
    } else if (user.role === 'CASHIER' || user.role === 'MANAGER') {
      return <Navigate to="/admin/pos" replace />
    } else if (user.role === 'COOK') {
      return <Navigate to="/admin/orders" replace />
    }
    
    // Fallback
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}
