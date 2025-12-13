import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { Search, Plus, Edit, Trash2, Package, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'

interface InventoryItem {
  id: string
  name: string
  category: string
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  costPerUnit: number
  supplier: string
  lastRestocked: Date
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
}

// Sample data
const SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: '1',
    name: 'Pizza Dough',
    category: 'ingredients',
    currentStock: 50,
    minStock: 20,
    maxStock: 100,
    unit: 'kg',
    costPerUnit: 80,
    supplier: 'Manila Flour Co.',
    lastRestocked: new Date(Date.now() - 2 * 24 * 60 * 60000),
    status: 'in-stock',
  },
  {
    id: '2',
    name: 'Mozzarella Cheese',
    category: 'ingredients',
    currentStock: 15,
    minStock: 20,
    maxStock: 80,
    unit: 'kg',
    costPerUnit: 450,
    supplier: 'Dairy Fresh Supplies',
    lastRestocked: new Date(Date.now() - 5 * 24 * 60 * 60000),
    status: 'low-stock',
  },
  {
    id: '3',
    name: 'Coffee Beans',
    category: 'beverages',
    currentStock: 25,
    minStock: 15,
    maxStock: 60,
    unit: 'kg',
    costPerUnit: 650,
    supplier: 'Premium Coffee Traders',
    lastRestocked: new Date(Date.now() - 3 * 24 * 60 * 60000),
    status: 'in-stock',
  },
  {
    id: '4',
    name: 'Pepperoni',
    category: 'ingredients',
    currentStock: 0,
    minStock: 10,
    maxStock: 40,
    unit: 'kg',
    costPerUnit: 380,
    supplier: 'Meat Masters Inc.',
    lastRestocked: new Date(Date.now() - 10 * 24 * 60 * 60000),
    status: 'out-of-stock',
  },
  {
    id: '5',
    name: 'French Fries',
    category: 'ingredients',
    currentStock: 30,
    minStock: 25,
    maxStock: 100,
    unit: 'kg',
    costPerUnit: 120,
    supplier: 'Potato Paradise',
    lastRestocked: new Date(Date.now() - 1 * 24 * 60 * 60000),
    status: 'in-stock',
  },
  {
    id: '6',
    name: 'Milk',
    category: 'beverages',
    currentStock: 18,
    minStock: 20,
    maxStock: 80,
    unit: 'liters',
    costPerUnit: 85,
    supplier: 'Dairy Fresh Supplies',
    lastRestocked: new Date(Date.now() - 4 * 24 * 60 * 60000),
    status: 'low-stock',
  },
  {
    id: '7',
    name: 'Matcha Powder',
    category: 'beverages',
    currentStock: 8,
    minStock: 5,
    maxStock: 20,
    unit: 'kg',
    costPerUnit: 1200,
    supplier: 'Premium Coffee Traders',
    lastRestocked: new Date(Date.now() - 7 * 24 * 60 * 60000),
    status: 'in-stock',
  },
  {
    id: '8',
    name: 'Beef',
    category: 'ingredients',
    currentStock: 22,
    minStock: 15,
    maxStock: 50,
    unit: 'kg',
    costPerUnit: 420,
    supplier: 'Meat Masters Inc.',
    lastRestocked: new Date(Date.now() - 1 * 24 * 60 * 60000),
    status: 'in-stock',
  },
]

export const InventoryPage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>(SAMPLE_INVENTORY)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({})
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(() => Date.now())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const categories = ['all', 'ingredients', 'beverages', 'packaging', 'supplies']

  const statusConfig = {
    'in-stock': { label: 'In Stock', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    'low-stock': { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
    'out-of-stock': { label: 'Out of Stock', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
  }

  const filteredInventory = inventory.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch = searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const stats = {
    totalItems: inventory.length,
    lowStock: inventory.filter(i => i.status === 'low-stock').length,
    outOfStock: inventory.filter(i => i.status === 'out-of-stock').length,
    totalValue: inventory.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0),
  }

  const updateStock = (itemId: string, newStock: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === itemId) {
        let status: InventoryItem['status'] = 'in-stock'
        if (newStock === 0) status = 'out-of-stock'
        else if (newStock <= item.minStock) status = 'low-stock'
        
        return { ...item, currentStock: newStock, status, lastRestocked: new Date() }
      }
      return item
    }))
  }

  const deleteItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setInventory(prev => prev.filter(item => item.id !== itemId))
    }
  }

  const addNewItem = () => {
    if (!newItem.name || !newItem.category || !newItem.currentStock || !newItem.minStock || !newItem.maxStock || !newItem.unit || !newItem.costPerUnit || !newItem.supplier) {
      alert('Please fill in all required fields')
      return
    }

    const stock = newItem.currentStock || 0
    const minStock = newItem.minStock || 0
    let status: InventoryItem['status'] = 'in-stock'
    if (stock === 0) status = 'out-of-stock'
    else if (stock <= minStock) status = 'low-stock'

    const item: InventoryItem = {
      id: Date.now().toString(),
      name: newItem.name,
      category: newItem.category,
      currentStock: stock,
      minStock: newItem.minStock,
      maxStock: newItem.maxStock || 100,
      unit: newItem.unit,
      costPerUnit: newItem.costPerUnit,
      supplier: newItem.supplier,
      lastRestocked: new Date(),
      status,
    }

    setInventory(prev => [...prev, item])
    setNewItem({})
    setIsAdding(false)
  }

  const getStockPercentage = (item: InventoryItem) => {
    return Math.round((item.currentStock / item.maxStock) * 100)
  }

  const getDaysAgo = (date: Date) => {
    const days = Math.floor((currentTime - date.getTime()) / (24 * 60 * 60000))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Inventory Management</h1>
          <p className="text-sm lg:text-base text-gray-600">Track and manage your stock levels</p>
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
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
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
                {filteredInventory.length === 0 ? (
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
                  filteredInventory.map(item => {
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
                            {item.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-sm">
                              {item.currentStock} {item.unit}
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
                              variant="outline"
                              onClick={() => {
                                setSelectedItem(item)
                                setIsEditing(true)
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteItem(item.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
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
        </div>
      </div>

      {/* Restock Modal */}
      {isEditing && selectedItem && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setIsEditing(false)
              setSelectedItem(null)
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Update Stock</h2>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setSelectedItem(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Item Name</p>
                  <p className="font-semibold text-lg">{selectedItem.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Current Stock</p>
                    <p className="font-semibold">{selectedItem.currentStock} {selectedItem.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Min Stock</p>
                    <p className="font-semibold">{selectedItem.minStock} {selectedItem.unit}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Stock Amount
                  </label>
                  <input
                    type="number"
                    defaultValue={selectedItem.currentStock}
                    min={0}
                    max={selectedItem.maxStock}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    onChange={(e) => {
                      const newStock = parseInt(e.target.value) || 0
                      updateStock(selectedItem.id, newStock)
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: {selectedItem.maxStock} {selectedItem.unit}</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setSelectedItem(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    style={{ backgroundColor: '#F9C900', color: '#000000' }}
                    onClick={() => {
                      setIsEditing(false)
                      setSelectedItem(null)
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
                      onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      <option value="">Select category</option>
                      <option value="ingredients">Ingredients</option>
                      <option value="beverages">Beverages</option>
                      <option value="packaging">Packaging</option>
                      <option value="supplies">Supplies</option>
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
                    <input
                      type="text"
                      value={newItem.unit || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="e.g., kg, liters, pcs"
                    />
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
                      Supplier *
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
    </AdminLayout>
  )
}
