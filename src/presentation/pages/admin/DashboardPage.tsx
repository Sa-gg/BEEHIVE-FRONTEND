import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, AlertCircle } from 'lucide-react'
import { dashboardApi, type DashboardStats } from '../../../infrastructure/api/dashboard.api'

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardStats()
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      loadDashboardStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadDashboardStats = async () => {
    try {
      setError(null)
      const response = await dashboardApi.getStats()
      setStats(response.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      console.error('Error loading dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error || 'No data available'}</p>
            <button
              onClick={loadDashboardStats}
              className="px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your business performance</p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Sales */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-400">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Sales</p>
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold mt-2 text-black">₱{(stats.totalSales || 0).toLocaleString()}</p>
            <div className={`flex items-center gap-1 text-sm mt-2 ${stats.salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.salesChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{stats.salesChange >= 0 ? '+' : ''}{stats.salesChange.toFixed(1)}% from yesterday</span>
            </div>
          </div>

          {/* Orders Today */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-400">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Orders Today</p>
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold mt-2 text-black">{stats.ordersToday}</p>
            <div className={`flex items-center gap-1 text-sm mt-2 ${stats.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.ordersChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{stats.ordersChange >= 0 ? '+' : ''}{stats.ordersChange.toFixed(1)}% from yesterday</span>
            </div>
          </div>

          {/* Active Customers */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-400">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Active Customers</p>
              <Users className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold mt-2 text-black">{stats.activeCustomers.toLocaleString()}</p>
            <div className={`flex items-center gap-1 text-sm mt-2 ${stats.customersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.customersChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{stats.customersChange >= 0 ? '+' : ''}{stats.customersChange.toFixed(1)}% from last month</span>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-400">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Pending Orders</p>
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold mt-2 text-black">{stats.pendingOrders}</p>
            <p className="text-sm mt-2 text-orange-600">
              {stats.pendingOrders > 0 ? 'Action needed' : 'All clear'}
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
