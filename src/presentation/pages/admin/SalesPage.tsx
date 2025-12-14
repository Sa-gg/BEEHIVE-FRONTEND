import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, Download, Printer } from 'lucide-react'
import { salesApi, type SalesReport } from '../../../infrastructure/api/sales.api'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#F9C900', '#FF6B6B', '#4ECDC4', '#95E1D3', '#FFA07A', '#98D8C8']

export const SalesPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week')
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSalesData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod])

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sales Line Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4">Daily Sales Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySalesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#F9C900" strokeWidth={2} name="Sales (₱)" />
                  <Line type="monotone" dataKey="orders" stroke="#4ECDC4" strokeWidth={2} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4">Sales by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categorySalesChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name} (${((entry.percent || 0) * 100).toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categorySalesChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₱${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Hourly Sales Bar Chart */}
            {hourlySalesChartData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold mb-4">Sales by Hour</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlySalesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" style={{ fontSize: '12px' }} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#4ECDC4" name="Orders" />
                    <Bar dataKey="revenue" fill="#F9C900" name="Revenue (₱)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Selling Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4">Top Selling Items</h3>
              <div className="space-y-3">
                {topSellingItems.map((item, index) => {
                  const maxRevenue = Math.max(...topSellingItems.map(i => i.revenue))
                  const percentage = (item.revenue / maxRevenue) * 100
                  
                  return (
                    <div key={item.itemId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <span className="font-medium text-sm">{item.itemName}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">₱{item.revenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{item.quantity} sold</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Detailed Daily Breakdown Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold">Daily Breakdown</h3>
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
        </div>
      </div>
    </AdminLayout>
  )
}
