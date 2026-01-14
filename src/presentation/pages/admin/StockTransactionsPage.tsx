import { useState, useEffect, useRef } from 'react'
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
  Printer,
  Eye,
  X,
  AlertTriangle,
  AlertOctagon,
  Edit2,
  Upload,
  Trash2,
  Image as ImageIcon,
  Check,
  FileText,
  History
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { stockTransactionApi, type StockTransaction, type TransactionMetadataAuditLog } from '../../../infrastructure/api/stockTransaction.api'
import { uploadApi } from '../../../infrastructure/api/menuItems.api'
import { DateFilter, type DateFilterValue, filterByDateRange } from '../../components/common/DateFilter'
import { printWithIframe } from '../../../shared/utils/printUtils'
import { Label } from '../../components/common/ui/label'
import { Input } from '../../components/common/ui/input'
import { Textarea } from '../../components/common/ui/textarea'

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  PURCHASE: { label: 'Purchase', color: 'bg-green-100 text-green-800' },
  ORDER: { label: 'Order', color: 'bg-blue-100 text-blue-800' },
  WASTE: { label: 'Waste', color: 'bg-red-100 text-red-800' },
  ADJUSTMENT: { label: 'Adjustment', color: 'bg-yellow-100 text-yellow-800' },
  RECONCILIATION: { label: 'Reconciliation', color: 'bg-purple-100 text-purple-800' },
  VOID: { label: 'Void', color: 'bg-gray-100 text-gray-800' },
  CREATED: { label: 'Created', color: 'bg-teal-100 text-teal-800' },
  EDITED: { label: 'Edited', color: 'bg-orange-100 text-orange-800' },
  DELETED: { label: 'Deleted', color: 'bg-rose-100 text-rose-800' },
}

export const StockTransactionsPage = () => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null)
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editReferenceId, setEditReferenceId] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editReceiptImage, setEditReceiptImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [savingMetadata, setSavingMetadata] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Audit log state
  const [auditLogs, setAuditLogs] = useState<TransactionMetadataAuditLog[]>([])
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)
  const [showAuditLogs, setShowAuditLogs] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterReason, setFilterReason] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: 'week', startDate: null, endDate: null })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(25)
  const itemsPerPageOptions = [10, 25, 50, 100, 'all'] as const


  // Get image URL helper
  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath
    }
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    return `${backendUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`
  }

  // Handle image upload for edit mode
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      console.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      console.error('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('image', file)
      const response = await uploadApi.uploadImage(formData)
      if (response.data?.path) {
        setEditReceiptImage(response.data.path)
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
    } finally {
      setUploadingImage(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      console.error('Please drop an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      console.error('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('image', file)
      const response = await uploadApi.uploadImage(formData)
      if (response.data?.path) {
        setEditReceiptImage(response.data.path)
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
    } finally {
      setUploadingImage(false)
    }
  }

  // Remove receipt image
  const removeReceiptImage = () => {
    setEditReceiptImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Enter edit mode
  const enterEditMode = () => {
    if (selectedTransaction) {
      setEditReferenceId(selectedTransaction.referenceId || '')
      setEditNotes(selectedTransaction.notes || '')
      setEditReceiptImage(selectedTransaction.receiptImage || null)
      setIsEditMode(true)
      setSuccessMessage(null)
    }
  }

  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditMode(false)
    setSuccessMessage(null)
  }

  // Save metadata changes
  const saveMetadata = async () => {
    if (!selectedTransaction) return

    try {
      setSavingMetadata(true)
      await stockTransactionApi.updateTransactionMetadata(selectedTransaction.id, {
        referenceId: editReferenceId || undefined,
        notes: editNotes || undefined,
        receiptImage: editReceiptImage || undefined,
      })

      // Update the transaction in the list
      setTransactions(prev => prev.map(tx => 
        tx.id === selectedTransaction.id 
          ? { ...tx, referenceId: editReferenceId || undefined, notes: editNotes || undefined, receiptImage: editReceiptImage || undefined }
          : tx
      ))

      // Update selected transaction
      setSelectedTransaction(prev => prev ? {
        ...prev,
        referenceId: editReferenceId || undefined,
        notes: editNotes || undefined,
        receiptImage: editReceiptImage || undefined
      } : null)

      setIsEditMode(false)
      setSuccessMessage('Metadata updated. Inventory quantity unchanged.')
      
      // Refresh audit logs after saving
      if (selectedTransaction) {
        fetchAuditLogs(selectedTransaction.id)
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Failed to update metadata:', error)
    } finally {
      setSavingMetadata(false)
    }
  }
  
  // Fetch audit logs for a transaction
  const fetchAuditLogs = async (transactionId: string) => {
    try {
      setLoadingAuditLogs(true)
      const logs = await stockTransactionApi.getAuditLogs(transactionId)
      setAuditLogs(logs)
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      setAuditLogs([])
    } finally {
      setLoadingAuditLogs(false)
    }
  }

  // Close modal and reset state
  const closeModal = () => {
    setSelectedTransaction(null)
    setIsEditMode(false)
    setSuccessMessage(null)
    setAuditLogs([])
    setShowAuditLogs(false)
  }

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
  }, [searchQuery, filterType, filterReason, filterStatus, dateFilter])

  // Filter transactions
  const filteredTransactions = filterByDateRange(transactions, dateFilter, 'createdAt')
    .filter(tx => {
      const itemName = tx.inventory_item?.name || ''
      const matchesSearch = !searchQuery || 
        itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || tx.type === filterType
      const matchesReason = filterReason === 'all' || tx.reason === filterReason
      const matchesStatus = filterStatus === 'all' || tx.status === filterStatus
      return matchesSearch && matchesType && matchesReason && matchesStatus
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Calculate discrepancy count from date-filtered transactions
  const dateFilteredTransactions = filterByDateRange(transactions, dateFilter, 'createdAt')
  const discrepancyCount = dateFilteredTransactions.filter(t => t.status === 'DISCREPANCY').length

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
      </body>
      </html>
    `

    printWithIframe(printHTML)
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
            <h1 className="text-2xl lg:text-3xl font-bold">Inventory</h1>
            <p className="text-sm lg:text-base text-gray-600">Manage your BEEHIVE operations</p>
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

        {/* Stats Cards - Dynamic grid based on whether discrepancy card is shown */}
        <div className={`grid gap-4 lg:gap-6 ${
          discrepancyCount > 0 
            ? 'grid-cols-2 lg:grid-cols-4' 
            : 'grid-cols-3'
        }`}>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-sm p-5 border border-green-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Stock In</p>
            <p className="text-2xl lg:text-3xl font-bold text-green-700">+{stats.totalIn.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-2">total incoming</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl shadow-sm p-5 border border-red-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-red-100 rounded-xl group-hover:scale-110 transition-transform">
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Stock Out</p>
            <p className="text-2xl lg:text-3xl font-bold text-red-700">-{stats.totalOut.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-2">total outgoing</p>
          </div>
          {/* Discrepancy Card - Only show if there are discrepancies */}
          {discrepancyCount > 0 && (
            <div 
              className={`rounded-2xl shadow-sm p-5 border cursor-pointer transition-all duration-300 group ${
                filterStatus === 'DISCREPANCY'
                  ? 'bg-gradient-to-br from-purple-100 to-violet-100 border-purple-300 ring-2 ring-purple-200'
                  : 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100 hover:shadow-lg'
              }`}
              onClick={() => setFilterStatus(filterStatus === 'DISCREPANCY' ? 'all' : 'DISCREPANCY')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform">
                  <AlertOctagon className="h-5 w-5 text-purple-600" />
                </div>
                {filterStatus === 'DISCREPANCY' && (
                  <Badge className="bg-purple-200 text-purple-800 text-[10px]">Filtered</Badge>
                )}
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">Discrepancies</p>
              <p className="text-2xl lg:text-3xl font-bold text-purple-700">{discrepancyCount}</p>
              <p className="text-xs text-gray-400 mt-2">click to filter</p>
            </div>
          )}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-5 border border-blue-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Transactions</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.transactionCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">total records</p>
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
              <option value="VOID">Void</option>
              <option value="CREATED">Created</option>
              <option value="EDITED">Edited</option>
              <option value="DELETED">Deleted</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`h-10 px-3 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 ${
                filterStatus === 'DISCREPANCY' ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            >
              <option value="all">All Status</option>
              <option value="NORMAL">Normal</option>
              <option value="DISCREPANCY">⚠️ Discrepancy ({discrepancyCount})</option>
            </select>

            {(searchQuery || filterType !== 'all' || filterReason !== 'all' || filterStatus !== 'all' || dateFilter.preset !== 'week') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setFilterType('all')
                  setFilterReason('all')
                  setFilterStatus('all')
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
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Balance</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Notes</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center">
                          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No transactions found</p>
                          {(searchQuery || filterType !== 'all' || filterReason !== 'all' || filterStatus !== 'all') && (
                            <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      paginatedTransactions.map(tx => {
                        const reasonInfo = REASON_LABELS[tx.reason] || { label: tx.reason, color: 'bg-gray-100 text-gray-800' }
                        
                        return (
                          <tr key={tx.id} className={`hover:bg-gray-50 transition-colors ${tx.status === 'DISCREPANCY' ? 'bg-red-50' : ''}`}>
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
                            <td className="px-4 py-4 text-right">
                              {tx.balanceBefore != null && tx.balanceAfter != null ? (
                                <div className="text-xs">
                                  <span className={tx.balanceBefore < 0 ? 'text-purple-600 font-medium' : 'text-gray-500'}>{tx.balanceBefore.toFixed(2)}</span>
                                  <span className="text-gray-400 mx-1">→</span>
                                  <span className={`font-medium ${tx.balanceAfter < 0 ? 'text-purple-600' : 'text-gray-900'}`}>{tx.balanceAfter.toFixed(2)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              {tx.status === 'DISCREPANCY' ? (
                                <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Discrepancy
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600">Normal</Badge>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="max-w-[120px]">
                                <p 
                                  className="text-sm text-gray-600 truncate"
                                  title={tx.notes || '-'}
                                >
                                  {tx.notes || '-'}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTransaction(tx)}
                                className="h-8 w-8 p-0"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
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

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={closeModal}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Transaction Metadata' : 'Transaction Details'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {!isEditMode && (
                      <button
                        onClick={enterEditMode}
                        className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
                        title="Edit metadata"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={closeModal}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Success Message */}
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-green-800">{successMessage}</p>
                  </div>
                )}

                {/* Status Banner */}
                {selectedTransaction.status === 'DISCREPANCY' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Stock Discrepancy Detected</p>
                      <p className="text-sm text-red-600 mt-1">
                        This transaction exceeded the available system quantity. This may indicate unrecorded stock or inventory count differences.
                      </p>
                    </div>
                  </div>
                )}

                {/* Transaction Info Grid - Read Only */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Date & Time</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(selectedTransaction.createdAt).toLocaleString('en-US', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Item</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedTransaction.inventory_item?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">{selectedTransaction.inventory_item?.unit}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Type</label>
                    <Badge className={`mt-1 ${
                      selectedTransaction.type === 'IN' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedTransaction.type === 'IN' ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {selectedTransaction.type === 'IN' ? 'Stock In' : 'Stock Out'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Reason</label>
                    <Badge className={`mt-1 ${REASON_LABELS[selectedTransaction.reason]?.color || 'bg-gray-100'}`}>
                      {REASON_LABELS[selectedTransaction.reason]?.label || selectedTransaction.reason}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Quantity</label>
                    <p className={`text-lg font-bold mt-1 ${
                      selectedTransaction.type === 'IN' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedTransaction.type === 'IN' ? '+' : '-'}{(selectedTransaction.quantity ?? 0).toFixed(2)} {selectedTransaction.inventory_item?.unit}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                    <Badge className={`mt-1 ${
                      selectedTransaction.status === 'DISCREPANCY'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedTransaction.status === 'DISCREPANCY' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {selectedTransaction.status || 'NORMAL'}
                    </Badge>
                  </div>
                </div>

                {/* Balance Change */}
                {selectedTransaction.balanceBefore != null && selectedTransaction.balanceAfter != null && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Balance Change</label>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Before</p>
                        <p className={`text-lg font-semibold ${selectedTransaction.balanceBefore < 0 ? 'text-purple-600' : 'text-gray-600'}`}>{selectedTransaction.balanceBefore.toFixed(2)}</p>
                      </div>
                      <div className="text-gray-400">→</div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">After</p>
                        <p className={`text-lg font-semibold ${selectedTransaction.balanceAfter < 0 ? 'text-purple-600' : 'text-gray-900'}`}>{selectedTransaction.balanceAfter.toFixed(2)}</p>
                      </div>
                      <div className="ml-auto">
                        <p className={`text-sm font-medium px-2 py-1 rounded ${
                          selectedTransaction.balanceAfter < 0
                            ? 'bg-purple-100 text-purple-700'
                            : selectedTransaction.type === 'IN' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {selectedTransaction.type === 'IN' ? '+' : ''}{(selectedTransaction.balanceAfter - selectedTransaction.balanceBefore).toFixed(2)} {selectedTransaction.inventory_item?.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* EDITABLE METADATA SECTION */}
                {isEditMode ? (
                  <>
                    {/* Editable Reference ID */}
                    <div className="space-y-2">
                      <Label htmlFor="editReferenceId" className="text-xs text-gray-500 uppercase tracking-wide">
                        Reference # (Optional)
                      </Label>
                      <Input
                        id="editReferenceId"
                        type="text"
                        value={editReferenceId}
                        onChange={(e) => setEditReferenceId(e.target.value)}
                        placeholder="e.g., Invoice #, PO #, Receipt #"
                        className="text-sm"
                      />
                    </div>

                    {/* Editable Receipt Image */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Receipt Image (Optional)</Label>
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors relative ${
                          isDragging 
                            ? 'border-blue-500 bg-blue-50' 
                            : editReceiptImage
                              ? 'border-gray-200 bg-gray-50'
                              : uploadingImage 
                                ? 'border-yellow-400 bg-yellow-50' 
                                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 cursor-pointer'
                        }`}
                        onClick={() => !editReceiptImage && fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {editReceiptImage ? (
                          <div className="relative">
                            <img
                              src={getImageUrl(editReceiptImage) || ''}
                              alt="Receipt"
                              className="w-full h-40 object-contain rounded cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(getImageUrl(editReceiptImage) || '', '_blank')
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeReceiptImage()
                              }}
                              className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                              title="Remove image"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : uploadingImage ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin h-6 w-6 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                            <span className="text-sm text-gray-600">Uploading...</span>
                          </div>
                        ) : isDragging ? (
                          <div className="flex flex-col items-center gap-2 py-4">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <Upload size={20} className="text-blue-500" />
                            </div>
                            <span className="text-sm text-blue-600 font-medium">Drop image here</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="p-2 bg-gray-100 rounded-full">
                              <Upload size={20} className="text-gray-500" />
                            </div>
                            <span className="text-sm text-gray-600">Click or drag to upload receipt image</span>
                            <span className="text-xs text-gray-400">JPG, PNG, max 5MB</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Editable Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="editNotes" className="text-xs text-gray-500 uppercase tracking-wide">
                        Notes (Optional)
                      </Label>
                      <Textarea
                        id="editNotes"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Add notes about this transaction..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Read-only Reference ID */}
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Reference #
                      </label>
                      <p className="text-sm font-mono text-gray-700 mt-1 bg-gray-50 px-3 py-2 rounded">
                        {selectedTransaction.referenceId || <span className="text-gray-400 italic">Not provided</span>}
                      </p>
                    </div>

                    {/* Read-only Receipt Image */}
                    {selectedTransaction.receiptImage && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          Receipt Image
                        </label>
                        <div className="mt-1 border border-gray-200 rounded-lg p-2">
                          <img
                            src={getImageUrl(selectedTransaction.receiptImage) || ''}
                            alt="Receipt"
                            className="w-full h-40 object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(getImageUrl(selectedTransaction.receiptImage) || '', '_blank')}
                            title="Click to view full size"
                          />
                        </div>
                      </div>
                    )}

                    {/* Read-only Notes */}
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Notes</label>
                      <div className="mt-1 bg-gray-50 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {selectedTransaction.notes || <span className="text-gray-400 italic">No notes</span>}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Audit Log Section - Show change history */}
                {!isEditMode && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        if (!showAuditLogs && auditLogs.length === 0) {
                          fetchAuditLogs(selectedTransaction.id)
                        }
                        setShowAuditLogs(!showAuditLogs)
                      }}
                      className="flex items-center justify-between w-full text-left group"
                    >
                      <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1 cursor-pointer group-hover:text-gray-700">
                        <History className="h-3 w-3" />
                        Change History
                      </label>
                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${showAuditLogs ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {showAuditLogs && (
                      <div className="mt-3">
                        {loadingAuditLogs ? (
                          <div className="text-center py-4">
                            <RefreshCw className="h-5 w-5 text-gray-400 animate-spin mx-auto" />
                            <p className="text-xs text-gray-500 mt-2">Loading history...</p>
                          </div>
                        ) : auditLogs.length === 0 ? (
                          <div className="text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500">No changes have been made to this transaction.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {auditLogs.map((log, idx) => (
                              <div key={log.id || idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-700 capitalize">{log.field}</span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(log.changedAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded line-through">
                                    {log.oldValue || '(empty)'}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                    {log.newValue || '(empty)'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Transaction ID */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Transaction ID</label>
                  <p className="text-xs font-mono text-gray-400 mt-1">{selectedTransaction.id}</p>
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-200">
                {isEditMode ? (
                  <div className="flex gap-3">
                    <Button 
                      onClick={cancelEditMode}
                      variant="outline"
                      className="flex-1"
                      disabled={savingMetadata}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveMetadata}
                      className="flex-1"
                      style={{ backgroundColor: '#F9C900', color: '#000000' }}
                      disabled={savingMetadata || uploadingImage}
                    >
                      {savingMetadata ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button 
                      onClick={enterEditMode}
                      variant="outline"
                      className="flex-1"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Metadata
                    </Button>
                    <Button 
                      onClick={closeModal}
                      className="flex-1"
                      style={{ backgroundColor: '#F9C900', color: '#000000' }}
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
