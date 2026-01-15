import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { Label } from '../../components/common/ui/label'
import { Loader2, User, Mail, Phone, Lock, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react'

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { register, isAuthenticated, isLoading } = useAuthStore()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/client/home')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !phone || !password || !confirmPassword) {
      setError('Please fill in all required fields')
      return
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[+]?[0-9\s-]{10,15}$/
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    try {
      await register(phone, password, name, email || undefined)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    }
  }

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' }
    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    
    if (strength <= 2) return { strength: 33, label: 'Weak', color: 'bg-red-400' }
    if (strength <= 3) return { strength: 66, label: 'Medium', color: 'bg-yellow-400' }
    return { strength: 100, label: 'Strong', color: 'bg-green-400' }
  }

  const passwordStrength = getPasswordStrength()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 50%, #FEF3C7 100%)' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20" style={{ backgroundColor: '#F9C900' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#F9C900' }} />
        <div className="absolute top-1/4 left-10 text-6xl opacity-10 animate-pulse">🐝</div>
        <div className="absolute bottom-1/4 right-10 text-6xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🍯</div>
        <div className="absolute top-1/2 right-1/4 text-4xl opacity-5 animate-pulse" style={{ animationDelay: '0.5s' }}>✨</div>
      </div>
      
      <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 relative z-10 border border-yellow-100">
        {/* Logo and Title */}
        <div className="text-center mb-6">
          <div 
            className="flex items-center justify-center gap-3 mb-4 cursor-pointer hover:scale-105 transition-transform" 
            onClick={() => navigate('/')}
          >
            <img src="/assets/logo.png" alt="BEEHIVE" className="h-14 w-14 object-contain drop-shadow-lg" />
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: '#F9C900' }}>BEEHIVE</h1>
              <p className="text-xs text-gray-500 font-medium">Cafe & Resto</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h2>
          <p className="text-gray-500 text-sm">Join us and start your journey</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 text-sm animate-shake">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-gray-700 font-medium text-sm">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="h-11 pl-10 rounded-xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-gray-700 font-medium text-sm">Phone Number * <span className="text-xs text-gray-400">(for loyalty stamps)</span></Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="+63 912 345 6789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                className="h-11 pl-10 rounded-xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 transition-all"
              />
            </div>
            <p className="text-xs text-gray-500">Your phone number will be used to track your loyalty stamps</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-gray-700 font-medium text-sm">Email Address <span className="text-xs text-gray-400">(optional)</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11 pl-10 rounded-xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-gray-700 font-medium text-sm">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 pl-10 pr-10 rounded-xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Password strength indicator */}
            {password && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${passwordStrength.color} transition-all duration-300`}
                    style={{ width: `${passwordStrength.strength}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  passwordStrength.label === 'Weak' ? 'text-red-500' : 
                  passwordStrength.label === 'Medium' ? 'text-yellow-600' : 'text-green-500'
                }`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-gray-700 font-medium text-sm">Confirm Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 pl-10 pr-10 rounded-xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {/* Password match indicator */}
              {confirmPassword && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  {password === confirmPassword ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-red-400 text-xs">✗</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 font-semibold text-black rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all group mt-2"
            style={{ backgroundColor: '#F9C900' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link 
              to="/auth/login" 
              className="font-semibold hover:underline transition-colors"
              style={{ color: '#D97706' }}
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Decorative bottom */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-center text-xs text-gray-400">
            🐝 Become part of our hive community
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
