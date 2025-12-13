import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  children: ReactNode
}

/**
 * AuthLayout - Layout for authentication pages
 * 
 * Centered card design with gradient background.
 * Used for: Login, Register, Forgot Password, etc.
 */
export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <img src="/src/assets/logo.png" alt="BEEHIVE" className="h-16 w-16 object-contain" />
            <span className="text-4xl font-bold" style={{ color: '#F9C900' }}>BEEHIVE</span>
          </Link>
          <p className="mt-2 text-gray-600">Welcome back!</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          {children}
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
