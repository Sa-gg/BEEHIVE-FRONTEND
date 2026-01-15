import { type ReactNode, useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, Bell, LayoutDashboard, CreditCard, Package, ClipboardList, ChefHat, TrendingUp, FileText, Wallet, Tag, Users, Brain, Settings, Coffee } from 'lucide-react'
// Solid icons from react-icons
import { 
  RiDashboardFill, 
  RiBankCardFill, 
  RiFileList3Fill, 
  RiArchiveFill,
  RiRestaurantFill,
  RiLineChartFill,
  RiFileTextFill,
  RiWalletFill,
  RiPriceTag3Fill,
  RiTeamFill,
  RiBrainFill,
  RiSettings4Fill,
  RiCupFill
} from 'react-icons/ri'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useShallow } from 'zustand/react/shallow'
import { useOrderEvents } from '../../../shared/hooks/useOrderEvents'
import { playNotificationSound, vibrate } from '../../../shared/utils/notificationSound'

interface AdminLayoutProps {
  children: ReactNode
  hideHeader?: boolean
  hideHeaderOnDesktop?: boolean
  noPadding?: boolean
  overviewCounts?: {
    pending: number
    preparing: number
    completed: number
  }
  showOverviewInHeader?: boolean
}

/**
 * AdminLayout - Layout for admin dashboard pages
 * 
 * Includes sidebar navigation and top bar.
 * Used for: Dashboard, POS, Orders, Inventory, etc.
 */
export const AdminLayout = ({ children, hideHeader = false, hideHeaderOnDesktop = false, noPadding = false, overviewCounts, showOverviewInHeader = false }: AdminLayoutProps) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  // Initialize sidebar state from localStorage for desktop, default to closed for mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (window.innerWidth < 1024) return false
    const saved = localStorage.getItem('sidebarCollapsed')
    // If saved is 'true' (collapsed), return false (not open), otherwise return true (open)
    return saved !== 'true'
  })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [sidebarNeedsScroll, setSidebarNeedsScroll] = useState(false)
  const sidebarContentRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { pendingOrderCount, stockAlertCount, discrepancyCount, productsNeedAttentionCount, fetchNotifications, newOrderAlert, dismissNewOrderAlert, handleNewOrder, handleOrderUpdate } = useNotificationStore()
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const { pendingOrders, lowStockItems, outOfStockItems, discrepancyItems, productsNeedAttention } = useNotificationStore()

  // Persist sidebar collapsed state to localStorage for desktop
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarCollapsed', (!sidebarOpen).toString())
    }
  }, [sidebarOpen, isMobile])

  // Real-time SSE event handlers for cashier
  const onNewOrder = useCallback((order: unknown) => {
    console.log('🔔 AdminLayout: New order received globally', order)
    const orderData = order as { createdBy?: string }
    // Only play notification sound for customer orders
    // POS orders created by cashier/manager should not trigger notification
    const createdBy = orderData.createdBy?.toLowerCase() || ''
    const isCustomerOrder = createdBy === 'customer' || createdBy === 'guest customer' || createdBy === 'guest'
    handleNewOrder(order as any)
    if (isCustomerOrder) {
      playNotificationSound()
      vibrate([200, 100, 200])
    }
  }, [handleNewOrder])

  const onOrderUpdate = useCallback((order: unknown) => {
    console.log('🔄 AdminLayout: Order update received globally', order)
    handleOrderUpdate(order as any)
  }, [handleOrderUpdate])

  // Subscribe to real-time order events globally for all admin pages
  useOrderEvents({
    type: 'cashier',
    onNewOrder,
    onOrderUpdate,
    enabled: true
  })

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
        if (mobile) {
          // Switching to mobile: close sidebar
          setSidebarOpen(false)
        } else {
          // Switching to desktop: restore from localStorage
          const saved = localStorage.getItem('sidebarCollapsed')
          setSidebarOpen(saved !== 'true')
        }
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
  
  // Get only the settings we need for the navbar - use shallow to prevent unnecessary re-renders
  const { navbarIconStyle, navbarBackgroundStyle } = useSettingsStore(
    useShallow((state) => ({
      navbarIconStyle: state.navbarIconStyle,
      navbarBackgroundStyle: state.navbarBackgroundStyle
    }))
  )

  // Permission-based menu items - each item has outline and solid icons
  // Order: dashboard > pos > orders > inventory > products > sales > expenses > mood system > reports > accounts > settings
  const allMenuItems = [
    { outlineIcon: LayoutDashboard, solidIcon: RiDashboardFill, label: 'Dashboard', path: '/admin', badge: null, permission: 'viewDashboard', iconColor: 'text-blue-400' },
    { outlineIcon: CreditCard, solidIcon: RiBankCardFill, label: 'POS', path: '/admin/pos', badge: null, permission: 'accessPOS', iconColor: 'text-emerald-400' },
    { outlineIcon: ClipboardList, solidIcon: RiFileList3Fill, label: 'Orders', path: '/admin/orders', badge: pendingOrderCount > 0 ? pendingOrderCount : null, badgeColor: 'bg-red-500', permission: 'viewOrders', iconColor: 'text-amber-400' },
    { outlineIcon: Package, solidIcon: RiArchiveFill, label: 'Inventory', path: '/admin/inventory', badge: (stockAlertCount + discrepancyCount) > 0 ? (stockAlertCount + discrepancyCount) : null, badgeColor: discrepancyCount > 0 ? 'bg-red-600' : 'bg-orange-500', permission: 'viewInventory', iconColor: 'text-cyan-400' },
    { outlineIcon: Tag, solidIcon: RiPriceTag3Fill, label: 'Products', path: '/admin/products', badge: productsNeedAttentionCount > 0 ? productsNeedAttentionCount : null, badgeColor: 'bg-amber-500', permission: 'viewProducts', iconColor: 'text-purple-400' },
    { outlineIcon: TrendingUp, solidIcon: RiLineChartFill, label: 'Sales', path: '/admin/sales', badge: null, permission: 'viewSales', iconColor: 'text-green-400' },
    { outlineIcon: Wallet, solidIcon: RiWalletFill, label: 'Expenses', path: '/admin/expenses', badge: null, badgeColor: null, permission: 'viewExpenses', iconColor: 'text-red-400' },
    { outlineIcon: Brain, solidIcon: RiBrainFill, label: 'Mood System', path: '/admin/mood-settings', badge: null, permission: 'manageMoodSettings', iconColor: 'text-pink-400' },
    { outlineIcon: Coffee, solidIcon: RiCupFill, label: 'Loyalty', path: '/admin/loyalty', badge: null, permission: 'manageOrders', iconColor: 'text-amber-500' },
    { outlineIcon: FileText, solidIcon: RiFileTextFill, label: 'Reports', path: '/admin/reports', badge: null, badgeColor: null, permission: 'viewReports', iconColor: 'text-indigo-400' },
    { outlineIcon: Users, solidIcon: RiTeamFill, label: 'Accounts', path: '/admin/accounts', badge: null, badgeColor: null, permission: 'viewAccounts', iconColor: 'text-teal-400' },
    { outlineIcon: Settings, solidIcon: RiSettings4Fill, label: 'Settings', path: '/admin/settings', badge: null, permission: 'viewSettings', iconColor: 'text-gray-400' },
    // Hidden for now - Recipe page (functionality moved to Products page)
    // { outlineIcon: ChefHat, solidIcon: RiRestaurantFill, label: 'Product Components', path: '/admin/recipes', badge: null, permission: 'viewRecipes', iconColor: 'text-orange-400' },
  ]

  // Filter menu items based on user's permissions
  const menuItems = allMenuItems.filter(item => {
    if (!user?.role) return false
    return userPermissions[item.permission] === true
  })

  // Check if sidebar content needs scrolling (placed after menuItems definition)
  // Use requestAnimationFrame to prevent flash during page transitions
  useEffect(() => {
    let rafId: number
    let timeoutId: ReturnType<typeof setTimeout>
    
    const checkOverflow = () => {
      // Use RAF + small delay to let DOM settle after page transitions
      rafId = requestAnimationFrame(() => {
        timeoutId = setTimeout(() => {
          if (sidebarContentRef.current) {
            const { scrollHeight, clientHeight } = sidebarContentRef.current
            setSidebarNeedsScroll(scrollHeight > clientHeight)
          }
        }, 50) // Small delay to prevent flash
      })
    }
    
    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => {
      window.removeEventListener('resize', checkOverflow)
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
    }
  }, [sidebarOpen, menuItems.length])

  const totalNotifications = pendingOrderCount + stockAlertCount + discrepancyCount + productsNeedAttentionCount

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 100%)' }}>
      {/* Global New Order Alert Banner - Modern Yellow Theme */}
      {newOrderAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100]">
          <div 
            className="bg-gray-900 text-white pl-3 pr-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 cursor-pointer hover:bg-gray-800 transition-all animate-pulse"
            onClick={() => {
              dismissNewOrderAlert()
              navigate('/admin/orders')
            }}
            style={{ boxShadow: '0 10px 40px rgba(249, 201, 0, 0.3)' }}
          >
            <div className="p-2 rounded-full" style={{ backgroundColor: '#F9C900' }}>
              <Bell className="h-4 w-4 text-gray-900" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm" style={{ color: '#F9C900' }}>New Order!</span>
              <span className="text-xs text-gray-300">
                {newOrderAlert.orderNumber} • {newOrderAlert.customerName} • ₱{newOrderAlert.totalAmount.toFixed(2)}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                dismissNewOrderAlert()
              }}
              className="ml-1 hover:bg-white/10 rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
      )}

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
        style={{ backgroundColor: navbarBackgroundStyle === 'light' ? '#FFFBF0' : '#000000' }}
      >
        <div ref={sidebarContentRef} className={`p-4 h-full flex flex-col overflow-y-auto ${navbarBackgroundStyle === 'light' ? 'light-scrollbar' : 'dark-scrollbar'}`}>{/* Logo & Toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className={`flex items-center gap-3 ${!sidebarOpen && !isMobile && 'hidden'}`}>
              <img src="/assets/logo.png" alt="BEEHIVE" className="h-10 w-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#F9C900' }}>
                  BEEHIVE
                </h1>
                <p className={`text-xs ${navbarBackgroundStyle === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Admin Panel</p>
              </div>
            </div>
            {!isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`${navbarBackgroundStyle === 'light' ? 'text-gray-500' : 'text-gray-400'} hover:text-[#F9C900] transition-colors p-2`}
              >
                {sidebarOpen ? '←' : '→'}
              </button>
            )}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className={`${navbarBackgroundStyle === 'light' ? 'text-gray-500' : 'text-gray-400'} hover:text-[#F9C900] transition-colors p-2`}
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            {menuItems.map((item) => {
              // Check if current page is active (including sub-pages like stock-transactions for inventory)
              const isActive = location.pathname === item.path || 
                (item.path === '/admin/inventory' && location.pathname === '/admin/stock-transactions')
              // Select icon based on user preference
              const IconComponent = navbarIconStyle === 'solid' ? item.solidIcon : item.outlineIcon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center ${sidebarOpen || isMobile ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'text-[#000000] font-semibold shadow-lg'
                      : navbarBackgroundStyle === 'light' 
                        ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                  style={isActive ? { backgroundColor: '#F9C900' } : {}}
                  title={!sidebarOpen && !isMobile ? item.label : undefined}
                >
                  <span className="flex-shrink-0 relative">
                    <IconComponent className={`h-5 w-5 ${isActive ? 'text-gray-900' : item.iconColor}`} />
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

          {/* Bottom Section - User Info & Logout (always visible) */}
          {(sidebarOpen || isMobile) && (
            <div className={`border-t ${navbarBackgroundStyle === 'light' ? 'border-gray-200' : 'border-gray-800'} pt-4 mt-4 space-y-3`}>
              <div className={`px-4 py-3 rounded-lg ${navbarBackgroundStyle === 'light' ? 'bg-gray-100' : 'bg-gray-800/50'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-black font-bold" style={{ backgroundColor: '#F9C900' }}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${navbarBackgroundStyle === 'light' ? 'text-gray-900' : 'text-white'} truncate`}>{user?.name || 'User'}</p>
                    <p className={`text-xs ${navbarBackgroundStyle === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{user?.role || 'Role'}</p>
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
              <div className={`px-4 py-2 text-xs ${navbarBackgroundStyle === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>© 2025 BEEHIVE</p>
                <p>Version 1.0.0</p>
              </div>
            </div>
          )}
          
          {/* Collapsed state - logout button only (always visible) */}
          {!sidebarOpen && !isMobile && (
            <div className={`border-t ${navbarBackgroundStyle === 'light' ? 'border-gray-200' : 'border-gray-800'} pt-4 mt-4`}>
              <button
                onClick={handleLogout}
                className={`w-full flex items-center justify-center p-3 rounded-lg ${navbarBackgroundStyle === 'light' ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'} hover:text-red-400 transition-colors`}
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
        {/* Show header when: not hideHeader AND (on mobile OR not hideHeaderOnDesktop) */}
        {/* This ensures mobile always gets the header with hamburger menu for consistent UX */}
        {!hideHeader && (isMobile || !hideHeaderOnDesktop) && (
          <header className="shadow-md backdrop-blur-md sticky top-0 z-30" style={{ backgroundColor: 'rgba(255, 251, 240, 0.95)' }}>
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
                  {/* Handle sub-pages like stock-transactions as part of Inventory */}
                  {location.pathname === '/admin/stock-transactions' 
                    ? 'Inventory' 
                    : menuItems.find(item => item.path === location.pathname)?.label || 'Admin Panel'}
                </h2>
                <p className="text-xs lg:text-sm text-gray-500 mt-1 hidden sm:block">
                  {location.pathname === '/admin/stock-transactions'
                    ? 'Stock Transactions - View all inventory stock movements'
                    : 'Manage your BEEHIVE operations'}
                </p>
              </div>
              
              {/* Overview Counts in Header */}
              {showOverviewInHeader && overviewCounts && (
                <div className="hidden md:flex items-center gap-3 mr-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 rounded-full">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-xs font-semibold text-yellow-700">{overviewCounts.pending} Pending</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 rounded-full">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-xs font-semibold text-blue-700">{overviewCounts.preparing} Preparing</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs font-semibold text-green-700">{overviewCounts.completed} Completed</span>
                  </div>
                </div>
              )}
              
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
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                            {totalNotifications > 0 && (
                              <span className="text-xs text-gray-500">{totalNotifications} pending</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                          {/* Pending Orders */}
                          {pendingOrders.length > 0 && (
                            <div className="py-2">
                              <p className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">Orders</p>
                              {pendingOrders.slice(0, 3).map(order => (
                                <Link
                                  key={order.id}
                                  to="/admin/orders"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{order.orderNumber}</p>
                                    <p className="text-xs text-gray-500">₱{order.totalAmount.toFixed(2)}</p>
                                  </div>
                                </Link>
                              ))}
                              {pendingOrders.length > 3 && (
                                <Link
                                  to="/admin/orders"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="block px-4 py-1 text-xs text-amber-600 font-medium hover:underline"
                                >
                                  +{pendingOrders.length - 3} more
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Stock Alerts */}
                          {(lowStockItems.length > 0 || outOfStockItems.length > 0 || discrepancyItems.length > 0) && (
                            <div className="py-2">
                              <p className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">Stock Alerts</p>
                              {/* Discrepancy Items (highest priority) */}
                              {discrepancyItems.slice(0, 2).map(item => (
                                <Link
                                  key={item.id}
                                  to="/admin/inventory?filter=discrepancy"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 animate-pulse" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                    <p className="text-xs text-purple-600 font-semibold">Discrepancy: {item.currentStock.toFixed(1)}</p>
                                  </div>
                                </Link>
                              ))}
                              {outOfStockItems.slice(0, 2).map(item => (
                                <Link
                                  key={item.id}
                                  to="/admin/inventory?filter=out_of_stock"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                    <p className="text-xs text-red-600">Out of stock</p>
                                  </div>
                                </Link>
                              ))}
                              {lowStockItems.slice(0, 2).map(item => (
                                <Link
                                  key={item.id}
                                  to="/admin/inventory?filter=low_stock"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                    <p className="text-xs text-orange-600">
                                      Stock: {item.currentStock.toFixed(1)}/{item.minStock.toFixed(1)}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                              {(lowStockItems.length + outOfStockItems.length + discrepancyItems.length) > 6 && (
                                <Link
                                  to="/admin/inventory"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="block px-4 py-1 text-xs text-amber-600 font-medium hover:underline"
                                >
                                  +{(lowStockItems.length + outOfStockItems.length + discrepancyItems.length) - 6} more
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Products Need Attention */}
                          {productsNeedAttention.length > 0 && (
                            <div className="py-2">
                              <p className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">Products Need Attention</p>
                              {productsNeedAttention.slice(0, 3).map(item => (
                                <Link
                                  key={item.id}
                                  to="/admin/products?filter=needs-attention"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                >
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${item.currentStock <= 0 ? 'bg-red-500' : 'bg-amber-500'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                    <p className={`text-xs ${item.currentStock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                      {item.currentStock <= 0 
                                        ? `Available but 0 stock • Check inventory`
                                        : `Marked out of stock • ${item.currentStock} available`}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                              {productsNeedAttention.length > 3 && (
                                <Link
                                  to="/admin/products?filter=needs-attention"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="block px-4 py-1 text-xs text-amber-600 font-medium hover:underline"
                                >
                                  +{productsNeedAttention.length - 3} more
                                </Link>
                              )}
                            </div>
                          )}

                          {totalNotifications === 0 && (
                            <div className="px-4 py-6 text-center">
                              <p className="text-sm text-gray-500">No pending alerts</p>
                            </div>
                          )}
                        </div>

                        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                          <Link
                            to="/admin/orders"
                            onClick={() => setNotificationDropdownOpen(false)}
                            className="block text-center text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            View All Orders
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
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{user?.role?.toLowerCase()}</p>
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
        <main className={`flex-1 overflow-auto ${!noPadding ? 'p-4 lg:p-6' : ''}`}>
          {/* Floating Hamburger Menu only for pages with hideHeader (completely hidden on all devices) */}
          {/* Note: hideHeaderOnDesktop pages now show header on mobile, so they don't need floating hamburger */}
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
