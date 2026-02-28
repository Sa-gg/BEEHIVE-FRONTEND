import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { AnimatedNumber } from '../../components/common/AnimatedNumber'
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
import { expensesApi, type Expense } from '../../../infrastructure/api/expenses.api'
import { formatSmartStock } from '../../../shared/utils/stockFormat'
import { DateFilter, type DateFilterValue, getDateRangeFromPreset } from '../../components/common/DateFilter'
import { printWithIframe } from '../../../shared/utils/printUtils'
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'

const COLORS = ['#F9C900', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

type ReportTab = 'sales' | 'inventory' | 'expenses'
type PrintOption = 'full' | 'transactions' | 'summary' | 'stock-transactions'

interface SalesTransaction {
  id: string
  orderNumber: string
  date: string
  time: string
  customer: string
  cashier: string
  processedBy: string
  orderType: string
  paymentMethod: string
  paymentStatus: string
  grossAmount: number
  discountAmount: number
  deliveryFee: number
  serviceFee: number
  netAmount: number
  vatAmount: number
  total: number
}

// Industry-standard POS Sales Report Data Structure
interface SalesReportData {
  // Revenue Metrics
  grossSales: number              // Total sales before any deductions
  totalDiscounts: number          // Total discounts given
  netSales: number                // Gross - Discounts
  totalVAT: number                // VAT amount (12/112 of net sales for VAT-inclusive)
  vatableSales: number            // Sales before VAT
  totalDeliveryFees: number       // Delivery fees collected
  totalServiceFees: number        // Service fees collected
  totalRevenue: number            // Final revenue (net sales + fees)
  
  // Order Metrics
  totalOrders: number             // Total order count
  averageOrderValue: number       // AOV
  totalItems: number              // Items sold
  averageItemsPerOrder: number    // Basket size
  
  // Payment Status Breakdown (Industry Standard)
  paidOrders: { count: number; amount: number }
  refundedOrders: { count: number; amount: number }
  voidedOrders: { count: number; amount: number }
  complimentaryOrders: { count: number; amount: number }
  writtenOffOrders: { count: number; amount: number }
  unpaidOrders: { count: number; amount: number }
  
  // Staff Performance
  salesByCashier: Array<{ name: string; orders: number; revenue: number; avgOrder: number }>
  
  // Breakdowns
  dailySales: Array<{ date: string; grossSales: number; discounts: number; netSales: number; orders: number; items: number }>
  categoryBreakdown: Array<{ category: string; revenue: number; count: number; percentage: number }>
  paymentMethods: Array<{ method: string; amount: number; count: number; percentage: number }>
  orderTypes: Array<{ type: string; revenue: number; count: number; percentage: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number; percentage: number }>
  hourlyDistribution: Array<{ hour: string; orders: number; revenue: number }>
  
  // Transaction List
  transactions: SalesTransaction[]
  
  // Period Info
  periodLabel: string
  reportGeneratedAt: string
}

// Industry-standard Inventory Report Data Structure
interface InventoryReportData {
  // Summary Metrics
  totalItems: number                    // Total SKUs in inventory
  activeItems: number                   // Non-archived items
  totalValue: number                    // Total inventory value at cost
  averageItemValue: number              // Average value per item
  
  // Stock Level Metrics (Industry Standard)
  inStockCount: number                  // Items with adequate stock
  lowStockCount: number                 // Items below reorder point
  outOfStockCount: number               // Items with zero stock
  overstockCount: number                // Items above max stock
  discrepancyCount: number              // Items with stock issues
  
  // Financial Metrics
  totalCostValue: number                // Sum of (currentStock * costPerUnit)
  potentialWasteValue: number           // Value of items approaching spoilage (if applicable)
  reorderValue: number                  // Estimated cost to bring low stock items to par
  
  // Turnover & Movement (Industry KPIs)
  stockTurnoverRate: number             // How quickly inventory is sold/used
  averageDaysToRestock: number          // Average restocking frequency
  fastMovingItems: Array<{ name: string; category: string; movement: number; currentStock: number; unit: string }>
  slowMovingItems: Array<{ name: string; category: string; movement: number; currentStock: number; unit: string; daysStagnant: number }>
  
  // Category Analysis
  categoryDistribution: Array<{ 
    category: string
    count: number
    value: number
    percentage: number
    inStock: number
    lowStock: number
    outOfStock: number
  }>
  
  // Stock Status Distribution
  stockStatus: Array<{ status: string; count: number; value: number; percentage: number }>
  
  // Items Requiring Attention
  lowStockItems: Array<{ 
    name: string
    category: string
    currentStock: number
    minStock: number
    maxStock: number
    unit: string
    costPerUnit: number
    reorderQuantity: number
    reorderCost: number
    daysUntilOutOfStock: number
    urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  }>
  
  // Overstock Items
  overstockItems: Array<{
    name: string
    category: string
    currentStock: number
    maxStock: number
    unit: string
    excessQuantity: number
    excessValue: number
  }>
  
  // Full Inventory List
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
    stockLevel: number           // Percentage of max
    supplier: string
    lastRestocked: string
    restockFrequencyDays: number
  }>
  
  // Stock Transactions
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
    balanceBefore: number
    balanceAfter: number
    status: string
    notes: string
  }>
  
  // Transaction Summary
  transactionSummary: {
    totalTransactions: number
    stockInCount: number
    stockOutCount: number
    totalStockIn: number
    totalStockOut: number
    netMovement: number
    reasonBreakdown: Array<{ reason: string; count: number; quantity: number; type: 'IN' | 'OUT' }>
  }
  
  // Inventory Trend (for charts)
  inventoryTrend: Array<{ date: string; value: number; items: number }>
  
  // Period Info
  periodLabel: string
  reportGeneratedAt: string
}

interface ExpenseReportData {
  totalExpenses: number
  monthlyExpenses: number
  expenseCount: number
  categoryBreakdown: Array<{ name: string; value: number }>
  dailyTrend: Array<{ day: string; total: number }>
  expenses: Expense[]
}

export const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales')
  const [customDateFilter, setCustomDateFilter] = useState<DateFilterValue>({ preset: 'month', startDate: null, endDate: null })
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<SalesReportData | null>(null)
  const [inventoryData, setInventoryData] = useState<InventoryReportData | null>(null)
  const [expenseData, setExpenseData] = useState<ExpenseReportData | null>(null)
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
      } else if (activeTab === 'inventory') {
        await loadInventoryReport()
      } else if (activeTab === 'expenses') {
        await loadExpensesReport()
      }
    } catch (error) {
      console.error('Failed to load report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSalesReport = async () => {
    try {
      // Get all orders from API
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

      // Period label for report header
      const periodLabel = customDateFilter.preset === 'custom' 
        ? `${startDate?.toLocaleDateString()} - ${endDate?.toLocaleDateString()}`
        : customDateFilter.preset === 'today' ? 'Today'
        : customDateFilter.preset === 'week' ? 'This Week'
        : customDateFilter.preset === 'month' ? 'This Month'
        : customDateFilter.preset

      // Filter orders by date range (include ALL statuses for comprehensive reporting)
      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.completedAt || order.createdAt)
        const matchesDate = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate)
        // Include COMPLETED and CANCELLED orders (for voided tracking)
        return (order.status === 'COMPLETED' || order.status === 'CANCELLED') && matchesDate
      })

      // Separate orders by payment status for industry-standard breakdown
      const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'PAID')
      const refundedOrders = filteredOrders.filter(o => o.paymentStatus === 'REFUNDED')
      const voidedOrders = filteredOrders.filter(o => o.paymentStatus === 'VOIDED')
      const complimentaryOrders = filteredOrders.filter(o => o.paymentStatus === 'COMPLIMENTARY')
      const writtenOffOrders = filteredOrders.filter(o => o.paymentStatus === 'WRITTEN_OFF')
      const unpaidOrders = filteredOrders.filter(o => o.paymentStatus === 'UNPAID')

      // Calculate Gross Sales (total of all PAID orders before deductions)
      const grossSales = paidOrders.reduce((sum, o) => sum + o.totalAmount + (o.discountAmount || 0), 0)
      const totalDiscounts = paidOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0)
      const netSales = grossSales - totalDiscounts
      
      // Delivery and Service Fees
      const totalDeliveryFees = paidOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0)
      const totalServiceFees = paidOrders.reduce((sum, o) => sum + (o.serviceFee || 0), 0)
      
      // VAT Calculation (12/112 for VAT-inclusive pricing in Philippines)
      // Net Sales already includes VAT, so we extract it
      const salesWithoutFees = netSales - totalDeliveryFees - totalServiceFees
      const totalVAT = salesWithoutFees * (12 / 112)  // VAT is inclusive
      const vatableSales = salesWithoutFees - totalVAT
      
      // Total Revenue is the actual money received
      const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0)
      
      // Order Metrics
      const totalOrders = paidOrders.length
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const totalItems = paidOrders.reduce((sum, order) => 
        sum + (order.order_items || []).reduce((itemSum: number, item: { quantity: number }) => itemSum + item.quantity, 0), 0)
      const averageItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0

      // Staff Performance - Sales by Cashier/Staff
      const cashierMap = new Map<string, { orders: number; revenue: number }>()
      paidOrders.forEach(order => {
        const cashierName = order.processedBy || order.createdBy || 'System'
        const existing = cashierMap.get(cashierName) || { orders: 0, revenue: 0 }
        cashierMap.set(cashierName, {
          orders: existing.orders + 1,
          revenue: existing.revenue + order.totalAmount
        })
      })
      const salesByCashier = Array.from(cashierMap.entries())
        .map(([name, data]) => ({
          name,
          orders: data.orders,
          revenue: data.revenue,
          avgOrder: data.orders > 0 ? data.revenue / data.orders : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)

      // Daily sales breakdown with more metrics
      const dailySalesMap = new Map<string, { grossSales: number; discounts: number; netSales: number; orders: number; items: number }>()
      paidOrders.forEach(order => {
        const date = new Date(order.completedAt || order.createdAt).toISOString().split('T')[0]
        const existing = dailySalesMap.get(date) || { grossSales: 0, discounts: 0, netSales: 0, orders: 0, items: 0 }
        const orderItems = (order.order_items || []).reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)
        dailySalesMap.set(date, {
          grossSales: existing.grossSales + order.totalAmount + (order.discountAmount || 0),
          discounts: existing.discounts + (order.discountAmount || 0),
          netSales: existing.netSales + order.totalAmount,
          orders: existing.orders + 1,
          items: existing.items + orderItems
        })
      })
      const dailySales = Array.from(dailySalesMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Payment methods breakdown with percentages
      const paymentMap = new Map<string, { amount: number; count: number }>()
      paidOrders.forEach(order => {
        const method = order.paymentMethod || 'Unknown'
        const existing = paymentMap.get(method) || { amount: 0, count: 0 }
        paymentMap.set(method, {
          amount: existing.amount + order.totalAmount,
          count: existing.count + 1
        })
      })
      const paymentMethods = Array.from(paymentMap.entries())
        .map(([method, data]) => ({
          method,
          ...data,
          percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)

      // Order types breakdown with percentages
      const orderTypeMap = new Map<string, { revenue: number; count: number }>()
      paidOrders.forEach(order => {
        const type = order.orderType || 'Unknown'
        const existing = orderTypeMap.get(type) || { revenue: 0, count: 0 }
        orderTypeMap.set(type, {
          revenue: existing.revenue + order.totalAmount,
          count: existing.count + 1
        })
      })
      const orderTypes = Array.from(orderTypeMap.entries())
        .map(([type, data]) => ({
          type: type.replace('_', ' '),
          ...data,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)

      // Top products - using menu item names with percentages
      const productMap = new Map<string, { quantity: number; revenue: number }>()
      paidOrders.forEach(order => {
        (order.order_items || []).forEach((item: { menuItemId: string; quantity: number; subtotal: number }) => {
          const itemName = menuItems.get(item.menuItemId) || item.menuItemId
          const existing = productMap.get(itemName) || { quantity: 0, revenue: 0 }
          productMap.set(itemName, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.subtotal
          })
        })
      })
      const productRevenue = Array.from(productMap.values()).reduce((sum, p) => sum + p.revenue, 0)
      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({
          name,
          ...data,
          percentage: productRevenue > 0 ? (data.revenue / productRevenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15)

      // Hourly distribution
      const hourlyMap = new Map<string, { orders: number; revenue: number }>()
      paidOrders.forEach(order => {
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
      const categoryTotalRevenue = salesReport?.categorySales?.reduce((sum, cat) => sum + cat.revenue, 0) || 1
      const categoryBreakdown = salesReport?.categorySales?.map(cat => ({
        category: cat.category,
        revenue: cat.revenue,
        count: cat.orders,
        percentage: (cat.revenue / categoryTotalRevenue) * 100
      })) || []

      // Build transactions list with all industry-standard fields
      const transactions: SalesTransaction[] = filteredOrders
        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
        .map(order => {
          // VAT is inclusive (12/112 of total)
          const vatAmount = order.totalAmount * (12 / 112)
          const netAmount = order.totalAmount - vatAmount
          const orderDate = new Date(order.completedAt || order.createdAt)
          return {
            id: order.id,
            orderNumber: order.orderNumber,
            date: orderDate.toLocaleDateString(),
            time: orderDate.toLocaleTimeString(),
            customer: order.customerName || 'Walk-in',
            cashier: order.createdBy || 'System',
            processedBy: order.processedBy || '-',
            orderType: order.orderType.replace('_', ' '),
            paymentMethod: order.paymentMethod || 'N/A',
            paymentStatus: order.paymentStatus,
            grossAmount: order.totalAmount + (order.discountAmount || 0),
            discountAmount: order.discountAmount || 0,
            deliveryFee: order.deliveryFee || 0,
            serviceFee: order.serviceFee || 0,
            netAmount,
            vatAmount,
            total: order.totalAmount
          }
        })

      setSalesData({
        // Revenue Metrics
        grossSales,
        totalDiscounts,
        netSales,
        totalVAT,
        vatableSales,
        totalDeliveryFees,
        totalServiceFees,
        totalRevenue,
        
        // Order Metrics
        totalOrders,
        averageOrderValue,
        totalItems,
        averageItemsPerOrder,
        
        // Payment Status Breakdown
        paidOrders: { count: paidOrders.length, amount: paidOrders.reduce((s, o) => s + o.totalAmount, 0) },
        refundedOrders: { count: refundedOrders.length, amount: refundedOrders.reduce((s, o) => s + o.totalAmount, 0) },
        voidedOrders: { count: voidedOrders.length, amount: voidedOrders.reduce((s, o) => s + o.totalAmount, 0) },
        complimentaryOrders: { count: complimentaryOrders.length, amount: complimentaryOrders.reduce((s, o) => s + o.totalAmount, 0) },
        writtenOffOrders: { count: writtenOffOrders.length, amount: writtenOffOrders.reduce((s, o) => s + o.totalAmount, 0) },
        unpaidOrders: { count: unpaidOrders.length, amount: unpaidOrders.reduce((s, o) => s + o.totalAmount, 0) },
        
        // Staff Performance
        salesByCashier,
        
        // Breakdowns
        dailySales,
        categoryBreakdown,
        paymentMethods,
        orderTypes,
        topProducts,
        hourlyDistribution,
        transactions,
        
        // Period Info
        periodLabel,
        reportGeneratedAt: new Date().toLocaleString()
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

      // Generate period label
      let periodLabel = ''
      if (customDateFilter.preset === 'custom' && startDate && endDate) {
        periodLabel = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
      } else {
        const presetLabels: Record<string, string> = {
          today: 'Today',
          yesterday: 'Yesterday',
          week: 'This Week',
          month: 'This Month',
          quarter: 'This Quarter',
          year: 'This Year',
          all: 'All Time'
        }
        periodLabel = presetLabels[customDateFilter.preset] || customDateFilter.preset
      }

      const [inventoryItems, allTransactions] = await Promise.all([
        inventoryApi.getAll(),
        stockTransactionApi.getAllTransactions({
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        })
      ])

      // All inventory items are considered active (no archive feature yet)
      const activeItems = inventoryItems
      const totalItems = inventoryItems.length
      const activeItemsCount = activeItems.length

      // ========== STOCK LEVEL METRICS (Industry Standard) ==========
      const inStockCount = activeItems.filter(i => i.status === 'IN_STOCK').length
      const lowStockCount = activeItems.filter(i => i.status === 'LOW_STOCK').length
      const outOfStockCount = activeItems.filter(i => i.status === 'OUT_OF_STOCK').length
      const discrepancyCount = activeItems.filter(i => i.currentStock < 0).length
      const overstockCount = activeItems.filter(i => i.currentStock > i.maxStock).length

      // ========== FINANCIAL METRICS ==========
      const totalCostValue = activeItems.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0)
      const averageItemValue = activeItemsCount > 0 ? totalCostValue / activeItemsCount : 0
      
      // Calculate reorder value (cost to bring low stock items to minStock level)
      const reorderValue = activeItems
        .filter(i => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK')
        .reduce((sum, item) => {
          const reorderQty = Math.max(0, item.minStock - item.currentStock)
          return sum + (reorderQty * item.costPerUnit)
        }, 0)

      // ========== MOVEMENT ANALYSIS ==========
      // Calculate movement from transactions
      const itemMovementMap = new Map<string, number>()
      allTransactions.forEach(tx => {
        const itemId = tx.inventoryItemId
        const existing = itemMovementMap.get(itemId) || 0
        itemMovementMap.set(itemId, existing + tx.quantity)
      })

      // Fast moving items (highest movement)
      const fastMovingItems = activeItems
        .map(item => ({
          name: item.name,
          category: item.category,
          movement: itemMovementMap.get(item.id) || 0,
          currentStock: item.currentStock,
          unit: item.unit
        }))
        .filter(i => i.movement > 0)
        .sort((a, b) => b.movement - a.movement)
        .slice(0, 10)

      // Slow moving items (no movement in period)
      const slowMovingItems = activeItems
        .filter(item => !itemMovementMap.has(item.id) || itemMovementMap.get(item.id) === 0)
        .filter(item => item.currentStock > 0) // Only items with stock
        .map(item => {
          const daysSinceRestock = Math.floor((Date.now() - new Date(item.lastRestocked || item.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          return {
            name: item.name,
            category: item.category,
            movement: 0,
            currentStock: item.currentStock,
            unit: item.unit,
            daysStagnant: daysSinceRestock
          }
        })
        .sort((a, b) => b.daysStagnant - a.daysStagnant)
        .slice(0, 10)

      // Average restocking frequency
      const avgRestockDays = activeItems.reduce((sum, i) => sum + (i.restockFrequencyDays || 7), 0) / Math.max(activeItemsCount, 1)

      // Stock turnover rate (simplified: total OUT transactions / average inventory)
      const totalOutQty = allTransactions.filter(t => t.type === 'OUT').reduce((s, t) => s + t.quantity, 0)
      const stockTurnoverRate = totalCostValue > 0 ? (totalOutQty / Math.max(totalItems, 1)) : 0

      // ========== CATEGORY ANALYSIS ==========
      const categoryMap = new Map<string, { count: number; value: number; inStock: number; lowStock: number; outOfStock: number }>()
      activeItems.forEach(item => {
        const existing = categoryMap.get(item.category) || { count: 0, value: 0, inStock: 0, lowStock: 0, outOfStock: 0 }
        categoryMap.set(item.category, {
          count: existing.count + 1,
          value: existing.value + (item.currentStock * item.costPerUnit),
          inStock: existing.inStock + (item.status === 'IN_STOCK' ? 1 : 0),
          lowStock: existing.lowStock + (item.status === 'LOW_STOCK' ? 1 : 0),
          outOfStock: existing.outOfStock + (item.status === 'OUT_OF_STOCK' ? 1 : 0)
        })
      })
      const categoryDistribution = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          ...data,
          percentage: totalCostValue > 0 ? (data.value / totalCostValue) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)

      // ========== STOCK STATUS DISTRIBUTION ==========
      const inStockValue = activeItems.filter(i => i.status === 'IN_STOCK').reduce((s, i) => s + i.currentStock * i.costPerUnit, 0)
      const lowStockValue = activeItems.filter(i => i.status === 'LOW_STOCK').reduce((s, i) => s + i.currentStock * i.costPerUnit, 0)
      const outOfStockValue = activeItems.filter(i => i.status === 'OUT_OF_STOCK').reduce((s, i) => s + i.currentStock * i.costPerUnit, 0)
      
      const stockStatus = [
        { status: 'In Stock', count: inStockCount, value: inStockValue, percentage: totalCostValue > 0 ? (inStockValue / totalCostValue) * 100 : 0 },
        { status: 'Low Stock', count: lowStockCount, value: lowStockValue, percentage: totalCostValue > 0 ? (lowStockValue / totalCostValue) * 100 : 0 },
        { status: 'Out of Stock', count: outOfStockCount, value: outOfStockValue, percentage: totalCostValue > 0 ? (outOfStockValue / totalCostValue) * 100 : 0 }
      ]

      // ========== LOW STOCK ITEMS (with urgency) ==========
      const lowStockItems = activeItems
        .filter(item => item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK')
        .map(item => {
          // Calculate reorder quantity (bring up to maxStock or at least minStock + buffer)
          const reorderQty = Math.max(item.maxStock - item.currentStock, item.minStock - item.currentStock)
          // Estimate days until out of stock (based on transaction history)
          const itemMovement = itemMovementMap.get(item.id) || 0
          const dailyUsage = itemMovement / 30 // Rough daily usage estimate
          const daysUntilOut = dailyUsage > 0 ? Math.floor(item.currentStock / dailyUsage) : 999
          // Urgency based on current stock vs min stock
          let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM'
          if (item.currentStock === 0) urgency = 'CRITICAL'
          else if (item.currentStock < item.minStock * 0.5) urgency = 'HIGH'
          
          return {
            name: item.name,
            category: item.category,
            currentStock: item.currentStock,
            minStock: item.minStock,
            maxStock: item.maxStock,
            unit: item.unit,
            costPerUnit: item.costPerUnit,
            reorderQuantity: Math.max(0, reorderQty),
            reorderCost: Math.max(0, reorderQty) * item.costPerUnit,
            daysUntilOutOfStock: daysUntilOut,
            urgency
          }
        })
        .sort((a, b) => {
          // Sort by urgency first, then by days until out
          const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 }
          if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
          }
          return a.daysUntilOutOfStock - b.daysUntilOutOfStock
        })

      // ========== OVERSTOCK ITEMS ==========
      const overstockItems = activeItems
        .filter(item => item.currentStock > item.maxStock)
        .map(item => ({
          name: item.name,
          category: item.category,
          currentStock: item.currentStock,
          maxStock: item.maxStock,
          unit: item.unit,
          excessQuantity: item.currentStock - item.maxStock,
          excessValue: (item.currentStock - item.maxStock) * item.costPerUnit
        }))
        .sort((a, b) => b.excessValue - a.excessValue)

      // ========== FULL INVENTORY LIST ==========
      const inventoryItemsList = activeItems.map(item => ({
        name: item.name,
        category: item.category,
        currentStock: item.currentStock,
        minStock: item.minStock,
        maxStock: item.maxStock,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        value: item.currentStock * item.costPerUnit,
        status: item.status,
        stockLevel: item.maxStock > 0 ? Math.round((item.currentStock / item.maxStock) * 100) : 0,
        supplier: item.supplier || 'N/A',
        lastRestocked: item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString() : 'Never',
        restockFrequencyDays: item.restockFrequencyDays || 7
      })).sort((a, b) => a.name.localeCompare(b.name))

      // ========== STOCK TRANSACTIONS ==========
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
            type: tx.type as 'IN' | 'OUT',
            reason: tx.reason,
            quantity: tx.quantity,
            unit: tx.inventory_item?.unit || '',
            balanceBefore: tx.balanceBefore || 0,
            balanceAfter: tx.balanceAfter || 0,
            status: tx.status || 'NORMAL',
            notes: tx.notes || ''
          }
        })

      // ========== TRANSACTION SUMMARY ==========
      const stockInTransactions = stockTransactions.filter(t => t.type === 'IN')
      const stockOutTransactions = stockTransactions.filter(t => t.type === 'OUT')
      const totalStockIn = stockInTransactions.reduce((s, t) => s + t.quantity, 0)
      const totalStockOut = stockOutTransactions.reduce((s, t) => s + t.quantity, 0)
      
      // Reason breakdown
      const reasonMap = new Map<string, { count: number; quantity: number; type: 'IN' | 'OUT' }>()
      stockTransactions.forEach(tx => {
        const key = `${tx.reason}-${tx.type}`
        const existing = reasonMap.get(key) || { count: 0, quantity: 0, type: tx.type }
        reasonMap.set(key, {
          count: existing.count + 1,
          quantity: existing.quantity + tx.quantity,
          type: tx.type
        })
      })
      const reasonBreakdown = Array.from(reasonMap.entries())
        .map(([key, data]) => ({
          reason: key.split('-')[0],
          ...data
        }))
        .sort((a, b) => b.quantity - a.quantity)

      const transactionSummary = {
        totalTransactions: stockTransactions.length,
        stockInCount: stockInTransactions.length,
        stockOutCount: stockOutTransactions.length,
        totalStockIn,
        totalStockOut,
        netMovement: totalStockIn - totalStockOut,
        reasonBreakdown
      }

      // ========== INVENTORY TREND (last 30 days or selected period) ==========
      const inventoryTrend: Array<{ date: string; value: number; items: number }> = []
      const trendDays = 30
      for (let i = trendDays; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        // Calculate approximate value for each day (simplified)
        const dayTransactions = stockTransactions.filter(tx => {
          const txDate = new Date(tx.date)
          return txDate.toDateString() === date.toDateString()
        })
        const dayChange = dayTransactions.reduce((sum, tx) => 
          sum + (tx.type === 'IN' ? tx.quantity : -tx.quantity), 0)
        
        inventoryTrend.push({
          date: date.toISOString().split('T')[0],
          value: totalCostValue - (dayChange * averageItemValue), // Approximate
          items: activeItemsCount
        })
      }

      setInventoryData({
        // Summary Metrics
        totalItems,
        activeItems: activeItemsCount,
        totalValue: totalCostValue,
        averageItemValue,
        
        // Stock Level Metrics
        inStockCount,
        lowStockCount,
        outOfStockCount,
        overstockCount,
        discrepancyCount,
        
        // Financial Metrics
        totalCostValue,
        potentialWasteValue: 0, // Can be calculated if expiry dates are tracked
        reorderValue,
        
        // Turnover & Movement
        stockTurnoverRate,
        averageDaysToRestock: avgRestockDays,
        fastMovingItems,
        slowMovingItems,
        
        // Category Analysis
        categoryDistribution,
        
        // Stock Status Distribution
        stockStatus,
        
        // Items Requiring Attention
        lowStockItems,
        overstockItems,
        
        // Full Inventory List
        inventoryItems: inventoryItemsList,
        
        // Stock Transactions
        stockTransactions,
        transactionSummary,
        
        // Inventory Trend
        inventoryTrend,
        
        // Period Info
        periodLabel,
        reportGeneratedAt: new Date().toLocaleString()
      })
    } catch (error) {
      console.error('Failed to load inventory report:', error)
    }
  }

  const loadExpensesReport = async () => {
    try {
      const expenses = await expensesApi.getAll()
      
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
      
      // Filter expenses by date range
      const filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date)
        return (!startDate || expenseDate >= startDate) && (!endDate || expenseDate <= endDate)
      })
      
      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
      const monthlyExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
      
      // Category breakdown for pie chart
      const categoryTotals: Record<string, number> = {}
      filteredExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount
      })
      const categoryBreakdown = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }))
      
      // Daily trend for bar chart
      const dailyTotals: Record<string, number> = {}
      filteredExpenses.forEach(exp => {
        const day = new Date(exp.date).getDate().toString()
        dailyTotals[day] = (dailyTotals[day] || 0) + exp.amount
      })
      const dailyTrend = Object.entries(dailyTotals)
        .map(([day, total]) => ({ day, total }))
        .sort((a, b) => parseInt(a.day) - parseInt(b.day))
      
      setExpenseData({
        totalExpenses,
        monthlyExpenses,
        expenseCount: filteredExpenses.length,
        categoryBreakdown,
        dailyTrend,
        expenses: filteredExpenses
      })
    } catch (error) {
      console.error('Failed to load expenses report:', error)
    }
  }

  const handlePrint = (option: PrintOption) => {
    if (!salesData && activeTab === 'sales') return
    if (!inventoryData && activeTab === 'inventory') return
    if (!expenseData && activeTab === 'expenses') return

    let content = ''
    
    if (activeTab === 'sales' && salesData) {
      if (option === 'full') {
        // Full industry-grade report with all financial breakdowns
        content = `
          <div class="report-header">
            <h1 style="text-align:center;margin-bottom:5px">SALES REPORT</h1>
            <p style="text-align:center;color:#666;margin-bottom:20px">${salesData.periodLabel} | Generated: ${salesData.reportGeneratedAt}</p>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card"><h3>₱${salesData.grossSales.toLocaleString()}</h3><p>Gross Sales</p></div>
            <div class="stat-card"><h3>₱${salesData.totalDiscounts.toLocaleString()}</h3><p>Discounts</p></div>
            <div class="stat-card"><h3>₱${salesData.netSales.toLocaleString()}</h3><p>Net Sales</p></div>
            <div class="stat-card"><h3>₱${salesData.totalRevenue.toLocaleString()}</h3><p>Total Revenue</p></div>
          </div>
          
          <div class="section">
            <h2>Financial Summary</h2>
            <table>
              <tbody>
                <tr><td>Gross Sales</td><td style="text-align:right">₱${salesData.grossSales.toFixed(2)}</td></tr>
                <tr><td>Less: Discounts</td><td style="text-align:right">(₱${salesData.totalDiscounts.toFixed(2)})</td></tr>
                <tr style="font-weight:bold"><td>Net Sales</td><td style="text-align:right">₱${salesData.netSales.toFixed(2)}</td></tr>
                <tr><td>Add: Delivery Fees</td><td style="text-align:right">₱${salesData.totalDeliveryFees.toFixed(2)}</td></tr>
                <tr><td>Add: Service Fees</td><td style="text-align:right">₱${salesData.totalServiceFees.toFixed(2)}</td></tr>
                <tr style="font-weight:bold;background:#f0f0f0"><td>Total Revenue</td><td style="text-align:right">₱${salesData.totalRevenue.toFixed(2)}</td></tr>
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>VAT Summary (12%)</h2>
            <table>
              <tbody>
                <tr><td>Vatable Sales (Net of VAT)</td><td style="text-align:right">₱${salesData.vatableSales.toFixed(2)}</td></tr>
                <tr><td>VAT Amount</td><td style="text-align:right">₱${salesData.totalVAT.toFixed(2)}</td></tr>
                <tr style="font-weight:bold"><td>VAT-Inclusive Total</td><td style="text-align:right">₱${salesData.netSales.toFixed(2)}</td></tr>
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Payment Status Breakdown</h2>
            <table>
              <thead><tr><th>Status</th><th style="text-align:right">Orders</th><th style="text-align:right">Amount</th></tr></thead>
              <tbody>
                <tr><td>✅ Paid</td><td style="text-align:right">${salesData.paidOrders.count}</td><td style="text-align:right">₱${salesData.paidOrders.amount.toFixed(2)}</td></tr>
                <tr><td>⏳ Unpaid</td><td style="text-align:right">${salesData.unpaidOrders.count}</td><td style="text-align:right">₱${salesData.unpaidOrders.amount.toFixed(2)}</td></tr>
                <tr><td>↩️ Refunded</td><td style="text-align:right">${salesData.refundedOrders.count}</td><td style="text-align:right">₱${salesData.refundedOrders.amount.toFixed(2)}</td></tr>
                <tr><td>🚫 Voided</td><td style="text-align:right">${salesData.voidedOrders.count}</td><td style="text-align:right">₱${salesData.voidedOrders.amount.toFixed(2)}</td></tr>
                <tr><td>🎁 Complimentary</td><td style="text-align:right">${salesData.complimentaryOrders.count}</td><td style="text-align:right">₱${salesData.complimentaryOrders.amount.toFixed(2)}</td></tr>
                <tr><td>📝 Written Off</td><td style="text-align:right">${salesData.writtenOffOrders.count}</td><td style="text-align:right">₱${salesData.writtenOffOrders.amount.toFixed(2)}</td></tr>
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Key Metrics</h2>
            <table>
              <tbody>
                <tr><td>Total Orders</td><td style="text-align:right">${salesData.totalOrders}</td></tr>
                <tr><td>Total Items Sold</td><td style="text-align:right">${salesData.totalItems}</td></tr>
                <tr><td>Average Order Value</td><td style="text-align:right">₱${salesData.averageOrderValue.toFixed(2)}</td></tr>
                <tr><td>Average Basket Size</td><td style="text-align:right">${salesData.averageItemsPerOrder.toFixed(1)} items</td></tr>
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Staff Performance</h2>
            <table>
              <thead><tr><th>Staff Member</th><th style="text-align:right">Orders</th><th style="text-align:right">Sales</th><th style="text-align:right">Avg Order</th></tr></thead>
              <tbody>
                ${salesData.salesByCashier.map(c => `<tr><td>${c.name}</td><td style="text-align:right">${c.orders}</td><td style="text-align:right">₱${c.revenue.toFixed(2)}</td><td style="text-align:right">₱${c.avgOrder.toFixed(2)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Daily Sales Breakdown</h2>
            <table>
              <thead><tr><th>Date</th><th style="text-align:right">Orders</th><th style="text-align:right">Gross</th><th style="text-align:right">Discounts</th><th style="text-align:right">Net Sales</th></tr></thead>
              <tbody>
                ${salesData.dailySales.map(d => `<tr><td>${d.date}</td><td style="text-align:right">${d.orders}</td><td style="text-align:right">₱${d.grossSales.toFixed(2)}</td><td style="text-align:right">₱${d.discounts.toFixed(2)}</td><td style="text-align:right">₱${d.netSales.toFixed(2)}</td></tr>`).join('')}
              </tbody>
              <tfoot class="totals-row">
                <tr><td><strong>TOTAL</strong></td><td style="text-align:right"><strong>${salesData.dailySales.reduce((s, d) => s + d.orders, 0)}</strong></td><td style="text-align:right"><strong>₱${salesData.grossSales.toFixed(2)}</strong></td><td style="text-align:right"><strong>₱${salesData.totalDiscounts.toFixed(2)}</strong></td><td style="text-align:right"><strong>₱${salesData.netSales.toFixed(2)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
          
          <div class="section">
            <h2>Top Selling Products</h2>
            <table>
              <thead><tr><th>#</th><th>Product</th><th style="text-align:right">Qty Sold</th><th style="text-align:right">Revenue</th><th style="text-align:right">% of Sales</th></tr></thead>
              <tbody>
                ${salesData.topProducts.map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td style="text-align:right">${p.quantity}</td><td style="text-align:right">₱${p.revenue.toFixed(2)}</td><td style="text-align:right">${salesData.netSales > 0 ? ((p.revenue / salesData.netSales) * 100).toFixed(1) : 0}%</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Payment Methods Summary</h2>
            <table>
              <thead><tr><th>Method</th><th style="text-align:right">Transactions</th><th style="text-align:right">Amount</th><th style="text-align:right">% of Total</th></tr></thead>
              <tbody>
                ${salesData.paymentMethods.map(p => `<tr><td>${p.method}</td><td style="text-align:right">${p.count}</td><td style="text-align:right">₱${p.amount.toFixed(2)}</td><td style="text-align:right">${salesData.totalRevenue > 0 ? ((p.amount / salesData.totalRevenue) * 100).toFixed(1) : 0}%</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Order Types Summary</h2>
            <table>
              <thead><tr><th>Type</th><th style="text-align:right">Orders</th><th style="text-align:right">Revenue</th><th style="text-align:right">% of Total</th></tr></thead>
              <tbody>
                ${salesData.orderTypes.map(t => `<tr><td>${t.type.replace('_', ' ')}</td><td style="text-align:right">${t.count}</td><td style="text-align:right">₱${t.revenue.toFixed(2)}</td><td style="text-align:right">${salesData.totalRevenue > 0 ? ((t.revenue / salesData.totalRevenue) * 100).toFixed(1) : 0}%</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section page-break">
            <h2>Transaction Log</h2>
            <table>
              <thead><tr><th>Order #</th><th>Date/Time</th><th>Customer</th><th>Staff</th><th>Type</th><th>Payment</th><th>Status</th><th style="text-align:right">Gross</th><th style="text-align:right">Discount</th><th style="text-align:right">Net</th></tr></thead>
              <tbody>
                ${salesData.transactions.map(t => `<tr><td>${t.orderNumber}</td><td>${t.date} ${t.time}</td><td>${t.customer}</td><td>${t.processedBy}</td><td>${t.orderType}</td><td>${t.paymentMethod}</td><td>${t.paymentStatus}</td><td style="text-align:right">₱${t.grossAmount.toFixed(2)}</td><td style="text-align:right">₱${t.discountAmount.toFixed(2)}</td><td style="text-align:right">₱${t.netAmount.toFixed(2)}</td></tr>`).join('')}
              </tbody>
              <tfoot class="totals-row">
                <tr><td colspan="7"><strong>TOTALS (${salesData.transactions.length} transactions)</strong></td><td style="text-align:right"><strong>₱${salesData.grossSales.toFixed(2)}</strong></td><td style="text-align:right"><strong>₱${salesData.totalDiscounts.toFixed(2)}</strong></td><td style="text-align:right"><strong>₱${salesData.netSales.toFixed(2)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
        `
      } else {
        // Transactions only summary
        content = `
          <div class="report-header">
            <h1 style="text-align:center;margin-bottom:5px">SALES TRANSACTIONS</h1>
            <p style="text-align:center;color:#666;margin-bottom:20px">${salesData.periodLabel} | Generated: ${salesData.reportGeneratedAt}</p>
          </div>
          
          <div class="summary-box">
            <h2>Sales Summary</h2>
            <div class="summary-grid">
              <div><span>Total Orders:</span><strong>${salesData.totalOrders}</strong></div>
              <div><span>Gross Sales:</span><strong>₱${salesData.grossSales.toLocaleString()}</strong></div>
              <div><span>Total Discounts:</span><strong>₱${salesData.totalDiscounts.toLocaleString()}</strong></div>
              <div><span>Net Sales:</span><strong>₱${salesData.netSales.toLocaleString()}</strong></div>
              <div><span>Delivery Fees:</span><strong>₱${salesData.totalDeliveryFees.toLocaleString()}</strong></div>
              <div><span>Service Fees:</span><strong>₱${salesData.totalServiceFees.toLocaleString()}</strong></div>
              <div><span>Total Revenue:</span><strong>₱${salesData.totalRevenue.toLocaleString()}</strong></div>
              <div><span>VAT Collected:</span><strong>₱${salesData.totalVAT.toLocaleString()}</strong></div>
            </div>
          </div>
          
          <div class="section">
            <h2>Payment Status Summary</h2>
            <table>
              <thead><tr><th>Status</th><th style="text-align:right">Orders</th><th style="text-align:right">Amount</th></tr></thead>
              <tbody>
                <tr><td>Paid</td><td style="text-align:right">${salesData.paidOrders.count}</td><td style="text-align:right">₱${salesData.paidOrders.amount.toFixed(2)}</td></tr>
                <tr><td>Unpaid</td><td style="text-align:right">${salesData.unpaidOrders.count}</td><td style="text-align:right">₱${salesData.unpaidOrders.amount.toFixed(2)}</td></tr>
                <tr><td>Refunded</td><td style="text-align:right">${salesData.refundedOrders.count}</td><td style="text-align:right">₱${salesData.refundedOrders.amount.toFixed(2)}</td></tr>
                <tr><td>Voided</td><td style="text-align:right">${salesData.voidedOrders.count}</td><td style="text-align:right">₱${salesData.voidedOrders.amount.toFixed(2)}</td></tr>
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Transaction Log</h2>
            <table>
              <thead><tr><th>Order #</th><th>Date/Time</th><th>Customer</th><th>Staff</th><th>Type</th><th>Payment</th><th>Status</th><th style="text-align:right">Gross</th><th style="text-align:right">Discount</th><th style="text-align:right">Net</th></tr></thead>
              <tbody>
                ${salesData.transactions.map(t => `<tr><td>${t.orderNumber}</td><td>${t.date} ${t.time}</td><td>${t.customer}</td><td>${t.processedBy}</td><td>${t.orderType}</td><td>${t.paymentMethod}</td><td>${t.paymentStatus}</td><td style="text-align:right">₱${t.grossAmount.toFixed(2)}</td><td style="text-align:right">₱${t.discountAmount.toFixed(2)}</td><td style="text-align:right">₱${t.netAmount.toFixed(2)}</td></tr>`).join('')}
              </tbody>
              <tfoot class="totals-row">
                <tr><td colspan="7"><strong>GRAND TOTALS</strong></td><td style="text-align:right"><strong>₱${salesData.grossSales.toFixed(2)}</strong></td><td style="text-align:right"><strong>₱${salesData.totalDiscounts.toFixed(2)}</strong></td><td style="text-align:right"><strong>₱${salesData.netSales.toFixed(2)}</strong></td></tr>
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
    } else if (activeTab === 'expenses' && expenseData) {
      // Expense report print handling
      if (option === 'full') {
        content = `
          <div class="stats-grid">
            <div class="stat-card"><h3>₱${expenseData.totalExpenses.toLocaleString()}</h3><p>Total All-Time</p></div>
            <div class="stat-card"><h3>₱${expenseData.monthlyExpenses.toLocaleString()}</h3><p>Period Total</p></div>
            <div class="stat-card"><h3>${expenseData.expenseCount}</h3><p>Expense Count</p></div>
          </div>
          
          <div class="section">
            <h2>Expenses by Category</h2>
            <table>
              <thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
              <tbody>
                ${expenseData.categoryBreakdown.map(c => `<tr><td>${c.name}</td><td style="text-align:right">₱${c.value.toFixed(2)}</td></tr>`).join('')}
              </tbody>
              <tfoot class="totals-row">
                <tr><td><strong>TOTAL</strong></td><td style="text-align:right"><strong>₱${expenseData.categoryBreakdown.reduce((sum, c) => sum + c.value, 0).toFixed(2)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
          
          <div class="section page-break">
            <h2>Expense Transactions</h2>
            <table>
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Frequency</th><th style="text-align:right">Amount</th></tr></thead>
              <tbody>
                ${expenseData.expenses.map(e => `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.description || '-'}</td><td>${e.frequency || 'One-time'}</td><td style="text-align:right">₱${e.amount.toFixed(2)}</td></tr>`).join('')}
              </tbody>
              <tfoot class="totals-row">
                <tr><td colspan="4"><strong>GRAND TOTAL</strong></td><td style="text-align:right"><strong>₱${expenseData.expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
        `
      } else {
        // Summary only
        content = `
          <div class="summary-box">
            <h2>Expense Summary</h2>
            <div class="summary-grid">
              <div><span>Total All-Time:</span><strong>₱${expenseData.totalExpenses.toLocaleString()}</strong></div>
              <div><span>Period Total:</span><strong>₱${expenseData.monthlyExpenses.toLocaleString()}</strong></div>
              <div><span>Expense Count:</span><strong>${expenseData.expenseCount}</strong></div>
            </div>
          </div>
          
          <div class="section">
            <h2>Expense Transactions Detail</h2>
            <table>
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Frequency</th><th style="text-align:right">Amount</th></tr></thead>
              <tbody>
                ${expenseData.expenses.map(e => `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.description || '-'}</td><td>${e.frequency || 'One-time'}</td><td style="text-align:right">₱${e.amount.toFixed(2)}</td></tr>`).join('')}
              </tbody>
              <tfoot class="totals-row">
                <tr><td colspan="4"><strong>GRAND TOTAL</strong></td><td style="text-align:right"><strong>₱${expenseData.expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
        `
      }
    }

    const reportTitle = activeTab === 'sales' 
      ? (option === 'full' ? 'Complete Sales Report' : 'Sales Transactions Summary')
      : activeTab === 'inventory'
      ? (option === 'full' ? 'Complete Inventory Report' : option === 'summary' ? 'Inventory Summary' : 'Stock Transactions Report')
      : (option === 'full' ? 'Complete Expense Report' : 'Expense Summary')

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeTab === 'sales' ? 'Sales' : activeTab === 'inventory' ? 'Inventory' : 'Expense'} Report - BEEHIVE</title>
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
            .totals-row td { border-top: 2px solid #F9C900; padding: 10px 6px; }
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
      csvContent += `Generated,${salesData.reportGeneratedAt}\n`
      csvContent += `Period,${salesData.periodLabel}\n\n`
      
      csvContent += 'FINANCIAL SUMMARY\n'
      csvContent += `Gross Sales,${salesData.grossSales.toFixed(2)}\n`
      csvContent += `Total Discounts,${salesData.totalDiscounts.toFixed(2)}\n`
      csvContent += `Net Sales,${salesData.netSales.toFixed(2)}\n`
      csvContent += `Delivery Fees,${salesData.totalDeliveryFees.toFixed(2)}\n`
      csvContent += `Service Fees,${salesData.totalServiceFees.toFixed(2)}\n`
      csvContent += `Total Revenue,${salesData.totalRevenue.toFixed(2)}\n\n`
      
      csvContent += 'VAT SUMMARY\n'
      csvContent += `Vatable Sales (Net of VAT),${salesData.vatableSales.toFixed(2)}\n`
      csvContent += `VAT Amount (12%),${salesData.totalVAT.toFixed(2)}\n\n`
      
      csvContent += 'PAYMENT STATUS BREAKDOWN\n'
      csvContent += 'Status,Orders,Amount\n'
      csvContent += `Paid,${salesData.paidOrders.count},${salesData.paidOrders.amount.toFixed(2)}\n`
      csvContent += `Unpaid,${salesData.unpaidOrders.count},${salesData.unpaidOrders.amount.toFixed(2)}\n`
      csvContent += `Refunded,${salesData.refundedOrders.count},${salesData.refundedOrders.amount.toFixed(2)}\n`
      csvContent += `Voided,${salesData.voidedOrders.count},${salesData.voidedOrders.amount.toFixed(2)}\n`
      csvContent += `Complimentary,${salesData.complimentaryOrders.count},${salesData.complimentaryOrders.amount.toFixed(2)}\n`
      csvContent += `Written Off,${salesData.writtenOffOrders.count},${salesData.writtenOffOrders.amount.toFixed(2)}\n\n`
      
      csvContent += 'KEY METRICS\n'
      csvContent += `Total Orders,${salesData.totalOrders}\n`
      csvContent += `Total Items Sold,${salesData.totalItems}\n`
      csvContent += `Average Order Value,${salesData.averageOrderValue.toFixed(2)}\n`
      csvContent += `Average Basket Size,${salesData.averageItemsPerOrder.toFixed(1)}\n\n`
      
      if (option === 'full') {
        csvContent += 'STAFF PERFORMANCE\n'
        csvContent += 'Staff Member,Orders,Sales,Average Order\n'
        salesData.salesByCashier.forEach(c => {
          csvContent += `"${c.name}",${c.orders},${c.revenue.toFixed(2)},${c.avgOrder.toFixed(2)}\n`
        })
        
        csvContent += '\nDAILY SALES\n'
        csvContent += 'Date,Orders,Gross Sales,Discounts,Net Sales\n'
        salesData.dailySales.forEach(day => {
          csvContent += `${day.date},${day.orders},${day.grossSales.toFixed(2)},${day.discounts.toFixed(2)},${day.netSales.toFixed(2)}\n`
        })
        
        csvContent += '\nTOP PRODUCTS\n'
        csvContent += 'Product,Quantity,Revenue,% of Sales\n'
        salesData.topProducts.forEach(product => {
          const pct = salesData.netSales > 0 ? ((product.revenue / salesData.netSales) * 100).toFixed(1) : '0'
          csvContent += `"${product.name}",${product.quantity},${product.revenue.toFixed(2)},${pct}%\n`
        })
        
        csvContent += '\nPAYMENT METHODS\n'
        csvContent += 'Method,Transactions,Amount,% of Total\n'
        salesData.paymentMethods.forEach(p => {
          const pct = salesData.totalRevenue > 0 ? ((p.amount / salesData.totalRevenue) * 100).toFixed(1) : '0'
          csvContent += `${p.method},${p.count},${p.amount.toFixed(2)},${pct}%\n`
        })
        
        csvContent += '\nORDER TYPES\n'
        csvContent += 'Type,Orders,Revenue,% of Total\n'
        salesData.orderTypes.forEach(t => {
          const pct = salesData.totalRevenue > 0 ? ((t.revenue / salesData.totalRevenue) * 100).toFixed(1) : '0'
          csvContent += `${t.type},${t.count},${t.revenue.toFixed(2)},${pct}%\n`
        })
      }
      
      csvContent += '\nTRANSACTION LOG\n'
      csvContent += 'Order #,Date,Time,Customer,Processed By,Order Type,Payment Method,Payment Status,Gross Amount,Discount,Delivery Fee,Service Fee,Net Amount,VAT Amount\n'
      salesData.transactions.forEach(t => {
        csvContent += `"${t.orderNumber}","${t.date}","${t.time}","${t.customer}","${t.processedBy}","${t.orderType}","${t.paymentMethod}","${t.paymentStatus}",${t.grossAmount.toFixed(2)},${t.discountAmount.toFixed(2)},${t.deliveryFee.toFixed(2)},${t.serviceFee.toFixed(2)},${t.netAmount.toFixed(2)},${t.vatAmount.toFixed(2)}\n`
      })
      csvContent += `\nTOTALS,,,,,,,Transactions:${salesData.transactions.length},${salesData.grossSales.toFixed(2)},${salesData.totalDiscounts.toFixed(2)},${salesData.totalDeliveryFees.toFixed(2)},${salesData.totalServiceFees.toFixed(2)},${salesData.netSales.toFixed(2)},${salesData.totalVAT.toFixed(2)}\n`
      
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
              className="gap-2 text-black"
              style={{ backgroundColor: '#F9C900' }}
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Tabs & Date Range */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-xl p-4 shadow-sm">
          {/* Tab Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'sales'
                  ? 'text-black shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === 'sales' ? { backgroundColor: '#F9C900', boxShadow: '0 10px 15px -3px rgba(249, 201, 0, 0.3)' } : {}}
            >
              <BarChart3 className="h-5 w-5" />
              Sales Report
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'inventory'
                  ? 'text-black shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === 'inventory' ? { backgroundColor: '#F9C900', boxShadow: '0 10px 15px -3px rgba(249, 201, 0, 0.3)' } : {}}
            >
              <Package className="h-5 w-5" />
              Inventory Report
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'expenses'
                  ? 'text-black shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === 'expenses' ? { backgroundColor: '#F9C900', boxShadow: '0 10px 15px -3px rgba(249, 201, 0, 0.3)' } : {}}
            >
              <Receipt className="h-5 w-5" />
              Expenses Report
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
              <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: '#F9C900', borderTopColor: 'transparent' }}></div>
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
            {activeTab === 'expenses' && expenseData && (
              <ExpensesReportContent data={expenseData} formatCurrency={formatCurrency} />
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
                  Print Options - {activeTab === 'sales' ? 'Sales Report' : activeTab === 'inventory' ? 'Inventory Report' : 'Expense Report'}
                </h2>
                <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-600 text-sm">Choose what to include in your printed report:</p>
                
                {/* Full Report Option - Available for all tabs */}
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
                          : activeTab === 'inventory'
                          ? 'Complete inventory summary, stock levels, categories & all stock transactions'
                          : 'Complete expense summary, category breakdown & all expense transactions'}
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

                {/* Expense-specific options */}
                {activeTab === 'expenses' && (
                  <button
                    onClick={() => handlePrint('transactions')}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200">
                        <Receipt className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Expense Transactions Only</p>
                        <p className="text-sm text-gray-500">Just the expense transactions with totals by category</p>
                      </div>
                    </div>
                  </button>
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

// Helper function to format payment status
const getPaymentStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string; bgColor: string }> = {
    PAID: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
    UNPAID: { label: 'Unpaid', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    REFUNDED: { label: 'Refunded', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    VOIDED: { label: 'Voided', color: 'text-red-700', bgColor: 'bg-red-100' },
    COMPLIMENTARY: { label: 'Comp', color: 'text-pink-700', bgColor: 'bg-pink-100' },
    WRITTEN_OFF: { label: 'Written Off', color: 'text-gray-700', bgColor: 'bg-gray-200' }
  }
  return configs[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-100' }
}

// Industry-Grade Sales Report Content Component
const SalesReportContent = ({ data, formatCurrency }: { data: SalesReportData; formatCurrency: (value: number) => string }) => (
  <div className="space-y-6">
    {/* Report Header */}
    <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 rounded-2xl p-4 border border-amber-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">📊 Sales Performance Report</h2>
          <p className="text-sm text-gray-500">Period: {data.periodLabel} | Generated: {data.reportGeneratedAt}</p>
        </div>
        <Badge className="bg-amber-100 text-amber-800 text-sm px-3 py-1">
          {data.totalOrders} Orders | {data.totalItems} Items
        </Badge>
      </div>
    </div>

    {/* Key Performance Indicators - Industry Standard Row 1 */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Gross Sales */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-sm p-5 border border-green-100 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded">GROSS</span>
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Sales</p>
        <p className="text-xl lg:text-2xl font-bold text-gray-900"><AnimatedNumber value={data.grossSales} isCurrency duration={1000} /></p>
        <p className="text-xs text-gray-400 mt-1">Before discounts</p>
      </div>

      {/* Discounts Given */}
      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl shadow-sm p-5 border border-red-100 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-red-100 rounded-lg">
            <ArrowDownCircle className="h-5 w-5 text-red-600" />
          </div>
          <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded">DEDUCT</span>
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Discounts</p>
        <p className="text-xl lg:text-2xl font-bold text-red-600">-<AnimatedNumber value={data.totalDiscounts} isCurrency duration={1000} /></p>
        <p className="text-xs text-gray-400 mt-1">{data.grossSales > 0 ? ((data.totalDiscounts / data.grossSales) * 100).toFixed(1) : 0}% of gross</p>
      </div>

      {/* Net Sales */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm p-5 border border-amber-200 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-amber-100 rounded-lg">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </div>
          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">NET</span>
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net Sales</p>
        <p className="text-xl lg:text-2xl font-bold text-gray-900"><AnimatedNumber value={data.netSales} isCurrency duration={1000} /></p>
        <p className="text-xs text-gray-400 mt-1">After discounts</p>
      </div>

      {/* Total Revenue (Collected) */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-5 border border-blue-200 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">COLLECTED</span>
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue</p>
        <p className="text-xl lg:text-2xl font-bold text-blue-700"><AnimatedNumber value={data.totalRevenue} isCurrency duration={1000} /></p>
        <p className="text-xs text-gray-400 mt-1">Actual collected</p>
      </div>
    </div>

    {/* Secondary Metrics Row */}
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Orders */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500 uppercase">Orders</span>
        </div>
        <p className="text-lg font-bold"><AnimatedNumber value={data.totalOrders} /></p>
      </div>

      {/* Items Sold */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500 uppercase">Items Sold</span>
        </div>
        <p className="text-lg font-bold"><AnimatedNumber value={data.totalItems} /></p>
      </div>

      {/* Avg Order Value */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <LineChartIcon className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500 uppercase">Avg Order</span>
        </div>
        <p className="text-lg font-bold">{formatCurrency(data.averageOrderValue)}</p>
      </div>

      {/* Avg Items/Order */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500 uppercase">Basket Size</span>
        </div>
        <p className="text-lg font-bold">{data.averageItemsPerOrder.toFixed(1)} items</p>
      </div>

      {/* VAT Collected */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500 uppercase">VAT (12%)</span>
        </div>
        <p className="text-lg font-bold text-gray-600">{formatCurrency(data.totalVAT)}</p>
      </div>
    </div>

    {/* Payment Status Summary - Industry Standard */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Receipt className="h-5 w-5 text-amber-500" />
        Payment Status Summary
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 text-center">
          <p className="text-xs text-green-600 font-medium uppercase">Paid</p>
          <p className="text-xl font-bold text-green-700">{data.paidOrders.count}</p>
          <p className="text-sm text-green-600">{formatCurrency(data.paidOrders.amount)}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 text-center">
          <p className="text-xs text-orange-600 font-medium uppercase">Unpaid</p>
          <p className="text-xl font-bold text-orange-700">{data.unpaidOrders.count}</p>
          <p className="text-sm text-orange-600">{formatCurrency(data.unpaidOrders.amount)}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 text-center">
          <p className="text-xs text-purple-600 font-medium uppercase">Refunded</p>
          <p className="text-xl font-bold text-purple-700">{data.refundedOrders.count}</p>
          <p className="text-sm text-purple-600">{formatCurrency(data.refundedOrders.amount)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-center">
          <p className="text-xs text-red-600 font-medium uppercase">Voided</p>
          <p className="text-xl font-bold text-red-700">{data.voidedOrders.count}</p>
          <p className="text-sm text-red-600">{formatCurrency(data.voidedOrders.amount)}</p>
        </div>
        <div className="bg-pink-50 rounded-xl p-4 border border-pink-100 text-center">
          <p className="text-xs text-pink-600 font-medium uppercase">Comp</p>
          <p className="text-xl font-bold text-pink-700">{data.complimentaryOrders.count}</p>
          <p className="text-sm text-pink-600">{formatCurrency(data.complimentaryOrders.amount)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
          <p className="text-xs text-gray-600 font-medium uppercase">Written Off</p>
          <p className="text-xl font-bold text-gray-700">{data.writtenOffOrders.count}</p>
          <p className="text-sm text-gray-600">{formatCurrency(data.writtenOffOrders.amount)}</p>
        </div>
      </div>
    </div>

    {/* Staff Performance */}
    {data.salesByCashier.length > 0 && (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          Staff Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Staff Member</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Orders</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Revenue</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Avg Order</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">% of Sales</th>
              </tr>
            </thead>
            <tbody>
              {data.salesByCashier.map((staff, index) => (
                <tr key={staff.name} className="border-b border-gray-50 hover:bg-amber-50/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={index === 0 ? 'default' : 'outline'} className={index === 0 ? 'bg-amber-500' : ''}>
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{staff.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">{staff.orders}</td>
                  <td className="py-3 px-4 text-right font-semibold text-amber-600">{formatCurrency(staff.revenue)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(staff.avgOrder)}</td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant="outline">{data.totalRevenue > 0 ? ((staff.revenue / data.totalRevenue) * 100).toFixed(1) : 0}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Charts Row 1 - Revenue Trend & Payment Methods */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Revenue Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-500" />
          Daily Revenue Trend
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.dailySales}>
            <defs>
              <linearGradient id="colorNetSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F9C900" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F9C900" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={val => val.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={val => `₱${(val/1000).toFixed(0)}k`} />
            <Tooltip 
              formatter={(value, name) => [formatCurrency(value as number ?? 0), name === 'netSales' ? 'Net Sales' : name === 'grossSales' ? 'Gross Sales' : 'Discounts']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Area type="monotone" dataKey="netSales" stroke="#F9C900" strokeWidth={2} fill="url(#colorNetSales)" />
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
          <ResponsiveContainer width="55%" height={250}>
            <PieChart>
              <Pie
                data={data.paymentMethods}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="amount"
                nameKey="method"
              >
                {data.paymentMethods.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number ?? 0)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {data.paymentMethods.map((method, index) => (
              <div key={method.method} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span>{method.method}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{method.percentage.toFixed(1)}%</span>
                  <span className="text-gray-400 ml-1">({method.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Charts Row 2 - Order Types & Peak Hours */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Order Types */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          Sales by Order Type
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.orderTypes} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={val => `₱${(val/1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="type" tick={{ fontSize: 12 }} width={80} />
            <Tooltip 
              formatter={(value, name) => [name === 'revenue' ? formatCurrency(value as number ?? 0) : `${value} orders`, name === 'revenue' ? 'Revenue' : 'Orders']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="revenue" fill="#F9C900" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {data.orderTypes.map((type) => (
            <Badge key={type.type} variant="outline" className="text-xs">
              {type.type}: {type.percentage.toFixed(1)}%
            </Badge>
          ))}
        </div>
      </div>

      {/* Peak Hours */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-amber-500" />
          Peak Hours Analysis
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.hourlyDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={1} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip 
              formatter={(value, name) => [name === 'revenue' ? formatCurrency(value as number ?? 0) : `${value} orders`, name === 'revenue' ? 'Revenue' : 'Orders']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="orders" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Top Selling Products */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-amber-500" />
        Top Selling Products
        <Badge className="ml-2 bg-amber-100 text-amber-700">{data.topProducts.length} products</Badge>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Rank</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Product</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Qty Sold</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Revenue</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {data.topProducts.map((product, index) => (
              <tr key={product.name} className="border-b border-gray-50 hover:bg-amber-50/50">
                <td className="py-3 px-4">
                  <Badge variant={index < 3 ? 'default' : 'outline'} className={index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : ''}>
                    #{index + 1}
                  </Badge>
                </td>
                <td className="py-3 px-4 font-medium">{product.name}</td>
                <td className="py-3 px-4 text-right">{product.quantity}</td>
                <td className="py-3 px-4 text-right font-semibold text-amber-600">{formatCurrency(product.revenue)}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${product.percentage}%` }} />
                    </div>
                    <span className="text-sm text-gray-600">{product.percentage.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Daily Sales Breakdown */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-amber-500" />
        Daily Sales Breakdown
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Date</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Orders</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Items</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Gross Sales</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Discounts</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Net Sales</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase">Avg Order</th>
            </tr>
          </thead>
          <tbody>
            {data.dailySales.map((day) => (
              <tr key={day.date} className="border-b border-gray-50 hover:bg-amber-50/50">
                <td className="py-3 px-4 font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                <td className="py-3 px-4 text-right">{day.orders}</td>
                <td className="py-3 px-4 text-right text-gray-500">{day.items}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(day.grossSales)}</td>
                <td className="py-3 px-4 text-right text-red-500">{day.discounts > 0 ? `-${formatCurrency(day.discounts)}` : '-'}</td>
                <td className="py-3 px-4 text-right font-semibold text-amber-600">{formatCurrency(day.netSales)}</td>
                <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(day.orders > 0 ? day.netSales / day.orders : 0)}</td>
              </tr>
            ))}
            {data.dailySales.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">No sales data for selected period</td>
              </tr>
            )}
          </tbody>
          {data.dailySales.length > 0 && (
            <tfoot className="bg-amber-50 border-t-2 border-amber-200">
              <tr>
                <td className="py-3 px-4 font-bold">TOTALS</td>
                <td className="py-3 px-4 text-right font-bold">{data.totalOrders}</td>
                <td className="py-3 px-4 text-right font-bold text-gray-600">{data.totalItems}</td>
                <td className="py-3 px-4 text-right font-bold">{formatCurrency(data.grossSales)}</td>
                <td className="py-3 px-4 text-right font-bold text-red-500">-{formatCurrency(data.totalDiscounts)}</td>
                <td className="py-3 px-4 text-right font-bold text-amber-600">{formatCurrency(data.netSales)}</td>
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
        Transaction Log
        <Badge className="ml-2 bg-amber-100 text-amber-700">{data.transactions.length} transactions</Badge>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-2 font-semibold text-gray-600 text-xs uppercase">Order #</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-600 text-xs uppercase">Date/Time</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-600 text-xs uppercase">Customer</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-600 text-xs uppercase">Staff</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-600 text-xs uppercase">Type</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-600 text-xs uppercase">Payment</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-600 text-xs uppercase">Status</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-600 text-xs uppercase">Gross</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-600 text-xs uppercase">Disc</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-600 text-xs uppercase">VAT</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-600 text-xs uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.slice(0, 50).map((t) => {
              const statusConfig = getPaymentStatusConfig(t.paymentStatus)
              const isNegative = t.paymentStatus === 'REFUNDED' || t.paymentStatus === 'VOIDED'
              return (
                <tr key={t.id} className={`border-b border-gray-50 hover:bg-amber-50/50 ${isNegative ? 'bg-red-50/30' : ''}`}>
                  <td className="py-2 px-2 font-medium">{t.orderNumber}</td>
                  <td className="py-2 px-2 text-gray-600 text-xs">{t.date}<br/>{t.time}</td>
                  <td className="py-2 px-2">{t.customer}</td>
                  <td className="py-2 px-2 text-xs">{t.processedBy !== '-' ? t.processedBy : t.cashier}</td>
                  <td className="py-2 px-2">
                    <Badge variant="secondary" className="text-xs">{t.orderType}</Badge>
                  </td>
                  <td className="py-2 px-2 text-xs">{t.paymentMethod}</td>
                  <td className="py-2 px-2 text-center">
                    <Badge className={`text-xs ${statusConfig.bgColor} ${statusConfig.color}`}>{statusConfig.label}</Badge>
                  </td>
                  <td className="py-2 px-2 text-right text-xs">{formatCurrency(t.grossAmount)}</td>
                  <td className="py-2 px-2 text-right text-xs text-red-500">{t.discountAmount > 0 ? `-${formatCurrency(t.discountAmount)}` : '-'}</td>
                  <td className="py-2 px-2 text-right text-xs text-gray-500">{formatCurrency(t.vatAmount)}</td>
                  <td className={`py-2 px-2 text-right font-semibold ${isNegative ? 'text-red-600 line-through' : 'text-amber-600'}`}>{formatCurrency(t.total)}</td>
                </tr>
              )
            })}
            {data.transactions.length === 0 && (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-500">No transactions for selected period</td>
              </tr>
            )}
          </tbody>
          {data.transactions.filter(t => t.paymentStatus === 'PAID').length > 0 && (
            <tfoot className="bg-amber-50 border-t-2 border-amber-200">
              <tr>
                <td colSpan={7} className="py-3 px-2 font-bold">PAID TOTALS ({data.paidOrders.count} orders)</td>
                <td className="py-3 px-2 text-right font-bold">{formatCurrency(data.grossSales)}</td>
                <td className="py-3 px-2 text-right font-bold text-red-500">-{formatCurrency(data.totalDiscounts)}</td>
                <td className="py-3 px-2 text-right font-bold text-gray-600">{formatCurrency(data.totalVAT)}</td>
                <td className="py-3 px-2 text-right font-bold text-amber-600">{formatCurrency(data.totalRevenue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        {data.transactions.length > 50 && (
          <p className="text-center text-sm text-gray-500 mt-4 py-2 bg-gray-50 rounded">
            Showing first 50 of {data.transactions.length} transactions. Use Print or Export for the complete list.
          </p>
        )}
      </div>
    </div>

    {/* Fees Summary (if any) */}
    {(data.totalDeliveryFees > 0 || data.totalServiceFees > 0) && (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-amber-500" />
          Additional Fees Collected
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">Delivery Fees</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.totalDeliveryFees)}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <p className="text-sm text-purple-600 font-medium">Service Fees</p>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(data.totalServiceFees)}</p>
          </div>
        </div>
      </div>
    )}

    {/* VAT Summary Box */}
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">📋 VAT Summary (12% Inclusive)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-sm text-gray-500">VATable Sales</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(data.vatableSales)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-sm text-gray-500">VAT Amount (12%)</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(data.totalVAT)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-center">
          <p className="text-sm text-amber-600">Total with VAT</p>
          <p className="text-xl font-bold text-amber-700">{formatCurrency(data.vatableSales + data.totalVAT)}</p>
        </div>
      </div>
    </div>
  </div>
)

// Inventory Report Content Component
const InventoryReportContent = ({ data, formatCurrency }: { data: InventoryReportData; formatCurrency: (value: number) => string }) => (
  <div className="space-y-6">
    {/* Summary Stats - Updated to match InventoryPage design */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-5 border border-blue-100 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-center justify-between mb-3">
          <div className="p-3 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <CheckCircle className="h-4 w-4 text-blue-500" />
        </div>
        <p className="text-sm font-medium text-gray-500 mb-1">Total Items</p>
        <p className="text-xl lg:text-2xl font-bold text-gray-900"><AnimatedNumber value={data.totalItems} duration={1000} /></p>
        <p className="text-xs text-gray-400 mt-2">in inventory</p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-sm p-5 border border-green-100 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-center justify-between mb-3">
          <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <p className="text-sm font-medium text-gray-500 mb-1">Total Value</p>
        <p className="text-xl lg:text-2xl font-bold text-gray-900"><AnimatedNumber value={data.totalValue} isCurrency duration={1200} delay={100} /></p>
        <p className="text-xs text-gray-400 mt-2">inventory worth</p>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm p-5 border border-amber-100 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-center justify-between mb-3">
          <div className="p-3 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <ArrowDownRight className="h-4 w-4 text-amber-500" />
        </div>
        <p className="text-sm font-medium text-gray-500 mb-1">Low Stock Items</p>
        <p className="text-xl lg:text-2xl font-bold text-gray-900"><AnimatedNumber value={data.lowStockCount} duration={1000} delay={200} /></p>
        <p className="text-xs text-gray-400 mt-2">needs attention</p>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl shadow-sm p-5 border border-red-100 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-center justify-between mb-3">
          <div className="p-3 bg-red-100 rounded-xl group-hover:scale-110 transition-transform">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </div>
        <p className="text-sm font-medium text-gray-500 mb-1">Out of Stock</p>
        <p className="text-xl lg:text-2xl font-bold text-gray-900"><AnimatedNumber value={data.outOfStockCount} duration={1000} delay={300} /></p>
        <p className="text-xs text-gray-400 mt-2">restock needed</p>
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
                <Cell fill="#F9C900" />
                <Cell fill="#EF4444" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-3">
            {data.stockStatus.map((status, index) => (
              <div key={status.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#10B981', '#F9C900', '#EF4444'][index] }} />
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
              formatter={(value) => formatCurrency(value as number ?? 0)}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="value" fill="#F9C900" radius={[0, 8, 8, 0]} />
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
            formatter={(value) => formatCurrency(value as number ?? 0)}
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

const ExpensesReportContent = ({ data, formatCurrency }: { data: ExpenseReportData; formatCurrency: (value: number) => string }) => (
  <div className="space-y-6">
    {/* Stats Overview - Updated to match InventoryPage design */}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-sm p-5 border border-orange-100 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-center justify-between mb-3">
          <div className="p-3 bg-orange-100 rounded-xl group-hover:scale-110 transition-transform">
            <DollarSign className="h-5 w-5 text-orange-600" />
          </div>
          <TrendingDown className="h-4 w-4 text-orange-500" />
        </div>
        <p className="text-sm font-medium text-gray-500 mb-1">Total All-Time</p>
        <p className="text-xl lg:text-2xl font-bold text-gray-900"><AnimatedNumber value={data.totalExpenses} isCurrency duration={1200} /></p>
        <p className="text-xs text-gray-400 mt-2">all expenses</p>
      </div>
      
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-sm p-5 border border-amber-100 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-center justify-between mb-3">
          <div className="p-3 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
            <TrendingDown className="h-5 w-5 text-amber-600" />
          </div>
          <ArrowDownRight className="h-4 w-4 text-amber-500" />
        </div>
        <p className="text-sm font-medium text-gray-500 mb-1">Period Total</p>
        <p className="text-xl lg:text-2xl font-bold text-gray-900"><AnimatedNumber value={data.monthlyExpenses} isCurrency duration={1200} delay={100} /></p>
        <p className="text-xs text-gray-400 mt-2">selected period</p>
      </div>
      
      <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-5 border border-blue-100 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-center justify-between mb-3">
          <div className="p-3 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
            <Receipt className="h-5 w-5 text-blue-600" />
          </div>
          <CheckCircle className="h-4 w-4 text-blue-500" />
        </div>
        <p className="text-sm font-medium text-gray-500 mb-1">Expense Count</p>
        <p className="text-xl lg:text-2xl font-bold text-gray-900"><AnimatedNumber value={data.expenseCount} duration={1000} delay={200} /></p>
        <p className="text-xs text-gray-400 mt-2">total entries</p>
      </div>
    </div>

    {/* Charts Section */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Breakdown Pie */}
      {data.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Category Breakdown</h3>
              <p className="text-sm text-gray-500">Distribution by expense type</p>
            </div>
          </div>
          <div className="flex items-center">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie
                  data={data.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.categoryBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(value as number ?? 0)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.categoryBreakdown.slice(0, 5).map((cat, index) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-gray-600 truncate max-w-[120px]">{cat.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(cat.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Trend - Bar Chart */}
      {data.dailyTrend.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Expense Trend</h3>
              <p className="text-sm text-gray-500">Daily totals for selected period</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.dailyTrend}>
              <defs>
                <linearGradient id="expenseBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F9C900" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#F97316" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={val => `₱${(val/1000).toFixed(0)}k`} />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number ?? 0), 'Total']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="total" fill="url(#expenseBarGradient)" radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>

    {/* Expense List Table */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Expense Records</h3>
          <p className="text-sm text-gray-500">{data.expenses.length} expenses in selected period</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-amber-50 to-white border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Date</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Category</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Description</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Frequency</th>
              <th className="py-3 px-4 text-right font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.expenses.slice(0, 50).map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">{new Date(expense.date).toLocaleDateString()}</td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                </td>
                <td className="py-3 px-4 text-gray-600">{expense.description}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{expense.frequency}</td>
                <td className="py-3 px-4 text-right font-semibold text-orange-600">{formatCurrency(expense.amount)}</td>
              </tr>
            ))}
            {data.expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">No expenses found for selected period</td>
              </tr>
            )}
          </tbody>
          {data.expenses.length > 0 && (
            <tfoot className="bg-amber-50 border-t-2 border-amber-200">
              <tr>
                <td colSpan={4} className="py-3 px-4 font-bold text-right">TOTAL:</td>
                <td className="py-3 px-4 text-right font-bold text-orange-700">{formatCurrency(data.monthlyExpenses)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        {data.expenses.length > 50 && (
          <p className="text-center text-sm text-gray-500 py-4">Showing first 50 of {data.expenses.length} expenses.</p>
        )}
      </div>
    </div>
  </div>
)
