import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Loader2 } from 'lucide-react'

// Default permissions per role
type UserRole = 'CUSTOMER' | 'CASHIER' | 'COOK' | 'MANAGER' | 'ADMIN'
const DEFAULT_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  CUSTOMER: {},
  CASHIER: {
    viewDashboard: true,
    accessPOS: true,
    viewOrders: true,
    viewInventory: true,
    viewSales: true,
    viewProducts: true,
  },
  COOK: {
    viewDashboard: true,
    viewOrders: true,
    viewInventory: true,
    viewProducts: true,
  },
  MANAGER: {
    viewDashboard: true,
    accessPOS: true,
    viewOrders: true,
    viewInventory: true,
    viewSales: true,
    viewReports: true,
    viewExpenses: true,
    viewProducts: true,
    viewRecipes: true,
    viewAccounts: true,
    viewSettings: true,
    manageMoodSettings: true,
  },
  ADMIN: {
    viewDashboard: true,
    accessPOS: true,
    viewOrders: true,
    viewInventory: true,
    viewSales: true,
    viewReports: true,
    viewExpenses: true,
    viewProducts: true,
    viewRecipes: true,
    viewAccounts: true,
    viewSettings: true,
    manageMoodSettings: true,
  },
}

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  requiredPermission?: string
}

export const ProtectedRoute = ({ children, allowedRoles, requiredPermission }: ProtectedRouteProps) => {
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

  // Check permission-based access if requiredPermission is provided
  if (requiredPermission && user) {
    const userPermissions = DEFAULT_PERMISSIONS[user.role as UserRole] || {}
    if (!userPermissions[requiredPermission]) {
      // User doesn't have the required permission, redirect to appropriate page
      if (user.role === 'CUSTOMER') {
        return <Navigate to="/client/home" replace />
      } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
        return <Navigate to="/admin" replace />
      } else if (user.role === 'CASHIER') {
        return <Navigate to="/admin/pos" replace />
      } else if (user.role === 'COOK') {
        return <Navigate to="/admin/orders" replace />
      }
      return <Navigate to="/auth/login" replace />
    }
    return <>{children}</>
  }

  // Fallback to role-based check for backward compatibility
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect based on user role
    if (user.role === 'CUSTOMER') {
      return <Navigate to="/client/home" replace />
    } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      return <Navigate to="/admin" replace />
    } else if (user.role === 'CASHIER') {
      return <Navigate to="/admin/pos" replace />
    } else if (user.role === 'COOK') {
      return <Navigate to="/admin/orders" replace />
    }
    
    // Fallback
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}
