import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { Search, Plus, Package, AlertTriangle, CheckCircle, TrendingUp, ArrowUpDown, Trash2, Pencil, ChevronLeft, ChevronRight, History } from 'lucide-react'
import { inventoryApi, type CreateInventoryItemRequest, type InventoryStats, type UpdateInventoryItemRequest } from '../../../infrastructure/api/inventory.api'
import { StockManagementModal } from '../../components/features/Admin/StockManagementModal'
import { formatSmartStock } from '../../../shared/utils/stockFormat'

interface InventoryItem {
  id: string
  name: string
  category: 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES'
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  costPerUnit: number
  supplier: string
  lastRestocked: Date | null
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
}

export const InventoryPage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<InventoryStats>({ totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({})
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedItemForStock, setSelectedItemForStock] = useState<InventoryItem | null>(null)
  
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
        search: searchQuery || undefined
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

  useEffect(() => {
    loadInventory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory])

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
  }

  const handleSearch = () => {
    loadInventory()
  }

  const addNewItem = async () => {
    if (!newItem.name || !newItem.category || newItem.currentStock === undefined || 
        newItem.minStock === undefined || newItem.maxStock === undefined || 
        !newItem.unit || newItem.costPerUnit === undefined) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const itemData: CreateInventoryItemRequest = {
        name: newItem.name,
        category: newItem.category,
        currentStock: newItem.currentStock,
        minStock: newItem.minStock,
        maxStock: newItem.maxStock,
        unit: newItem.unit,
        costPerUnit: newItem.costPerUnit,
        supplier: newItem.supplier
      }
      await inventoryApi.create(itemData)
      setIsAdding(false)
      setNewItem({})
      await loadInventory()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add item')
      console.error('Error adding item:', err)
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      await inventoryApi.delete(id)
      await loadInventory()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item')
      console.error('Error deleting item:', err)
    }
  }

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item)
    setIsEditing(true)
  }

  const updateItem = async () => {
    if (!editingItem) return
    
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
      await loadInventory()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update item')
      console.error('Error updating item:', err)
    }
  }

  const getStockPercentage = (item: InventoryItem) => {
    return Math.round((item.currentStock / item.maxStock) * 100)
  }

  const getDaysAgo = (date: Date | null) => {
    if (!date) return 'Never'
    const days = Math.floor((currentTime - date.getTime()) / (24 * 60 * 60000))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">Inventory Management</h1>
            <p className="text-sm lg:text-base text-gray-600">Track and manage your stock levels</p>
          </div>
          <Link to="/admin/inventory/transactions">
            <Button variant="outline" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Stock Transactions
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Items</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-blue-900">{stats.totalItems}</p>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Low Stock</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-yellow-900">{stats.lowStock}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Out of Stock</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-red-900">{stats.outOfStock}</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Total Value</span>
            </div>
            <p className="text-xl lg:text-2xl font-bold text-green-900">₱{stats.totalValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    loadInventory()
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
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
            </div>

            {/* Search Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSearch}
              className="whitespace-nowrap"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>

            {/* Add New Button */}
            <Button
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setIsAdding(true)}
              style={{ backgroundColor: '#F9C900', color: '#000000' }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
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
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
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
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-500">₱{item.costPerUnit}/{item.unit}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <Badge variant="outline" className="capitalize text-xs">
                            {item.category.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-sm">
                              {formatSmartStock(item.currentStock, item.unit)}
                            </p>
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
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <div>
                            <p className="text-sm text-gray-700">{item.supplier}</p>
                            <p className="text-xs text-gray-500">Last: {getDaysAgo(item.lastRestocked)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`${statusConfig[item.status].color} border text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[item.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedItemForStock(item)
                                setShowStockModal(true)
                              }}
                              className="h-9 px-4 font-medium"
                              style={{ backgroundColor: '#F9C900', color: '#000000' }}
                            >
                              <ArrowUpDown className="h-4 w-4 mr-2" />
                              Manage Stock
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(item)}
                              className="h-9 px-3 text-blue-600 hover:bg-blue-50 border-blue-200"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteItem(item.id)}
                              className="h-9 px-3 text-red-600 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
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
                      onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="e.g., Pizza Dough"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={newItem.category || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value as 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES' }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      <option value="">Select category</option>
                      <option value="INGREDIENTS">Ingredients</option>
                      <option value="BEVERAGES">Beverages</option>
                      <option value="PACKAGING">Packaging</option>
                      <option value="SUPPLIES">Supplies</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Stock *
                    </label>
                    <input
                      type="number"
                      value={newItem.currentStock || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="0"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
                    </label>
                    <select
                      value={newItem.unit || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Stock *
                    </label>
                    <input
                      type="number"
                      value={newItem.minStock || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="0"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Stock *
                    </label>
                    <input
                      type="number"
                      value={newItem.maxStock || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, maxStock: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="0"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost per Unit *
                    </label>
                    <input
                      type="number"
                      value={newItem.costPerUnit || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, costPerUnit: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                    />
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
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="e.g., Pizza Dough"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={editingItem.category}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, category: e.target.value as 'INGREDIENTS' | 'BEVERAGES' | 'PACKAGING' | 'SUPPLIES' } : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      <option value="">Select category</option>
                      <option value="INGREDIENTS">Ingredients</option>
                      <option value="BEVERAGES">Beverages</option>
                      <option value="PACKAGING">Packaging</option>
                      <option value="SUPPLIES">Supplies</option>
                    </select>
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
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit: e.target.value } : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Stock *
                    </label>
                    <input
                      type="number"
                      value={editingItem.minStock}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, minStock: parseInt(e.target.value) || 0 } : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="0"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Stock *
                    </label>
                    <input
                      type="number"
                      value={editingItem.maxStock}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, maxStock: parseInt(e.target.value) || 0 } : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="0"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost per Unit *
                    </label>
                    <input
                      type="number"
                      value={editingItem.costPerUnit}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, costPerUnit: parseFloat(e.target.value) || 0 } : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                    />
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
    </AdminLayout>
  )
}
