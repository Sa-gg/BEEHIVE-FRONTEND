import { useState, useEffect } from 'react'
import { X, Plus, Minus, Loader2, Package } from 'lucide-react'
import { Button } from '../../common/ui/button'
import { addonsApi, type VariantDTO, type MenuItemAddonLinkDTO, calculateOrderItemSubtotal } from '../../../../infrastructure/api/addons.api'
import { recipeApi } from '../../../../infrastructure/api/recipe.api'
import type { OrderItemAddon } from '../../../../core/domain/entities/Order.entity'

// Export types for consumers
export interface VariantSelection {
  id: string
  name: string
  priceDelta: number
}

export interface AddonSelection {
  addonItemId: string
  addonName: string
  addonPrice: number
  quantity: number
}

export interface AddonsVariantsResult {
  variantId: string | null
  variantName: string | null
  variantPriceDelta: number
  addons: OrderItemAddon[]
  notes: string
  finalPrice: number
  quantity: number // Added: support ordering multiple items at once
}

// Cart item format for stock calculation
export interface CartItemForStock {
  menuItemId: string
  variantId?: string | null
  quantity: number
}

interface AddonsVariantsModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: AddonsVariantsResult) => void
  menuItem: {
    id: string
    name: string
    price: number
    image?: string | null
  }
  initialQuantity?: number
  // Cart items to consider when calculating available stock
  cartItems?: CartItemForStock[]
  // Base product max servings from POSPage (for real-time display)
  baseMaxServings?: number
  // Whether to auto out-of-stock variants when ingredients run out
  autoOutOfStockWhenIngredientsRunOut?: boolean
}

export const AddonsVariantsModal = ({
  isOpen,
  onClose,
  onConfirm,
  menuItem,
  initialQuantity = 1,
  cartItems = [],
  baseMaxServings,
  autoOutOfStockWhenIngredientsRunOut = false
}: AddonsVariantsModalProps) => {
  const [loading, setLoading] = useState(true)
  const [variants, setVariants] = useState<VariantDTO[]>([])
  const [addonLinks, setAddonLinks] = useState<MenuItemAddonLinkDTO[]>([])
  const [variantServings, setVariantServings] = useState<Record<string, number>>({}) // 'base' or variantId -> stock count
  // Store initial servings to calculate real-time stock based on quantity changes
  const [initialVariantServings, setInitialVariantServings] = useState<Record<string, number>>({})
  
  // Memoize cartItems for proper dependency tracking
  const cartItemsKey = JSON.stringify(cartItems)
  
  // Selection state
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Map<string, { quantity: number; unitPrice: number; name: string }>>(new Map())
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState(initialQuantity)
  
  // Editable quantity state
  const [isEditingQuantity, setIsEditingQuantity] = useState(false)
  const [editQuantityValue, setEditQuantityValue] = useState('')

  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    return `${API_BASE_URL}${imagePath}`
  }

  // Fetch variants and add-ons when modal opens
  useEffect(() => {
    const doFetch = async () => {
      try {
        setLoading(true)
        const [variantsData, addonsData] = await Promise.all([
          addonsApi.getVariantsByMenuItem(menuItem.id),
          addonsApi.getAddonsForBaseItem(menuItem.id)
        ])
        
        setVariants(variantsData)
        setAddonLinks(addonsData)
        
        // Fetch variant-specific stock (accounting for cart items) if there are variants
        if (variantsData.length > 0) {
          try {
            // Use the new endpoint that considers cart items
            const servingsData = await recipeApi.getVariantServingsWithCart(menuItem.id, cartItems)
            setVariantServings(servingsData)
            setInitialVariantServings(servingsData) // Store initial values for quantity-based calculations
          } catch (error) {
            console.error('Failed to fetch variant servings:', error)
            // Fallback to regular endpoint
            try {
              const servingsData = await recipeApi.getVariantServings(menuItem.id)
              setVariantServings(servingsData)
              setInitialVariantServings(servingsData) // Store initial values
            } catch (fallbackError) {
              console.error('Fallback also failed:', fallbackError)
            }
          }
        }
        
        // Set default variant if available
        const defaultVariant = variantsData.find(v => v.isDefault)
        if (defaultVariant) {
          setSelectedVariantId(defaultVariant.id)
        }
      } catch (error) {
        console.error('Failed to fetch addons data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (isOpen && menuItem.id) {
      doFetch()
    }
  }, [isOpen, menuItem.id, cartItemsKey]) // Use stringified cartItems for proper comparison
  
  // Update base servings from POSPage prop when it changes (for real-time updates)
  useEffect(() => {
    if (baseMaxServings !== undefined && variants.length > 0) {
      setVariantServings(prev => ({
        ...prev,
        base: baseMaxServings
      }))
    }
  }, [baseMaxServings, variants.length])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedVariantId(null)
      setSelectedAddons(new Map())
      setNotes('')
      setQuantity(1) // Reset quantity to 1
      setInitialVariantServings({}) // Reset initial servings
      setIsEditingQuantity(false)
      setEditQuantityValue('')
    }
  }, [isOpen])

  // Calculate current price
  const calculatePrice = () => {
    const selectedVariant = variants.find(v => v.id === selectedVariantId)
    const variantDelta = selectedVariant?.priceDelta || 0
    
    const addonsArray = Array.from(selectedAddons.values()).map(data => ({
      unitPrice: data.unitPrice,
      quantity: data.quantity
    }))
    
    return calculateOrderItemSubtotal({
      basePrice: menuItem.price,
      variantPriceDelta: variantDelta,
      addons: addonsArray,
      quantity: quantity // Use state quantity instead of initialQuantity
    })
  }

  // Get max quantity helper (extracted for reuse)
  const getCurrentMaxQuantity = () => {
    if (!autoOutOfStockWhenIngredientsRunOut) return Infinity
    
    // Check if this item has variants
    if (variants.length > 0) {
      if (selectedVariantId && initialVariantServings[selectedVariantId] !== undefined) {
        const stock = initialVariantServings[selectedVariantId]
        if (stock === -1) return Infinity
        return Math.max(1, stock)
      }
      if (initialVariantServings['base'] !== undefined) {
        const stock = initialVariantServings['base']
        if (stock === -1) return Infinity
        return Math.max(1, stock)
      }
    } else {
      if (baseMaxServings !== undefined && baseMaxServings !== -1) {
        return Math.max(1, baseMaxServings)
      }
    }
    return Infinity
  }

  // Update variant servings display when quantity changes
  const updateVariantServingsDisplay = (newQuantity: number) => {
    if (Object.keys(initialVariantServings).length > 0) {
      const updatedServings: Record<string, number> = {}
      
      for (const [key, initialValue] of Object.entries(initialVariantServings)) {
        if (initialValue === -1) {
          updatedServings[key] = -1
        } else {
          updatedServings[key] = Math.max(0, initialValue - newQuantity)
        }
      }
      
      setVariantServings(updatedServings)
    }
  }

  // Handle item quantity change and update displayed variant stock in real-time
  const updateQuantity = (delta: number) => {
    const currentMaxQuantity = getCurrentMaxQuantity()
    
    setQuantity(prev => {
      // Apply stock cap when increasing and setting is enabled
      const newQuantity = Math.max(1, Math.min(prev + delta, currentMaxQuantity))
      
      // Update displayed variant servings based on new quantity
      updateVariantServingsDisplay(newQuantity)
      
      return newQuantity
    })
  }

  // Handle direct quantity edit (click on number to edit)
  const handleQuantityClick = () => {
    setEditQuantityValue(quantity.toString())
    setIsEditingQuantity(true)
  }

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, '')
    setEditQuantityValue(value)
  }

  const handleQuantityInputBlur = () => {
    const currentMaxQuantity = getCurrentMaxQuantity()
    let newValue = parseInt(editQuantityValue, 10)
    
    // Validate and constrain the value
    if (isNaN(newValue) || newValue < 1) {
      newValue = 1
    } else if (currentMaxQuantity !== Infinity && newValue > currentMaxQuantity) {
      newValue = currentMaxQuantity
    }
    
    setQuantity(newValue)
    updateVariantServingsDisplay(newValue)
    setIsEditingQuantity(false)
    setEditQuantityValue('')
  }

  const handleQuantityInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleQuantityInputBlur()
    } else if (e.key === 'Escape') {
      setIsEditingQuantity(false)
      setEditQuantityValue('')
    }
  }

  // Handle addon quantity change
  const updateAddonQuantity = (addonLink: MenuItemAddonLinkDTO, delta: number) => {
    const addonItem = addonLink.addon_item
    if (!addonItem) return
    
    const current = selectedAddons.get(addonLink.addonItemId)?.quantity || 0
    const newQty = Math.max(0, Math.min(current + delta, addonLink.maxQuantity))
    
    setSelectedAddons(prev => {
      const newMap = new Map(prev)
      if (newQty === 0) {
        newMap.delete(addonLink.addonItemId)
      } else {
        newMap.set(addonLink.addonItemId, {
          quantity: newQty,
          unitPrice: addonItem.price,
          name: addonItem.name
        })
      }
      return newMap
    })
  }

  // Handle confirm
  const handleConfirm = () => {
    const selectedVariant = variants.find(v => v.id === selectedVariantId)
    
    const addonsArray: OrderItemAddon[] = Array.from(selectedAddons.entries()).map(([id, data]) => ({
      addonItemId: id,
      addonName: data.name,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      subtotal: data.unitPrice * data.quantity
    }))
    
    onConfirm({
      variantId: selectedVariantId,
      variantName: selectedVariant?.name || null,
      variantPriceDelta: selectedVariant?.priceDelta || 0,
      addons: addonsArray,
      notes,
      finalPrice: calculatePrice(),
      quantity: quantity // Pass the selected quantity
    })
  }

  if (!isOpen) return null

  const hasVariants = variants.length > 0
  const hasAddons = addonLinks.length > 0
  const finalPrice = calculatePrice()
  
  // Calculate max quantity based on stock when auto out-of-stock is enabled
  // For items without variants, use baseMaxServings from POSPage
  const getMaxQuantity = () => {
    if (!autoOutOfStockWhenIngredientsRunOut) {
      return Infinity // No limit when setting is off
    }
    
    if (hasVariants) {
      // For variants, use the selected variant's stock from initial servings
      // (initialVariantServings represents stock BEFORE this modal's quantity is deducted)
      if (selectedVariantId && initialVariantServings[selectedVariantId] !== undefined) {
        const stock = initialVariantServings[selectedVariantId]
        if (stock === -1) return Infinity // Unlimited
        return Math.max(1, stock) // At least 1 if we have any stock
      }
      // Check base product stock as fallback
      if (initialVariantServings['base'] !== undefined) {
        const stock = initialVariantServings['base']
        if (stock === -1) return Infinity
        return Math.max(1, stock)
      }
    } else {
      // For items without variants (only add-ons or plain items), use baseMaxServings
      if (baseMaxServings !== undefined && baseMaxServings !== -1) {
        return Math.max(1, baseMaxServings)
      }
    }
    
    return Infinity // No limit if no stock data
  }
  
  const maxQuantity = getMaxQuantity()
  const isAtMaxQuantity = quantity >= maxQuantity && maxQuantity !== Infinity

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {menuItem.image && (
              <img
                src={getImageUrl(menuItem.image) || undefined}
                alt={menuItem.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{menuItem.name}</h3>
              <p className="text-sm text-gray-500">₱{menuItem.price.toFixed(2)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              {/* No options available */}
              {!hasVariants && !hasAddons && (
                <div className="text-center py-8 text-gray-500">
                  <p>No variants or add-ons available for this item.</p>
                </div>
              )}

              {/* Variants Section */}
              {hasVariants && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Select Size/Option</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {variants.map(variant => {
                      const stock = variantServings[variant.id]
                      const hasStock = stock !== undefined && stock !== -1
                      // Variant is out of stock if:
                      // 1. Manually marked as out of stock (variant.outOfStock) - always respected
                      // 2. Auto out of stock setting is ON AND ingredient stock is 0
                      const isManuallyOutOfStock = variant.outOfStock
                      const isIngredientOutOfStock = autoOutOfStockWhenIngredientsRunOut && hasStock && stock <= 0
                      const isOutOfStock = isManuallyOutOfStock || isIngredientOutOfStock
                      const isLowStock = hasStock && stock > 0 && stock <= 5
                      
                      return (
                        <button
                          key={variant.id}
                          onClick={() => !isOutOfStock && setSelectedVariantId(variant.id)}
                          disabled={isOutOfStock}
                          className={`p-3 rounded-lg border-2 transition-all relative ${
                            isOutOfStock
                              ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                              : selectedVariantId === variant.id
                                ? 'border-amber-500 bg-amber-50'
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-sm">{variant.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {variant.priceDelta > 0 && `+₱${variant.priceDelta.toFixed(2)}`}
                            {variant.priceDelta < 0 && `-₱${Math.abs(variant.priceDelta).toFixed(2)}`}
                            {variant.priceDelta === 0 && 'Base price'}
                          </div>
                          {/* Stock indicator for variant - only show when auto out-of-stock is enabled */}
                          {autoOutOfStockWhenIngredientsRunOut && hasStock && (
                            <div className={`absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : isLowStock
                                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                  : 'bg-green-100 text-green-700 border border-green-300'
                            }`}>
                              <Package className="h-2.5 w-2.5" />
                              {Math.max(0, stock)}
                            </div>
                          )}
                          {isOutOfStock && (
                            <div className="text-[10px] text-red-600 mt-1 font-medium">
                              {isManuallyOutOfStock ? 'Marked out of stock' : 'Out of stock'}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Add-ons Section */}
              {hasAddons && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Add Extras</h4>
                  <div className="space-y-2">
                    {addonLinks.map(link => {
                      const addon = link.addon_item
                      if (!addon || !addon.available) return null
                      
                      const currentQty = selectedAddons.get(link.addonItemId)?.quantity || 0
                      
                      return (
                        <div
                          key={link.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            currentQty > 0 ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {addon.image && (
                              <img
                                src={getImageUrl(addon.image) || undefined}
                                alt={addon.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium text-sm">{addon.name}</div>
                              <div className="text-xs text-gray-500">+₱{addon.price.toFixed(2)}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateAddonQuantity(link, -1)}
                              disabled={currentQty === 0}
                              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{currentQty}</span>
                            <button
                              onClick={() => updateAddonQuantity(link, 1)}
                              disabled={currentQty >= link.maxQuantity}
                              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Special Instructions</h4>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any special requests? (optional)"
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          {/* Quantity Control */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium">Quantity</span>
              {/* Stock indicator for items without variants when auto out-of-stock is enabled */}
              {!hasVariants && autoOutOfStockWhenIngredientsRunOut && baseMaxServings !== undefined && baseMaxServings !== -1 && (
                <div className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${
                  baseMaxServings <= 0
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : baseMaxServings <= 5
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      : 'bg-green-100 text-green-700 border border-green-300'
                }`}>
                  <Package className="h-2.5 w-2.5" />
                  {Math.max(0, baseMaxServings)} left
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateQuantity(-1)}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              {isEditingQuantity ? (
                <input
                  type="text"
                  value={editQuantityValue}
                  onChange={handleQuantityInputChange}
                  onBlur={handleQuantityInputBlur}
                  onKeyDown={handleQuantityInputKeyDown}
                  autoFocus
                  className="w-12 h-8 text-center font-bold text-lg border border-amber-400 rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              ) : (
                <button
                  onClick={handleQuantityClick}
                  className="w-10 h-8 text-center font-bold text-lg cursor-pointer hover:bg-gray-100 rounded transition-colors border border-transparent hover:border-gray-300"
                  title="Click to edit quantity"
                >
                  {quantity}
                </button>
              )}
              <button
                onClick={() => updateQuantity(1)}
                disabled={isAtMaxQuantity}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isAtMaxQuantity
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Total */}
          <div className="flex items-center justify-between mb-3 pt-2 border-t border-gray-200">
            <span className="text-gray-600">Total ({quantity}×)</span>
            <span className="text-xl font-bold text-amber-600">₱{finalPrice.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              disabled={loading}
            >
              Add {quantity > 1 ? `${quantity} items` : ''} to Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
