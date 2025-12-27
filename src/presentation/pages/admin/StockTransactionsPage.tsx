import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Package,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  Printer
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { stockTransactionApi, type StockTransaction } from '../../../infrastructure/api/stockTransaction.api'
import { DateFilter, type DateFilterValue, filterByDateRange } from '../../components/common/DateFilter'

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  PURCHASE: { label: 'Purchase', color: 'bg-green-100 text-green-800' },
  ORDER: { label: 'Order', color: 'bg-blue-100 text-blue-800' },
  WASTE: { label: 'Waste', color: 'bg-red-100 text-red-800' },
  ADJUSTMENT: { label: 'Adjustment', color: 'bg-yellow-100 text-yellow-800' },
  RECONCILIATION: { label: 'Reconciliation', color: 'bg-purple-100 text-purple-800' },
}

export const StockTransactionsPage = () => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterReason, setFilterReason] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: 'week', startDate: null, endDate: null })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(25)
  const itemsPerPageOptions = [10, 25, 50, 100, 'all'] as const

  const loadTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await stockTransactionApi.getAllTransactions()
      setTransactions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterType, filterReason, dateFilter])

  // Filter transactions
  const filteredTransactions = filterByDateRange(transactions, dateFilter, 'createdAt')
    .filter(tx => {
      const itemName = tx.inventory_item?.name || ''
      const matchesSearch = !searchQuery || 
        itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || tx.type === filterType
      const matchesReason = filterReason === 'all' || tx.reason === filterReason
      return matchesSearch && matchesType && matchesReason
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

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

  // Calculate summary stats
  const stats = {
    totalIn: filteredTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.quantity, 0),
    totalOut: filteredTransactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.quantity, 0),
    transactionCount: filteredTransactions.length,
  }

  // Print transactions report
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print')
      return
    }

    const getDateRangeText = () => {
      if (dateFilter.preset === 'all') return 'All Time'
      if (dateFilter.preset === 'custom' && dateFilter.startDate && dateFilter.endDate) {
        return `${dateFilter.startDate.toLocaleDateString()} - ${dateFilter.endDate.toLocaleDateString()}`
      }
      const presetLabels: Record<string, string> = {
        today: 'Today',
        yesterday: 'Yesterday',
        week: 'This Week',
        month: 'This Month',
        quarter: 'This Quarter',
        year: 'This Year'
      }
      return presetLabels[dateFilter.preset] || dateFilter.preset
    }

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stock Transactions Report - BEEHIVE</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #F9C900; }
          .header h1 { font-size: 24px; color: #1a1a1a; margin-bottom: 5px; }
          .header .subtitle { font-size: 14px; color: #666; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #666; }
          .stats { display: flex; gap: 20px; margin-bottom: 25px; }
          .stat-box { flex: 1; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-box.in { background: #dcfce7; border: 1px solid #86efac; }
          .stat-box.out { background: #fee2e2; border: 1px solid #fca5a5; }
          .stat-box.total { background: #dbeafe; border: 1px solid #93c5fd; }
          .stat-box h3 { font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 5px; }
          .stat-box p { font-size: 20px; font-weight: bold; }
          .stat-box.in p { color: #16a34a; }
          .stat-box.out p { color: #dc2626; }
          .stat-box.total p { color: #2563eb; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f8f9fa; padding: 10px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
          td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; }
          tr:hover { background: #f9fafb; }
          .type-in { color: #16a34a; font-weight: 600; }
          .type-out { color: #dc2626; font-weight: 600; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
          .badge-purchase { background: #dcfce7; color: #166534; }
          .badge-order { background: #dbeafe; color: #1e40af; }
          .badge-waste { background: #fee2e2; color: #991b1b; }
          .badge-adjustment { background: #fef3c7; color: #92400e; }
          .badge-reconciliation { background: #f3e8ff; color: #6b21a8; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #888; }
          @media print { body { padding: 10px; } .header { margin-bottom: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐝 BEEHIVE - Stock Transactions Report</h1>
          <p class="subtitle">Inventory Movement History</p>
        </div>

        <div class="meta">
          <div>Period: ${getDateRangeText()}</div>
          <div>Generated: ${new Date().toLocaleString()}</div>
        </div>

        <div class="stats">
          <div class="stat-box in">
            <h3>Stock In</h3>
            <p>+${stats.totalIn.toFixed(2)}</p>
          </div>
          <div class="stat-box out">
            <h3>Stock Out</h3>
            <p>-${stats.totalOut.toFixed(2)}</p>
          </div>
          <div class="stat-box total">
            <h3>Transactions</h3>
            <p>${stats.transactionCount}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Item</th>
              <th>Type</th>
              <th>Reason</th>
              <th style="text-align: right;">Quantity</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTransactions.map(tx => {
              const reasonClass = tx.reason.toLowerCase()
              return `
                <tr>
                  <td>
                    ${new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}<br>
                    <small style="color: #888">${new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small>
                  </td>
                  <td>
                    <strong>${tx.inventory_item?.name || 'Unknown'}</strong><br>
                    <small style="color: #888">${tx.inventory_item?.unit || ''}</small>
                  </td>
                  <td class="type-${tx.type.toLowerCase()}">${tx.type === 'IN' ? '↑ IN' : '↓ OUT'}</td>
                  <td><span class="badge badge-${reasonClass}">${REASON_LABELS[tx.reason]?.label || tx.reason}</span></td>
                  <td style="text-align: right;" class="type-${tx.type.toLowerCase()}">${tx.type === 'IN' ? '+' : '-'}${tx.quantity.toFixed(2)}</td>
                  <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${tx.notes || '-'}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>© ${new Date().getFullYear()} BEEHIVE POS System | Stock Transactions Report</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(printHTML)
    printWindow.document.close()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link 
                to="/admin/inventory" 
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to Inventory</span>
              </Link>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold">Stock Transactions</h1>
            <p className="text-sm lg:text-base text-gray-600">View all inventory stock movements</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
              disabled={filteredTransactions.length === 0}
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
            <Button
              onClick={loadTransactions}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Stock In</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-green-900">{stats.totalIn.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Stock Out</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-red-900">{stats.totalOut.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Transactions</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-blue-900">{stats.transactionCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by item name or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>

            {/* Date Filter */}
            <DateFilter
              value={dateFilter}
              onChange={setDateFilter}
              showAllOption={true}
            />

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
            </select>

            {/* Reason Filter */}
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Reasons</option>
              <option value="PURCHASE">Purchase</option>
              <option value="ORDER">Order</option>
              <option value="WASTE">Waste</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="RECONCILIATION">Reconciliation</option>
            </select>

            {(searchQuery || filterType !== 'all' || filterReason !== 'all' || dateFilter.preset !== 'week') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setFilterType('all')
                  setFilterReason('all')
                  setDateFilter({ preset: 'week', startDate: null, endDate: null })
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-12 text-center">
              <p className="text-red-600">{error}</p>
              <Button onClick={loadTransactions} className="mt-4" size="sm" variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Reason</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No transactions found</p>
                          {(searchQuery || filterType !== 'all' || filterReason !== 'all') && (
                            <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      paginatedTransactions.map(tx => {
                        const reasonInfo = REASON_LABELS[tx.reason] || { label: tx.reason, color: 'bg-gray-100 text-gray-800' }
                        
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {new Date(tx.createdAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(tx.createdAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{tx.inventory_item?.name || 'Unknown Item'}</p>
                                <p className="text-xs text-gray-500">{tx.inventory_item?.unit || ''}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Badge className={`${
                                tx.type === 'IN' 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-red-100 text-red-800 border-red-200'
                              } border`}>
                                {tx.type === 'IN' ? (
                                  <ArrowUpRight className="h-3 w-3 mr-1" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3 mr-1" />
                                )}
                                {tx.type}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Badge className={`${reasonInfo.color} border border-transparent`}>
                                {reasonInfo.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className={`font-semibold ${tx.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.type === 'IN' ? '+' : '-'}{tx.quantity.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-sm text-gray-600 max-w-xs truncate">
                                {tx.notes || '-'}
                              </p>
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
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
