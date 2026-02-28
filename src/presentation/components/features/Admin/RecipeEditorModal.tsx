import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Plus, Trash2, AlertCircle, CheckCircle, Package, Layers, Search, ChevronDown } from 'lucide-react'
import { Button } from '../../common/ui/button'
import { Badge } from '../../common/ui/badge'
import { recipeApi, type MenuItemIngredient } from '../../../../infrastructure/api/recipe.api'
import { inventoryApi, type InventoryItemDTO } from '../../../../infrastructure/api/inventory.api'
import { addonsApi, type VariantDTO } from '../../../../infrastructure/api/addons.api'
import { formatSmartStock } from '../../../../shared/utils/stockFormat'

interface RecipeEditorModalProps {
  menuItemId: string
  menuItemName: string
  onClose: () => void
  onSuccess: () => void
}

type TabType = 'base' | string // 'base' for base product, or variant ID

export const RecipeEditorModal = ({ menuItemId, menuItemName, onClose, onSuccess }: RecipeEditorModalProps) => {
  const [ingredients, setIngredients] = useState<MenuItemIngredient[]>([])
  const [availableInventory, setAvailableInventory] = useState<InventoryItemDTO[]>([])
  const [variants, setVariants] = useState<VariantDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Current tab: 'base' for base product, or variant ID for variant-specific
  const [activeTab, setActiveTab] = useState<TabType>('base')
  
  // New ingredient form
  const [selectedInventoryId, setSelectedInventoryId] = useState('')
  const [quantity, setQuantity] = useState<number>(0)
  const [isAdding, setIsAdding] = useState(false)
  
  // Search for inventory items
  const [searchQuery, setSearchQuery] = useState('')
  
  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Update dropdown position when opening - show above if not enough space below
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const dropdownHeight = 320 // max-h-80 = 320px
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      
      // Show above if not enough space below and more space above
      const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow
      
      setDropdownPosition({
        top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }, [isDropdownOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    loadData()
  }, [menuItemId])

  useEffect(() => {
    // When tab changes, reload ingredients for that tab
    if (!loading) {
      loadIngredients()
    }
  }, [activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [inventoryData, variantsData] = await Promise.all([
        inventoryApi.getAll({}), // Get all inventory items
        addonsApi.getVariantsByMenuItem(menuItemId, true) // Include inactive variants
      ])
      setAvailableInventory(inventoryData)
      setVariants(variantsData.filter(v => v.isActive)) // Only show active variants
      
      // Load initial ingredients (base)
      const recipeData = await recipeApi.getRecipe(menuItemId, null, false)
      setIngredients(recipeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error loading recipe data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadIngredients = async () => {
    try {
      setError(null)
      const variantId = activeTab === 'base' ? null : activeTab
      const recipeData = await recipeApi.getRecipe(menuItemId, variantId, false)
      setIngredients(recipeData)
    } catch (err) {
      console.error('Error loading ingredients:', err)
    }
  }

  const handleAddIngredient = async () => {
    if (!selectedInventoryId || quantity <= 0) {
      setError('Please select an item and enter a valid quantity')
      return
    }

    try {
      setIsAdding(true)
      setError(null)
      const variantId = activeTab === 'base' ? null : activeTab
      await recipeApi.addIngredient(menuItemId, selectedInventoryId, quantity, variantId)
      await loadIngredients()
      setSelectedInventoryId('')
      setQuantity(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item')
      console.error('Error adding ingredient:', err)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveIngredient = async (inventoryItemId: string, variantId: string | null) => {
    if (!confirm('Remove this item from the configuration?')) return

    try {
      setError(null)
      await recipeApi.removeIngredient(menuItemId, inventoryItemId, variantId)
      await loadIngredients()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item')
      console.error('Error removing ingredient:', err)
    }
  }

  const handleSave = () => {
    onSuccess()
    onClose()
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'LOW_STOCK':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'OUT_OF_STOCK':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'DISCREPANCY':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'INGREDIENTS':
        return 'bg-green-100 text-green-700'
      case 'PACKAGING':
        return 'bg-blue-100 text-blue-700'
      case 'SUPPLIES':
        return 'bg-orange-100 text-orange-700'
      case 'BEVERAGES':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const currentVariantName = activeTab === 'base' 
    ? 'Base Product' 
    : variants.find(v => v.id === activeTab)?.name || 'Variant'

  // Filter available inventory items based on search
  const filteredInventory = useMemo(() => {
    return availableInventory.filter(item => {
      // Exclude already added items
      if (ingredients.some(ing => ing.inventoryItemId === item.id)) return false
      // Filter by search query
      if (!searchQuery) return true
      return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [availableInventory, ingredients, searchQuery])

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200" style={{ backgroundColor: '#F9C900' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-black">{menuItemName}</h2>
                <p className="text-sm text-black/70 mt-1">Configure inventory components for this product</p>
              </div>
              <button onClick={onClose} className="text-black hover:text-black/70 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Variant Tabs */}
          {variants.length > 0 && (
            <div className="px-6 pt-4 bg-gray-50 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Configure per variant:</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-3">
                <button
                  onClick={() => setActiveTab('base')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === 'base'
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Package className="h-4 w-4 inline mr-2" />
                  Base Product
                </button>
                {variants.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => setActiveTab(variant.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === variant.id
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {variant.name}
                    {variant.priceDelta !== 0 && (
                      <span className="ml-1 text-xs opacity-70">
                        ({variant.priceDelta > 0 ? '+' : ''}₱{variant.priceDelta})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab Description */}
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
            <p className="text-sm text-amber-800">
              {activeTab === 'base' ? (
                <>
                  <strong>Base Product:</strong> Items added here will be deducted for <u>all orders</u> of this product (unless overridden by a variant).
                </>
              ) : (
                <>
                  <strong>{currentVariantName}:</strong> Items added here will <u>only</u> be deducted when this specific variant is ordered. These override base items with the same inventory.
                </>
              )}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-500 border-r-transparent"></div>
                <p className="text-gray-500 mt-4">Loading configuration...</p>
              </div>
            ) : (
              <>
                {/* Current Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    {activeTab === 'base' ? 'Base Components' : `${currentVariantName} Components`}
                    <Badge variant="outline" className="text-xs">
                      {ingredients.length} items
                    </Badge>
                  </h3>
                  
                  {ingredients.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No components added yet</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {activeTab === 'base' 
                          ? 'Add inventory items below (ingredients, packaging, etc.)' 
                          : 'Add variant-specific items that override or extend the base configuration'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ingredients.map((ingredient) => (
                        <div
                          key={ingredient.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="font-semibold text-gray-900">
                                {ingredient.inventory_item.name}
                              </p>
                              <Badge className={`text-xs ${getCategoryColor(ingredient.inventory_item.category || '')}`}>
                                {ingredient.inventory_item.category || 'Unknown'}
                              </Badge>
                              <Badge className={`text-xs ${getStockStatusColor(ingredient.inventory_item.status)}`}>
                                {ingredient.inventory_item.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Required:</span>{' '}
                                <span className="text-amber-700 font-semibold">
                                  {formatSmartStock(ingredient.quantity, ingredient.inventory_item.unit)}
                                </span>
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Available:</span>{' '}
                                <span className={ingredient.inventory_item.currentStock < ingredient.quantity ? 'text-red-600 font-semibold' : ''}>
                                  {formatSmartStock(ingredient.inventory_item.currentStock, ingredient.inventory_item.unit)}
                                </span>
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveIngredient(ingredient.inventoryItemId, ingredient.variantId)}
                            className="text-red-600 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Item */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Add Inventory Item</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Item {searchQuery && <span className="text-gray-400">({filteredInventory.length} found)</span>}
                      </label>
                      {/* Custom Searchable Dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <button
                          type="button"
                          onClick={() => !isAdding && setIsDropdownOpen(!isDropdownOpen)}
                          disabled={isAdding}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-left flex items-center justify-between"
                        >
                          <span className={selectedInventoryId ? 'text-gray-900' : 'text-gray-500'}>
                            {selectedInventoryId
                              ? availableInventory.find(i => i.id === selectedInventoryId)?.name || 'Choose an item...'
                              : 'Choose an item...'}
                          </span>
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Dropdown Panel - uses fixed position to escape overflow clipping */}
                        {isDropdownOpen && dropdownPosition && (
                          <div 
                            className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden"
                            style={{ 
                              top: dropdownPosition.top, 
                              left: dropdownPosition.left, 
                              width: dropdownPosition.width 
                            }}
                          >
                            {/* Search Input Inside Dropdown */}
                            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search items..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
                                  autoFocus
                                />
                                {searchQuery && (
                                  <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Items List */}
                            <div className="overflow-y-auto max-h-60">
                              {filteredInventory.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                  No items found
                                </div>
                              ) : (
                                ['INGREDIENTS', 'PACKAGING', 'SUPPLIES', 'BEVERAGES'].map(category => {
                                  const categoryItems = filteredInventory.filter(
                                    item => item.category?.toUpperCase() === category
                                  )
                                  if (categoryItems.length === 0) return null
                                  return (
                                    <div key={category}>
                                      <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0">
                                        {category}
                                      </div>
                                      {categoryItems.map((item) => (
                                        <button
                                          key={item.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedInventoryId(item.id)
                                            setIsDropdownOpen(false)
                                            setSearchQuery('')
                                          }}
                                          className={`w-full px-3 py-2 text-left hover:bg-amber-50 flex items-center justify-between transition-colors ${
                                            selectedInventoryId === item.id ? 'bg-amber-100' : ''
                                          }`}
                                        >
                                          <span className="font-medium text-gray-900">{item.name}</span>
                                          <span className="text-sm text-gray-500">
                                            {formatSmartStock(item.currentStock, item.unit)}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity Required
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={quantity || ''}
                          onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                          disabled={isAdding}
                        />
                        <Button
                          onClick={handleAddIngredient}
                          disabled={isAdding || !selectedInventoryId || quantity <= 0}
                          style={{ backgroundColor: '#F9C900', color: '#000000' }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                      {selectedInventoryId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Unit: {availableInventory.find(i => i.id === selectedInventoryId)?.unit}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {ingredients.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">Configuration Summary</p>
                        <p className="text-sm text-blue-700 mt-1">
                          {activeTab === 'base' 
                            ? `Base product uses ${ingredients.length} inventory item${ingredients.length !== 1 ? 's' : ''}`
                            : `${currentVariantName} has ${ingredients.length} specific item${ingredients.length !== 1 ? 's' : ''}`}
                        </p>
                        <p className="text-xs text-blue-600 mt-2">
                          When an order is completed, these items will be deducted from inventory.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                style={{ backgroundColor: '#F9C900', color: '#000000' }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
