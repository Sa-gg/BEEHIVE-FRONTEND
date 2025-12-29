import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { Label } from '../../components/common/ui/label'
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading, user } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on role
      if (user.role === 'CUSTOMER') {
        navigate('/client/home')
      } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
        navigate('/admin')
      } else if (user.role === 'CASHIER') {
        navigate('/admin/pos')
      } else if (user.role === 'COOK') {
        navigate('/admin/orders')
      }
    }
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 50%, #FEF3C7 100%)' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20" style={{ backgroundColor: '#F9C900' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#F9C900' }} />
        <div className="absolute top-1/4 left-10 text-6xl opacity-10 animate-pulse">🐝</div>
        <div className="absolute bottom-1/4 right-10 text-6xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🍯</div>
      </div>
      
      <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 relative z-10 border border-yellow-100">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div 
            className="flex items-center justify-center gap-3 mb-6 cursor-pointer hover:scale-105 transition-transform" 
            onClick={() => navigate('/')}
          >
            <img src="/assets/logo.png" alt="BEEHIVE" className="h-16 w-16 object-contain drop-shadow-lg" />
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: '#F9C900' }}>BEEHIVE</h1>
              <p className="text-xs text-gray-500 font-medium">Cafe & Resto</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back!</h2>
          <p className="text-gray-500 text-sm">Sign in to continue to your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm animate-shake">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-12 pl-10 rounded-xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-12 pl-10 pr-10 rounded-xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 font-semibold text-black rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all group"
            style={{ backgroundColor: '#F9C900' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Register Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link 
              to="/auth/register" 
              className="font-semibold hover:underline transition-colors"
              style={{ color: '#D97706' }}
            >
              Create one now
            </Link>
          </p>
        </div>

        {/* Decorative bottom */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-center text-xs text-gray-400">
            🐝 Enjoy your food with a relaxing ambiance
          </p>
        </div>
      </div>
      
      {/* Custom animation styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
