import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2, GripVertical, Settings2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '../../common/ui/button'
import { Input } from '../../common/ui/input'
import { Label } from '../../common/ui/label'
import { Badge } from '../../common/ui/badge'
import { 
  addonsApi, 
  type VariantDTO, 
  type MenuItemAddonLinkDTO,
  type AddonItemDTO 
} from '../../../../infrastructure/api/addons.api'
import { toast } from '../../common/ToastNotification'

interface VariantsAddonsManagerProps {
  isOpen: boolean
  onClose: () => void
  menuItem: {
    id: string
    name: string
    price: number
  }
  onUpdate?: () => void
}

type TabType = 'variants' | 'addons'

export const VariantsAddonsManager = ({
  isOpen,
  onClose,
  menuItem,
  onUpdate
}: VariantsAddonsManagerProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('variants')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Variants state
  const [variants, setVariants] = useState<VariantDTO[]>([])
  const [newVariant, setNewVariant] = useState({ name: '', priceDelta: '' })
  
  // Add-ons state
  const [addonLinks, setAddonLinks] = useState<MenuItemAddonLinkDTO[]>([])
  const [availableAddons, setAvailableAddons] = useState<AddonItemDTO[]>([])
  const [selectedAddonId, setSelectedAddonId] = useState('')

  // Fetch data when modal opens
  useEffect(() => {
    const doFetch = async () => {
      try {
        setLoading(true)
        const [variantsData, addonsData, allAddons] = await Promise.all([
          addonsApi.getVariantsByMenuItem(menuItem.id, true),
          addonsApi.getAddonsForBaseItem(menuItem.id, true),
          addonsApi.getAllAddonMenuItems(true)
        ])
        
        setVariants(variantsData)
        setAddonLinks(addonsData)
        setAvailableAddons(allAddons)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    
    if (isOpen && menuItem.id) {
      doFetch()
    }
  }, [isOpen, menuItem.id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [variantsData, addonsData, allAddons] = await Promise.all([
        addonsApi.getVariantsByMenuItem(menuItem.id, true),
        addonsApi.getAddonsForBaseItem(menuItem.id, true),
        addonsApi.getAllAddonMenuItems(true)
      ])
      
      setVariants(variantsData)
      setAddonLinks(addonsData)
      setAvailableAddons(allAddons)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNewVariant({ name: '', priceDelta: '' })
      setSelectedAddonId('')
    }
  }, [isOpen])

  // ============================================================================
  // VARIANTS HANDLERS
  // ============================================================================

  const handleAddVariant = async () => {
    if (!newVariant.name.trim()) {
      toast.warning('Please enter a variant name')
      return
    }

    try {
      setSaving(true)
      await addonsApi.createVariant({
        menuItemId: menuItem.id,
        name: newVariant.name.trim(),
        priceDelta: parseFloat(newVariant.priceDelta) || 0,
        isDefault: variants.length === 0 // First variant is default
      })
      
      toast.success('Variant added!')
      setNewVariant({ name: '', priceDelta: '' })
      await fetchData()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to add variant:', error)
      toast.error(error.response?.data?.error || 'Failed to add variant')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('Delete this variant?')) return

    try {
      await addonsApi.deleteVariant(variantId)
      toast.success('Variant deleted!')
      await fetchData()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to delete variant:', error)
      toast.error(error.response?.data?.error || 'Failed to delete variant')
    }
  }

  const handleSetDefaultVariant = async (variantId: string) => {
    try {
      await addonsApi.updateVariant(variantId, { isDefault: true })
      toast.success('Default variant updated!')
      await fetchData()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to update variant:', error)
      toast.error('Failed to update variant')
    }
  }

  const handleToggleVariantActive = async (variant: VariantDTO) => {
    try {
      await addonsApi.updateVariant(variant.id, { isActive: !variant.isActive })
      toast.success(variant.isActive ? 'Variant deactivated' : 'Variant activated')
      await fetchData()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to toggle variant:', error)
      toast.error('Failed to update variant')
    }
  }

  const handleToggleVariantOutOfStock = async (variant: VariantDTO) => {
    try {
      await addonsApi.updateVariant(variant.id, { outOfStock: !variant.outOfStock })
      toast.success(variant.outOfStock ? 'Variant marked in stock' : 'Variant marked out of stock')
      await fetchData()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to toggle variant out of stock:', error)
      toast.error('Failed to update variant')
    }
  }

  // ============================================================================
  // ADDONS HANDLERS
  // ============================================================================

  const handleLinkAddon = async () => {
    if (!selectedAddonId) {
      toast.warning('Please select an add-on')
      return
    }

    // Check if already linked
    if (addonLinks.some(l => l.addonItemId === selectedAddonId)) {
      toast.warning('This add-on is already linked')
      return
    }

    try {
      setSaving(true)
      await addonsApi.linkAddonToBaseItem({
        baseItemId: menuItem.id,
        addonItemId: selectedAddonId
      })
      
      toast.success('Add-on linked!')
      setSelectedAddonId('')
      await fetchData()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to link add-on:', error)
      toast.error(error.response?.data?.error || 'Failed to link add-on')
    } finally {
      setSaving(false)
    }
  }

  const handleUnlinkAddon = async (linkId: string) => {
    if (!confirm('Remove this add-on from this item?')) return

    try {
      await addonsApi.unlinkAddon(linkId)
      toast.success('Add-on removed!')
      await fetchData()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to unlink add-on:', error)
      toast.error('Failed to remove add-on')
    }
  }

  const handleUpdateAddonMaxQty = async (linkId: string, maxQuantity: number) => {
    try {
      await addonsApi.updateAddonLink(linkId, { maxQuantity })
      toast.success('Max quantity updated!')
      await fetchData()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to update add-on:', error)
      toast.error('Failed to update add-on')
    }
  }

  const handleToggleAddonActive = async (link: MenuItemAddonLinkDTO) => {
    try {
      await addonsApi.updateAddonLink(link.id, { isActive: !link.isActive })
      toast.success(link.isActive ? 'Add-on deactivated' : 'Add-on activated')
      await fetchData()
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to toggle add-on:', error)
      toast.error('Failed to update add-on')
    }
  }

  // Get add-ons that aren't already linked
  const unlinkedAddons = availableAddons.filter(
    addon => !addonLinks.some(link => link.addonItemId === addon.id)
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Manage Variants & Add-ons
            </h3>
            <p className="text-sm text-gray-500 mt-1">{menuItem.name} - ₱{menuItem.price.toFixed(2)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('variants')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'variants'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Variants ({variants.length})
          </button>
          <button
            onClick={() => setActiveTab('addons')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'addons'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Add-ons ({addonLinks.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              {/* Variants Tab */}
              {activeTab === 'variants' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Add size or type variations (e.g., Small, Medium, Large or Hot, Iced)
                  </p>
                  
                  {/* Add New Variant */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        placeholder="e.g., Large"
                        value={newVariant.name}
                        onChange={e => setNewVariant(prev => ({ ...prev, name: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Price +/-</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={newVariant.priceDelta}
                        onChange={e => setNewVariant(prev => ({ ...prev, priceDelta: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                    <Button
                      onClick={handleAddVariant}
                      disabled={saving || !newVariant.name.trim()}
                      size="sm"
                      className="h-9"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Variants List */}
                  {variants.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>No variants yet</p>
                      <p className="text-sm">Add variants like sizes or temperatures</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {variants.map(variant => (
                        <div
                          key={variant.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            !variant.isActive ? 'border-gray-100 bg-gray-50 opacity-60' : 
                            variant.outOfStock ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <GripVertical className="w-4 h-4 text-gray-300" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{variant.name}</span>
                              {variant.isDefault && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                              {!variant.isActive && (
                                <Badge variant="outline" className="text-xs text-gray-400">Inactive</Badge>
                              )}
                              {variant.outOfStock && variant.isActive && (
                                <Badge variant="destructive" className="text-xs bg-red-600 text-white">Out of Stock</Badge>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">
                              {variant.priceDelta > 0 && `+₱${variant.priceDelta.toFixed(2)}`}
                              {variant.priceDelta < 0 && `-₱${Math.abs(variant.priceDelta).toFixed(2)}`}
                              {variant.priceDelta === 0 && 'Base price'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Out of Stock Toggle - only show if variant is active */}
                            {variant.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleVariantOutOfStock(variant)}
                                className={`text-xs ${variant.outOfStock ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                              >
                                {variant.outOfStock ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Mark In Stock
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Mark Out
                                  </>
                                )}
                              </Button>
                            )}
                            {!variant.isDefault && variant.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultVariant(variant.id)}
                                className="text-xs"
                              >
                                Set Default
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleVariantActive(variant)}
                              className="text-xs"
                            >
                              {variant.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVariant(variant.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add-ons Tab */}
              {activeTab === 'addons' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Link add-ons that customers can add to this item (e.g., Extra Rice, Egg)
                  </p>

                  {/* Link Add-on */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Select Add-on</Label>
                      <select
                        value={selectedAddonId}
                        onChange={e => setSelectedAddonId(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Choose an add-on...</option>
                        {unlinkedAddons.map(addon => (
                          <option key={addon.id} value={addon.id}>
                            {addon.name} (+₱{addon.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      onClick={handleLinkAddon}
                      disabled={saving || !selectedAddonId}
                      size="sm"
                      className="h-9"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>

                  {unlinkedAddons.length === 0 && availableAddons.length === 0 && (
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                      No add-on items created yet. Create add-on menu items first.
                    </p>
                  )}

                  {/* Linked Add-ons List */}
                  {addonLinks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>No add-ons linked</p>
                      <p className="text-sm">Link add-ons that can be added to this item</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {addonLinks.map(link => (
                        <div
                          key={link.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            link.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{link.addon_item?.name || 'Unknown'}</span>
                              {!link.isActive && (
                                <Badge variant="outline" className="text-xs text-gray-400">Inactive</Badge>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">
                              +₱{link.addon_item?.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-500">Max:</Label>
                            <select
                              value={link.maxQuantity}
                              onChange={e => handleUpdateAddonMaxQty(link.id, parseInt(e.target.value))}
                              className="h-8 px-2 rounded border border-gray-200 text-sm"
                            >
                              {[1, 2, 3, 4, 5, 10].map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleAddonActive(link)}
                              className="text-xs"
                            >
                              {link.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlinkAddon(link.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
