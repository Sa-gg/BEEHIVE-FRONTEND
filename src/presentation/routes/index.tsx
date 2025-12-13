import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'

// Lazy load pages for better performance
import { lazy } from 'react'

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
const SalesPage = lazy(() => import('../pages/admin/SalesPage').then(m => ({ default: m.SalesPage })))
const ExpensesPage = lazy(() => import('../pages/admin/ExpensesPage').then(m => ({ default: m.ExpensesPage })))
const ProductsPage = lazy(() => import('../pages/admin/ProductsPage').then(m => ({ default: m.ProductsPage })))

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
        element: <HomePage />,
      },
      {
        path: 'menu',
        element: <MenuPage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },

      // Auth Routes
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },

      // Admin Routes (Should be protected with auth guards)
      {
        path: 'admin',
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'pos',
            element: <POSPage />,
          },
          {
            path: 'orders',
            element: <OrdersPage />,
          },
          {
            path: 'inventory',
            element: <InventoryPage />,
          },
          {
            path: 'sales',
            element: <SalesPage />,
          },
          {
            path: 'expenses',
            element: <ExpensesPage />,
          },
          {
            path: 'products',
            element: <ProductsPage />,
          },
        ],
      },

      // Error Routes
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
