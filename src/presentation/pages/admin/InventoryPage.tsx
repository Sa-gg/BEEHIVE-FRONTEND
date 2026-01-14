import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { Search, Plus, Package, AlertTriangle, CheckCircle, TrendingUp, ArrowUpDown, Trash2, Pencil, ChevronLeft, ChevronRight, History, Printer, Eye, X, AlertOctagon, Layers } from 'lucide-react'
import { inventoryApi, type CreateInventoryItemRequest, type InventoryStats, type UpdateInventoryItemRequest, type InventoryItemDTO } from '../../../infrastructure/api/inventory.api'
import { StockManagementModal } from '../../components/features/Admin/StockManagementModal'
import { BulkStockModal } from '../../components/features/Admin/BulkStockModal'
import { formatSmartStock } from '../../../shared/utils/stockFormat'
import { printWithIframe } from '../../../shared/utils/printUtils'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../components/common/ToastNotification'

// Use DTO type from API for inventory items
type InventoryItem = InventoryItemDTO

export const InventoryPage = () => {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Check if user can manage inventory (ADMIN or MANAGER only)
  const canManageInventory = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<InventoryStats>({ totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStockStatus, setSelectedStockStatus] = useState('all')
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({})
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedItemForStock, setSelectedItemForStock] = useState<InventoryItem | null>(null)
  const [showBulkStockModal, setShowBulkStockModal] = useState(false)
  
  // Form validation error states
  const [nameError, setNameError] = useState<string | null>(null)
  const [minStockError, setMinStockError] = useState<string | null>(null)
  const [maxStockError, setMaxStockError] = useState<string | null>(null)
  const [currentStockError, setCurrentStockError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [unitError, setUnitError] = useState<string | null>(null)
  const [costError, setCostError] = useState<string | null>(null)
  
  // Edit form validation error states
  const [editNameError, setEditNameError] = useState<string | null>(null)
  const [editMinStockError, setEditMinStockError] = useState<string | null>(null)
  const [editMaxStockError, setEditMaxStockError] = useState<string | null>(null)
  const [editCategoryError, setEditCategoryError] = useState<string | null>(null)
  const [editUnitError, setEditUnitError] = useState<string | null>(null)
  const [editCostError, setEditCostError] = useState<string | null>(null)
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10)
  const itemsPerPageOptions = [5, 10, 25, 50, 'all'] as const

  // Fetch inventory data
  const loadInventory = async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = {
        category: selectedCategory !== 'all' ? selectedCategory.toUpperCase() : undefined,
        search: searchQuery || undefined,
        status: selectedStockStatus !== 'all' ? selectedStockStatus.toUpperCase() : undefined
      }
      const [items, statsData] = await Promise.all([
        inventoryApi.getAll(filters),
        inventoryApi.getStats()
      ])
      setInventory(items)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory')
      console.error('Error loading inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  // Read filter from URL params on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam) {
      // Map URL filter values to stock status values
      const filterMap: Record<string, string> = {
        'discrepancy': 'discrepancy',
        'out_of_stock': 'out_of_stock',
        'low_stock': 'low_stock',
        'in_stock': 'in_stock'
      }
      if (filterMap[filterParam]) {
        setSelectedStockStatus(filterMap[filterParam])
      }
      // Clear the URL param after applying
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    loadInventory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedStockStatus, searchQuery])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory])

  // Pagination logic
  const totalItems = inventory.length
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage)
  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * (itemsPerPage as number)
  const endIndex = itemsPerPage === 'all' ? totalItems : startIndex + (itemsPerPage as number)
  const paginatedInventory = inventory.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleItemsPerPageChange = (value: number | 'all') => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(() => Date.now())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const categories = ['all', 'ingredients', 'beverages', 'packaging', 'supplies']

  const statusConfig = {
    'IN_STOCK': { label: 'In Stock', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    'LOW_STOCK': { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
    'OUT_OF_STOCK': { label: 'Out of Stock', color: 'bg-red-100 text-red-800 border-red-200', icon: Package },
    'DISCREPANCY': { label: 'Discrepancy', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: AlertOctagon },
  }

  // Search triggers on text change; no explicit search handler needed

  // Clear all validation errors
  const clearValidationErrors = () => {
    setNameError(null)
    setMinStockError(null)
    setMaxStockError(null)
    setCurrentStockError(null)
    setCategoryError(null)
    setUnitError(null)
    setCostError(null)
  }

  // Validate form before submission
  const validateForm = (): boolean => {
    clearValidationErrors()
    let isValid = true

    // Name validation
    if (!newItem.name || newItem.name.trim() === '') {
      setNameError('Item name is required')
      isValid = false
    } else if (inventory.some(item => item.name.toLowerCase() === newItem.name!.toLowerCase())) {
      setNameError(`An item with the name "${newItem.name}" already exists in inventory`)
      isValid = false
    }

    // Category validation
    if (!newItem.category) {
      setCategoryError('Please select a category')
      isValid = false
    }

    // Unit validation
    if (!newItem.unit) {
      setUnitError('Please select a unit')
      isValid = false
    }

    // Current stock validation
    if (newItem.currentStock === undefined || newItem.currentStock === null) {
      setCurrentStockError('Current stock is required')
      isValid = false
    } else if (newItem.currentStock < 0) {
      setCurrentStockError('Current stock cannot be negative')
      isValid = false
    }

    // Min stock validation
    if (newItem.minStock === undefined || newItem.minStock === null) {
      setMinStockError('Minimum stock is required')
      isValid = false
    } else if (newItem.minStock < 0) {
      setMinStockError('Minimum stock cannot be negative')
      isValid = false
    }

    // Max stock validation
    if (newItem.maxStock === undefined || newItem.maxStock === null) {
      setMaxStockError('Maximum stock is required')
      isValid = false
    } else if (newItem.maxStock < 0) {
      setMaxStockError('Maximum stock cannot be negative')
      isValid = false
    } else if (newItem.minStock !== undefined && newItem.maxStock <= newItem.minStock) {
      setMaxStockError('Maximum stock must be greater than minimum stock')
      isValid = false
    }

    // Cost validation
    if (newItem.costPerUnit === undefined || newItem.costPerUnit === null) {
      setCostError('Cost per unit is required')
      isValid = false
    } else if (newItem.costPerUnit < 0) {
      setCostError('Cost cannot be negative')
      isValid = false
    }

    return isValid
  }

  // Clear all edit validation errors
  const clearEditValidationErrors = () => {
    setEditNameError(null)
    setEditMinStockError(null)
    setEditMaxStockError(null)
    setEditCategoryError(null)
    setEditUnitError(null)
    setEditCostError(null)
  }

  // Validate edit form before submission
  const validateEditForm = (): boolean => {
    clearEditValidationErrors()
    let isValid = true

    if (!editingItem) return false

    // Name validation
    if (!editingItem.name || editingItem.name.trim() === '') {
      setEditNameError('Item name is required')
      isValid = false
    } else if (inventory.some(item => item.id !== editingItem.id && item.name.toLowerCase() === editingItem.name.toLowerCase())) {
      setEditNameError(`An item with the name "${editingItem.name}" already exists in inventory`)
      isValid = false
    }

    // Category validation
    if (!editingItem.category) {
      setEditCategoryError('Please select a category')
      isValid = false
    }

    // Unit validation
    if (!editingItem.unit) {
      setEditUnitError('Please select a unit')
      isValid = false
    }

    // Min stock validation
    if (editingItem.minStock === undefined || editingItem.minStock === null) {
      setEditMinStockError('Minimum stock is required')
      isValid = false
    } else if (editingItem.minStock < 0) {
      setEditMinStockError('Minimum stock cannot be negative')
      isValid = false
    }

    // Max stock validation
    if (editingItem.maxStock === undefined || editingItem.maxStock === null) {
      setEditMaxStockError('Maximum stock is required')
      isValid = false
    } else if (editingItem.maxStock < 0) {
      setEditMaxStockError('Maximum stock cannot be negative')
      isValid = false
    } else if (editingItem.minStock !== undefined && editingItem.maxStock <= editingItem.minStock) {
      setEditMaxStockError('Maximum stock must be greater than minimum stock')
      isValid = false
    }

    // Cost validation
    if (editingItem.costPerUnit === undefined || editingItem.costPerUnit === null) {
      setEditCostError('Cost per unit is required')
      isValid = false
    } else if (editingItem.costPerUnit < 0) {
      setEditCostError('Cost cannot be negative')
      isValid = false
    }

    return isValid
  }

  const addNewItem = async () => {
    // Validate form
    if (!validateForm()) {
      return
    }

    try {
      const itemData: CreateInventoryItemRequest = {
        name: newItem.name!,
        category: newItem.category!,
        currentStock: newItem.currentStock!,
        minStock: newItem.minStock!,
        maxStock: newItem.maxStock!,
        unit: newItem.unit!,
        costPerUnit: newItem.costPerUnit!,
        supplier: newItem.supplier || ''
      }
      await inventoryApi.create(itemData)
      setIsAdding(false)
      setNewItem({})
      clearValidationErrors()
      await loadInventory()
      toast.success('Item Added', 'Inventory item has been added successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item'
      // Check if it's a duplicate name error from backend
      if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('duplicate')) {
        setNameError(`An item with the name "${newItem.name}" already exists in inventory`)
      } else if (errorMessage.toLowerCase().includes('max') && errorMessage.toLowerCase().includes('min')) {
        setMaxStockError('Maximum stock must be greater than minimum stock')
      } else {
        toast.error('Add Failed', errorMessage)
      }
      console.error('Error adding item:', err)
    }
  }

  // Open delete confirmation modal
  const openDeleteModal = (item: InventoryItem) => {
    setItemToDelete(item)
    setDeleteReason('')
    setDeleteModalOpen(true)
  }

  // Close delete confirmation modal
  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setItemToDelete(null)
    setDeleteReason('')
    setIsDeleting(false)
  }

  // Confirm delete with reason
  const confirmDelete = async () => {
    if (!itemToDelete) return
    if (!deleteReason.trim()) {
      toast.warning('Reason Required', 'Please provide a reason for archiving this item')
      return
    }
    
    setIsDeleting(true)
    try {
      await inventoryApi.delete(itemToDelete.id, deleteReason.trim())
      toast.success('Item Archived', `${itemToDelete.name} has been archived successfully`)
      closeDeleteModal()
      await loadInventory()
    } catch (err) {
      toast.error('Archive Failed', err instanceof Error ? err.message : 'Failed to archive item')
      console.error('Error archiving item:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item)
    clearEditValidationErrors()
    setIsEditing(true)
  }

  const updateItem = async () => {
    if (!editingItem) return
    
    // Validate form
    if (!validateEditForm()) {
      return
    }
    
    try {
      const updateData: UpdateInventoryItemRequest = {
        name: editingItem.name,
        category: editingItem.category,
        minStock: editingItem.minStock,
        maxStock: editingItem.maxStock,
        unit: editingItem.unit,
        costPerUnit: editingItem.costPerUnit,
        supplier: editingItem.supplier
      }
      await inventoryApi.update(editingItem.id, updateData)
      setIsEditing(false)
      setEditingItem(null)
      clearEditValidationErrors()
      await loadInventory()
      toast.success('Item Updated', 'Inventory item has been updated successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item'
      // Check if it's a duplicate name error from backend
      if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('duplicate')) {
        setEditNameError(`An item with the name "${editingItem.name}" already exists in inventory`)
      } else if (errorMessage.toLowerCase().includes('max') && errorMessage.toLowerCase().includes('min')) {
        setEditMaxStockError('Maximum stock must be greater than minimum stock')
      } else {
        toast.error('Update Failed', errorMessage)
      }
      console.error('Error updating item:', err)
    }
  }

  const getStockPercentage = (item: InventoryItem) => {
    // Handle negative stock - return 0% (or could return negative for visual effect)
    if (item.currentStock < 0) return 0
    return Math.round((item.currentStock / item.maxStock) * 100)
  }

  // Check if item has negative stock (discrepancy)
  const hasNegativeStock = (item: InventoryItem) => item.currentStock < 0

  const getDaysAgo = (date: Date | null) => {
    if (!date) return 'Never'
    const days = Math.floor((currentTime - date.getTime()) / (24 * 60 * 60000))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  const handlePrint = () => {
    const statusLabels: Record<string, string> = {
      'IN_STOCK': 'In Stock',
      'LOW_STOCK': 'Low Stock',
      'OUT_OF_STOCK': 'Out of Stock'
    }

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Report - BEEHIVE</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #F9C900;
          }
          .header h1 {
            margin: 0;
            color: #1a1a1a;
          }
          .header .subtitle {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .stat-card {
            padding: 15px;
            border-radius: 8px;
            text-align: center;
          }
          .stat-card.total { background: #EFF6FF; border: 1px solid #BFDBFE; }
          .stat-card.low { background: #FFFBEB; border: 1px solid #FDE68A; }
          .stat-card.out { background: #FEF2F2; border: 1px solid #FECACA; }
          .stat-card.value { background: #F0FDF4; border: 1px solid #BBF7D0; }
          .stat-card h3 { margin: 0; font-size: 12px; text-transform: uppercase; color: #666; }
          .stat-card p { margin: 5px 0 0; font-size: 24px; font-weight: bold; }
          .filters {
            margin-bottom: 15px;
            font-size: 12px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background: #F9C900;
            color: #1a1a1a;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
          }
          tr:nth-child(even) { background: #f9fafb; }
          .status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
          }
          .status.in-stock { background: #D1FAE5; color: #065F46; }
          .status.low-stock { background: #FEF3C7; color: #92400E; }
          .status.out-of-stock { background: #FEE2E2; color: #991B1B; }
          .footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #666;
            text-align: center;
          }
          @media print {
            body { padding: 10px; }
            .stats { grid-template-columns: repeat(4, 1fr); }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🐝 BEEHIVE Inventory Report</h1>
          <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
        </div>

        <div class="stats">
          <div class="stat-card total">
            <h3>Total Items</h3>
            <p>${stats.totalItems}</p>
          </div>
          <div class="stat-card low">
            <h3>Low Stock</h3>
            <p>${stats.lowStock}</p>
          </div>
          <div class="stat-card out">
            <h3>Out of Stock</h3>
            <p>${stats.outOfStock}</p>
          </div>
          <div class="stat-card value">
            <h3>Total Value</h3>
            <p>₱${stats.totalValue.toLocaleString()}</p>
          </div>
        </div>

        <div class="filters">
          Category: ${selectedCategory === 'all' ? 'All Categories' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
          ${searchQuery ? ` | Search: "${searchQuery}"` : ''}
          | Showing ${inventory.length} items
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Stock Level</th>
              <th>Unit</th>
              <th>Cost/Unit</th>
              <th>Supplier</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${inventory.map(item => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.category}</td>
                <td>${formatSmartStock(item.currentStock, item.unit)} / ${formatSmartStock(item.maxStock, item.unit)}</td>
                <td>${item.unit}</td>
                <td>₱${item.costPerUnit.toFixed(2)}</td>
                <td>${item.supplier || '-'}</td>
                <td>
                  <span class="status ${item.status.toLowerCase().replace('_', '-')}">${statusLabels[item.status]}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          BEEHIVE Cafe & Restaurant - Inventory Management System
        </div>
      </body>
      </html>
    `

    printWithIframe(printHTML)
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="text-gray-500 mt-1">Manage your stock and supplies</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
            {canManageInventory && (
              <>
                <Link to="/admin/inventory/transactions">
                  <Button variant="outline" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Transactions
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkStockModal(true)}
                  className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Layers className="h-4 w-4" />
                  Bulk Stock
                </Button>
                <Button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2"
                  style={{ backgroundColor: '#F9C900', color: '#000000' }}
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards - Dynamic grid based on whether discrepancy card is shown */}
        <div className={`grid gap-4 lg:gap-6 ${
          (stats.discrepancy ?? 0) > 0 
            ? 'grid-cols-2 lg:grid-cols-5' 
            : 'grid-cols-2 lg:grid-cols-4'
        }`}>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-5 border border-blue-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Items</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900">
              {stats.totalItems.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-2">all inventory</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl shadow-sm p-5 border border-yellow-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-yellow-100 rounded-xl group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              {stats.lowStock > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 animate-pulse">
                  Alert
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Low Stock</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900">
              {stats.lowStock.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-2">{stats.lowStock > 0 ? 'needs restock' : 'all clear'}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl shadow-sm p-5 border border-red-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-red-100 rounded-xl group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              {stats.outOfStock > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">
                  Critical
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Out of Stock</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900">
              {stats.outOfStock.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-2">{stats.outOfStock > 0 ? 'urgent attention' : 'all stocked'}</p>
          </div>
          {/* Discrepancy Card - Only show if there are discrepancies */}
          {(stats.discrepancy ?? 0) > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-sm p-5 border border-purple-100 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform">
                  <AlertOctagon className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 animate-pulse">
                  Review
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">Discrepancy</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                {(stats.discrepancy ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-2">negative stock</p>
            </div>
          )}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-sm p-5 border border-green-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Value</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">
              ₱{stats.totalValue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-2">inventory worth</p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-gray-50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-medium text-gray-500">Category:</span>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="whitespace-nowrap capitalize"
                >
                  {cat}
                </Button>
              ))}
              
              {/* Divider */}
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              {/* Stock Status Filter */}
              <span className="text-xs font-medium text-gray-500">Status:</span>
              <Button
                variant={selectedStockStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStockStatus('all')}
                className="whitespace-nowrap"
              >
                All
              </Button>
              <Button
                variant={selectedStockStatus === 'IN_STOCK' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStockStatus('IN_STOCK')}
                className="whitespace-nowrap text-green-600"
              >
                ✓ In Stock
              </Button>
              <Button
                variant={selectedStockStatus === 'LOW_STOCK' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStockStatus('LOW_STOCK')}
                className="whitespace-nowrap text-yellow-600 relative"
              >
                ⚠️ Low Stock
                {stats.lowStock > 0 && selectedStockStatus !== 'LOW_STOCK' && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center">
                    {stats.lowStock}
                  </span>
                )}
              </Button>
              <Button
                variant={selectedStockStatus === 'OUT_OF_STOCK' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStockStatus('OUT_OF_STOCK')}
                className="whitespace-nowrap text-red-600 relative"
              >
                ❌ Out of Stock
                {stats.outOfStock > 0 && selectedStockStatus !== 'OUT_OF_STOCK' && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {stats.outOfStock}
                  </span>
                )}
              </Button>
              {/* Discrepancy Filter - Only show if there are discrepancies */}
              {(stats.discrepancy ?? 0) > 0 && (
                <Button
                  variant={selectedStockStatus === 'DISCREPANCY' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStockStatus('DISCREPANCY')}
                  className="whitespace-nowrap text-purple-600 relative"
                >
                  ⚠️ Discrepancy
                  {(stats.discrepancy ?? 0) > 0 && selectedStockStatus !== 'DISCREPANCY' && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.discrepancy}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-500">Loading inventory...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-600">{error}</p>
              <Button onClick={loadInventory} className="mt-4" size="sm" variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Supplier</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedInventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No items found</p>
                        {searchQuery && (
                          <p className="text-sm text-gray-400 mt-2">Try adjusting your search</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                  paginatedInventory.map(item => {
                    const StatusIcon = statusConfig[item.status].icon
                    const percentage = getStockPercentage(item)
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-500">₱{item.costPerUnit}/{item.unit}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-center">
                          <Badge variant="outline" className="capitalize text-xs">
                            {item.category.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="space-y-1 flex flex-col items-center">
                            <p className={`font-semibold text-sm ${hasNegativeStock(item) ? 'text-purple-600' : ''}`}>
                              {formatSmartStock(item.currentStock, item.unit)}
                            </p>
                            {hasNegativeStock(item) ? (
                              <>
                                <div className="w-24 bg-purple-200 rounded-full h-2">
                                  <div className="h-2 rounded-full bg-purple-500 w-full animate-pulse" />
                                </div>
                                <p className="text-xs text-purple-600 font-medium">Discrepancy</p>
                              </>
                            ) : (
                              <>
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      percentage > 50 ? 'bg-green-500' :
                                      percentage > 20 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500">{percentage}% of max</p>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell text-center">
                          <div>
                            <p className="text-sm text-gray-700">{item.supplier}</p>
                            <p className="text-xs text-gray-500">Last: {getDaysAgo(item.lastRestocked)}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Badge className={`${statusConfig[item.status].color} border text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[item.status].label}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          {canManageInventory ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedItemForStock(item)
                                  setShowStockModal(true)
                                }}
                                className="h-8 px-3 text-xs font-medium"
                                style={{ backgroundColor: '#F9C900', color: '#000000' }}
                              >
                                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                                Stock
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(item)}
                                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 border-blue-200"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDeleteModal(item)}
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 border-red-200"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 text-gray-500">
                              <Eye className="h-4 w-4" />
                              <span className="text-sm">View Only</span>
                            </div>
                          )}
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

      {/* Add Item Modal */}
      {isAdding && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setIsAdding(false)
              setNewItem({})
              clearValidationErrors()
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Add New Item</h2>
                  <button
                    onClick={() => {
                      setIsAdding(false)
                      setNewItem({})
                      clearValidationErrors()
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={newItem.name || ''}
                      onChange={(e) => {
                        setNewItem(prev => ({ ...prev, name: e.target.value }))
                        setNameError(null) // Clear error when user types
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        nameError 
                          ? 'border-red-500 focus:ring-red-400 bg-red-50' 
                          : 'border-gray-300 focus:ring-yellow-400'
                      }`}
                      placeholder="e.g., Pizza Dough"
                    />
                    {nameError && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {nameError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={newItem.category || ''}
                      onChange={(e) => {
                        setNewItem(prev => ({ ...prev, category: e.target.value as 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES' }))
                        setCategoryError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        categoryError 
                          ? 'border-red-500 focus:ring-red-400 bg-red-50' 
                          : 'border-gray-300 focus:ring-yellow-400'
                      }`}
                    >
                      <option value="">Select category</option>
                      <option value="INGREDIENTS">Ingredients</option>
                      <option value="BEVERAGES">Beverages</option>
                      <option value="PACKAGING">Packaging</option>
                      <option value="SUPPLIES">Supplies</option>
                    </select>
                    {categoryError && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {categoryError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Stock *
                    </label>
                    <input
                      type="number"
                      value={newItem.currentStock ?? ''}
                      onChange={(e) => {
                        setNewItem(prev => ({ 
                          ...prev, 
                          currentStock: e.target.value === '' ? undefined : Math.round(parseFloat(e.target.value) * 1000) / 1000 
                        }))
                        setCurrentStockError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        currentStockError 
                          ? 'border-red-500 focus:ring-red-400 bg-red-50' 
                          : 'border-gray-300 focus:ring-yellow-400'
                      }`}
                      placeholder="0"
                      min={0}
                      step="0.001"
                    />
                    {currentStockError && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {currentStockError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
                    </label>
                    <select
                      value={newItem.unit || ''}
                      onChange={(e) => {
                        setNewItem(prev => ({ ...prev, unit: e.target.value }))
                        setUnitError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white ${
                        unitError 
                          ? 'border-red-500 focus:ring-red-400 bg-red-50' 
                          : 'border-gray-300 focus:ring-yellow-400'
                      }`}
                    >
                      <option value="">Select unit...</option>
                      <option value="kg">kg (Kilogram)</option>
                      <option value="g">g (Gram)</option>
                      <option value="L">L (Liter)</option>
                      <option value="mL">mL (Milliliter)</option>
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="pack">pack (Pack)</option>
                      <option value="box">box (Box)</option>
                      <option value="bottle">bottle (Bottle)</option>
                      <option value="can">can (Can)</option>
                      <option value="bag">bag (Bag)</option>
                    </select>
                    {unitError && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {unitError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Stock *
                    </label>
                    <input
                      type="number"
                      value={newItem.minStock ?? ''}
                      onChange={(e) => {
                        setNewItem(prev => ({ 
                          ...prev, 
                          minStock: e.target.value === '' ? undefined : Math.round(parseFloat(e.target.value) * 1000) / 1000 
                        }))
                        setMinStockError(null)
                        // Also clear max stock error when min changes
                        setMaxStockError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        minStockError 
                          ? 'border-red-500 focus:ring-red-400 bg-red-50' 
                          : 'border-gray-300 focus:ring-yellow-400'
                      }`}
                      placeholder="0"
                      min={0}
                      step="0.001"
                    />
                    {minStockError && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {minStockError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Stock *
                    </label>
                    <input
                      type="number"
                      value={newItem.maxStock ?? ''}
                      onChange={(e) => {
                        setNewItem(prev => ({ 
                          ...prev, 
                          maxStock: e.target.value === '' ? undefined : Math.round(parseFloat(e.target.value) * 1000) / 1000 
                        }))
                        setMaxStockError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        maxStockError 
                          ? 'border-red-500 focus:ring-red-400 bg-red-50' 
                          : 'border-gray-300 focus:ring-yellow-400'
                      }`}
                      placeholder="0"
                      min={0}
                      step="0.001"
                    />
                    {maxStockError && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {maxStockError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost per Unit *
                    </label>
                    <input
                      type="number"
                      value={newItem.costPerUnit ?? ''}
                      onChange={(e) => {
                        setNewItem(prev => ({ 
                          ...prev, 
                          costPerUnit: e.target.value === '' ? undefined : Math.round(parseFloat(e.target.value) * 100) / 100 
                        }))
                        setCostError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        costError 
                          ? 'border-red-500 focus:ring-red-400 bg-red-50' 
                          : 'border-gray-300 focus:ring-yellow-400'
                      }`}
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                    />
                    {costError && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {costError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier (Optional)
                    </label>
                    <input
                      type="text"
                      value={newItem.supplier || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, supplier: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="e.g., Manila Flour Co."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false)
                      setNewItem({})
                      clearValidationErrors()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    style={{ backgroundColor: '#F9C900', color: '#000000' }}
                    onClick={addNewItem}
                  >
                    Add Item
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stock Management Modal */}
      {selectedItemForStock && (
        <StockManagementModal
          item={selectedItemForStock}
          isOpen={showStockModal}
          onClose={() => {
            setShowStockModal(false)
            setSelectedItemForStock(null)
          }}
          onSuccess={() => {
            loadInventory()
          }}
        />
      )}

      {/* Edit Item Modal */}
      {isEditing && editingItem && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setIsEditing(false)
              setEditingItem(null)
              clearEditValidationErrors()
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Edit Item</h2>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditingItem(null)
                      clearEditValidationErrors()
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => {
                        setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)
                        if (editNameError) setEditNameError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                        editNameError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Pizza Dough"
                    />
                    {editNameError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {editNameError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={editingItem.category}
                      onChange={(e) => {
                        setEditingItem(prev => prev ? { ...prev, category: e.target.value as 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES' } : null)
                        if (editCategoryError) setEditCategoryError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                        editCategoryError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select category</option>
                      <option value="INGREDIENTS">Ingredients</option>
                      <option value="BEVERAGES">Beverages</option>
                      <option value="PACKAGING">Packaging</option>
                      <option value="SUPPLIES">Supplies</option>
                    </select>
                    {editCategoryError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {editCategoryError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Stock
                    </label>
                    <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600">
                      {formatSmartStock(editingItem.currentStock, editingItem.unit)}
                      <span className="text-xs ml-2 text-gray-400">(Use "Manage Stock" to adjust)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
                    </label>
                    <select
                      value={editingItem.unit}
                      onChange={(e) => {
                        setEditingItem(prev => prev ? { ...prev, unit: e.target.value } : null)
                        if (editUnitError) setEditUnitError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white ${
                        editUnitError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select unit...</option>
                      <option value="kg">kg (Kilogram)</option>
                      <option value="g">g (Gram)</option>
                      <option value="L">L (Liter)</option>
                      <option value="mL">mL (Milliliter)</option>
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="pack">pack (Pack)</option>
                      <option value="box">box (Box)</option>
                      <option value="bottle">bottle (Bottle)</option>
                      <option value="can">can (Can)</option>
                      <option value="bag">bag (Bag)</option>
                    </select>
                    {editUnitError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {editUnitError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Stock *
                    </label>
                    <input
                      type="number"
                      value={editingItem.minStock ?? ''}
                      onChange={(e) => {
                        setEditingItem(prev => prev ? { 
                          ...prev, 
                          minStock: e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value) * 1000) / 1000 
                        } : null)
                        if (editMinStockError) setEditMinStockError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                        editMinStockError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="0"
                      min={0}
                      step="0.001"
                    />
                    {editMinStockError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {editMinStockError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Stock *
                    </label>
                    <input
                      type="number"
                      value={editingItem.maxStock ?? ''}
                      onChange={(e) => {
                        setEditingItem(prev => prev ? { 
                          ...prev, 
                          maxStock: e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value) * 1000) / 1000 
                        } : null)
                        if (editMaxStockError) setEditMaxStockError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                        editMaxStockError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="0"
                      min={0}
                      step="0.001"
                    />
                    {editMaxStockError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {editMaxStockError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost per Unit *
                    </label>
                    <input
                      type="number"
                      value={editingItem.costPerUnit ?? ''}
                      onChange={(e) => {
                        setEditingItem(prev => prev ? { 
                          ...prev, 
                          costPerUnit: e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value) * 100) / 100 
                        } : null)
                        if (editCostError) setEditCostError(null)
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                        editCostError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                    />
                    {editCostError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {editCostError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingItem.supplier || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, supplier: e.target.value } : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="e.g., Manila Flour Co."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setEditingItem(null)
                      clearEditValidationErrors()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    style={{ backgroundColor: '#F9C900', color: '#000000' }}
                    onClick={updateItem}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closeDeleteModal}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-red-800">Archive Item</h2>
                  </div>
                  <button
                    onClick={closeDeleteModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">You are about to archive:</p>
                  <p className="font-semibold text-lg text-gray-900">{itemToDelete.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Category: {itemToDelete.category} • Current Stock: {formatSmartStock(itemToDelete.currentStock, itemToDelete.unit)}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This action will archive the item and create an audit record. 
                    The item will no longer appear in active inventory but can be reviewed in stock transactions.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for archiving <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    placeholder="e.g., Item discontinued, Duplicate entry, No longer used..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={confirmDelete}
                  disabled={isDeleting || !deleteReason.trim()}
                >
                  {isDeleting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Archiving...
                    </div>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Archive Item
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bulk Stock Modal */}
      <BulkStockModal
        inventoryItems={inventory}
        isOpen={showBulkStockModal}
        onClose={() => setShowBulkStockModal(false)}
        onSuccess={() => {
          loadInventory()
        }}
      />
    </AdminLayout>
  )
}
