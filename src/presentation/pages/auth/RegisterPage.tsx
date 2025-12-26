import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { Label } from '../../components/common/ui/label'
import { Loader2 } from 'lucide-react'

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { register, isAuthenticated, isLoading } = useAuthStore()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/client/home')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields')
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
      await register(email, password, name, phone || undefined)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 100%)' }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
            <img src="/assets/logo.png" alt="BEEHIVE" className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#F9C900' }}>BEEHIVE</h1>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-600">Join us today</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 font-medium text-black hover:shadow-lg transition-all mt-6"
            style={{ backgroundColor: '#F9C900' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium hover:underline" style={{ color: '#F9C900' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
