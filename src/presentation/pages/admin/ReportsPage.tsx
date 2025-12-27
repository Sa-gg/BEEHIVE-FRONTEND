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
  ArrowDownCircle,
  RefreshCw,
  FileText,
  Receipt
} from 'lucide-react'
import { salesApi } from '../../../infrastructure/api/sales.api'
import { inventoryApi } from '../../../infrastructure/api/inventory.api'
import { stockTransactionApi } from '../../../infrastructure/api/stockTransaction.api'
import { ordersApi } from '../../../infrastructure/api/orders.api'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import { formatSmartStock } from '../../../shared/utils/stockFormat'
import { DateFilter, type DateFilterValue, getDateRangeFromPreset } from '../../components/common/DateFilter'
import { printWithIframe } from '../../../shared/utils/printUtils'
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
type PrintOption = 'full' | 'transactions' | 'summary' | 'stock-transactions'

interface SalesTransaction {
  id: string
  orderNumber: string
  date: string
  time: string
  customer: string
  cashier: string
  orderType: string
  paymentMethod: string
  subtotal: number
  vat: number
  total: number
}

interface SalesReportData {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  totalItems: number
  totalSubtotal: number
  totalVAT: number
  dailySales: Array<{ date: string; revenue: number; orders: number }>
  categoryBreakdown: Array<{ category: string; revenue: number; count: number }>
  paymentMethods: Array<{ method: string; amount: number; count: number }>
  orderTypes: Array<{ type: string; revenue: number; count: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  hourlyDistribution: Array<{ hour: string; orders: number; revenue: number }>
  transactions: SalesTransaction[]
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
  inventoryItems: Array<{ 
    name: string
    category: string
    currentStock: number
    minStock: number
    maxStock: number
    unit: string
    costPerUnit: number
    value: number
    status: string
  }>
  stockTransactions: Array<{
    id: string
    date: string
    time: string
    itemName: string
    category: string
    type: 'IN' | 'OUT'
    reason: string
    quantity: number
    unit: string
    notes: string
  }>
}

export const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales')
  const [customDateFilter, setCustomDateFilter] = useState<DateFilterValue>({ preset: 'month', startDate: null, endDate: null })
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<SalesReportData | null>(null)
  const [inventoryData, setInventoryData] = useState<InventoryReportData | null>(null)
  const [menuItems, setMenuItems] = useState<Map<string, string>>(new Map())
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
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

      // Build transactions list with all fields
      const transactions: SalesTransaction[] = completedOrders
        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
        .map(order => {
          const vat = order.totalAmount * 0.12
          const subtotal = order.totalAmount - vat
          const orderDate = new Date(order.completedAt || order.createdAt)
          return {
            id: order.id,
            orderNumber: order.orderNumber,
            date: orderDate.toLocaleDateString(),
            time: orderDate.toLocaleTimeString(),
            customer: order.customerName || 'Walk-in',
            cashier: order.createdBy || 'System',
            orderType: order.orderType.replace('_', ' '),
            paymentMethod: order.paymentMethod || 'N/A',
            subtotal,
            vat,
            total: order.totalAmount
          }
        })

      // Calculate totals for VAT and subtotal
      const totalVAT = totalRevenue * 0.12
      const totalSubtotal = totalRevenue - totalVAT

      setSalesData({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalItems,
        totalSubtotal,
        totalVAT,
        dailySales,
        categoryBreakdown,
        paymentMethods,
        orderTypes,
        topProducts,
        hourlyDistribution,
        transactions
      })
    } catch (error) {
      console.error('Failed to load sales report:', error)
    }
  }

  const loadInventoryReport = async () => {
    try {
      // Get date range for stock transactions
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

      const [inventoryItems, allTransactions] = await Promise.all([
        inventoryApi.getAll(),
        stockTransactionApi.getAllTransactions({
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        })
      ])

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
          value: totalValue * (0.9 + Math.random() * 0.2),
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

      // Full inventory items list for summary print
      const inventoryItemsList = inventoryItems.map(item => ({
        name: item.name,
        category: item.category,
        currentStock: item.currentStock,
        minStock: item.minStock,
        maxStock: item.maxStock,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        value: item.currentStock * item.costPerUnit,
        status: item.status
      }))

      // Stock transactions formatted for printing
      const stockTransactions = (allTransactions || [])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(tx => {
          const txDate = new Date(tx.createdAt)
          return {
            id: tx.id,
            date: txDate.toLocaleDateString(),
            time: txDate.toLocaleTimeString(),
            itemName: tx.inventory_item?.name || 'Unknown Item',
            category: tx.inventory_item?.category || 'N/A',
            type: tx.type,
            reason: tx.reason,
            quantity: tx.quantity,
            unit: tx.inventory_item?.unit || '',
            notes: tx.notes || ''
          }
        })

      setInventoryData({
        totalItems,
        totalValue,
        lowStockCount,
        outOfStockCount,
        categoryDistribution,
        stockStatus,
        topMovingItems,
        lowStockItems,
        inventoryTrend,
        inventoryItems: inventoryItemsList,
        stockTransactions
      })
    } catch (error) {
      console.error('Failed to load inventory report:', error)
    }
  }

  const handlePrint = (option: PrintOption) => {
    if (!salesData && activeTab === 'sales') return
    if (!inventoryData && activeTab === 'inventory') return

    let content = ''
    
    if (activeTab === 'sales' && salesData) {
      if (option === 'full') {
        // Full report with charts description and all tables
        content = `
          <div class="stats-grid">
            <div class="stat-card"><h3>₱${salesData.totalRevenue.toLocaleString()}</h3><p>Total Revenue</p></div>
            <div class="stat-card"><h3>${salesData.totalOrders}</h3><p>Total Orders</p></div>
            <div class="stat-card"><h3>₱${salesData.averageOrderValue.toFixed(2)}</h3><p>Avg Order Value</p></div>
            <div class="stat-card"><h3>${salesData.totalItems}</h3><p>Items Sold</p></div>
          </div>
          
          <div class="section">
            <h2>Daily Sales Breakdown</h2>
            <table>
              <thead><tr><th>Date</th><th style="text-align:right">Orders</th><th style="text-align:right">Revenue</th></tr></thead>
              <tbody>
                ${salesData.dailySales.map(d => `<tr><td>${d.date}</td><td style="text-align:right">${d.orders}</td><td style="text-align:right">₱${d.revenue.toFixed(2)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Top Selling Products</h2>
            <table>
              <thead><tr><th>#</th><th>Product</th><th style="text-align:right">Qty Sold</th><th style="text-align:right">Revenue</th></tr></thead>
              <tbody>
                ${salesData.topProducts.map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td style="text-align:right">${p.quantity}</td><td style="text-align:right">₱${p.revenue.toFixed(2)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Payment Methods Summary</h2>
            <table>
              <thead><tr><th>Method</th><th style="text-align:right">Transactions</th><th style="text-align:right">Amount</th></tr></thead>
              <tbody>
                ${salesData.paymentMethods.map(p => `<tr><td>${p.method}</td><td style="text-align:right">${p.count}</td><td style="text-align:right">₱${p.amount.toFixed(2)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Order Types Summary</h2>
            <table>
              <thead><tr><th>Type</th><th style="text-align:right">Orders</th><th style="text-align:right">Revenue</th></tr></thead>
              <tbody>
                ${salesData.orderTypes.map(t => `<tr><td>${t.type.replace('_', ' ')}</td><td style="text-align:right">${t.count}</td><td style="text-align:right">₱${t.revenue.toFixed(2)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section page-break">
            <h2>Sales Transactions</h2>
            <table>
              <thead><tr><th>Order #</th><th>Date</th><th>Time</th><th>Customer</th><th>Cashier</th><th>Type</th><th>Payment</th><th style="text-align:right">Subtotal</th><th style="text-align:right">VAT (12%)</th><th style="text-align:right">Total</th></tr></thead>
              <tbody>
                ${salesData.transactions.map(t => `<tr><td>${t.orderNumber}</td><td>${t.date}</td><td>${t.time}</td><td>${t.customer}</td><td>${t.cashier}</td><td>${t.orderType}</td><td>${t.paymentMethod}</td><td style="text-align:right">₱${t.subtotal.toFixed(2)}</td><td style="text-align:right">₱${t.vat.toFixed(2)}</td><td style="text-align:right">₱${t.total.toFixed(2)}</td></tr>`).join('')}
              </tbody>
              <tfoot class="totals-row">
                <tr><td colspan="7"><strong>TOTALS</strong></td><td style="text-align:right"><strong>₱${salesData.totalSubtotal.toFixed(2)}</strong></td><td style="text-align:right"><strong>₱${salesData.totalVAT.toFixed(2)}</strong></td><td style="text-align:right"><strong>₱${salesData.totalRevenue.toFixed(2)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
        `
      } else {
        // Transactions only summary
        content = `
          <div class="summary-box">
            <h2>Sales Summary</h2>
            <div class="summary-grid">
              <div><span>Total Transactions:</span><strong>${salesData.totalOrders}</strong></div>
              <div><span>Total Items Sold:</span><strong>${salesData.totalItems}</strong></div>
              <div><span>Average Order:</span><strong>₱${salesData.averageOrderValue.toFixed(2)}</strong></div>
            </div>
          </div>
          
          <div class="section">
            <h2>Sales Transactions Detail</h2>
            <table>
              <thead><tr><th>Order #</th><th>Date</th><th>Time</th><th>Customer</th><th>Cashier</th><th>Type</th><th>Payment</th><th style="text-align:right">Subtotal</th><th style="text-align:right">VAT (12%)</th><th style="text-align:right">Total</th></tr></thead>
              <tbody>
                ${salesData.transactions.map(t => `<tr><td>${t.orderNumber}</td><td>${t.date}</td><td>${t.time}</td><td>${t.customer}</td><td>${t.cashier}</td><td>${t.orderType}</td><td>${t.paymentMethod}</td><td style="text-align:right">₱${t.subtotal.toFixed(2)}</td><td style="text-align:right">₱${t.vat.toFixed(2)}</td><td style="text-align:right">₱${t.total.toFixed(2)}</td></tr>`).join('')}
              </tbody>
              <tfoot class="totals-row">
                <tr><td colspan="7"><strong>GRAND TOTALS</strong></td><td style="text-align:right"><strong>₱${salesData.totalSubtotal.toFixed(2)}</strong></td><td style="text-align:right"><strong>₱${salesData.totalVAT.toFixed(2)}</strong></td><td style="text-align:right"><strong>₱${salesData.totalRevenue.toFixed(2)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
        `
      }
    } else if (activeTab === 'inventory' && inventoryData) {
      const statusLabels: Record<string, string> = {
        'IN_STOCK': 'In Stock',
        'LOW_STOCK': 'Low Stock',
        'OUT_OF_STOCK': 'Out of Stock'
      }

      if (option === 'full') {
        // Full inventory report
        content = `
          <div class="stats-grid">
            <div class="stat-card"><h3>${inventoryData.totalItems}</h3><p>Total Items</p></div>
            <div class="stat-card"><h3>₱${inventoryData.totalValue.toLocaleString()}</h3><p>Total Value</p></div>
            <div class="stat-card"><h3>${inventoryData.lowStockCount}</h3><p>Low Stock</p></div>
            <div class="stat-card"><h3>${inventoryData.outOfStockCount}</h3><p>Out of Stock</p></div>
          </div>
          
          <div class="section">
            <h2>Inventory by Category</h2>
            <table>
              <thead><tr><th>Category</th><th style="text-align:right">Items</th><th style="text-align:right">Value</th></tr></thead>
              <tbody>
                ${inventoryData.categoryDistribution.map(c => `<tr><td>${c.category}</td><td style="text-align:right">${c.count}</td><td style="text-align:right">₱${c.value.toFixed(2)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Stock Status Overview</h2>
            <table>
              <thead><tr><th>Status</th><th style="text-align:right">Count</th></tr></thead>
              <tbody>
                ${inventoryData.stockStatus.map(s => `<tr><td>${s.status}</td><td style="text-align:right">${s.count}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Low Stock & Out of Stock Items</h2>
            <table>
              <thead><tr><th>Item Name</th><th style="text-align:right">Current Stock</th><th style="text-align:right">Min Stock</th><th>Unit</th></tr></thead>
              <tbody>
                ${inventoryData.lowStockItems.map(i => `<tr><td>${i.name}</td><td style="text-align:right">${i.currentStock}</td><td style="text-align:right">${i.minStock}</td><td>${i.unit}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section page-break">
            <h2>Complete Inventory List</h2>
            <table>
              <thead><tr><th>Item Name</th><th>Category</th><th style="text-align:right">Current</th><th style="text-align:right">Min</th><th style="text-align:right">Max</th><th>Unit</th><th style="text-align:right">Cost/Unit</th><th style="text-align:right">Value</th><th>Status</th></tr></thead>
              <tbody>
                ${inventoryData.inventoryItems.map(i => `<tr><td>${i.name}</td><td>${i.category}</td><td style="text-align:right">${i.currentStock}</td><td style="text-align:right">${i.minStock}</td><td style="text-align:right">${i.maxStock}</td><td>${i.unit}</td><td style="text-align:right">₱${i.costPerUnit.toFixed(2)}</td><td style="text-align:right">₱${i.value.toFixed(2)}</td><td>${statusLabels[i.status] || i.status}</td></tr>`).join('')}
              </tbody>
              <tfoot class="totals-row">
                <tr><td colspan="7"><strong>TOTAL VALUE</strong></td><td style="text-align:right" colspan="2"><strong>₱${inventoryData.totalValue.toFixed(2)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
          
          <div class="section page-break">
            <h2>Stock Transactions</h2>
            <table>
              <thead><tr><th>Date</th><th>Time</th><th>Item</th><th>Category</th><th>Type</th><th>Reason</th><th style="text-align:right">Qty</th><th>Unit</th><th>Notes</th></tr></thead>
              <tbody>
                ${inventoryData.stockTransactions.length > 0 
                  ? inventoryData.stockTransactions.map(tx => `<tr><td>${tx.date}</td><td>${tx.time}</td><td>${tx.itemName}</td><td>${tx.category}</td><td class="${tx.type === 'IN' ? 'text-green' : 'text-red'}">${tx.type === 'IN' ? '📥 IN' : '📤 OUT'}</td><td>${tx.reason}</td><td style="text-align:right">${tx.quantity}</td><td>${tx.unit}</td><td>${tx.notes}</td></tr>`).join('')
                  : '<tr><td colspan="9" style="text-align:center;padding:20px;color:#666">No stock transactions in this period</td></tr>'}
              </tbody>
            </table>
          </div>
        `
      } else if (option === 'summary') {
        // Inventory summary only (current stock levels)
        content = `
          <div class="summary-box">
            <h2>Inventory Summary</h2>
            <div class="summary-grid">
              <div><span>Total Items:</span><strong>${inventoryData.totalItems}</strong></div>
              <div><span>Total Value:</span><strong>₱${inventoryData.totalValue.toLocaleString()}</strong></div>
              <div><span>Low Stock Items:</span><strong>${inventoryData.lowStockCount}</strong></div>
              <div><span>Out of Stock:</span><strong>${inventoryData.outOfStockCount}</strong></div>
              <div><span>In Stock:</span><strong>${inventoryData.stockStatus.find(s => s.status === 'In Stock')?.count || 0}</strong></div>
            </div>
          </div>
          
          <div class="section">
            <h2>Complete Inventory Summary</h2>
            <table>
              <thead><tr><th>Item Name</th><th>Category</th><th style="text-align:right">Current Stock</th><th style="text-align:right">Min Stock</th><th style="text-align:right">Max Stock</th><th>Unit</th><th style="text-align:right">Cost/Unit</th><th style="text-align:right">Total Value</th><th>Status</th></tr></thead>
              <tbody>
                ${inventoryData.inventoryItems.map(i => `<tr><td>${i.name}</td><td>${i.category}</td><td style="text-align:right">${i.currentStock}</td><td style="text-align:right">${i.minStock}</td><td style="text-align:right">${i.maxStock}</td><td>${i.unit}</td><td style="text-align:right">₱${i.costPerUnit.toFixed(2)}</td><td style="text-align:right">₱${i.value.toFixed(2)}</td><td>${statusLabels[i.status] || i.status}</td></tr>`).join('')}
              </tbody>
              <tfoot class="totals-row">
                <tr><td colspan="7"><strong>GRAND TOTAL</strong></td><td style="text-align:right" colspan="2"><strong>₱${inventoryData.totalValue.toFixed(2)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
        `
      } else if (option === 'stock-transactions') {
        // Stock transactions only
        const totalIn = inventoryData.stockTransactions.filter(tx => tx.type === 'IN').reduce((sum, tx) => sum + tx.quantity, 0)
        const totalOut = inventoryData.stockTransactions.filter(tx => tx.type === 'OUT').reduce((sum, tx) => sum + tx.quantity, 0)
        
        content = `
          <div class="summary-box">
            <h2>Stock Transactions Summary</h2>
            <div class="summary-grid">
              <div><span>Total Transactions:</span><strong>${inventoryData.stockTransactions.length}</strong></div>
              <div><span>Stock In (Total Qty):</span><strong class="text-green">${totalIn}</strong></div>
              <div><span>Stock Out (Total Qty):</span><strong class="text-red">${totalOut}</strong></div>
            </div>
          </div>
          
          <div class="section">
            <h2>Stock Transactions Detail</h2>
            <table>
              <thead><tr><th>Date</th><th>Time</th><th>Item Name</th><th>Category</th><th>Type</th><th>Reason</th><th style="text-align:right">Quantity</th><th>Unit</th><th>Notes</th></tr></thead>
              <tbody>
                ${inventoryData.stockTransactions.length > 0 
                  ? inventoryData.stockTransactions.map(tx => `<tr><td>${tx.date}</td><td>${tx.time}</td><td>${tx.itemName}</td><td>${tx.category}</td><td class="${tx.type === 'IN' ? 'text-green' : 'text-red'}">${tx.type === 'IN' ? '📥 IN' : '📤 OUT'}</td><td>${tx.reason}</td><td style="text-align:right">${tx.quantity}</td><td>${tx.unit}</td><td>${tx.notes}</td></tr>`).join('')
                  : '<tr><td colspan="9" style="text-align:center;padding:20px;color:#666">No stock transactions found in this period</td></tr>'}
              </tbody>
            </table>
          </div>
        `
      }
    }

    const reportTitle = activeTab === 'sales' 
      ? (option === 'full' ? 'Complete Sales Report' : 'Sales Transactions Summary')
      : (option === 'full' ? 'Complete Inventory Report' : option === 'summary' ? 'Inventory Summary' : 'Stock Transactions Report')

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeTab === 'sales' ? 'Sales' : 'Inventory'} Report - BEEHIVE</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #fff; color: #333; font-size: 11px; }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 3px solid #F9C900; }
            .header h1 { font-size: 24px; color: #000; margin-bottom: 8px; }
            .header p { color: #666; font-size: 12px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-card { background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 100%); border: 1px solid #F9C900; border-radius: 8px; padding: 15px; text-align: center; }
            .stat-card h3 { font-size: 20px; color: #000; margin-bottom: 4px; }
            .stat-card p { font-size: 10px; color: #666; text-transform: uppercase; }
            .summary-box { background: #f8f8f8; border-radius: 8px; padding: 20px; margin-bottom: 25px; }
            .summary-box h2 { font-size: 16px; margin-bottom: 15px; color: #333; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .summary-grid div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ddd; }
            .summary-grid span { color: #666; }
            .summary-grid strong { color: #000; }
            .section { margin-bottom: 25px; }
            .section h2 { font-size: 14px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #F9C900; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
            th, td { padding: 8px 6px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f8f8f8; font-weight: 600; font-size: 9px; text-transform: uppercase; }
            .totals-row { background: #FEF3C7; font-weight: bold; }
            .totals-row td { border-top: 2px solid #F59E0B; padding: 10px 6px; }
            .text-green { color: #059669; }
            .text-red { color: #DC2626; }
            .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 10px; color: #999; }
            .page-break { page-break-before: auto; }
            @media print { 
              body { padding: 15px; } 
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🐝 BEEHIVE - ${reportTitle}</h1>
            <p>Generated on ${new Date().toLocaleString()} | Period: ${customDateFilter.preset.charAt(0).toUpperCase() + customDateFilter.preset.slice(1)}</p>
          </div>
          ${content}
          <div class="footer">
            <p>© ${new Date().getFullYear()} BEEHIVE POS System. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
    
    printWithIframe(printHTML)
    setShowPrintModal(false)
  }

  const handleExportCSV = (option: PrintOption) => {
    let csvContent = ''
    const timestamp = new Date().toISOString().split('T')[0]

    if (activeTab === 'sales' && salesData) {
      csvContent = 'BEEHIVE Sales Report\n'
      csvContent += `Generated,${new Date().toLocaleString()}\n`
      csvContent += `Period,${customDateFilter.preset}\n\n`
      
      csvContent += 'SUMMARY\n'
      csvContent += `Total Revenue,${salesData.totalRevenue.toFixed(2)}\n`
      csvContent += `Total Subtotal,${salesData.totalSubtotal.toFixed(2)}\n`
      csvContent += `Total VAT (12%),${salesData.totalVAT.toFixed(2)}\n`
      csvContent += `Total Orders,${salesData.totalOrders}\n`
      csvContent += `Average Order Value,${salesData.averageOrderValue.toFixed(2)}\n`
      csvContent += `Total Items Sold,${salesData.totalItems}\n\n`
      
      if (option === 'full') {
        csvContent += 'DAILY SALES\n'
        csvContent += 'Date,Orders,Revenue\n'
        salesData.dailySales.forEach(day => {
          csvContent += `${day.date},${day.orders},${day.revenue.toFixed(2)}\n`
        })
        
        csvContent += '\nTOP PRODUCTS\n'
        csvContent += 'Product,Quantity,Revenue\n'
        salesData.topProducts.forEach(product => {
          csvContent += `"${product.name}",${product.quantity},${product.revenue.toFixed(2)}\n`
        })
        
        csvContent += '\nPAYMENT METHODS\n'
        csvContent += 'Method,Transactions,Amount\n'
        salesData.paymentMethods.forEach(p => {
          csvContent += `${p.method},${p.count},${p.amount.toFixed(2)}\n`
        })
        
        csvContent += '\nORDER TYPES\n'
        csvContent += 'Type,Orders,Revenue\n'
        salesData.orderTypes.forEach(t => {
          csvContent += `${t.type},${t.count},${t.revenue.toFixed(2)}\n`
        })
      }
      
      csvContent += '\nSALES TRANSACTIONS\n'
      csvContent += 'Order #,Date,Time,Customer,Cashier,Order Type,Payment Method,Subtotal,VAT (12%),Total\n'
      salesData.transactions.forEach(t => {
        csvContent += `"${t.orderNumber}","${t.date}","${t.time}","${t.customer}","${t.cashier}","${t.orderType}","${t.paymentMethod}",${t.subtotal.toFixed(2)},${t.vat.toFixed(2)},${t.total.toFixed(2)}\n`
      })
      csvContent += `\nTOTALS,,,,,,,${salesData.totalSubtotal.toFixed(2)},${salesData.totalVAT.toFixed(2)},${salesData.totalRevenue.toFixed(2)}\n`
      
    } else if (activeTab === 'inventory' && inventoryData) {
      csvContent = 'BEEHIVE Inventory Report\n'
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`
      csvContent += 'SUMMARY\n'
      csvContent += `Total Items,${inventoryData.totalItems}\n`
      csvContent += `Total Value,${inventoryData.totalValue.toFixed(2)}\n`
      csvContent += `Low Stock Items,${inventoryData.lowStockCount}\n`
      csvContent += `Out of Stock Items,${inventoryData.outOfStockCount}\n\n`
      csvContent += 'LOW STOCK ITEMS\n'
      csvContent += 'Item,Current Stock,Min Stock,Unit\n'
      inventoryData.lowStockItems.forEach(item => {
        csvContent += `"${item.name}",${item.currentStock},${item.minStock},${item.unit}\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `beehive-${activeTab}-${option === 'full' ? 'full' : 'transactions'}-${timestamp}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    setShowExportModal(false)
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
              onClick={() => setShowExportModal(true)}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => setShowPrintModal(true)}
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

      {/* Print Options Modal */}
      {showPrintModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowPrintModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-white flex justify-between items-center rounded-t-2xl">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Printer className="h-5 w-5 text-amber-500" />
                  Print Options - {activeTab === 'sales' ? 'Sales Report' : 'Inventory Report'}
                </h2>
                <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-600 text-sm">Choose what to include in your printed report:</p>
                
                {/* Full Report Option - Available for both */}
                <button
                  onClick={() => handlePrint('full')}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Full Report</p>
                      <p className="text-sm text-gray-500">
                        {activeTab === 'sales' 
                          ? 'Charts summaries, daily breakdown, top products & all transactions'
                          : 'Complete inventory summary, stock levels, categories & all stock transactions'}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Sales-specific options */}
                {activeTab === 'sales' && (
                  <button
                    onClick={() => handlePrint('transactions')}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200">
                        <Receipt className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Sales Transactions Only</p>
                        <p className="text-sm text-gray-500">Just the sales transactions with totals (subtotal, VAT, total)</p>
                      </div>
                    </div>
                  </button>
                )}

                {/* Inventory-specific options */}
                {activeTab === 'inventory' && (
                  <>
                    <button
                      onClick={() => handlePrint('summary')}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Inventory Summary</p>
                          <p className="text-sm text-gray-500">Current stock levels for all items with cost and value</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handlePrint('stock-transactions')}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200">
                          <Receipt className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Stock Transactions Only</p>
                          <p className="text-sm text-gray-500">All stock-in and stock-out transactions for the period</p>
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export Options Modal */}
      {showExportModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowExportModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b bg-gradient-to-r from-green-50 to-white flex justify-between items-center rounded-t-2xl">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Download className="h-5 w-5 text-green-500" />
                  Export Options
                </h2>
                <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-600 text-sm">Choose what to include in your CSV export:</p>
                <button
                  onClick={() => handleExportCSV('full')}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Full Report</p>
                      <p className="text-sm text-gray-500">Summary, daily sales, top products, payment methods & transactions</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleExportCSV('transactions')}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200">
                      <Receipt className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Transactions Only</p>
                      <p className="text-sm text-gray-500">Summary + detailed transactions with all fields</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
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

    {/* Daily Breakdown Table */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-amber-500" />
        Daily Breakdown
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Orders</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Revenue</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Avg Order</th>
            </tr>
          </thead>
          <tbody>
            {data.dailySales.map((day) => (
              <tr key={day.date} className="border-b border-gray-50 hover:bg-amber-50/50">
                <td className="py-3 px-4 font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                <td className="py-3 px-4 text-right">{day.orders}</td>
                <td className="py-3 px-4 text-right font-semibold text-amber-600">{formatCurrency(day.revenue)}</td>
                <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(day.orders > 0 ? day.revenue / day.orders : 0)}</td>
              </tr>
            ))}
            {data.dailySales.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">No sales data for selected period</td>
              </tr>
            )}
          </tbody>
          {data.dailySales.length > 0 && (
            <tfoot className="bg-amber-50 border-t-2 border-amber-200">
              <tr>
                <td className="py-3 px-4 font-bold">Total</td>
                <td className="py-3 px-4 text-right font-bold">{data.dailySales.reduce((sum, d) => sum + d.orders, 0)}</td>
                <td className="py-3 px-4 text-right font-bold text-amber-600">{formatCurrency(data.dailySales.reduce((sum, d) => sum + d.revenue, 0))}</td>
                <td className="py-3 px-4 text-right font-bold text-gray-600">{formatCurrency(data.averageOrderValue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>

    {/* Sales Transactions Table */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Receipt className="h-5 w-5 text-amber-500" />
        Sales Transactions
        <Badge className="ml-2 bg-amber-100 text-amber-700">{data.transactions.length} transactions</Badge>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Order #</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Date</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Time</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Customer</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Cashier</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Type</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Payment</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Subtotal</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase">VAT (12%)</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.slice(0, 50).map((t) => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-amber-50/50">
                <td className="py-2 px-3 font-medium">{t.orderNumber}</td>
                <td className="py-2 px-3 text-gray-600">{t.date}</td>
                <td className="py-2 px-3 text-gray-600">{t.time}</td>
                <td className="py-2 px-3">{t.customer}</td>
                <td className="py-2 px-3">
                  <Badge variant="outline" className="text-xs">{t.cashier}</Badge>
                </td>
                <td className="py-2 px-3">
                  <Badge variant="secondary" className="text-xs">{t.orderType}</Badge>
                </td>
                <td className="py-2 px-3">{t.paymentMethod}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(t.subtotal)}</td>
                <td className="py-2 px-3 text-right text-gray-500">{formatCurrency(t.vat)}</td>
                <td className="py-2 px-3 text-right font-semibold text-amber-600">{formatCurrency(t.total)}</td>
              </tr>
            ))}
            {data.transactions.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-500">No transactions for selected period</td>
              </tr>
            )}
          </tbody>
          {data.transactions.length > 0 && (
            <tfoot className="bg-amber-50 border-t-2 border-amber-200">
              <tr>
                <td colSpan={7} className="py-3 px-3 font-bold">TOTALS ({data.transactions.length} transactions)</td>
                <td className="py-3 px-3 text-right font-bold">{formatCurrency(data.totalSubtotal)}</td>
                <td className="py-3 px-3 text-right font-bold text-gray-600">{formatCurrency(data.totalVAT)}</td>
                <td className="py-3 px-3 text-right font-bold text-amber-600">{formatCurrency(data.totalRevenue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        {data.transactions.length > 50 && (
          <p className="text-center text-sm text-gray-500 mt-4">Showing first 50 of {data.transactions.length} transactions. Export or print for full list.</p>
        )}
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

    {/* Inventory Summary Table */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Package className="h-5 w-5 text-amber-500" />
        Inventory Summary
        <Badge className="ml-2 bg-amber-100 text-amber-700">{data.inventoryItems?.length || 0} items</Badge>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Item Name</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Category</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Current Stock</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Min Stock</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Max Stock</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Cost/Unit</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Total Value</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data.inventoryItems || []).slice(0, 50).map((item, index) => (
              <tr key={`inv-${index}`} className="border-b border-gray-50 hover:bg-amber-50/50">
                <td className="py-2 px-3 font-medium">{item.name}</td>
                <td className="py-2 px-3 text-gray-600">{item.category}</td>
                <td className="py-2 px-3 text-right">{formatSmartStock(item.currentStock, item.unit)}</td>
                <td className="py-2 px-3 text-right text-gray-500">{formatSmartStock(item.minStock, item.unit)}</td>
                <td className="py-2 px-3 text-right text-gray-500">{formatSmartStock(item.maxStock, item.unit)}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(item.costPerUnit)}</td>
                <td className="py-2 px-3 text-right font-semibold text-amber-600">{formatCurrency(item.value)}</td>
                <td className="py-2 px-3 text-center">
                  <Badge variant={item.status === 'Out of Stock' ? 'destructive' : item.status === 'Low Stock' ? 'outline' : 'secondary'} 
                    className={item.status === 'Low Stock' ? 'border-amber-500 text-amber-600' : item.status === 'OK' ? 'bg-green-100 text-green-700' : ''}>
                    {item.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {(!data.inventoryItems || data.inventoryItems.length === 0) && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">No inventory items found</td>
              </tr>
            )}
          </tbody>
          {data.inventoryItems && data.inventoryItems.length > 0 && (
            <tfoot className="bg-amber-50 border-t-2 border-amber-200">
              <tr>
                <td colSpan={6} className="py-3 px-3 font-bold">TOTAL ({data.inventoryItems.length} items)</td>
                <td className="py-3 px-3 text-right font-bold text-amber-600">{formatCurrency(data.totalValue)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
        {data.inventoryItems && data.inventoryItems.length > 50 && (
          <p className="text-center text-sm text-gray-500 mt-4">Showing first 50 of {data.inventoryItems.length} items. Export or print for full list.</p>
        )}
      </div>
    </div>

    {/* Stock Transactions Table */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ArrowDownCircle className="h-5 w-5 text-amber-500" />
        Stock Transactions
        <Badge className="ml-2 bg-amber-100 text-amber-700">{data.stockTransactions?.length || 0} transactions</Badge>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Date</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Time</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Item</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Category</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Type</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Reason</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Quantity</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(data.stockTransactions || []).slice(0, 50).map((tx) => (
              <tr key={tx.id} className="border-b border-gray-50 hover:bg-amber-50/50">
                <td className="py-2 px-3 text-gray-600">{tx.date}</td>
                <td className="py-2 px-3 text-gray-600">{tx.time}</td>
                <td className="py-2 px-3 font-medium">{tx.itemName}</td>
                <td className="py-2 px-3 text-gray-600">{tx.category}</td>
                <td className="py-2 px-3 text-center">
                  <Badge variant={tx.type === 'IN' ? 'secondary' : 'destructive'} 
                    className={tx.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {tx.type === 'IN' ? '+ IN' : '- OUT'}
                  </Badge>
                </td>
                <td className="py-2 px-3">
                  <Badge variant="outline" className="text-xs">{tx.reason}</Badge>
                </td>
                <td className="py-2 px-3 text-right font-semibold">{tx.quantity} {tx.unit}</td>
                <td className="py-2 px-3 text-gray-500 text-xs max-w-[150px] truncate">{tx.notes || '-'}</td>
              </tr>
            ))}
            {(!data.stockTransactions || data.stockTransactions.length === 0) && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">No stock transactions found</td>
              </tr>
            )}
          </tbody>
          {data.stockTransactions && data.stockTransactions.length > 0 && (
            <tfoot className="bg-amber-50 border-t-2 border-amber-200">
              <tr>
                <td colSpan={8} className="py-3 px-3 font-bold">
                  TOTAL: {data.stockTransactions.length} transactions 
                  ({data.stockTransactions.filter(t => t.type === 'IN').length} IN / {data.stockTransactions.filter(t => t.type === 'OUT').length} OUT)
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        {data.stockTransactions && data.stockTransactions.length > 50 && (
          <p className="text-center text-sm text-gray-500 mt-4">Showing first 50 of {data.stockTransactions.length} transactions. Export or print for full list.</p>
        )}
      </div>
    </div>
  </div>
)
