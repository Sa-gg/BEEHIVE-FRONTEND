import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, AlertCircle, Package, Clock, ArrowUpRight, ArrowDownRight, Activity, BarChart3 } from 'lucide-react'
import { dashboardApi, type DashboardStats } from '../../../infrastructure/api/dashboard.api'
import { salesApi, type SalesReport } from '../../../infrastructure/api/sales.api'
import { inventoryApi, type InventoryItemDTO } from '../../../infrastructure/api/inventory.api'
import { ordersApi } from '../../../infrastructure/api/orders.api'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts'
import { formatSmartStock } from '../../../shared/utils/stockFormat'

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899']
const GRADIENT_IDS = ['gradientYellow', 'gradientGreen', 'gradientBlue', 'gradientPurple']

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [salesData, setSalesData] = useState<SalesReport | null>(null)
  const [lowStockItems, setLowStockItems] = useState<InventoryItemDTO[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
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
      
      // Load all data in parallel
      const [dashboardResponse, salesReport, inventoryItems, orders] = await Promise.all([
        dashboardApi.getStats(),
        salesApi.getReport({ period: 'week' }),
        inventoryApi.getAll({ status: 'LOW_STOCK' }),
        ordersApi.getAll()
      ])
      
      setStats(dashboardResponse.stats)
      setSalesData(salesReport)
      setLowStockItems(inventoryItems.slice(0, 5)) // Top 5 low stock
      
      // Get recent pending/preparing orders
      const activeOrders = orders
        .filter(o => o.status === 'PENDING' || o.status === 'PREPARING')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
      setRecentOrders(activeOrders)
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Dashboard</h1>
            <p className="text-gray-500 mt-1">Overview of your business performance</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <Activity className="h-4 w-4 text-green-500 animate-pulse" />
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
        
        {/* Stats Grid - Modern Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Sales */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm p-6 border border-amber-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stats.salesChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {stats.salesChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(stats.salesChange).toFixed(1)}%
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Sales</p>
            <p className="text-3xl font-bold text-gray-900">₱{(stats.totalSales || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">vs yesterday</p>
          </div>

          {/* Orders Today */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-sm p-6 border border-green-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stats.ordersChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {stats.ordersChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(stats.ordersChange).toFixed(1)}%
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Orders Today</p>
            <p className="text-3xl font-bold text-gray-900">{stats.ordersToday}</p>
            <p className="text-xs text-gray-400 mt-2">vs yesterday</p>
          </div>

          {/* Active Customers */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-6 border border-blue-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stats.customersChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {stats.customersChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(stats.customersChange).toFixed(1)}%
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Active Customers</p>
            <p className="text-3xl font-bold text-gray-900">{stats.activeCustomers.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">vs last month</p>
          </div>

          {/* Pending Orders */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-sm p-6 border border-purple-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform">
                <AlertCircle className="h-6 w-6 text-purple-600" />
              </div>
              {stats.pendingOrders > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 animate-pulse">
                  Action
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Pending Orders</p>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingOrders}</p>
            <p className="text-xs text-gray-400 mt-2">{stats.pendingOrders > 0 ? 'Needs attention' : 'All clear'}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Chart */}
          {salesData && salesData.dailySales.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Weekly Sales Trend</h3>
                  <p className="text-sm text-gray-500">Revenue performance over time</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={salesData.dailySales.map(d => ({
                  date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
                  sales: d.totalSales,
                  orders: d.totalOrders
                }))}>
                  <defs>
                    <linearGradient id="dashSalesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={val => `₱${(val/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'sales' ? `₱${value.toLocaleString()}` : value,
                      name === 'sales' ? 'Sales' : 'Orders'
                    ]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#F59E0B" strokeWidth={3} fill="url(#dashSalesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category Sales Pie Chart */}
          {salesData && salesData.categorySales.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Sales by Category</h3>
                  <p className="text-sm text-gray-500">Category distribution</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center">
                <ResponsiveContainer width="55%" height={250}>
                  <PieChart>
                    <defs>
                      {COLORS.map((color, index) => (
                        <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={1}/>
                          <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={salesData.categorySales.map(c => ({ name: c.category, value: c.revenue }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {salesData.categorySales.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#pieGradient${index % COLORS.length})`} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₱${value.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {salesData.categorySales.slice(0, 5).map((cat, index) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm text-gray-600 truncate max-w-[100px]">{cat.category}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">₱{(cat.revenue/1000).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Selling Items */}
          {salesData && salesData.topSellingItems.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Top Selling Items</h3>
                  <p className="text-sm text-gray-500">Best performers this week</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesData.topSellingItems.slice(0, 5).map(item => ({
                  name: item.itemName.length > 12 ? item.itemName.substring(0, 12) + '...' : item.itemName,
                  quantity: item.quantity,
                  revenue: item.revenue
                }))} layout="vertical">
                  <defs>
                    <linearGradient id="barGradientGreen" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#34D399" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#374151' }} width={90} />
                  <Tooltip formatter={(value: number, name: string) => [
                    name === 'revenue' ? `₱${value.toLocaleString()}` : value,
                    name === 'revenue' ? 'Revenue' : 'Quantity'
                  ]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="quantity" fill="url(#barGradientGreen)" radius={[0, 8, 8, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hourly Sales Chart */}
          {salesData && salesData.hourlySales.filter(h => h.orders > 0).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Peak Hours</h3>
                  <p className="text-sm text-gray-500">Order distribution by hour</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesData.hourlySales.filter(h => h.orders > 0).map(h => ({
                  hour: `${h.hour}:00`,
                  orders: h.orders,
                  revenue: h.revenue
                }))}>
                  <defs>
                    <linearGradient id="barGradientBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(value: number, name: string) => [
                    name === 'revenue' ? `₱${value.toLocaleString()}` : value,
                    name === 'revenue' ? 'Revenue' : 'Orders'
                  ]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="orders" fill="url(#barGradientBlue)" radius={[8, 8, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bottom Section - Recent Orders & Low Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Active Orders */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Active Orders
                </h3>
                <p className="text-sm text-gray-500">{recentOrders.length} orders need attention</p>
              </div>
            </div>
            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500">No active orders</p>
                <p className="text-sm text-gray-400">Orders will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                    <div>
                      <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">{order.customerName || 'Walk-in Customer'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'PENDING' 
                          ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {order.status === 'PENDING' ? '⏳' : '👨‍🍳'} {order.status}
                      </span>
                      <p className="text-sm font-medium text-gray-600 mt-1">₱{order.totalAmount.toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Alert */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-red-500" />
                  Low Stock Alert
                </h3>
                <p className="text-sm text-gray-500">{lowStockItems.length} items need restocking</p>
              </div>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-gray-600 font-medium">All items in stock</p>
                <p className="text-sm text-gray-400">Inventory looks healthy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100 hover:shadow-sm transition-shadow">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{formatSmartStock(item.currentStock, item.unit)}</p>
                      <p className="text-xs text-gray-500">Min: {formatSmartStock(item.minStock, item.unit)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
