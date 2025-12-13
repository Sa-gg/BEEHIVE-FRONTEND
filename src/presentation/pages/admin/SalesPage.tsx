import { useState } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Calendar, Download, Filter } from 'lucide-react'

interface SalesData {
  date: string
  totalSales: number
  totalOrders: number
  averageOrder: number
  topSellingItems: { name: string; quantity: number; revenue: number }[]
}

// Sample data - Last 7 days
const SAMPLE_SALES: SalesData[] = [
  {
    date: new Date(Date.now() - 0 * 24 * 60 * 60000).toLocaleDateString(),
    totalSales: 28450,
    totalOrders: 87,
    averageOrder: 327,
    topSellingItems: [
      { name: 'Bacon Pepperoni', quantity: 24, revenue: 7176 },
      { name: 'Beef Wagon', quantity: 18, revenue: 5922 },
      { name: 'Iced Coffee', quantity: 42, revenue: 3738 },
    ],
  },
  {
    date: new Date(Date.now() - 1 * 24 * 60 * 60000).toLocaleDateString(),
    totalSales: 32100,
    totalOrders: 95,
    averageOrder: 338,
    topSellingItems: [
      { name: 'Beef Wagon', quantity: 22, revenue: 7238 },
      { name: 'Nachos', quantity: 31, revenue: 4929 },
      { name: 'Spanish Latte', quantity: 38, revenue: 4522 },
    ],
  },
  {
    date: new Date(Date.now() - 2 * 24 * 60 * 60000).toLocaleDateString(),
    totalSales: 25600,
    totalOrders: 78,
    averageOrder: 328,
    topSellingItems: [
      { name: 'Creamy Spinach', quantity: 28, revenue: 7812 },
      { name: 'Beef Burger', quantity: 35, revenue: 5215 },
      { name: 'Caramel Macchiato', quantity: 29, revenue: 3451 },
    ],
  },
  {
    date: new Date(Date.now() - 3 * 24 * 60 * 60000).toLocaleDateString(),
    totalSales: 29800,
    totalOrders: 92,
    averageOrder: 324,
    topSellingItems: [
      { name: 'Bacon Pepperoni', quantity: 26, revenue: 7774 },
      { name: 'Beef Tapa', quantity: 24, revenue: 4536 },
      { name: 'Hot Chocolate', quantity: 40, revenue: 3960 },
    ],
  },
  {
    date: new Date(Date.now() - 4 * 24 * 60 * 60000).toLocaleDateString(),
    totalSales: 27300,
    totalOrders: 84,
    averageOrder: 325,
    topSellingItems: [
      { name: 'Ham & Cheese Hawaiian', quantity: 29, revenue: 8381 },
      { name: 'Lumpia Shanghai', quantity: 45, revenue: 4005 },
      { name: 'Iced Matcha', quantity: 32, revenue: 3808 },
    ],
  },
  {
    date: new Date(Date.now() - 5 * 24 * 60 * 60000).toLocaleDateString(),
    totalSales: 31500,
    totalOrders: 98,
    averageOrder: 321,
    topSellingItems: [
      { name: 'Beef Wagon', quantity: 25, revenue: 8225 },
      { name: 'Meaty Chili Fries', quantity: 38, revenue: 4902 },
      { name: 'Blueberry Smoothie', quantity: 27, revenue: 4023 },
    ],
  },
  {
    date: new Date(Date.now() - 6 * 24 * 60 * 60000).toLocaleDateString(),
    totalSales: 24900,
    totalOrders: 76,
    averageOrder: 328,
    topSellingItems: [
      { name: 'Bacon Pepperoni', quantity: 23, revenue: 6877 },
      { name: 'Burger w/ Fries', quantity: 32, revenue: 5728 },
      { name: 'Spanish Latte', quantity: 36, revenue: 4284 },
    ],
  },
]

export const SalesPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week')
  const [salesData] = useState<SalesData[]>(SAMPLE_SALES)

  // Calculate totals based on selected period
  const getPeriodData = () => {
    let data = salesData
    if (selectedPeriod === 'today') {
      data = salesData.slice(0, 1)
    } else if (selectedPeriod === 'week') {
      data = salesData.slice(0, 7)
    }
    // For 'month', we'd need more data, but using all available for demo
    
    const totalRevenue = data.reduce((sum, day) => sum + day.totalSales, 0)
    const totalOrders = data.reduce((sum, day) => sum + day.totalOrders, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    return { totalRevenue, totalOrders, avgOrderValue, data }
  }

  const { totalRevenue, totalOrders, avgOrderValue, data } = getPeriodData()

  // Calculate growth (comparing to previous period)
  const previousPeriodRevenue = selectedPeriod === 'today' ? 32100 : 185000
  const revenueGrowth = ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100

  // Get all top-selling items across period
  const allTopItems = data.flatMap(day => day.topSellingItems)
  const itemSales = new Map<string, { quantity: number; revenue: number }>()
  
  allTopItems.forEach(item => {
    const existing = itemSales.get(item.name)
    if (existing) {
      existing.quantity += item.quantity
      existing.revenue += item.revenue
    } else {
      itemSales.set(item.name, { quantity: item.quantity, revenue: item.revenue })
    }
  })

  const topSellingItems = Array.from(itemSales.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">Sales Analytics</h1>
            <p className="text-sm lg:text-base text-gray-600">Track your revenue and performance</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <Button
                variant={selectedPeriod === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('today')}
              >
                Today
              </Button>
              <Button
                variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('week')}
              >
                Week
              </Button>
              <Button
                variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('month')}
              >
                Month
              </Button>
            </div>
            
            {/* Export Button */}
            <Button
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-lg bg-yellow-200">
                <DollarSign className="h-6 w-6 text-yellow-900" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(revenueGrowth).toFixed(1)}%
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">₱{totalRevenue.toLocaleString()}</p>
          </div>

          {/* Total Orders */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-lg bg-blue-200">
                <ShoppingCart className="h-6 w-6 text-blue-900" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
          </div>

          {/* Average Order Value */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-lg bg-green-200">
                <TrendingUp className="h-6 w-6 text-green-900" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Avg Order Value</p>
            <p className="text-3xl font-bold text-gray-900">₱{avgOrderValue.toFixed(0)}</p>
          </div>

          {/* Daily Average */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-lg bg-purple-200">
                <Calendar className="h-6 w-6 text-purple-900" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Daily Average</p>
            <p className="text-3xl font-bold text-gray-900">₱{(totalRevenue / data.length).toFixed(0)}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Sales Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Daily Sales</h3>
            <div className="space-y-3">
              {data.map((day, index) => {
                const maxSales = Math.max(...data.map(d => d.totalSales))
                const percentage = (day.totalSales / maxSales) * 100
                
                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-600">{day.date}</span>
                      <span className="text-sm font-bold" style={{ color: '#F9C900' }}>
                        ₱{day.totalSales.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: '#F9C900'
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">{day.totalOrders} orders</span>
                      <span className="text-xs text-gray-500">₱{day.averageOrder} avg</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Top Selling Items</h3>
            <div className="space-y-4">
              {topSellingItems.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.quantity} sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₱{item.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Sales Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold">Sales History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg Order</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Top Item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((day, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{day.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-sm">
                        {day.totalOrders} orders
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-lg" style={{ color: '#F9C900' }}>
                        ₱{day.totalSales.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-700">
                        ₱{day.averageOrder}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{day.topSellingItems[0].name}</p>
                        <p className="text-sm text-gray-500">{day.topSellingItems[0].quantity} sold</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
