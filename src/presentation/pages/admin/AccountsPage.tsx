import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { Label } from '../../components/common/ui/label'
import { Badge } from '../../components/common/ui/badge'
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  Users,
  UserCheck,
  Loader2,
  CreditCard,
  Phone,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldCheck,
  UserCircle,
  ChefHat,
  Store,
  Eye,
  EyeOff
} from 'lucide-react'
import { authApi, type User as UserType } from '../../../infrastructure/api/auth.api'
import { useAuthStore } from '../../store/authStore'

// Role definitions
const ROLES = [
  { value: 'CUSTOMER', label: 'Customer', icon: UserCircle, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'CASHIER', label: 'Cashier', icon: Store, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'COOK', label: 'Cook', icon: ChefHat, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'MANAGER', label: 'Manager', icon: ShieldCheck, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'ADMIN', label: 'Admin', icon: Shield, color: 'bg-red-100 text-red-700 border-red-200' },
] as const

type UserRole = typeof ROLES[number]['value']

// Default permissions per role
const DEFAULT_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  CUSTOMER: {
    viewMenu: true,
    placeOrders: true,
    viewOwnOrders: true,
    viewLoyaltyPoints: true,
  },
  CASHIER: {
    viewDashboard: true,
    accessPOS: true,
    viewOrders: true,
    manageOrders: true,
    viewInventory: true,
    manageInventory: false,
    viewSales: true,
    viewReports: false,
    viewExpenses: false,
    viewProducts: true,
    manageProducts: false,
    viewAccounts: false,
    manageAccounts: false,
    viewSettings: false,
    manageSettings: false,
  },
  COOK: {
    viewDashboard: true,
    accessPOS: false,
    viewOrders: true,
    manageOrders: true,
    viewInventory: true,
    manageInventory: false,
    viewSales: false,
    viewReports: false,
    viewExpenses: false,
    viewProducts: true,
    manageProducts: false,
    viewAccounts: false,
    manageAccounts: false,
    viewSettings: false,
    manageSettings: false,
  },
  MANAGER: {
    viewDashboard: true,
    accessPOS: true,
    viewOrders: true,
    manageOrders: true,
    viewInventory: true,
    manageInventory: true,
    viewSales: true,
    viewReports: true,
    viewExpenses: true,
    manageExpenses: true,
    viewProducts: true,
    manageProducts: true,
    viewAccounts: true,
    manageAccounts: false,
    viewSettings: true,
    manageSettings: true,
    viewRecipes: true,
    manageRecipes: true,
    manageMoodSettings: true,
  },
  ADMIN: {
    viewDashboard: true,
    accessPOS: true,
    viewOrders: true,
    manageOrders: true,
    viewInventory: true,
    manageInventory: true,
    viewSales: true,
    viewReports: true,
    viewExpenses: true,
    manageExpenses: true,
    viewProducts: true,
    manageProducts: true,
    viewAccounts: true,
    manageAccounts: true,
    viewSettings: true,
    manageSettings: true,
    viewRecipes: true,
    manageRecipes: true,
    manageUserPermissions: true,
    manageMoodSettings: true,
  },
}

// Permission labels for display
const PERMISSION_LABELS: Record<string, string> = {
  viewDashboard: 'View Dashboard',
  accessPOS: 'Access POS',
  viewOrders: 'View Orders',
  manageOrders: 'Manage Orders',
  viewInventory: 'View Inventory',
  manageInventory: 'Manage Inventory',
  viewSales: 'View Sales',
  viewReports: 'View Reports',
  viewExpenses: 'View Expenses',
  manageExpenses: 'Manage Expenses',
  viewProducts: 'View Products',
  manageProducts: 'Manage Products',
  viewAccounts: 'View Accounts',
  manageAccounts: 'Manage Accounts',
  viewSettings: 'View Settings',
  manageSettings: 'Manage Settings',
  viewRecipes: 'View Recipes',
  manageRecipes: 'Manage Recipes',
  manageUserPermissions: 'Manage User Permissions',
  manageMoodSettings: 'Manage Mood Settings',
}

// Staff permission categories
const PERMISSION_CATEGORIES = [
  { name: 'Dashboard & POS', permissions: ['viewDashboard', 'accessPOS'] },
  { name: 'Orders', permissions: ['viewOrders', 'manageOrders'] },
  { name: 'Inventory', permissions: ['viewInventory', 'manageInventory'] },
  { name: 'Sales & Reports', permissions: ['viewSales', 'viewReports'] },
  { name: 'Expenses', permissions: ['viewExpenses', 'manageExpenses'] },
  { name: 'Products & Recipes', permissions: ['viewProducts', 'manageProducts', 'viewRecipes', 'manageRecipes'] },
  { name: 'Administration', permissions: ['viewAccounts', 'manageAccounts', 'viewSettings', 'manageSettings', 'manageMoodSettings'] },
]

interface AccountFormData {
  name: string
  email: string
  password: string
  phone: string
  role: UserRole
  cardNumber: string
  isActive: boolean
  loyaltyPoints: number
  permissions: Record<string, boolean>
}

export const AccountsPage = () => {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<keyof UserType>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [submitting, setSubmitting] = useState(false)
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('all')
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserType | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Check if current user is admin (can manage permissions)
  const isAdmin = currentUser?.role === 'ADMIN'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10)
  const itemsPerPageOptions = [5, 10, 25, 50, 'all'] as const

  // Form state
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'CUSTOMER',
    cardNumber: '',
    isActive: true,
    loyaltyPoints: 0,
    permissions: { ...DEFAULT_PERMISSIONS.CUSTOMER }
  })

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    customers: 0,
    cashiers: 0,
    cooks: 0,
    managers: 0,
    admins: 0,
    activeUsers: 0
  })

  useEffect(() => {
    loadUsers()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterRole, filterActive])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await authApi.getAllUsers()
      setUsers(data)
      
      // Calculate stats
      const statsData = {
        totalUsers: data.length,
        customers: data.filter(u => u.role === 'CUSTOMER').length,
        cashiers: data.filter(u => u.role === 'CASHIER').length,
        cooks: data.filter(u => u.role === 'COOK').length,
        managers: data.filter(u => u.role === 'MANAGER').length,
        admins: data.filter(u => u.role === 'ADMIN').length,
        activeUsers: data.filter(u => u.isActive).length
      }
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = !searchQuery || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone && user.phone.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesActive = filterActive === 'all' || 
        (filterActive === 'active' && user.isActive) ||
        (filterActive === 'inactive' && !user.isActive)
      return matchesSearch && matchesRole && matchesActive
    })
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      const multiplier = sortDirection === 'asc' ? 1 : -1
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * multiplier
      }
      return String(aVal || '').localeCompare(String(bVal || '')) * multiplier
    })

  // Pagination logic
  const totalItems = filteredUsers.length
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage)
  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage
  const endIndex = itemsPerPage === 'all' ? totalItems : startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleItemsPerPageChange = (value: number | 'all') => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  const handleSort = (field: keyof UserType) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || (!editingUser && !formData.password)) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)

      if (editingUser) {
        // Update user via API
        await authApi.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          role: formData.role,
          cardNumber: formData.cardNumber || undefined,
          isActive: formData.isActive,
          loyaltyPoints: formData.role === 'CUSTOMER' ? formData.loyaltyPoints : 0,
          ...(formData.password ? { password: formData.password } : {})
        })
      } else {
        // Create new user
        await authApi.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          role: formData.role
        })
      }

      await loadUsers()
      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return

    try {
      await authApi.deleteUser(id)
      await loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete account')
    }
  }

  const handleEdit = (user: UserType) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.role as UserRole,
      cardNumber: user.cardNumber || '',
      isActive: user.isActive,
      loyaltyPoints: user.loyaltyPoints,
      permissions: { ...DEFAULT_PERMISSIONS[user.role as UserRole] }
    })
    setIsModalOpen(true)
  }

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: { ...DEFAULT_PERMISSIONS[role] }
    }))
  }

  const handleOpenPermissions = (user: UserType) => {
    setSelectedUserForPermissions(user)
    setShowPermissionsModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'CUSTOMER',
      cardNumber: '',
      isActive: true,
      loyaltyPoints: 0,
      permissions: { ...DEFAULT_PERMISSIONS.CUSTOMER }
    })
    setEditingUser(null)
    setShowPassword(false)
  }

  const getRoleConfig = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[0]
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-red-500">{error}</p>
          <Button onClick={loadUsers}>Retry</Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Account Management</h1>
            <p className="text-gray-500 mt-1">Manage all user accounts, roles, and permissions</p>
          </div>
          <Button 
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2"
            style={{ backgroundColor: '#F9C900', color: '#000000' }}
          >
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCircle className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Customers</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats.customers}</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Cashiers</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{stats.cashiers}</p>
          </div>
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ChefHat className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Cooks</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">{stats.cooks}</p>
          </div>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Managers</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{stats.managers}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Admins</span>
            </div>
            <p className="text-2xl font-bold text-red-900">{stats.admins}</p>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-900">Active</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900">{stats.activeUsers}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="h-10 px-4 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Roles</option>
            {ROLES.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="h-10 px-4 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    Account {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('role')}
                  >
                    Role {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Loyalty Points
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      No accounts found
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const roleConfig = getRoleConfig(user.role)
                    const RoleIcon = roleConfig.icon
                    return (
                      <tr key={user.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: '#F9C900' }}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`${roleConfig.color} border flex items-center gap-1 w-fit`}>
                            <RoleIcon className="h-3 w-3" />
                            {roleConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            {user.phone ? (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </div>
                            ) : (
                              <span className="text-gray-400">No phone</span>
                            )}
                            {user.cardNumber && (
                              <div className="flex items-center gap-1 text-gray-500 mt-1">
                                <CreditCard className="h-3 w-3" />
                                {user.cardNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge variant={user.isActive ? 'default' : 'secondary'}
                            className={user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {user.role === 'CUSTOMER' ? (
                            <span className="font-semibold text-amber-600">
                              {user.loyaltyPoints.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Permission button - only show for admin managing staff (not customers or other admins) */}
                            {isAdmin && user.role !== 'CUSTOMER' && user.role !== 'ADMIN' ? (
                              <button
                                onClick={() => handleOpenPermissions(user)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Manage Permissions"
                              >
                                <Shield className="h-4 w-4" />
                              </button>
                            ) : (
                              /* Invisible placeholder to maintain alignment */
                              <div className="w-8 h-8" />
                            )}
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All' : option}
                  </option>
                ))}
              </select>
              <span>entries</span>
              <span className="ml-2 text-gray-500">
                (Showing {totalItems > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, totalItems)} of {totalItems})
              </span>
            </div>
            
            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="min-w-[36px]"
                      style={currentPage === pageNum ? { backgroundColor: '#F9C900', color: '#000000' } : {}}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Account Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingUser ? 'Edit Account' : 'Add New Account'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {editingUser ? 'Update account details' : 'Create a new user account'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Role Selection */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                    Account Type <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.filter(role => {
                      // Only ADMIN can create other ADMIN accounts
                      if (role.value === 'ADMIN' && !isAdmin) return false
                      return true
                    }).map((role) => {
                      const RoleIcon = role.icon
                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => handleRoleChange(role.value)}
                          className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                            formData.role === role.value
                              ? 'border-amber-400 bg-amber-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <RoleIcon className={`h-5 w-5 ${formData.role === role.value ? 'text-amber-600' : 'text-gray-400'}`} />
                          <span className={`font-medium ${formData.role === role.value ? 'text-amber-900' : 'text-gray-600'}`}>
                            {role.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      required
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700 mb-2 block">
                    Password {!editingUser && <span className="text-red-500">*</span>}
                    {editingUser && <span className="text-gray-400 text-xs ml-2">(leave blank to keep current)</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? '••••••••' : 'Enter password'}
                      required={!editingUser}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Phone & Card Number */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+63 912 345 6789"
                      className="h-11"
                    />
                  </div>
                  {formData.role === 'CUSTOMER' && (
                    <div>
                      <Label htmlFor="cardNumber" className="text-sm font-semibold text-gray-700 mb-2 block">
                        Loyalty Card #
                      </Label>
                      <Input
                        id="cardNumber"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                        placeholder="BH-0001"
                        className="h-11"
                      />
                    </div>
                  )}
                </div>

                {/* Customer-specific: Loyalty Points */}
                {formData.role === 'CUSTOMER' && editingUser && (
                  <div>
                    <Label htmlFor="loyaltyPoints" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Loyalty Points
                    </Label>
                    <Input
                      id="loyaltyPoints"
                      type="number"
                      value={formData.loyaltyPoints}
                      onChange={(e) => setFormData({ ...formData, loyaltyPoints: parseInt(e.target.value) || 0 })}
                      min={0}
                      className="h-11"
                    />
                  </div>
                )}

                {/* Active Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">Account Status</p>
                    <p className="text-sm text-gray-500">
                      {formData.isActive ? 'Account is active and can log in' : 'Account is disabled'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      formData.isActive ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false)
                      resetForm()
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="shadow-lg shadow-amber-500/20"
                    style={{ backgroundColor: '#F9C900', color: '#000000' }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingUser ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>{editingUser ? 'Update' : 'Create'} Account</>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permissions Modal */}
        {showPermissionsModal && selectedUserForPermissions && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-500" />
                    View Permissions
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {selectedUserForPermissions.name} ({getRoleConfig(selectedUserForPermissions.role).label})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPermissionsModal(false)
                    setSelectedUserForPermissions(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Role-Based Access Control</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Permissions are determined by the user's role. To change what a user can access, update their role in the Edit Account form.
                    </p>
                  </div>
                </div>

                {/* Permission Categories */}
                <div className="space-y-4">
                  {PERMISSION_CATEGORIES.map((category) => (
                    <div key={category.name} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-700">
                        {category.name}
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {category.permissions.map((perm) => {
                          const isEnabled = DEFAULT_PERMISSIONS[selectedUserForPermissions.role as UserRole]?.[perm] ?? false
                          return (
                            <div key={perm} className={`flex items-center justify-between p-2 rounded-lg ${isEnabled ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                              <span className={`text-sm ${isEnabled ? 'text-green-800 font-medium' : 'text-gray-500'}`}>
                                {PERMISSION_LABELS[perm] || perm}
                              </span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                {isEnabled ? '✓ YES' : '✗ NO'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer with action button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Change role to modify permissions
                  </p>
                  <Button
                    onClick={() => {
                      setShowPermissionsModal(false)
                      setSelectedUserForPermissions(null)
                      handleEdit(selectedUserForPermissions)
                    }}
                    className="flex items-center gap-2"
                    style={{ backgroundColor: '#F9C900', color: '#000000' }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
