import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../common/ui/dropdown-menu'
import { Button } from '../../common/ui/button'
import { User, ShoppingBag, Award, LogOut, LogIn } from 'lucide-react'

interface CustomerDropdownProps {
  onViewOrders?: () => void
}

export const CustomerDropdown = ({ onViewOrders }: CustomerDropdownProps) => {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = () => {
    navigate('/login')
  }

  const handleRegister = () => {
    navigate('/register')
  }

  const handleViewOrders = () => {
    if (onViewOrders) {
      onViewOrders()
    } else {
      navigate('/my-orders')
    }
  }

  const handleLogout = () => {
    logout()
  }

  if (!isAuthenticated) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full border-2 border-gray-300 hover:border-yellow-400 hover:bg-yellow-50">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Welcome Guest</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogin} className="cursor-pointer">
            <LogIn className="mr-2 h-4 w-4" />
            <span>Sign In</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRegister} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Create Account</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full border-2 border-gray-300 hover:border-yellow-400 hover:bg-yellow-50">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1 py-1">
            <p className="text-sm font-bold text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleViewOrders} className="cursor-pointer">
          <ShoppingBag className="mr-2 h-4 w-4" />
          <span>My Orders</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-default hover:bg-transparent focus:bg-transparent">
          <Award className="mr-2 h-4 w-4 text-yellow-500" />
          <span className="font-medium">Loyalty Points: <span style={{ color: '#F9C900' }}>{user?.loyaltyPoints || 0}</span></span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer hover:bg-red-50 focus:bg-red-50">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
