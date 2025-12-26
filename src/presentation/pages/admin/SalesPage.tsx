import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, Download, Printer, Eye, Receipt, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { salesApi, type SalesReport } from '../../../infrastructure/api/sales.api'
import { ordersApi, type OrderResponse } from '../../../infrastructure/api/orders.api'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

const COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']

// Helper to format order number (strip date prefix)
const formatOrderNumber = (orderNumber: string) => {
  // If format is ORD-YYYYMMDD-XXXXX, show only ORD-XXXXX
  const match = orderNumber.match(/^ORD-\d{8}-(\d+)$/)
  if (match) {
    return `ORD-${match[1]}`
  }
  return orderNumber
}

export const SalesPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week')
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<OrderResponse[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<OrderResponse | null>(null)
  const [menuItems, setMenuItems] = useState<Map<string, string>>(new Map())
  const printRef = useRef<HTMLDivElement>(null)
  
  // Filter states for transactions
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOrderType, setFilterOrderType] = useState<string>('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10)
  const itemsPerPageOptions = [5, 10, 25, 50, 'all'] as const

  useEffect(() => {
    loadMenuItems()
  }, [])

  useEffect(() => {
    loadSalesData()
    loadTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod])

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

  const loadSalesData = async () => {
    try {
      setLoading(true)
      setError(null)
      const report = await salesApi.getReport({ period: selectedPeriod })
      setSalesReport(report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales data')
      console.error('Error loading sales data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      // Get all completed and paid orders
      const allOrders = await ordersApi.getAll()
      
      // Filter by period
      const now = new Date()
      let startDate: Date
      
      if (selectedPeriod === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (selectedPeriod === 'week') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
      } else {
        // month
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      }
      
      const completedPaidOrders = allOrders
        .filter(order => {
          const orderDate = new Date(order.completedAt || order.createdAt)
          return order.status === 'COMPLETED' && 
                 order.paymentStatus === 'PAID' && 
                 orderDate >= startDate
        })
        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
      
      setTransactions(completedPaidOrders)
    } catch (err) {
      console.error('Error loading transactions:', err)
    }
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '', 'height=800,width=1200')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Report - ${selectedPeriod.toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #000; margin-bottom: 10px; }
            h2 { color: #333; margin-top: 20px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; font-weight: bold; }
            .metric-card { display: inline-block; width: 23%; margin: 1%; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .metric-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
            .metric-label { font-size: 12px; color: #666; }
            .print-date { text-align: right; color: #666; font-size: 12px; margin-bottom: 20px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
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

  const handleExport = () => {
    if (!salesReport) return

    const csvData = [
      ['Sales Report', selectedPeriod.toUpperCase()],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['METRICS'],
      ['Total Revenue', `₱${salesReport.metrics.totalRevenue.toLocaleString()}`],
      ['Total Orders', salesReport.metrics.totalOrders.toString()],
      ['Average Order Value', `₱${salesReport.metrics.averageOrderValue.toFixed(2)}`],
      ['Daily Average', `₱${salesReport.metrics.dailyAverage.toFixed(2)}`],
      ['Revenue Growth', `${salesReport.metrics.revenueGrowth.toFixed(2)}%`],
      [''],
      ['TOP SELLING ITEMS'],
      ['Item', 'Quantity', 'Revenue'],
      ...salesReport.topSellingItems.map(item => [
        item.itemName,
        item.quantity.toString(),
        `₱${item.revenue.toLocaleString()}`
      ]),
      [''],
      ['DAILY SALES'],
      ['Date', 'Sales', 'Orders', 'Average'],
      ...salesReport.dailySales.map(day => [
        day.date,
        `₱${day.totalSales.toLocaleString()}`,
        day.totalOrders.toString(),
        `₱${day.averageOrder.toFixed(2)}`
      ])
    ]

    const csv = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Print receipt for a single transaction
  const printTransactionReceipt = (transaction: OrderResponse) => {
    const vat = transaction.totalAmount * 0.12
    const subtotal = transaction.totalAmount - vat
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print receipt')
      return
    }

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${formatOrderNumber(transaction.orderNumber)}</title>
        <style>
          @media print { body { margin: 0; } }
          body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; padding: 10mm; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .info { margin: 10px 0; font-size: 12px; }
          .items { margin: 15px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
          .item-name { flex: 1; }
          .item-qty { width: 40px; text-align: center; }
          .item-price { width: 60px; text-align: right; }
          .totals { border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
          .grand-total { font-size: 16px; font-weight: bold; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🐝 BEEHIVE</div>
          <div style="font-size: 10px;">Restaurant & Cafe</div>
        </div>
        
        <div class="info">
          <div><strong>Order:</strong> ${formatOrderNumber(transaction.orderNumber)}</div>
          <div><strong>Date:</strong> ${new Date(transaction.completedAt || transaction.createdAt).toLocaleString()}</div>
          <div><strong>Customer:</strong> ${transaction.customerName || 'Walk-in'}</div>
          ${transaction.tableNumber ? `<div><strong>Table:</strong> ${transaction.tableNumber}</div>` : ''}
          <div><strong>Type:</strong> ${transaction.orderType === 'DINE_IN' ? 'Dine In' : transaction.orderType === 'TAKEOUT' ? 'Takeout' : 'Delivery'}</div>
          <div><strong>Payment:</strong> ${transaction.paymentMethod || 'N/A'}</div>
        </div>
        
        <div class="items">
          <div style="display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; font-size: 11px;">
            <span style="flex: 1;">Item</span>
            <span style="width: 40px; text-align: center;">Qty</span>
            <span style="width: 60px; text-align: right;">Amount</span>
          </div>
          ${transaction.order_items.map(item => `
            <div class="item">
              <span class="item-name">${menuItems.get(item.menuItemId) || item.menuItemId}</span>
              <span class="item-qty">${item.quantity}</span>
              <span class="item-price">₱${item.subtotal.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₱${subtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>VAT (12%):</span>
            <span>₱${vat.toFixed(2)}</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>₱${transaction.totalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for dining with us!</p>
          <p>Please come again 🐝</p>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(receiptHTML)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  // Filter transactions based on search and filters
  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || 
      transaction.orderNumber.toLowerCase().includes(searchLower) ||
      (transaction.customerName?.toLowerCase() || '').includes(searchLower)
    
    // Order type filter
    const matchesOrderType = filterOrderType === 'all' || transaction.orderType === filterOrderType
    
    // Payment method filter
    const matchesPayment = filterPaymentMethod === 'all' || transaction.paymentMethod === filterPaymentMethod
    
    return matchesSearch && matchesOrderType && matchesPayment
  })

  // Pagination logic
  const totalItems = filteredTransactions.length
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / (itemsPerPage as number))
  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * (itemsPerPage as number)
  const endIndex = itemsPerPage === 'all' ? totalItems : startIndex + (itemsPerPage as number)
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleItemsPerPageChange = (value: number | 'all') => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterOrderType, filterPaymentMethod, selectedPeriod])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sales data...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !salesReport) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'No data available'}</p>
            <Button onClick={loadSalesData}>Retry</Button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const { metrics, dailySales, topSellingItems, categorySales, hourlySales } = salesReport

  // Prepare data for charts
  const dailySalesChartData = dailySales.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sales: day.totalSales,
    orders: day.totalOrders
  }))

  const hourlySalesChartData = hourlySales
    .filter(h => h.orders > 0)
    .map(hour => ({
      hour: `${hour.hour}:00`,
      orders: hour.orders,
      revenue: hour.revenue
    }))

  const categorySalesChartData = categorySales.map(cat => ({
    name: cat.category,
    value: cat.revenue,
    percentage: cat.percentage
  }))

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">Sales Analytics</h1>
            <p className="text-sm lg:text-base text-gray-600">Real-time revenue and performance tracking</p>
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
            
            {/* Export & Print Buttons */}
            <Button
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </div>
        </div>

        {/* Print-friendly content */}
        <div ref={printRef}>
          <div className="print-date" style={{ display: 'none' }}>
            Printed on: {new Date().toLocaleString()}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-lg bg-yellow-200">
                  <DollarSign className="h-6 w-6 text-yellow-900" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.revenueGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {Math.abs(metrics.revenueGrowth).toFixed(1)}%
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">₱{metrics.totalRevenue.toLocaleString()}</p>
            </div>

            {/* Total Orders */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-lg bg-blue-200">
                  <ShoppingCart className="h-6 w-6 text-blue-900" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalOrders}</p>
            </div>

            {/* Average Order Value */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-lg bg-green-200">
                  <TrendingUp className="h-6 w-6 text-green-900" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-900">₱{metrics.averageOrderValue.toFixed(0)}</p>
            </div>

            {/* Daily Average */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-lg bg-purple-200">
                  <Calendar className="h-6 w-6 text-purple-900" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Daily Average</p>
              <p className="text-3xl font-bold text-gray-900">₱{metrics.dailyAverage.toFixed(0)}</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Daily Sales Area Chart - Improved */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold mb-2">Daily Sales Trend</h3>
              <p className="text-sm text-gray-500 mb-4">Revenue and orders over time</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailySalesChartData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" style={{ fontSize: '11px' }} tick={{ fill: '#6B7280' }} />
                  <YAxis style={{ fontSize: '11px' }} tick={{ fill: '#6B7280' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'Sales (₱)' ? `₱${value.toLocaleString()}` : value,
                      name
                    ]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="sales" stroke="#F59E0B" strokeWidth={2} fill="url(#salesGradient)" name="Sales (₱)" />
                  <Line type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} name="Orders" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution Pie Chart - Improved */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold mb-2">Sales by Category</h3>
              <p className="text-sm text-gray-500 mb-4">Revenue distribution by category</p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categorySalesChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    label={(entry) => entry.name}
                    labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                  >
                    {categorySalesChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Hourly Sales Bar Chart - Improved */}
            {hourlySalesChartData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold mb-2">Peak Hours Analysis</h3>
                <p className="text-sm text-gray-500 mb-4">Orders and revenue by hour</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hourlySalesChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" style={{ fontSize: '11px' }} tick={{ fill: '#6B7280' }} />
                    <YAxis style={{ fontSize: '11px' }} tick={{ fill: '#6B7280' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'Revenue (₱)' ? `₱${value.toLocaleString()}` : value,
                        name
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="orders" fill="#10B981" name="Orders" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue" fill="#F59E0B" name="Revenue (₱)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Selling Items - Improved */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold mb-2">Top Selling Items</h3>
              <p className="text-sm text-gray-500 mb-4">Best performers by revenue</p>
              <div className="space-y-4">
                {topSellingItems.slice(0, 5).map((item, index) => {
                  const maxRevenue = Math.max(...topSellingItems.map(i => i.revenue))
                  const percentage = (item.revenue / maxRevenue) * 100
                  const rankColors = ['bg-amber-500', 'bg-gray-400', 'bg-amber-700', 'bg-blue-500', 'bg-blue-400']
                  
                  return (
                    <div key={item.itemId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 ${rankColors[index] || 'bg-gray-300'} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                            {index + 1}
                          </div>
                          <span className="font-medium text-sm">{item.itemName}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-amber-600">₱{item.revenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{item.quantity} sold</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-amber-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold">Daily Breakdown</h3>
              <p className="text-sm text-gray-500 mt-1">Revenue summary by date</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Sales</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dailySales.map((day, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₱{day.totalSales.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {day.totalOrders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₱{day.averageOrder.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Transactions Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-amber-500" />
                    Sales Transactions
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Completed and paid orders</p>
                </div>
                <Badge className="bg-green-100 text-green-700 border border-green-200 text-sm px-3 py-1 self-start lg:self-auto">
                  {filteredTransactions.length} of {transactions.length} transactions
                </Badge>
              </div>
              
              {/* Filter Controls */}
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by order # or customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={filterOrderType}
                  onChange={(e) => setFilterOrderType(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="all">All Types</option>
                  <option value="DINE_IN">Dine In</option>
                  <option value="TAKEOUT">Takeout</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="all">All Payments</option>
                  <option value="CASH">Cash</option>
                  <option value="GCASH">GCash</option>
                  <option value="CARD">Card</option>
                </select>
                {(searchQuery || filterOrderType !== 'all' || filterPaymentMethod !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      setFilterOrderType('all')
                      setFilterPaymentMethod('all')
                    }}
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Subtotal</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">VAT (12%)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                        {transactions.length === 0 ? 'No completed transactions yet' : 'No transactions match your filters'}
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((transaction) => {
                      const vat = transaction.totalAmount * 0.12
                      const subtotal = transaction.totalAmount - vat
                      return (
                        <tr key={transaction.id} className="hover:bg-amber-50/50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatOrderNumber(transaction.orderNumber)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(transaction.completedAt || transaction.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            <br />
                            <span className="text-xs text-gray-500">
                              {new Date(transaction.completedAt || transaction.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.customerName || 'Walk-in'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge variant="outline" className="text-xs">
                              {transaction.orderType === 'DINE_IN' ? 'Dine In' : transaction.orderType === 'TAKEOUT' ? 'Takeout' : 'Delivery'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.paymentMethod || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                            ₱{subtotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            ₱{vat.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-amber-600 text-right">
                            ₱{transaction.totalAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTransaction(transaction)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => printTransactionReceipt(transaction)}
                                className="flex items-center gap-1"
                              >
                                <Printer className="h-3 w-3" />
                                Print
                              </Button>
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
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (() => {
        const modalVat = selectedTransaction.totalAmount * 0.12
        const modalSubtotal = selectedTransaction.totalAmount - modalVat
        return (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setSelectedTransaction(null)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-white">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Receipt className="h-6 w-6 text-amber-500" />
                      Transaction Details
                    </h2>
                    <button
                      onClick={() => setSelectedTransaction(null)}
                      className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-green-100 text-green-800 border border-green-200">
                      Completed & Paid
                    </Badge>
                    <Badge variant="outline">
                      {selectedTransaction.orderType === 'DINE_IN' ? 'Dine In' : selectedTransaction.orderType === 'TAKEOUT' ? 'Takeout' : 'Delivery'}
                    </Badge>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Order Number</p>
                      <p className="font-semibold text-lg">{formatOrderNumber(selectedTransaction.orderNumber)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Customer</p>
                      <p className="font-semibold">{selectedTransaction.customerName || 'Walk-in'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Completed At</p>
                      <p className="font-semibold text-sm">
                        {new Date(selectedTransaction.completedAt || selectedTransaction.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Payment Method</p>
                      <p className="font-semibold">{selectedTransaction.paymentMethod || 'N/A'}</p>
                    </div>
                    {selectedTransaction.tableNumber && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Table Number</p>
                        <p className="font-semibold">{selectedTransaction.tableNumber}</p>
                      </div>
                    )}
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold mb-3 text-gray-700">Order Items</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {selectedTransaction.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                          <div>
                            <p className="font-medium text-sm">{item.menuItemId}</p>
                            <p className="text-xs text-gray-500">₱{item.price.toFixed(2)} × {item.quantity}</p>
                          </div>
                          <p className="font-semibold">₱{item.subtotal.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-amber-50 rounded-xl p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">₱{modalSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">VAT (12%):</span>
                        <span className="font-medium">₱{modalVat.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold pt-3 border-t border-amber-200">
                        <span>Total Amount:</span>
                        <span className="text-amber-600">₱{selectedTransaction.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </AdminLayout>
  )
}
