import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { ProtectedRoute } from '../components/common/ProtectedRoute'

// Lazy load pages for better performance
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)

// Client Pages (Public)
const HomePage = lazy(() => import('../pages/client/HomePage').then(m => ({ default: m.HomePage })))
const MenuPage = lazy(() => import('../pages/client/MenuPage').then(m => ({ default: m.MenuPage })))
const AboutPage = lazy(() => import('../pages/client/AboutPage').then(m => ({ default: m.AboutPage })))

// Auth Pages
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })))

// Admin Pages (Protected)
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage').then(m => ({ default: m.DashboardPage })))
const POSPage = lazy(() => import('../pages/admin/POSPage').then(m => ({ default: m.POSPage })))
const OrdersPage = lazy(() => import('../pages/admin/OrdersPage').then(m => ({ default: m.OrdersPage })))
const InventoryPage = lazy(() => import('../pages/admin/InventoryPage').then(m => ({ default: m.InventoryPage })))
const RecipesPage = lazy(() => import('../pages/admin/RecipesPage').then(m => ({ default: m.RecipesPage })))
const SalesPage = lazy(() => import('../pages/admin/SalesPage').then(m => ({ default: m.SalesPage })))
const ReportsPage = lazy(() => import('../pages/admin/ReportsPage').then(m => ({ default: m.ReportsPage })))
const ExpensesPage = lazy(() => import('../pages/admin/ExpensesPage').then(m => ({ default: m.ExpensesPage })))
const CustomersPage = lazy(() => import('../pages/admin/CustomersPage').then(m => ({ default: m.CustomersPage })))
const ProductsPage = lazy(() => import('../pages/admin/ProductsPage').then(m => ({ default: m.ProductsPage })))
const SettingsPage = lazy(() => import('../pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage })))
const StockTransactionsPage = lazy(() => import('../pages/admin/StockTransactionsPage').then(m => ({ default: m.StockTransactionsPage })))

// Error Pages
const NotFoundPage = lazy(() => import('../pages/error/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

/**
 * Route Configuration
 * Organized by feature areas following clean architecture
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      // Client Routes (Public)
      {
        index: true,
        element: <Suspense fallback={<LoadingFallback />}><HomePage /></Suspense>,
      },
      {
        path: 'menu',
        element: <Suspense fallback={<LoadingFallback />}><MenuPage /></Suspense>,
      },
      {
        path: 'about',
        element: <Suspense fallback={<LoadingFallback />}><AboutPage /></Suspense>,
      },
      {
        path: 'client',
        children: [
          {
            path: 'home',
            element: <Suspense fallback={<LoadingFallback />}><HomePage /></Suspense>,
          },
          {
            path: 'menu',
            element: <Suspense fallback={<LoadingFallback />}><MenuPage /></Suspense>,
          },
          {
            path: 'about',
            element: <Suspense fallback={<LoadingFallback />}><AboutPage /></Suspense>,
          },
        ],
      },

      // Auth Routes (both /login and /auth/login work)
      {
        path: 'login',
        element: <Suspense fallback={<LoadingFallback />}><LoginPage /></Suspense>,
      },
      {
        path: 'register',
        element: <Suspense fallback={<LoadingFallback />}><RegisterPage /></Suspense>,
      },
      {
        path: 'auth',
        children: [
          {
            path: 'login',
            element: <Suspense fallback={<LoadingFallback />}><LoginPage /></Suspense>,
          },
          {
            path: 'register',
            element: <Suspense fallback={<LoadingFallback />}><RegisterPage /></Suspense>,
          },
        ],
      },

      // Admin Routes (Protected - CASHIER, MANAGER, COOK only)
      {
        path: 'admin',
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['CASHIER', 'MANAGER', 'COOK']}>
                  <DashboardPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'pos',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['CASHIER', 'MANAGER']}>
                  <POSPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'orders',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['CASHIER', 'MANAGER', 'COOK']}>
                  <OrdersPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'inventory',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <InventoryPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'inventory/transactions',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <StockTransactionsPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'recipes',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <RecipesPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'sales',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <SalesPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'reports',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <ReportsPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'expenses',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <ExpensesPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'customers',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['MANAGER', 'CASHIER']}>
                  <CustomersPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'products',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <ProductsPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={['CASHIER', 'MANAGER']}>
                  <SettingsPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
        ],
      },

      // Error Routes
      {
        path: '*',
        element: <Suspense fallback={<LoadingFallback />}><NotFoundPage /></Suspense>,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
