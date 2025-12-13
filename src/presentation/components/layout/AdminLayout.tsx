import { type ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
  hideHeader?: boolean
}

/**
 * AdminLayout - Layout for admin dashboard pages
 * 
 * Includes sidebar navigation and top bar.
 * Used for: Dashboard, POS, Orders, Inventory, etc.
 */
export const AdminLayout = ({ children, hideHeader = false }: AdminLayoutProps) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024)
  const location = useLocation()

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

  const menuItems = [
    { icon: '🏠', label: 'Home (Dev)', path: '/' },
    { icon: '📊', label: 'Dashboard', path: '/admin' },
    { icon: '💳', label: 'POS', path: '/admin/pos' },
    { icon: '📦', label: 'Orders', path: '/admin/orders' },
    { icon: '📋', label: 'Inventory', path: '/admin/inventory' },
    { icon: '📈', label: 'Sales', path: '/admin/sales' },
    { icon: '💰', label: 'Expenses', path: '/admin/expenses' },
    { icon: '🏷️', label: 'Products', path: '/admin/products' },
    { icon: '👥', label: 'Customers', path: '/admin/customers' },
    { icon: '⚙️', label: 'Settings', path: '/admin/settings' },
  ]

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
              <img src="/src/assets/logo.png" alt="BEEHIVE" className="h-10 w-10 object-contain" />
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
                  className={`flex items-center ${sidebarOpen || isMobile ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'text-[#000000] font-semibold shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                  style={isActive ? { backgroundColor: '#F9C900' } : {}}
                  title={!sidebarOpen && !isMobile ? item.label : undefined}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {(sidebarOpen || isMobile) && <span className="text-sm">{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Section */}
          {(sidebarOpen || isMobile) && (
            <div className="border-t border-gray-800 pt-4 mt-4">
              <div className="px-4 py-3 rounded-lg text-xs text-gray-400">
                <p className="mb-1">© 2025 BEEHIVE</p>
                <p>Version 1.0.0</p>
              </div>
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
        {!hideHeader && (
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
                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-2xl">🔔</span>
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#F9C900' }}></span>
                </button>
                
                {/* User Profile */}
                <div className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                    A
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-semibold text-gray-800">Admin User</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className={`flex-1 overflow-auto ${!hideHeader ? 'p-4 lg:p-6' : ''}`}>
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
