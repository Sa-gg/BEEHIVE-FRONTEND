import { useState, useEffect } from 'react'
import { X, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '../../common/ui/button'
import { Badge } from '../../common/ui/badge'
import { recipeApi, type MenuItemIngredient } from '../../../../infrastructure/api/recipe.api'
import { inventoryApi, type InventoryItem } from '../../../../infrastructure/api/inventory.api'
import { formatSmartStock } from '../../../../shared/utils/stockFormat'

interface RecipeEditorModalProps {
  menuItemId: string
  menuItemName: string
  onClose: () => void
  onSuccess: () => void
}

export const RecipeEditorModal = ({ menuItemId, menuItemName, onClose, onSuccess }: RecipeEditorModalProps) => {
  const [ingredients, setIngredients] = useState<MenuItemIngredient[]>([])
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // New ingredient form
  const [selectedInventoryId, setSelectedInventoryId] = useState('')
  const [quantity, setQuantity] = useState<number>(0)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [menuItemId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [recipeData, inventoryData] = await Promise.all([
        recipeApi.getRecipe(menuItemId),
        inventoryApi.getAll({ category: 'INGREDIENTS' })
      ])
      setIngredients(recipeData)
      setAvailableInventory(inventoryData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error loading recipe data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddIngredient = async () => {
    if (!selectedInventoryId || quantity <= 0) {
      setError('Please select an ingredient and enter a valid quantity')
      return
    }

    try {
      setIsAdding(true)
      setError(null)
      await recipeApi.addIngredient(menuItemId, selectedInventoryId, quantity)
      await loadData()
      setSelectedInventoryId('')
      setQuantity(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add ingredient')
      console.error('Error adding ingredient:', err)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveIngredient = async (inventoryItemId: string) => {
    if (!confirm('Remove this ingredient from the recipe?')) return

    try {
      setError(null)
      await recipeApi.removeIngredient(menuItemId, inventoryItemId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove ingredient')
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
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const totalCost = ingredients.reduce((sum, ing) => {
    return sum + (ing.quantity * (ing.inventory_item.currentStock || 0))
  }, 0)

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200" style={{ backgroundColor: '#F9C900' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-black">Recipe Editor</h2>
                <p className="text-sm text-black/70 mt-1">{menuItemName}</p>
              </div>
              <button onClick={onClose} className="text-black hover:text-black/70 transition-colors text-2xl">
                <X className="h-6 w-6" />
              </button>
            </div>
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
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                <p className="text-gray-500 mt-4">Loading recipe...</p>
              </div>
            ) : (
              <>
                {/* Current Ingredients */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Current Ingredients
                    <Badge variant="outline" className="text-xs">
                      {ingredients.length} items
                    </Badge>
                  </h3>
                  
                  {ingredients.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No ingredients added yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add ingredients below to define this recipe</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ingredients.map((ingredient) => (
                        <div
                          key={ingredient.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <p className="font-semibold text-gray-900">
                                {ingredient.inventory_item.name}
                              </p>
                              <Badge className={`text-xs ${getStockStatusColor(ingredient.inventory_item.status)}`}>
                                {ingredient.inventory_item.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Required:</span>{' '}
                                {formatSmartStock(ingredient.quantity, ingredient.inventory_item.unit)}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Available:</span>{' '}
                                {formatSmartStock(ingredient.inventory_item.currentStock, ingredient.inventory_item.unit)}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveIngredient(ingredient.inventoryItemId)}
                            className="text-red-600 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Ingredient */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Add Ingredient</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Ingredient
                      </label>
                      <select
                        value={selectedInventoryId}
                        onChange={(e) => setSelectedInventoryId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        disabled={isAdding}
                      >
                        <option value="">Choose an ingredient...</option>
                        {availableInventory
                          .filter(item => !ingredients.some(ing => ing.inventoryItemId === item.id))
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({formatSmartStock(item.currentStock, item.unit)} available)
                            </option>
                          ))}
                      </select>
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
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
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

                {/* Recipe Summary */}
                {ingredients.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">Recipe Summary</p>
                        <p className="text-sm text-blue-700 mt-1">
                          This recipe uses {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-blue-600 mt-2">
                          When an order is marked as COMPLETED, these ingredients will automatically be deducted from inventory.
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
                Save Recipe
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
