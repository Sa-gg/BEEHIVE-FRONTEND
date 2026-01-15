import { useState, useEffect } from 'react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../common/ui/dialog'
import { Input } from '../../common/ui/input'
import { Label } from '../../common/ui/label'
import { User, ShoppingBag, Coffee, Star, LogOut, LogIn, Settings, Award } from 'lucide-react'
import { loyaltyApi, type CustomerLoyaltyDTO, STAMPS_FOR_REWARD } from '../../../../infrastructure/api/loyalty.api'
import { authApi } from '../../../../infrastructure/api/auth.api'
import { getDeviceId } from '../../../../shared/utils/deviceId'

interface CustomerDropdownProps {
  onViewOrders?: () => void
}

export const CustomerDropdown = ({ onViewOrders }: CustomerDropdownProps) => {
  const { user, isAuthenticated, logout, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [loyalty, setLoyalty] = useState<CustomerLoyaltyDTO | null>(null)
  const [loadingLoyalty, setLoadingLoyalty] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Fetch loyalty data when dropdown opens or user changes
  useEffect(() => {
    const fetchLoyalty = async () => {
      if (!isAuthenticated || !user) return
      
      setLoadingLoyalty(true)
      try {
        const result = await loyaltyApi.lookup({
          customerEmail: user.email,
          customerPhone: user.phone,
          deviceId: getDeviceId()
        })
        
        if (result.found && result.customer) {
          setLoyalty(result.customer)
        }
      } catch (err) {
        console.error('Failed to fetch loyalty:', err)
      } finally {
        setLoadingLoyalty(false)
      }
    }

    fetchLoyalty()
  }, [isAuthenticated, user])

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

  const handleEditProfile = () => {
    if (user) {
      setEditForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || ''
      })
      setError('')
      setShowEditProfile(true)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    
    setSaving(true)
    setError('')
    
    try {
      // Update user profile using the /me endpoint (customers can only update their own)
      const updatedUser = await authApi.updateMe({
        name: editForm.name,
        phone: editForm.phone || undefined
      })
      
      // Update local state
      setUser(updatedUser)
      
      // If phone was added/updated, link loyalty record
      if (editForm.phone) {
        try {
          await loyaltyApi.findOrCreate({
            customerEmail: user.email,
            customerPhone: editForm.phone,
            deviceId: getDeviceId(),
            customerName: editForm.name
          })
          
          // Refresh loyalty data
          const result = await loyaltyApi.lookup({
            customerEmail: user.email,
            customerPhone: editForm.phone,
            deviceId: getDeviceId()
          })
          if (result.found && result.customer) {
            setLoyalty(result.customer)
          }
        } catch (loyaltyErr) {
          console.error('Failed to link loyalty:', loyaltyErr)
        }
      }
      
      setShowEditProfile(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full border-2 border-gray-300 hover:border-yellow-400 hover:bg-yellow-50 relative">
            <User className="h-5 w-5" />
            {loyalty && loyalty.availableRewards > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {loyalty.availableRewards}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1 py-1">
              <p className="text-sm font-bold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              {user?.phone && (
                <p className="text-xs text-gray-400">{user.phone}</p>
              )}
            </div>
          </DropdownMenuLabel>
          
          {/* Loyalty Stamps Section */}
          <DropdownMenuSeparator />
          <div className="px-2 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-gray-700">Loyalty Stamps</span>
              </div>
              {loyalty?.availableRewards ? (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  {loyalty.availableRewards} FREE!
                </span>
              ) : null}
            </div>
            
            {loadingLoyalty ? (
              <div className="flex gap-1 justify-center py-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
                <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
                <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
              </div>
            ) : loyalty ? (
              <>
                {/* Stamp visualization */}
                <div className="flex gap-1 justify-center mb-2">
                  {Array.from({ length: STAMPS_FOR_REWARD }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        i < loyalty.currentStamps
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-300'
                      }`}
                    >
                      <Star className={`w-3 h-3 ${i < loyalty.currentStamps ? 'fill-current' : ''}`} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-center text-gray-500">
                  {loyalty.stampsToNextReward > 0 
                    ? `${loyalty.stampsToNextReward} more stamps until free drink!`
                    : '🎉 Claim your free drink!'}
                </p>
                <p className="text-[10px] text-center text-gray-400 mt-1">
                  Total stamps collected: {loyalty.totalStamps}
                </p>
              </>
            ) : !user?.phone ? (
              <div className="text-center py-2">
                <p className="text-xs text-gray-500">Add your phone number to track stamps</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-1 text-amber-600 hover:text-amber-700"
                  onClick={handleEditProfile}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Add Phone
                </Button>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="flex gap-1 justify-center mb-2">
                  {Array.from({ length: STAMPS_FOR_REWARD }).map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-100 text-gray-300"
                    >
                      <Star className="w-3 h-3" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">Start earning stamps with your orders!</p>
                <p className="text-[10px] text-gray-400 mt-1">Tracked via: {user?.phone}</p>
              </div>
            )}
          </div>
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleViewOrders} className="cursor-pointer">
            <ShoppingBag className="mr-2 h-4 w-4" />
            <span>My Orders</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEditProfile} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
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

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g., +63 912 345 6789"
              />
              <p className="text-xs text-gray-500">
                Add your phone number to track loyalty stamps across devices
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={editForm.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-400">Email cannot be changed</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProfile} 
              disabled={saving}
              style={{ backgroundColor: '#F9C900', color: '#000' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
