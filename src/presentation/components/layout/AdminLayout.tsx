import { type ReactNode, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, Bell } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'

interface AdminLayoutProps {
  children: ReactNode
  hideHeader?: boolean
  hideHeaderOnDesktop?: boolean
}

/**
 * AdminLayout - Layout for admin dashboard pages
 * 
 * Includes sidebar navigation and top bar.
 * Used for: Dashboard, POS, Orders, Inventory, etc.
 */
export const AdminLayout = ({ children, hideHeader = false, hideHeaderOnDesktop = false }: AdminLayoutProps) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { pendingOrderCount, stockAlertCount, fetchNotifications } = useNotificationStore()
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const { pendingOrders, lowStockItems, outOfStockItems } = useNotificationStore()

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleLogout = () => {
    logout()
    setDropdownOpen(false)
    navigate('/auth/login')
  }

  // Detect mobile screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      
      // Only auto-adjust sidebar on initial threshold crossing
      if (mobile !== isMobile) {
        setSidebarOpen(!mobile)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobile])

  // Close sidebar on route change on mobile only
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false)
    }
  }, [location.pathname, isMobile])

  // Default permissions per role - determines what each role can access
  type UserRole = 'CUSTOMER' | 'CASHIER' | 'COOK' | 'MANAGER' | 'ADMIN'
  const DEFAULT_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
    CUSTOMER: {},
    CASHIER: {
      viewDashboard: true,
      accessPOS: true,
      viewOrders: true,
      viewInventory: true,
      viewSales: true,
      viewProducts: true,
    },
    COOK: {
      viewDashboard: true,
      viewOrders: true,
      viewInventory: true,
      viewProducts: true,
    },
    MANAGER: {
      viewDashboard: true,
      accessPOS: true,
      viewOrders: true,
      viewInventory: true,
      viewSales: true,
      viewReports: true,
      viewExpenses: true,
      viewProducts: true,
      viewRecipes: true,
      viewAccounts: true,
      viewSettings: true,
      manageMoodSettings: true,
    },
    ADMIN: {
      viewDashboard: true,
      accessPOS: true,
      viewOrders: true,
      viewInventory: true,
      viewSales: true,
      viewReports: true,
      viewExpenses: true,
      viewProducts: true,
      viewRecipes: true,
      viewAccounts: true,
      viewSettings: true,
      manageMoodSettings: true,
    },
  }

  // Get user's permissions based on role
  const userPermissions = user?.role ? DEFAULT_PERMISSIONS[user.role as UserRole] || {} : {}

  // Permission-based menu items - each item has a required permission
  const allMenuItems = [
    { icon: '📊', label: 'Dashboard', path: '/admin', badge: null, permission: 'viewDashboard' },
    { icon: '💳', label: 'POS', path: '/admin/pos', badge: null, permission: 'accessPOS' },
    { icon: '📦', label: 'Orders', path: '/admin/orders', badge: pendingOrderCount > 0 ? pendingOrderCount : null, badgeColor: 'bg-red-500', permission: 'viewOrders' },
    { icon: '📋', label: 'Inventory', path: '/admin/inventory', badge: stockAlertCount > 0 ? stockAlertCount : null, badgeColor: 'bg-orange-500', permission: 'viewInventory' },
    { icon: '👨‍🍳', label: 'Recipes', path: '/admin/recipes', badge: null, permission: 'viewRecipes' },
    { icon: '📈', label: 'Sales', path: '/admin/sales', badge: null, permission: 'viewSales' },
    { icon: '📑', label: 'Reports', path: '/admin/reports', badge: null, permission: 'viewReports' },
    { icon: '💵', label: 'Expenses', path: '/admin/expenses', badge: null, permission: 'viewExpenses' },
    { icon: '🏷️', label: 'Products', path: '/admin/products', badge: null, permission: 'viewProducts' },
    { icon: '👥', label: 'Accounts', path: '/admin/accounts', badge: null, permission: 'viewAccounts' },
    { icon: '🧠', label: 'Mood System', path: '/admin/mood-settings', badge: null, permission: 'manageMoodSettings' },
    { icon: '⚙️', label: 'Settings', path: '/admin/settings', badge: null, permission: 'viewSettings' },
  ]

  // Filter menu items based on user's permissions
  const menuItems = allMenuItems.filter(item => {
    if (!user?.role) return false
    return userPermissions[item.permission] === true
  })

  const totalNotifications = pendingOrderCount + stockAlertCount

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 100%)' }}>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`shadow-2xl transition-all duration-300 fixed left-0 top-0 h-screen z-50 ${
          isMobile 
            ? (sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full')
            : (sidebarOpen ? 'w-64' : 'w-20')
        }`}
        style={{ backgroundColor: '#000000' }}
      >
        <div className="p-4 h-full flex flex-col overflow-y-auto">{/* Logo & Toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className={`flex items-center gap-3 ${!sidebarOpen && !isMobile && 'hidden'}`}>
              <img src="/assets/logo.png" alt="BEEHIVE" className="h-10 w-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#F9C900' }}>
                  BEEHIVE
                </h1>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            </div>
            {!isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-[#F9C900] transition-colors p-2"
              >
                {sidebarOpen ? '←' : '→'}
              </button>
            )}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-[#F9C900] transition-colors p-2"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center ${sidebarOpen || isMobile ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'text-[#000000] font-semibold shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                  style={isActive ? { backgroundColor: '#F9C900' } : {}}
                  title={!sidebarOpen && !isMobile ? item.label : undefined}
                >
                  <span className="text-xl flex-shrink-0 relative">
                    {item.icon}
                    {/* Badge for collapsed sidebar */}
                    {!sidebarOpen && !isMobile && item.badge && (
                      <span className={`absolute -top-1 -right-1 w-4 h-4 ${item.badgeColor} text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </span>
                  {(sidebarOpen || isMobile) && (
                    <>
                      <span className="text-sm flex-1">{item.label}</span>
                      {/* Badge for expanded sidebar */}
                      {item.badge && (
                        <span className={`${item.badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Section - User Info & Logout */}
          {(sidebarOpen || isMobile) && (
            <div className="border-t border-gray-800 pt-4 mt-4 space-y-3">
              <div className="px-4 py-3 rounded-lg bg-gray-800/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-black font-bold" style={{ backgroundColor: '#F9C900' }}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-400">{user?.role || 'Role'}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
              <div className="px-4 py-2 text-xs text-gray-500">
                <p>© 2025 BEEHIVE</p>
                <p>Version 1.0.0</p>
              </div>
            </div>
          )}
          
          {/* Collapsed state - logout button only */}
          {!sidebarOpen && !isMobile && (
            <div className="border-t border-gray-800 pt-4 mt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-3 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        isMobile 
          ? 'w-full' 
          : (sidebarOpen ? 'lg:ml-64 lg:w-[calc(100%-16rem)]' : 'lg:ml-20 lg:w-[calc(100%-5rem)]')
      }`}>
        {/* Top Bar */}
        {!hideHeader && !(hideHeaderOnDesktop && !isMobile) && (
          <header className="shadow-md backdrop-blur-md sticky top-0 z-30" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
            <div className="flex justify-between items-center px-4 lg:px-6 py-4">
              {/* Mobile Hamburger Menu */}
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
                >
                  <Menu className="h-6 w-6" />
                </button>
              )}
              <div className="flex-1">
                <h2 className="text-lg lg:text-2xl font-bold" style={{ color: '#000000' }}>
                  {menuItems.find(item => item.path === location.pathname)?.label || 'Admin Panel'}
                </h2>
                <p className="text-xs lg:text-sm text-gray-500 mt-1 hidden sm:block">Manage your BEEHIVE operations</p>
              </div>
              
              <div className="flex items-center gap-2 lg:gap-4">
                {/* Notifications Bell with Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Bell className="h-6 w-6 text-gray-600" />
                    {totalNotifications > 0 && (
                      <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {totalNotifications > 9 ? '9+' : totalNotifications}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {notificationDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setNotificationDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-white border-b border-gray-100">
                          <h3 className="font-bold text-gray-900">Notifications</h3>
                          <p className="text-xs text-gray-500">{totalNotifications} alerts require attention</p>
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto">
                          {/* Pending Orders */}
                          {pendingOrders.length > 0 && (
                            <div className="px-4 py-2 border-b border-gray-100">
                              <p className="text-xs font-semibold text-red-600 uppercase mb-2">📦 Pending Orders</p>
                              {pendingOrders.slice(0, 3).map(order => (
                                <Link
                                  key={order.id}
                                  to="/admin/orders"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="block px-3 py-2 rounded-lg hover:bg-red-50 transition-colors mb-1"
                                >
                                  <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                                  <p className="text-xs text-gray-500">
                                    {order.orderType} • ₱{order.totalAmount.toFixed(2)}
                                  </p>
                                </Link>
                              ))}
                              {pendingOrders.length > 3 && (
                                <Link
                                  to="/admin/orders"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="text-xs text-amber-600 font-medium hover:underline"
                                >
                                  +{pendingOrders.length - 3} more orders
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Stock Alerts */}
                          {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
                            <div className="px-4 py-2">
                              <p className="text-xs font-semibold text-orange-600 uppercase mb-2">📋 Stock Alerts</p>
                              {outOfStockItems.slice(0, 2).map(item => (
                                <Link
                                  key={item.id}
                                  to="/admin/inventory"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="block px-3 py-2 rounded-lg hover:bg-red-50 transition-colors mb-1 bg-red-50/50"
                                >
                                  <p className="text-sm font-medium text-red-700">{item.name}</p>
                                  <p className="text-xs text-red-600">Out of Stock!</p>
                                </Link>
                              ))}
                              {lowStockItems.slice(0, 2).map(item => (
                                <Link
                                  key={item.id}
                                  to="/admin/inventory"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="block px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors mb-1"
                                >
                                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                  <p className="text-xs text-orange-600">
                                    Low Stock: {item.currentStock}/{item.minStock}
                                  </p>
                                </Link>
                              ))}
                              {(lowStockItems.length + outOfStockItems.length) > 4 && (
                                <Link
                                  to="/admin/inventory"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="text-xs text-amber-600 font-medium hover:underline"
                                >
                                  +{(lowStockItems.length + outOfStockItems.length) - 4} more alerts
                                </Link>
                              )}
                            </div>
                          )}

                          {totalNotifications === 0 && (
                            <div className="px-4 py-8 text-center">
                              <span className="text-4xl">✅</span>
                              <p className="text-sm text-gray-500 mt-2">All caught up!</p>
                            </div>
                          )}
                        </div>

                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                          <Link
                            to="/admin/orders"
                            onClick={() => setNotificationDropdownOpen(false)}
                            className="block text-center text-sm font-medium text-amber-600 hover:text-amber-700"
                          >
                            View All Activity
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {/* User Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-sm font-semibold text-gray-800">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase() || 'Role'}</p>
                    </div>
                  </button>

                  {dropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setDropdownOpen(false)}
                      />
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                          <p className="text-xs text-gray-600 mt-1 capitalize">Role: {user?.role?.toLowerCase()}</p>
                        </div>

                        <div className="py-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className={`flex-1 overflow-auto ${!hideHeader && !(hideHeaderOnDesktop && !isMobile) ? 'p-4 lg:p-6' : ''}`}>
          {/* Floating Hamburger Menu for pages with hideHeader */}
          {hideHeader && isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed top-4 left-4 z-[60] p-3 rounded-lg shadow-lg transition-colors"
              style={{ backgroundColor: '#F9C900' }}
            >
              <Menu className="h-6 w-6 text-black" />
            </button>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
