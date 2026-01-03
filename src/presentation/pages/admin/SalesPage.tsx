import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, Eye, Receipt, Search, ChevronLeft, ChevronRight, Printer, Download } from 'lucide-react'
import { salesApi, type SalesReport } from '../../../infrastructure/api/sales.api'
import { ordersApi, type OrderResponse, type PaymentStatus } from '../../../infrastructure/api/orders.api'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import { DateFilter, type DateFilterValue, useDefaultDateFilter } from '../../components/common/DateFilter'
import { printWithIframe } from '../../../shared/utils/printUtils'
import { ManagerPinModal } from '../../components/common/ManagerPinModal'
import { generateReceiptHTML } from '../../../shared/utils/receiptTemplate'

const formatOrderNumber = (orderNumber: string) => {
  const match = orderNumber.match(/^ORD-\d{8}-(\d+)$/)
  return match ? `ORD-${match[1]}` : orderNumber
}

// Get display name for who created the order
// "Manager", "Cashier" = POS orders by staff
// "Customer" = Logged-in customer placed order
// "Guest Customer" = Guest customer placed order via phone menu
const getCreatedByName = (order: OrderResponse): string => {
  if (!order.createdBy) return 'Guest Customer' // Old orders without createdBy
  // Handle legacy values
  if (order.createdBy === 'GUEST' || order.createdBy === 'Guest') return 'Guest Customer'
  return order.createdBy
}

// Get the customer display name
// Show actual customer name or "Guest" if no name provided
const getCustomerDisplayName = (order: OrderResponse): string => {
  if (order.customerName && order.customerName.trim()) {
    return order.customerName
  }
  return 'Guest'
}

// Get cashier name who processed/completed the order
const getProcessedByName = (order: OrderResponse): string => {
  if (!order.processedBy) return 'Not completed yet'
  return order.processedBy
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
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all')
  const [filterOrderStatus, setFilterOrderStatus] = useState<string>('all')
  const [transactionDateFilter, setTransactionDateFilter] = useState<DateFilterValue>(useDefaultDateFilter('all'))
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10)
  
  // Manager PIN modal state for changing payment status
  const [showManagerPinModal, setShowManagerPinModal] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    orderId: string
    newStatus: PaymentStatus
    reason: string
  } | null>(null)
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false)
  const [selectedOrderForStatusChange, setSelectedOrderForStatusChange] = useState<OrderResponse | null>(null)
  const [statusChangeReason, setStatusChangeReason] = useState('')
  const [selectedNewStatus, setSelectedNewStatus] = useState<PaymentStatus>('PAID')

  // Payment status configuration
  const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string; bgColor: string }> = {
    UNPAID: { label: 'Unpaid', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    PAID: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
    REFUNDED: { label: 'Refunded', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    COMPLIMENTARY: { label: 'Complimentary', color: 'text-pink-700', bgColor: 'bg-pink-100' },
    WRITTEN_OFF: { label: 'Written Off', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    VOIDED: { label: 'Voided', color: 'text-red-700', bgColor: 'bg-red-100' },
  }

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
      // Show all orders except PENDING (including PREPARING, READY, COMPLETED, CANCELLED)
      // This allows tracking orders at all stages of the workflow
      setTransactions(allOrders
        .filter(o => o.status !== 'PENDING')
        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()))
    } catch (e) { console.error('Error loading transactions:', e) }
  }

  const printReceipt = (t: OrderResponse) => {
    const receiptHTML = generateReceiptHTML({
      orderNumber: t.orderNumber,
      createdAt: t.completedAt || t.createdAt,
      customerName: getCustomerDisplayName(t),
      orderType: t.orderType,
      paymentMethod: t.paymentMethod || 'N/A',
      items: t.order_items.map(i => ({
        name: menuItems.get(i.menuItemId) || i.menuItemId,
        quantity: i.quantity,
        price: i.price
      })),
      totalAmount: t.totalAmount,
      deliveryFee: (t as any).deliveryFee,
      serviceFee: (t as any).serviceFee,
      discountAmount: t.discountAmount,
      cashReceived: (t as any).cashReceived,
      changeAmount: (t as any).changeAmount
    })
    printWithIframe(receiptHTML)
  }

  const exportCSV = () => {
    const rows = [['Order #','Date','Time','Customer','Created By','Processed By','Type','Payment','Status','Subtotal','VAT','Total']]
    filteredTransactions.forEach(t => {
      // VAT is inclusive (12/112 of total)
      const vat = t.totalAmount * (12 / 112), d = new Date(t.completedAt || t.createdAt)
      rows.push([formatOrderNumber(t.orderNumber), d.toLocaleDateString(), d.toLocaleTimeString(), getCustomerDisplayName(t), getCreatedByName(t), getProcessedByName(t), t.orderType, t.paymentMethod || 'N/A', t.paymentStatus, (t.totalAmount - vat).toFixed(2), vat.toFixed(2), t.totalAmount.toFixed(2)])
    })
    const blob = new Blob([rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handlePrintSalesReport = () => {
    // Only count PAID orders for revenue (exclude voided, refunded, etc.)
    const paidTransactions = filteredTransactions.filter(t => t.paymentStatus === 'PAID')
    const totalRevenue = paidTransactions.reduce((sum, t) => sum + t.totalAmount, 0)
    // VAT is inclusive (12/112 of total)
    const totalVAT = totalRevenue * (12 / 112)
    const subtotal = totalRevenue - totalVAT
    
    // Helper function to get status label for print
    const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
        PAID: 'Paid',
        UNPAID: 'Unpaid',
        REFUNDED: 'Refunded',
        COMPLIMENTARY: 'Complimentary',
        WRITTEN_OFF: 'Written Off',
        VOIDED: 'Voided'
      }
      return labels[status] || status
    }
    
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
          .text-center { text-align: center; }
          .status-paid { color: #15803d; }
          .status-unpaid { color: #c2410c; }
          .status-refunded { color: #7c3aed; text-decoration: line-through; }
          .status-voided { color: #dc2626; text-decoration: line-through; }
          .status-complimentary { color: #db2777; }
          .status-written-off { color: #6b7280; }
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
            <div class="label">Subtotal (Paid)</div>
            <div class="value">₱${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
          <div class="summary-card">
            <div class="label">VAT (12% incl)</div>
            <div class="value">₱${totalVAT.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Revenue (Paid)</div>
            <div class="value">₱${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Created By</th>
              <th>Processed By</th>
              <th>Type</th>
              <th>Payment</th>
              <th class="text-center">Status</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTransactions.map(t => {
              const d = new Date(t.completedAt || t.createdAt)
              const statusClass = t.paymentStatus === 'PAID' ? 'status-paid' :
                                 t.paymentStatus === 'UNPAID' ? 'status-unpaid' :
                                 t.paymentStatus === 'REFUNDED' ? 'status-refunded' :
                                 t.paymentStatus === 'VOIDED' ? 'status-voided' :
                                 t.paymentStatus === 'COMPLIMENTARY' ? 'status-complimentary' :
                                 'status-written-off'
              const amountClass = (t.paymentStatus === 'REFUNDED' || t.paymentStatus === 'VOIDED') ? 'text-right status-refunded' : 'text-right'
              return `
                <tr>
                  <td>${formatOrderNumber(t.orderNumber)}</td>
                  <td>${d.toLocaleDateString()} ${d.toLocaleTimeString()}</td>
                  <td>${t.customerName || 'Guest'}</td>
                  <td>${t.createdBy || 'Guest'}</td>
                  <td>${t.processedBy || '-'}</td>
                  <td>${t.orderType}</td>
                  <td>${t.paymentMethod || 'N/A'}</td>
                  <td class="text-center ${statusClass}">${getStatusLabel(t.paymentStatus)}</td>
                  <td class="${amountClass}">₱${t.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>`
            }).join('')}
            <tr class="total-row">
              <td colspan="8" class="text-right">PAID TOTAL:</td>
              <td class="text-right">₱${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>BEEHIVE Restaurant & Cafe - Sales Report</p>
          <p>${filteredTransactions.length} transactions • ${paidTransactions.length} paid • Period: ${transactionDateFilter.preset === 'custom' ? 'Custom Range' : transactionDateFilter.preset.charAt(0).toUpperCase() + transactionDateFilter.preset.slice(1)}</p>
        </div>
      </body>
      </html>
    `
    printWithIframe(printContent)
  }

  // Handle initiating a payment status change (requires manager PIN)
  const initiateStatusChange = () => {
    if (!selectedOrderForStatusChange || !statusChangeReason.trim()) return
    setPendingStatusChange({
      orderId: selectedOrderForStatusChange.id,
      newStatus: selectedNewStatus,
      reason: statusChangeReason
    })
    setShowStatusChangeModal(false)
    setShowManagerPinModal(true)
  }

  // Handle manager PIN validation success - execute the status change
  const handleManagerPinSuccess = async (managerId: string, _managerName: string) => {
    if (!pendingStatusChange) return
    
    try {
      const { orderId, newStatus, reason } = pendingStatusChange
      
      if (newStatus === 'REFUNDED') {
        await ordersApi.refundOrder(orderId, reason, managerId)
        // Status is set by backend, but ensure it's COMPLETED for refunds
        await ordersApi.update(orderId, { status: 'COMPLETED' })
      } else if (newStatus === 'COMPLIMENTARY') {
        await ordersApi.markAsComplimentary(orderId, reason, managerId)
        // Status is set by backend, but ensure it's COMPLETED
        await ordersApi.update(orderId, { status: 'COMPLETED' })
      } else if (newStatus === 'WRITTEN_OFF') {
        await ordersApi.writeOff(orderId, reason, managerId)
        // Status is set by backend, but ensure it's COMPLETED
        await ordersApi.update(orderId, { status: 'COMPLETED' })
      } else if (newStatus === 'VOIDED') {
        // voidOrder already sets status to CANCELLED and replenishes stock if order was COMPLETED
        await ordersApi.voidOrder(orderId, reason, managerId)
      }
      
      // Refresh transactions
      await loadTransactions()
      
      // Reset state
      setShowManagerPinModal(false)
      setPendingStatusChange(null)
      setSelectedOrderForStatusChange(null)
      setStatusChangeReason('')
    } catch (error) {
      console.error('Failed to change payment status:', error)
      alert('Failed to change payment status. Please try again.')
    }
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
        && (filterPaymentStatus === 'all' || t.paymentStatus === filterPaymentStatus)
        && (filterOrderStatus === 'all' || t.status === filterOrderStatus)
    })

  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredTransactions.length / (itemsPerPage as number))
  const startIdx = itemsPerPage === 'all' ? 0 : (currentPage - 1) * (itemsPerPage as number)
  const paginatedTransactions = filteredTransactions.slice(startIdx, itemsPerPage === 'all' ? undefined : startIdx + (itemsPerPage as number))

  useEffect(() => { setCurrentPage(1) }, [searchQuery, filterOrderType, filterPaymentMethod, filterPaymentStatus, filterOrderStatus, transactionDateFilter])

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

        {/* Key Metrics - Compact style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900 mt-1">₱{metrics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-2.5 bg-yellow-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{metrics.totalOrders}</p>
              </div>
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Order Value</p>
                <p className="text-xl font-bold text-gray-900 mt-1">₱{metrics.averageOrderValue.toFixed(0)}</p>
              </div>
              <div className="p-2.5 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Daily Average</p>
                <p className="text-xl font-bold text-gray-900 mt-1">₱{metrics.dailyAverage.toFixed(0)}</p>
              </div>
              <div className="p-2.5 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </div>
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
                <p className="text-sm text-gray-500 mt-1">All orders (excluding pending) - preparing, ready, completed, cancelled</p>
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
              <select value={filterPaymentStatus} onChange={e => setFilterPaymentStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100">
                <option value="all">All Payment Statuses</option>
                <option value="PAID">✓ Paid</option>
                <option value="UNPAID">💰 Unpaid</option>
                <option value="REFUNDED">↩ Refunded</option>
                <option value="COMPLIMENTARY">🎁 Complimentary</option>
                <option value="WRITTEN_OFF">📝 Written Off</option>
                <option value="VOIDED">🚫 Voided</option>
              </select>
              <select value={filterOrderStatus} onChange={e => setFilterOrderStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100">
                <option value="all">All Order Statuses</option>
                <option value="PREPARING">🍳 Preparing</option>
                <option value="READY">✅ Ready</option>
                <option value="COMPLETED">🎉 Completed</option>
                <option value="CANCELLED">❌ Cancelled</option>
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
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Created By</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Processed By</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Payment Status</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-amber-800 uppercase tracking-wider">Order Status</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-amber-800 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-amber-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center">
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
                  const orderDate = new Date(t.completedAt || t.createdAt)
                  const statusInfo = paymentStatusConfig[t.paymentStatus] || paymentStatusConfig.UNPAID
                  
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
                        <span className="text-sm text-gray-700">{getCustomerDisplayName(t)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">{getCreatedByName(t)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">{getProcessedByName(t)}</span>
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
                      <td className="px-4 py-4">
                        <Badge className={`${statusInfo.bgColor} ${statusInfo.color} text-xs`}>
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={`text-xs ${
                          t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          t.status === 'PREPARING' ? 'bg-blue-100 text-blue-700' :
                          t.status === 'READY' ? 'bg-amber-100 text-amber-700' :
                          t.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {t.status === 'COMPLETED' ? 'Completed' :
                           t.status === 'PREPARING' ? 'Preparing' :
                           t.status === 'READY' ? 'Ready' :
                           t.status === 'CANCELLED' ? 'Cancelled' :
                           t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-semibold ${
                          t.paymentStatus === 'REFUNDED' || t.paymentStatus === 'VOIDED' ? 'text-red-600 line-through' :
                          t.paymentStatus === 'COMPLIMENTARY' ? 'text-pink-600' :
                          t.paymentStatus === 'WRITTEN_OFF' ? 'text-gray-400' :
                          'text-gray-900'
                        }`}>
                          ₱{t.totalAmount.toFixed(2)}
                        </span>
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
                          {t.paymentStatus === 'PAID' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setSelectedOrderForStatusChange(t)
                                setStatusChangeReason('')
                                setSelectedNewStatus('REFUNDED')
                                setShowStatusChangeModal(true)
                              }}
                              className="border-purple-200 text-purple-600 hover:bg-purple-50"
                              title="Change Payment Status"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
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
                    <td colSpan={8} className="px-4 py-3 text-right font-semibold text-gray-600 text-sm">Page Totals:</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 text-sm">
                      ₱{paginatedTransactions.filter(t => t.paymentStatus === 'PAID').reduce((sum, t) => sum + t.totalAmount, 0).toFixed(2)}
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
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 uppercase">Customer</p><p className="font-semibold">{getCustomerDisplayName(selectedTransaction)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 uppercase">Created By</p><p className="font-semibold">{getCreatedByName(selectedTransaction)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 uppercase">Processed By</p><p className="font-semibold">{getProcessedByName(selectedTransaction)}</p></div>
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
                  <div className="flex justify-between mb-2"><span>Items Subtotal:</span><span>₱{(selectedTransaction.totalAmount - (selectedTransaction.totalAmount * (12 / 112)) - ((selectedTransaction as any).deliveryFee || 0) - ((selectedTransaction as any).serviceFee || 0) + (selectedTransaction.discountAmount || 0)).toFixed(2)}</span></div>
                  <div className="flex justify-between mb-2"><span>VAT (12% incl):</span><span>₱{(selectedTransaction.totalAmount * (12 / 112)).toFixed(2)}</span></div>
                  {(selectedTransaction as any).deliveryFee > 0 && (
                    <div className="flex justify-between mb-2"><span>Delivery Fee:</span><span>₱{(selectedTransaction as any).deliveryFee.toFixed(2)}</span></div>
                  )}
                  {(selectedTransaction as any).serviceFee > 0 && (
                    <div className="flex justify-between mb-2"><span>Service Fee:</span><span>₱{(selectedTransaction as any).serviceFee.toFixed(2)}</span></div>
                  )}
                  {selectedTransaction.discountAmount > 0 && (
                    <div className="flex justify-between mb-2 text-green-600"><span>Discount:</span><span>-₱{selectedTransaction.discountAmount.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-amber-200"><span>Total:</span><span className="text-amber-600">₱{selectedTransaction.totalAmount.toFixed(2)}</span></div>
                  {(selectedTransaction as any).cashReceived > 0 && (
                    <div className="pt-3 border-t border-amber-200 mt-3 space-y-1">
                      <div className="flex justify-between text-green-700"><span>Cash Received:</span><span>₱{(selectedTransaction as any).cashReceived.toFixed(2)}</span></div>
                      <div className="flex justify-between text-green-700"><span>Change:</span><span>₱{((selectedTransaction as any).changeAmount || 0).toFixed(2)}</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Status Change Modal */}
      {showStatusChangeModal && selectedOrderForStatusChange && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowStatusChangeModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                  Change Payment Status
                </h2>
                <button onClick={() => setShowStatusChangeModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">Order</p>
                  <p className="font-semibold">{formatOrderNumber(selectedOrderForStatusChange.orderNumber)}</p>
                  <p className="text-sm text-gray-600 mt-1">Amount: ₱{selectedOrderForStatusChange.totalAmount.toFixed(2)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                  <select
                    value={selectedNewStatus}
                    onChange={(e) => setSelectedNewStatus(e.target.value as PaymentStatus)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="REFUNDED">Refunded</option>
                    <option value="COMPLIMENTARY">Complimentary</option>
                    <option value="WRITTEN_OFF">Written Off</option>
                    <option value="VOIDED">Voided</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Required)</label>
                  <textarea
                    value={statusChangeReason}
                    onChange={(e) => setStatusChangeReason(e.target.value)}
                    placeholder="Enter reason for status change..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <strong>Note:</strong> This action requires manager authorization and will be logged.
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowStatusChangeModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                    onClick={initiateStatusChange}
                    disabled={!statusChangeReason.trim()}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manager PIN Modal */}
      <ManagerPinModal
        isOpen={showManagerPinModal}
        onClose={() => {
          setShowManagerPinModal(false)
          setPendingStatusChange(null)
        }}
        onAuthorized={handleManagerPinSuccess}
        title="Manager Authorization Required"
        description={pendingStatusChange ? `Authorize changing payment status to ${pendingStatusChange.newStatus}` : ''}
        variant={pendingStatusChange?.newStatus === 'VOIDED' || pendingStatusChange?.newStatus === 'REFUNDED' ? 'danger' : 'warning'}
      />
    </AdminLayout>
  )
}
