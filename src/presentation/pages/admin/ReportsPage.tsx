import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react'
import { salesApi } from '../../../infrastructure/api/sales.api'
import { inventoryApi } from '../../../infrastructure/api/inventory.api'
import { ordersApi } from '../../../infrastructure/api/orders.api'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import { formatSmartStock } from '../../../shared/utils/stockFormat'
import { DateFilter, type DateFilterValue, getDateRangeFromPreset } from '../../components/common/DateFilter'
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

type ReportTab = 'sales' | 'inventory'

interface SalesReportData {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  totalItems: number
  dailySales: Array<{ date: string; revenue: number; orders: number }>
  categoryBreakdown: Array<{ category: string; revenue: number; count: number }>
  paymentMethods: Array<{ method: string; amount: number; count: number }>
  orderTypes: Array<{ type: string; revenue: number; count: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  hourlyDistribution: Array<{ hour: string; orders: number; revenue: number }>
}

interface InventoryReportData {
  totalItems: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
  categoryDistribution: Array<{ category: string; count: number; value: number }>
  stockStatus: Array<{ status: string; count: number }>
  topMovingItems: Array<{ name: string; movement: number; stock: number }>
  lowStockItems: Array<{ name: string; currentStock: number; minStock: number; unit: string }>
  inventoryTrend: Array<{ date: string; value: number; items: number }>
}

export const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales')
  const [customDateFilter, setCustomDateFilter] = useState<DateFilterValue>({ preset: 'month', startDate: null, endDate: null })
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<SalesReportData | null>(null)
  const [inventoryData, setInventoryData] = useState<InventoryReportData | null>(null)
  const [menuItems, setMenuItems] = useState<Map<string, string>>(new Map())
  const printRef = useRef<HTMLDivElement>(null)

  // Load menu items on mount
  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        const response = await menuItemsApi.getAll()
        const items = response.data || response
        const itemsMap = new Map(items.map((item: { id: string; name: string }) => [item.id, item.name]))
        setMenuItems(itemsMap)
      } catch (error) {
        console.error('Failed to load menu items:', error)
      }
    }
    loadMenuItems()
  }, [])

  useEffect(() => {
    loadReportData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDateFilter, activeTab])

  const loadReportData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'sales') {
        await loadSalesReport()
      } else {
        await loadInventoryReport()
      }
    } catch (error) {
      console.error('Failed to load report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSalesReport = async () => {
    try {
      // Get sales data from API
      const [orders, salesReport] = await Promise.all([
        ordersApi.getAll(),
        salesApi.getReport({ period: customDateFilter.preset === 'today' ? 'today' : customDateFilter.preset === 'week' ? 'week' : 'month' })
      ])

      // Get date range from custom filter
      let startDate: Date | null = null
      let endDate: Date | null = null
      
      if (customDateFilter.preset === 'custom') {
        startDate = customDateFilter.startDate
        endDate = customDateFilter.endDate
      } else {
        const range = getDateRangeFromPreset(customDateFilter.preset)
        startDate = range.startDate
        endDate = range.endDate
      }

      const completedOrders = orders.filter(order => {
        const orderDate = new Date(order.completedAt || order.createdAt)
        const matchesDate = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate)
        return order.status === 'COMPLETED' && 
               order.paymentStatus === 'PAID' && 
               matchesDate
      })

      // Calculate totals
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      const totalOrders = completedOrders.length
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const totalItems = completedOrders.reduce((sum, order) => 
        sum + (order.order_items || []).reduce((itemSum: number, item: { quantity: number }) => itemSum + item.quantity, 0), 0)

      // Daily sales breakdown
      const dailySalesMap = new Map<string, { revenue: number; orders: number }>()
      completedOrders.forEach(order => {
        const date = new Date(order.completedAt || order.createdAt).toISOString().split('T')[0]
        const existing = dailySalesMap.get(date) || { revenue: 0, orders: 0 }
        dailySalesMap.set(date, {
          revenue: existing.revenue + order.totalAmount,
          orders: existing.orders + 1
        })
      })
      const dailySales = Array.from(dailySalesMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Payment methods breakdown
      const paymentMap = new Map<string, { amount: number; count: number }>()
      completedOrders.forEach(order => {
        const method = order.paymentMethod || 'Unknown'
        const existing = paymentMap.get(method) || { amount: 0, count: 0 }
        paymentMap.set(method, {
          amount: existing.amount + order.totalAmount,
          count: existing.count + 1
        })
      })
      const paymentMethods = Array.from(paymentMap.entries())
        .map(([method, data]) => ({ method, ...data }))
        .sort((a, b) => b.amount - a.amount)

      // Order types breakdown
      const orderTypeMap = new Map<string, { revenue: number; count: number }>()
      completedOrders.forEach(order => {
        const type = order.orderType || 'Unknown'
        const existing = orderTypeMap.get(type) || { revenue: 0, count: 0 }
        orderTypeMap.set(type, {
          revenue: existing.revenue + order.totalAmount,
          count: existing.count + 1
        })
      })
      const orderTypes = Array.from(orderTypeMap.entries())
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.revenue - a.revenue)

      // Top products - using menu item names
      const productMap = new Map<string, { quantity: number; revenue: number }>()
      completedOrders.forEach(order => {
        (order.order_items || []).forEach((item: { menuItemId: string; quantity: number; subtotal: number }) => {
          // Use menu item name lookup, fallback to ID if not found
          const itemName = menuItems.get(item.menuItemId) || item.menuItemId
          const existing = productMap.get(itemName) || { quantity: 0, revenue: 0 }
          productMap.set(itemName, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.subtotal
          })
        })
      })
      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Hourly distribution
      const hourlyMap = new Map<string, { orders: number; revenue: number }>()
      completedOrders.forEach(order => {
        const hour = new Date(order.completedAt || order.createdAt).getHours()
        const hourStr = `${hour.toString().padStart(2, '0')}:00`
        const existing = hourlyMap.get(hourStr) || { orders: 0, revenue: 0 }
        hourlyMap.set(hourStr, {
          orders: existing.orders + 1,
          revenue: existing.revenue + order.totalAmount
        })
      })
      const hourlyDistribution = Array.from(hourlyMap.entries())
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => a.hour.localeCompare(b.hour))

      // Category breakdown from sales report if available
      const categoryBreakdown = salesReport?.categorySales?.map(cat => ({
        category: cat.category,
        revenue: cat.revenue,
        count: cat.orders
      })) || []

      setSalesData({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalItems,
        dailySales,
        categoryBreakdown,
        paymentMethods,
        orderTypes,
        topProducts,
        hourlyDistribution
      })
    } catch (error) {
      console.error('Failed to load sales report:', error)
    }
  }

  const loadInventoryReport = async () => {
    try {
      const inventoryItems = await inventoryApi.getAll()

      const totalItems = inventoryItems.length
      const totalValue = inventoryItems.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0)
      const lowStockCount = inventoryItems.filter(item => item.status === 'LOW_STOCK').length
      const outOfStockCount = inventoryItems.filter(item => item.status === 'OUT_OF_STOCK').length

      // Category distribution
      const categoryMap = new Map<string, { count: number; value: number }>()
      inventoryItems.forEach(item => {
        const existing = categoryMap.get(item.category) || { count: 0, value: 0 }
        categoryMap.set(item.category, {
          count: existing.count + 1,
          value: existing.value + (item.currentStock * item.costPerUnit)
        })
      })
      const categoryDistribution = Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.value - a.value)

      // Stock status
      const stockStatus = [
        { status: 'In Stock', count: inventoryItems.filter(i => i.status === 'IN_STOCK').length },
        { status: 'Low Stock', count: lowStockCount },
        { status: 'Out of Stock', count: outOfStockCount }
      ]

      // Low stock items
      const lowStockItems = inventoryItems
        .filter(item => item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK')
        .map(item => ({
          name: item.name,
          currentStock: item.currentStock,
          minStock: item.minStock,
          unit: item.unit
        }))
        .slice(0, 10)

      // Simulate inventory trend
      const inventoryTrend: Array<{ date: string; value: number; items: number }> = []
      for (let i = 30; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        inventoryTrend.push({
          date: date.toISOString().split('T')[0],
          value: totalValue * (0.9 + Math.random() * 0.2), // Simulated variation
          items: totalItems
        })
      }

      // Top moving items (simulated)
      const topMovingItems = inventoryItems
        .slice(0, 5)
        .map(item => ({
          name: item.name,
          movement: Math.floor(Math.random() * 100) + 20,
          stock: item.currentStock
        }))

      setInventoryData({
        totalItems,
        totalValue,
        lowStockCount,
        outOfStockCount,
        categoryDistribution,
        stockStatus,
        topMovingItems,
        lowStockItems,
        inventoryTrend
      })
    } catch (error) {
      console.error('Failed to load inventory report:', error)
    }
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '', 'width=1200,height=800')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeTab === 'sales' ? 'Sales' : 'Inventory'} Report - BEEHIVE</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #fff; color: #333; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #F9C900; }
            .header h1 { font-size: 28px; color: #000; margin-bottom: 8px; }
            .header p { color: #666; font-size: 14px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat-card { background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 100%); border: 1px solid #F9C900; border-radius: 12px; padding: 20px; text-align: center; }
            .stat-card h3 { font-size: 28px; color: #000; margin-bottom: 4px; }
            .stat-card p { font-size: 12px; color: #666; text-transform: uppercase; }
            .section { margin-bottom: 30px; }
            .section h2 { font-size: 18px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #eee; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f8f8f8; font-weight: 600; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🐝 BEEHIVE - ${activeTab === 'sales' ? 'Sales' : 'Inventory'} Report</h1>
            <p>Generated on ${new Date().toLocaleString()} | Period: ${customDateFilter.preset.charAt(0).toUpperCase() + customDateFilter.preset.slice(1)}</p>
          </div>
          ${printContent.innerHTML}
          <div class="footer">
            <p>© ${new Date().getFullYear()} BEEHIVE POS System. All rights reserved.</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleExportCSV = () => {
    let csvContent = ''
    const timestamp = new Date().toISOString().split('T')[0]

    if (activeTab === 'sales' && salesData) {
      csvContent = 'BEEHIVE Sales Report\n'
      csvContent += `Generated: ${new Date().toLocaleString()}\n`
      csvContent += `Period: ${customDateFilter.preset}\n\n`
      csvContent += 'Summary\n'
      csvContent += `Total Revenue,₱${salesData.totalRevenue.toFixed(2)}\n`
      csvContent += `Total Orders,${salesData.totalOrders}\n`
      csvContent += `Average Order Value,₱${salesData.averageOrderValue.toFixed(2)}\n`
      csvContent += `Total Items Sold,${salesData.totalItems}\n\n`
      csvContent += 'Daily Sales\n'
      csvContent += 'Date,Revenue,Orders\n'
      salesData.dailySales.forEach(day => {
        csvContent += `${day.date},${day.revenue.toFixed(2)},${day.orders}\n`
      })
      csvContent += '\nTop Products\n'
      csvContent += 'Product,Quantity,Revenue\n'
      salesData.topProducts.forEach(product => {
        csvContent += `${product.name},${product.quantity},${product.revenue.toFixed(2)}\n`
      })
    } else if (activeTab === 'inventory' && inventoryData) {
      csvContent = 'BEEHIVE Inventory Report\n'
      csvContent += `Generated: ${new Date().toLocaleString()}\n\n`
      csvContent += 'Summary\n'
      csvContent += `Total Items,${inventoryData.totalItems}\n`
      csvContent += `Total Value,₱${inventoryData.totalValue.toFixed(2)}\n`
      csvContent += `Low Stock Items,${inventoryData.lowStockCount}\n`
      csvContent += `Out of Stock Items,${inventoryData.outOfStockCount}\n\n`
      csvContent += 'Low Stock Items\n'
      csvContent += 'Item,Current Stock,Min Stock,Unit\n'
      inventoryData.lowStockItems.forEach(item => {
        csvContent += `${item.name},${item.currentStock},${item.minStock},${item.unit}\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `beehive-${activeTab}-report-${timestamp}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const formatCurrency = (value: number) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500 mt-1">Comprehensive business analytics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={loadReportData}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={handlePrint}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Tabs & Date Range */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-xl p-4 shadow-sm">
          {/* Tab Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'sales'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              Sales Report
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'inventory'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Package className="h-5 w-5" />
              Inventory Report
            </button>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <DateFilter
              value={customDateFilter}
              onChange={setCustomDateFilter}
              showAllOption={false}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading report data...</p>
            </div>
          </div>
        ) : (
          <div ref={printRef}>
            {activeTab === 'sales' && salesData && (
              <SalesReportContent data={salesData} formatCurrency={formatCurrency} />
            )}
            {activeTab === 'inventory' && inventoryData && (
              <InventoryReportContent data={inventoryData} formatCurrency={formatCurrency} />
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// Sales Report Content Component
const SalesReportContent = ({ data, formatCurrency }: { data: SalesReportData; formatCurrency: (value: number) => string }) => (
  <div className="space-y-6">
    {/* Summary Stats */}
    <div className="stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="stat-card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <DollarSign className="h-6 w-6 text-amber-600" />
          </div>
          <ArrowUpRight className="h-5 w-5 text-green-500" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</h3>
        <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
      </div>

      <div className="stat-card bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-green-100 rounded-xl">
            <BarChart3 className="h-6 w-6 text-green-600" />
          </div>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900">{data.totalOrders}</h3>
        <p className="text-sm text-gray-500 mt-1">Total Orders</p>
      </div>

      <div className="stat-card bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <LineChartIcon className="h-6 w-6 text-blue-600" />
          </div>
          <TrendingUp className="h-5 w-5 text-blue-500" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(data.averageOrderValue)}</h3>
        <p className="text-sm text-gray-500 mt-1">Avg Order Value</p>
      </div>

      <div className="stat-card bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Package className="h-6 w-6 text-purple-600" />
          </div>
          <ArrowUpRight className="h-5 w-5 text-purple-500" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900">{data.totalItems.toLocaleString()}</h3>
        <p className="text-sm text-gray-500 mt-1">Items Sold</p>
      </div>
    </div>

    {/* Charts Row 1 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-500" />
          Revenue Trend
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.dailySales}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={val => val.slice(5)} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={val => `₱${(val/1000).toFixed(0)}k`} />
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={3} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-amber-500" />
          Payment Methods
        </h2>
        <div className="flex items-center">
          <ResponsiveContainer width="60%" height={250}>
            <PieChart>
              <Pie
                data={data.paymentMethods}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="amount"
                nameKey="method"
              >
                {data.paymentMethods.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {data.paymentMethods.map((method, index) => (
              <div key={method.method} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm">{method.method}</span>
                </div>
                <span className="text-sm font-medium">{method.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Charts Row 2 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Order Types */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          Order Types
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.orderTypes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="type" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number, name: string) => [name === 'revenue' ? formatCurrency(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="revenue" fill="#F59E0B" radius={[8, 8, 0, 0]} />
            <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly Distribution */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-amber-500" />
          Peak Hours
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data.hourlyDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number, name: string) => [name === 'revenue' ? formatCurrency(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Line type="monotone" dataKey="orders" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Top Products Table */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-amber-500" />
        Top Selling Products
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">#</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Product</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Quantity</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.topProducts.map((product, index) => (
              <tr key={product.name} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <Badge variant={index < 3 ? 'default' : 'outline'} className={index < 3 ? 'bg-amber-500' : ''}>
                    {index + 1}
                  </Badge>
                </td>
                <td className="py-3 px-4 font-medium">{product.name}</td>
                <td className="py-3 px-4 text-right">{product.quantity}</td>
                <td className="py-3 px-4 text-right font-semibold text-amber-600">{formatCurrency(product.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)

// Inventory Report Content Component
const InventoryReportContent = ({ data, formatCurrency }: { data: InventoryReportData; formatCurrency: (value: number) => string }) => (
  <div className="space-y-6">
    {/* Summary Stats */}
    <div className="stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="stat-card bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <CheckCircle className="h-5 w-5 text-blue-500" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900">{data.totalItems}</h3>
        <p className="text-sm text-gray-500 mt-1">Total Items</p>
      </div>

      <div className="stat-card bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-green-100 rounded-xl">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(data.totalValue)}</h3>
        <p className="text-sm text-gray-500 mt-1">Total Value</p>
      </div>

      <div className="stat-card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <ArrowDownRight className="h-5 w-5 text-amber-500" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900">{data.lowStockCount}</h3>
        <p className="text-sm text-gray-500 mt-1">Low Stock Items</p>
      </div>

      <div className="stat-card bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-red-100 rounded-xl">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <TrendingDown className="h-5 w-5 text-red-500" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900">{data.outOfStockCount}</h3>
        <p className="text-sm text-gray-500 mt-1">Out of Stock</p>
      </div>
    </div>

    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Stock Status */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-amber-500" />
          Stock Status Overview
        </h2>
        <div className="flex items-center">
          <ResponsiveContainer width="60%" height={250}>
            <PieChart>
              <Pie
                data={data.stockStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                nameKey="status"
              >
                <Cell fill="#10B981" />
                <Cell fill="#F59E0B" />
                <Cell fill="#EF4444" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-3">
            {data.stockStatus.map((status, index) => (
              <div key={status.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#10B981', '#F59E0B', '#EF4444'][index] }} />
                  <span className="text-sm">{status.status}</span>
                </div>
                <span className="text-sm font-semibold">{status.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          Value by Category
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.categoryDistribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={val => `₱${(val/1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={100} />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="value" fill="#F59E0B" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Inventory Trend */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <LineChartIcon className="h-5 w-5 text-amber-500" />
        Inventory Value Trend
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data.inventoryTrend}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={val => val.slice(5)} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={val => `₱${(val/1000).toFixed(0)}k`} />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fill="url(#colorValue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>

    {/* Low Stock Items Table */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Items Needing Restock
      </h2>
      {data.lowStockItems.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Item Name</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Current Stock</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Min Stock</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.lowStockItems.map((item) => (
                <tr key={item.name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{item.name}</td>
                  <td className="py-3 px-4 text-right">{formatSmartStock(item.currentStock, item.unit)}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{formatSmartStock(item.minStock, item.unit)}</td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant={item.currentStock === 0 ? 'destructive' : 'outline'} className={item.currentStock === 0 ? '' : 'border-amber-500 text-amber-600'}>
                      {item.currentStock === 0 ? 'Out of Stock' : 'Low Stock'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <p>All items are well stocked!</p>
        </div>
      )}
    </div>
  </div>
)
