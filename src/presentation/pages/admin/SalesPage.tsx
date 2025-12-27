import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, Eye, Receipt, Search, ChevronLeft, ChevronRight, Printer, Download } from 'lucide-react'
import { salesApi, type SalesReport } from '../../../infrastructure/api/sales.api'
import { ordersApi, type OrderResponse } from '../../../infrastructure/api/orders.api'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import { DateFilter, type DateFilterValue, useDefaultDateFilter } from '../../components/common/DateFilter'
import { printWithIframe } from '../../../shared/utils/printUtils'

const formatOrderNumber = (orderNumber: string) => {
  const match = orderNumber.match(/^ORD-\d{8}-(\d+)$/)
  return match ? `ORD-${match[1]}` : orderNumber
}

export const SalesPage = () => {
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<OrderResponse[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<OrderResponse | null>(null)
  const [menuItems, setMenuItems] = useState<Map<string, string>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOrderType, setFilterOrderType] = useState<string>('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all')
  const [transactionDateFilter, setTransactionDateFilter] = useState<DateFilterValue>(useDefaultDateFilter('all'))
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10)

  useEffect(() => { loadMenuItems() }, [])
  useEffect(() => { loadSalesData(); loadTransactions() }, [])

  const loadMenuItems = async () => {
    try {
      const response = await menuItemsApi.getAll()
      const items = response.data || response
      setMenuItems(new Map(items.map((item: { id: string; name: string }) => [item.id, item.name])))
    } catch (e) { console.error('Failed to load menu items:', e) }
  }

  const loadSalesData = async () => {
    try {
      setLoading(true)
      setError(null)
      setSalesReport(await salesApi.getReport({ period: 'month' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales data')
    } finally { setLoading(false) }
  }

  const loadTransactions = async () => {
    try {
      const allOrders = await ordersApi.getAll()
      setTransactions(allOrders
        .filter(o => o.status === 'COMPLETED' && o.paymentStatus === 'PAID')
        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()))
    } catch (e) { console.error('Error loading transactions:', e) }
  }

  const printReceipt = (t: OrderResponse) => {
    const vat = t.totalAmount * 0.12, subtotal = t.totalAmount - vat
    const receiptHTML = `<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:monospace;width:80mm;margin:0 auto;padding:10mm}.header{text-align:center;border-bottom:2px dashed #000;padding-bottom:10px}.totals{border-top:2px dashed #000;padding-top:10px;margin-top:10px}</style></head><body><div class="header"><b>🐝 BEEHIVE</b><br/><small>Restaurant & Cafe</small></div><div style="margin:10px 0;font-size:12px"><div><b>Order:</b> ${formatOrderNumber(t.orderNumber)}</div><div><b>Date:</b> ${new Date(t.completedAt || t.createdAt).toLocaleString()}</div><div><b>Customer:</b> ${t.customerName || 'Walk-in'}</div><div><b>Payment:</b> ${t.paymentMethod || 'N/A'}</div></div><div style="margin:15px 0">${t.order_items.map(i => `<div style="display:flex;justify-content:space-between;font-size:12px"><span>${menuItems.get(i.menuItemId) || i.menuItemId}</span><span>${i.quantity}x ₱${i.subtotal.toFixed(2)}</span></div>`).join('')}</div><div class="totals"><div style="display:flex;justify-content:space-between;font-size:12px"><span>Subtotal:</span><span>₱${subtotal.toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;font-size:12px"><span>VAT (12%):</span><span>₱${vat.toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold"><span>TOTAL:</span><span>₱${t.totalAmount.toFixed(2)}</span></div></div></body></html>`
    printWithIframe(receiptHTML)
  }

  const exportCSV = () => {
    const rows = [['Order #','Date','Time','Customer','Cashier','Type','Payment','Subtotal','VAT','Total']]
    filteredTransactions.forEach(t => {
      const vat = t.totalAmount * 0.12, d = new Date(t.completedAt || t.createdAt)
      rows.push([formatOrderNumber(t.orderNumber), d.toLocaleDateString(), d.toLocaleTimeString(), t.customerName || 'Walk-in', t.createdBy || 'System', t.orderType, t.paymentMethod || 'N/A', (t.totalAmount - vat).toFixed(2), vat.toFixed(2), t.totalAmount.toFixed(2)])
    })
    const blob = new Blob([rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handlePrintSalesReport = () => {
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.totalAmount, 0)
    const totalVAT = totalRevenue * 0.12
    const subtotal = totalRevenue - totalVAT
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; font-size: 11px; color: #333; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f59e0b; }
          .header h1 { font-size: 22px; color: #92400e; margin-bottom: 5px; }
          .header p { font-size: 12px; color: #666; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; text-align: center; }
          .summary-card .label { font-size: 10px; color: #666; margin-bottom: 4px; }
          .summary-card .value { font-size: 18px; font-weight: bold; color: #92400e; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #fef3c7; color: #92400e; padding: 10px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #f59e0b; font-size: 10px; }
          td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
          tr:hover { background: #fffbeb; }
          .total-row { font-weight: bold; background: #fef3c7; }
          .text-right { text-align: right; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; padding-top: 15px; border-top: 1px solid #e5e7eb; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐝 BEEHIVE - Sales Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
          <div class="summary-card">
            <div class="label">Total Transactions</div>
            <div class="value">${filteredTransactions.length}</div>
          </div>
          <div class="summary-card">
            <div class="label">Subtotal</div>
            <div class="value">₱${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
          <div class="summary-card">
            <div class="label">VAT (12%)</div>
            <div class="value">₱${totalVAT.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Revenue</div>
            <div class="value">₱${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th>Type</th>
              <th>Payment</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTransactions.map(t => {
              const d = new Date(t.completedAt || t.createdAt)
              return `
                <tr>
                  <td>${formatOrderNumber(t.orderNumber)}</td>
                  <td>${d.toLocaleDateString()} ${d.toLocaleTimeString()}</td>
                  <td>${t.customerName || 'Walk-in'}</td>
                  <td>${t.createdBy || 'System'}</td>
                  <td>${t.orderType}</td>
                  <td>${t.paymentMethod || 'N/A'}</td>
                  <td class="text-right">₱${t.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              `
            }).join('')}
            <tr class="total-row">
              <td colspan="6" class="text-right">TOTAL:</td>
              <td class="text-right">₱${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>BEEHIVE Restaurant & Cafe - Sales Report</p>
          <p>${filteredTransactions.length} transactions • Period: ${transactionDateFilter.preset === 'custom' ? 'Custom Range' : transactionDateFilter.preset.charAt(0).toUpperCase() + transactionDateFilter.preset.slice(1)}</p>
        </div>
      </body>
      </html>
    `
    printWithIframe(printContent)
  }

  const filteredTransactions = transactions
    .filter(t => {
      // Date filter logic
      if (transactionDateFilter.preset !== 'all') {
        const date = new Date(t.completedAt || t.createdAt)
        const now = new Date()
        if (transactionDateFilter.preset === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          if (date < today) return false
        } else if (transactionDateFilter.preset === 'week') {
          const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          if (date < weekAgo) return false
        } else if (transactionDateFilter.preset === 'month') {
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          if (date < monthAgo) return false
        } else if (transactionDateFilter.preset === 'custom' && transactionDateFilter.startDate && transactionDateFilter.endDate) {
          if (date < transactionDateFilter.startDate || date > transactionDateFilter.endDate) return false
        }
      }
      const s = searchQuery.toLowerCase()
      return (!searchQuery || t.orderNumber.toLowerCase().includes(s) || (t.customerName?.toLowerCase() || '').includes(s))
        && (filterOrderType === 'all' || t.orderType === filterOrderType)
        && (filterPaymentMethod === 'all' || t.paymentMethod === filterPaymentMethod)
    })

  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredTransactions.length / (itemsPerPage as number))
  const startIdx = itemsPerPage === 'all' ? 0 : (currentPage - 1) * (itemsPerPage as number)
  const paginatedTransactions = filteredTransactions.slice(startIdx, itemsPerPage === 'all' ? undefined : startIdx + (itemsPerPage as number))

  useEffect(() => { setCurrentPage(1) }, [searchQuery, filterOrderType, filterPaymentMethod, transactionDateFilter])

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-96"><div className="animate-spin h-12 w-12 border-4 border-yellow-400 border-t-transparent rounded-full"></div></div></AdminLayout>
  if (error || !salesReport) return <AdminLayout><div className="flex items-center justify-center h-96"><p className="text-red-600">{error}</p><Button onClick={loadSalesData}>Retry</Button></div></AdminLayout>

  const { metrics } = salesReport

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">Sales Overview</h1>
            <p className="text-sm text-gray-600">Revenue tracking and transactions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePrintSalesReport()}>
              <Printer className="h-4 w-4 mr-1" />Print Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-lg bg-yellow-200"><DollarSign className="h-6 w-6 text-yellow-900" /></div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.revenueGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(metrics.revenueGrowth).toFixed(1)}%
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold">₱{metrics.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
            <div className="p-3 rounded-lg bg-blue-200 w-fit mb-3"><ShoppingCart className="h-6 w-6 text-blue-900" /></div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
            <p className="text-3xl font-bold">{metrics.totalOrders}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
            <div className="p-3 rounded-lg bg-green-200 w-fit mb-3"><TrendingUp className="h-6 w-6 text-green-900" /></div>
            <p className="text-sm font-medium text-gray-600 mb-1">Avg Order Value</p>
            <p className="text-3xl font-bold">₱{metrics.averageOrderValue.toFixed(0)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6">
            <div className="p-3 rounded-lg bg-purple-200 w-fit mb-3"><Calendar className="h-6 w-6 text-purple-900" /></div>
            <p className="text-sm font-medium text-gray-600 mb-1">Daily Average</p>
            <p className="text-3xl font-bold">₱{metrics.dailyAverage.toFixed(0)}</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-amber-100 overflow-hidden">
          <div className="p-6 border-b border-amber-100 bg-gradient-to-r from-amber-50/50 to-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Receipt className="h-5 w-5 text-amber-600" />
                  </div>
                  Sales Transactions
                </h3>
                <p className="text-sm text-gray-500 mt-1">Completed and paid orders</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportCSV} className="border-amber-200 hover:bg-amber-50 hover:border-amber-300">
                  <Download className="h-4 w-4 mr-1" />Export CSV
                </Button>
                <Badge className="bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border border-amber-200 px-3 py-1">
                  {filteredTransactions.length} transactions
                </Badge>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search order or customer..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 border-gray-200 focus:border-amber-400 focus:ring-amber-400" />
              </div>
              <DateFilter value={transactionDateFilter} onChange={setTransactionDateFilter} showAllOption />
              <select value={filterOrderType} onChange={e => setFilterOrderType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100">
                <option value="all">All Types</option>
                <option value="DINE_IN">Dine In</option>
                <option value="TAKEOUT">Takeout</option>
                <option value="DELIVERY">Delivery</option>
              </select>
              <select value={filterPaymentMethod} onChange={e => setFilterPaymentMethod(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100">
                <option value="all">All Payments</option>
                <option value="CASH">Cash</option>
                <option value="GCASH">GCash</option>
                <option value="CARD">Card</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-50 border-b-2 border-amber-200">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Order #</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Cashier</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-amber-800 uppercase tracking-wider">Subtotal</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-amber-800 uppercase tracking-wider">VAT (12%)</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-amber-800 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-amber-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-amber-50 rounded-full">
                          <Receipt className="h-8 w-8 text-amber-300" />
                        </div>
                        <p className="text-gray-500 font-medium">No transactions found</p>
                        <p className="text-sm text-gray-400">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTransactions.map((t, index) => {
                  const vat = t.totalAmount * 0.12
                  const orderDate = new Date(t.completedAt || t.createdAt)
                  return (
                    <tr key={t.id} className={`transition-colors duration-150 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {formatOrderNumber(t.orderNumber)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{orderDate.toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{orderDate.toLocaleTimeString()}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700">{t.customerName || 'Walk-in'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">{t.createdBy || 'System'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700">
                          {t.orderType === 'DINE_IN' ? 'Dine In' : t.orderType === 'TAKEOUT' ? 'Takeout' : 'Delivery'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700">
                          {t.paymentMethod || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm text-gray-700">₱{(t.totalAmount - vat).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm text-gray-400">₱{vat.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">₱{t.totalAmount.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1.5 justify-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setSelectedTransaction(t)}
                            className="border-gray-200 hover:bg-gray-50"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => printReceipt(t)}
                            className="border-gray-200 hover:bg-gray-50"
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {paginatedTransactions.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right font-semibold text-gray-600 text-sm">Page Totals:</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700 text-sm">
                      ₱{paginatedTransactions.reduce((sum, t) => sum + (t.totalAmount - t.totalAmount * 0.12), 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-500 text-sm">
                      ₱{paginatedTransactions.reduce((sum, t) => sum + t.totalAmount * 0.12, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 text-sm">
                      ₱{paginatedTransactions.reduce((sum, t) => sum + t.totalAmount, 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select 
                value={itemsPerPage} 
                onChange={e => { setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1) }} 
                className="border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              >
                {[5, 10, 25, 50, 'all'].map(o => <option key={o} value={o}>{o === 'all' ? 'All' : o}</option>)}
              </select>
              <span>entries</span>
            </div>
            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="border-amber-200 hover:bg-amber-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number
                    if (totalPages <= 5) {
                      page = i + 1
                    } else if (currentPage <= 3) {
                      page = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i
                    } else {
                      page = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={currentPage === page ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border-amber-200 hover:bg-amber-50'}
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  className="border-amber-200 hover:bg-amber-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedTransaction && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedTransaction(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><Receipt className="h-5 w-5 text-amber-500" />Transaction Details</h2>
                <button onClick={() => setSelectedTransaction(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 uppercase">Order</p><p className="font-semibold">{formatOrderNumber(selectedTransaction.orderNumber)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 uppercase">Customer</p><p className="font-semibold">{selectedTransaction.customerName || 'Walk-in'}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 uppercase">Cashier</p><p className="font-semibold">{selectedTransaction.createdBy || 'System'}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 uppercase">Date</p><p className="font-semibold text-sm">{new Date(selectedTransaction.completedAt || selectedTransaction.createdAt).toLocaleString()}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 uppercase">Payment</p><p className="font-semibold">{selectedTransaction.paymentMethod || 'N/A'}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 uppercase">Order Type</p><p className="font-semibold">{selectedTransaction.orderType.replace('_', ' ')}</p></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Items</h3>
                  {selectedTransaction.order_items.map(i => (
                    <div key={i.id} className="flex justify-between py-2 border-b last:border-0">
                      <span>{menuItems.get(i.menuItemId) || i.menuItemId} × {i.quantity}</span>
                      <span className="font-medium">₱{i.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <div className="flex justify-between mb-2"><span>Subtotal:</span><span>₱{(selectedTransaction.totalAmount * 0.88).toFixed(2)}</span></div>
                  <div className="flex justify-between mb-2"><span>VAT (12%):</span><span>₱{(selectedTransaction.totalAmount * 0.12).toFixed(2)}</span></div>
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-amber-200"><span>Total:</span><span className="text-amber-600">₱{selectedTransaction.totalAmount.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
