import { type ReactNode, Suspense } from 'react'
import { Outlet } from 'react-router-dom'

interface MainLayoutProps {
  children?: ReactNode
}

/**
 * MainLayout - Root layout wrapper
 * 
 * This is the top-level layout that wraps all other layouts.
 * Uses React Router's Outlet to render nested routes.
 */
export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        {children || <Outlet />}
      </Suspense>
    </div>
  )
}
