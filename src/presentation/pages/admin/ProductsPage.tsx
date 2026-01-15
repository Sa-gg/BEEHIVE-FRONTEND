import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { Label } from '../../components/common/ui/label'
import { Badge } from '../../components/common/ui/badge'
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X,
  Upload,
  Package,
  Grid3x3,
  List,
  Loader2,
  Star,
  AlertCircle,
  CheckCircle,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Copy,
  Wand2,
  FolderPlus,
  Settings,
  Layers,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Eye,
  Eraser,
  ImageIcon
} from 'lucide-react'
import { ImageViewer } from '../../components/common/ImageViewer'
import { processImage, formatFileSize } from '../../../shared/utils/imageProcessing'
import { VariantsAddonsManager } from '../../components/features/Admin/VariantsAddonsManager'
import { menuItemsApi, uploadApi } from '../../../infrastructure/api/menuItems.api'
import type { MenuItemDTO } from '../../../infrastructure/api/menuItems.api'
import { categoriesApi } from '../../../infrastructure/api/categories.api'
import type { CategoryDTO } from '../../../infrastructure/api/categories.api'
import { recipeApi } from '../../../infrastructure/api/recipe.api'
import { inventoryApi } from '../../../infrastructure/api/inventory.api'
import type { InventoryItemDTO } from '../../../infrastructure/api/inventory.api'
import { toast } from '../../components/common/ToastNotification'
import type { MenuItemType } from '../../../infrastructure/api/menuItems.api'

interface Product {
  id: string
  name: string
  categoryId: string
  category?: {
    id: string
    name: string
    displayName: string
  }
  price: number
  cost: number | null
  image: string | null
  description: string | null
  available: boolean
  featured: boolean
  prepTime: number | null
  nutrients: string | null
  moodBenefits: string | null
  itemType: MenuItemType
  showInMenu: boolean
  outOfStock: boolean  // Ingredients ran out
  archived: boolean    // Soft deleted
  createdAt: string
  updatedAt: string
}

// Item type options
const ITEM_TYPES = [
  { value: 'BASE', label: 'Base Item', description: 'Regular menu item that can have variants and add-ons' },
  { value: 'ADDON', label: 'Add-on', description: 'Can be added to other items (e.g., Extra Rice, Egg)' },
  { value: 'DRINK', label: 'Drink', description: 'Beverage item' }
] as const

// Mood types for the recommendation system
const MOOD_TYPES = [
  { value: 'happy', emoji: '😊', label: 'Happy' },
  { value: 'energetic', emoji: '⚡', label: 'Energetic' },
  { value: 'relaxed', emoji: '😌', label: 'Relaxed' },
  { value: 'excited', emoji: '🎉', label: 'Excited' },
  { value: 'tired', emoji: '😴', label: 'Tired' },
  { value: 'stressed', emoji: '😰', label: 'Stressed' },
  { value: 'anxious', emoji: '😟', label: 'Anxious' },
  { value: 'sad', emoji: '😢', label: 'Sad' },
  { value: 'depressed', emoji: '😔', label: 'Feeling Down' },
  { value: 'angry', emoji: '😠', label: 'Angry' },
] as const

export const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  const [maxServings, setMaxServings] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'out-of-stock' | 'needs-attention'>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all')
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'BASE' | 'ADDON' | 'DRINK'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Batch selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDTO[]>([])
  const [selectedIngredient, setSelectedIngredient] = useState<string>('')
  const [loadingIngredientProducts, setLoadingIngredientProducts] = useState(false)
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('')
  const [ingredientStatusFilter, setIngredientStatusFilter] = useState<'all' | 'DISCREPANCY' | 'OUT_OF_STOCK' | 'LOW_STOCK'>('all')
  const [selectedIngredientProducts, setSelectedIngredientProducts] = useState<Product[]>([])
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false)

  // Image processing state
  const [imageProcessingProgress, setImageProcessingProgress] = useState<string>('')
  const [compressImage, setCompressImage] = useState(true)
  const [removeBackground, setRemoveBackground] = useState(false)
  const [originalFileSize, setOriginalFileSize] = useState<number | null>(null)
  const [processedFileSize, setProcessedFileSize] = useState<number | null>(null)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    price: '',
    cost: '',
    prepTime: '',
    image: '',
    description: '',
    available: true,
    featured: false,
    nutrients: '',
    moodBenefits: {} as Record<string, string>,
    itemType: 'BASE' as MenuItemType,
    showInMenu: false
  })
  
  // Category management modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    displayName: '',
    description: ''
  })
  const [submittingCategory, setSubmittingCategory] = useState(false)
  
  // Mood benefits section expanded state
  const [moodSectionExpanded, setMoodSectionExpanded] = useState(false)
  
  // Variants & Add-ons modal state
  const [variantsAddonsProduct, setVariantsAddonsProduct] = useState<Product | null>(null)

  // Helper function to get category display name
  const getCategoryDisplayName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId)
    return cat?.displayName || cat?.name || categoryId
  }

  // Helper function
  const getProfitMargin = (product: Product) => {
    const cost = product.cost ?? 0
    if (cost === 0) return '0'
    return ((product.price - cost) / product.price * 100).toFixed(1)
  }

  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    return `${API_BASE_URL}${imagePath}`
  }

  // Handle URL query parameter for filter
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Set filter from URL on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam === 'needs-attention') {
      setStockFilter('needs-attention')
      // Clear the query param after reading
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  // Fetch products, categories and max servings on mount
  useEffect(() => {
    fetchProducts()
    fetchCategories()
    fetchMaxServings()
  }, [])

  const fetchMaxServings = async () => {
    try {
      const servingsData = await recipeApi.getAllMaxServings()
      setMaxServings(servingsData)
    } catch (error) {
      console.error('Failed to fetch max servings:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const response = await categoriesApi.getAll(true) // Include inactive for management
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await menuItemsApi.getAll()
      // Map response to Product interface
      const mappedProducts: Product[] = response.data.map((item: MenuItemDTO) => ({
        ...item,
        categoryId: item.categoryId,
        category: item.category,
        showInMenu: item.showInMenu ?? false,
        outOfStock: item.outOfStock ?? false,
        archived: item.archived ?? false
      }))
      setProducts(mappedProducts)
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Failed to load products', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      price: '',
      cost: '',
      prepTime: '',
      image: '',
      description: '',
      available: true,
      featured: false,
      nutrients: '',
      moodBenefits: {},
      itemType: 'BASE',
      showInMenu: false
    })
    setMoodSectionExpanded(false)
  }
  
  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      displayName: '',
      description: ''
    })
    setEditingCategory(null)
  }
  
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!categoryFormData.name || !categoryFormData.displayName) {
      toast.warning('Validation Error', 'Please fill in name and display name')
      return
    }
    
    try {
      setSubmittingCategory(true)
      
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, {
          name: categoryFormData.name,
          displayName: categoryFormData.displayName,
          description: categoryFormData.description || undefined
        })
        toast.success('Category updated successfully!')
      } else {
        await categoriesApi.create({
          name: categoryFormData.name,
          displayName: categoryFormData.displayName,
          description: categoryFormData.description || undefined
        })
        toast.success('Category created successfully!')
      }
      
      setIsCategoryModalOpen(false)
      resetCategoryForm()
      await fetchCategories()
    } catch (error) {
      console.error('Failed to save category:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to save category', err.response?.data?.message || 'Please try again.')
    } finally {
      setSubmittingCategory(false)
    }
  }
  
  const handleDeleteCategory = async (id: string, displayName: string) => {
    if (!confirm(`Are you sure you want to delete category "${displayName}"?`)) {
      return
    }
    
    try {
      await categoriesApi.delete(id)
      toast.success('Category deleted successfully!')
      await fetchCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to delete category', err.response?.data?.message || 'Please try again.')
    }
  }

  // Move category up or down
  const handleMoveCategoryPosition = async (id: string, direction: 'up' | 'down') => {
    // Sort categories by sortOrder first
    const sortedCategories = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const currentIndex = sortedCategories.findIndex(c => c.id === id)
    
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === sortedCategories.length - 1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    // Swap positions
    const newCategories = [...sortedCategories]
    const temp = newCategories[currentIndex]
    newCategories[currentIndex] = newCategories[newIndex]
    newCategories[newIndex] = temp
    
    // Build new order array
    const categoryOrders = newCategories.map((cat, index) => ({
      id: cat.id,
      sortOrder: index
    }))
    
    try {
      await categoriesApi.reorder(categoryOrders)
      await fetchCategories()
      toast.success('Category order updated')
    } catch (error) {
      console.error('Failed to reorder categories:', error)
      toast.error('Failed to update order')
    }
  }

  // Helper function to process and upload image
  const processAndUploadImage = async (file: File) => {
    try {
      setUploadingImage(true)
      setOriginalFileSize(file.size)
      setProcessedFileSize(null)
      setImageProcessingProgress('')

      let fileToUpload: File = file

      // Process image if compression or background removal is enabled
      if (compressImage || removeBackground) {
        setImageProcessingProgress('Processing image...')
        const result = await processImage(file, {
          compress: compressImage,
          removeBackground: removeBackground,
          onProgress: (stage, progress) => {
            if (stage === 'compressing') {
              setImageProcessingProgress(`Compressing... ${Math.round(progress)}%`)
            } else if (stage === 'removing-background') {
              setImageProcessingProgress(`Removing background... ${Math.round(progress)}%`)
            }
          }
        })
        fileToUpload = result.file
        setProcessedFileSize(result.file.size)
      }

      setImageProcessingProgress('Uploading...')
      const uploadFormData = new FormData()
      uploadFormData.append('image', fileToUpload)
      
      const response = await uploadApi.uploadImage(uploadFormData)
      setFormData(prev => ({ ...prev, image: response.data.path }))
      
      // Show success message with size comparison
      if (compressImage && originalFileSize) {
        const savedPercent = Math.round((1 - (fileToUpload.size / file.size)) * 100)
        if (savedPercent > 0) {
          toast.success('Image uploaded!', `Compressed from ${formatFileSize(file.size)} to ${formatFileSize(fileToUpload.size)} (${savedPercent}% smaller)`)
        } else {
          toast.success('Image uploaded successfully!')
        }
      } else {
        toast.success('Image uploaded successfully!')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to upload image', err.response?.data?.message || 'Please try again.')
    } finally {
      setUploadingImage(false)
      setImageProcessingProgress('')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processAndUploadImage(file)
  }

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
      toast.warning('Invalid File', 'Please drop an image file')
      return
    }

    // Allow larger files since we'll compress them
    if (file.size > 20 * 1024 * 1024) {
      toast.warning('File Too Large', 'Image size must be less than 20MB')
      return
    }

    await processAndUploadImage(file)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    
    // Parse moodBenefits JSON if it exists
    let parsedMoodBenefits: Record<string, string> = {}
    if (product.moodBenefits) {
      try {
        parsedMoodBenefits = JSON.parse(product.moodBenefits)
      } catch (e) {
        console.error('Failed to parse moodBenefits:', e)
      }
    }
    
    setFormData({
      name: product.name,
      categoryId: product.categoryId,
      price: product.price.toString(),
      cost: product.cost?.toString() || '',
      prepTime: product.prepTime?.toString() || '',
      image: product.image || '',
      description: product.description || '',
      available: product.available,
      featured: product.featured,
      nutrients: product.nutrients || '',
      moodBenefits: parsedMoodBenefits,
      itemType: product.itemType || 'BASE',
      showInMenu: product.showInMenu || false
    })
    
    // Expand mood section if there are any mood benefits
    setMoodSectionExpanded(Object.keys(parsedMoodBenefits).length > 0)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.categoryId || !formData.price || !formData.prepTime) {
      toast.warning('Validation Error', 'Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      
      // Filter out empty mood benefits
      const filteredMoodBenefits = Object.fromEntries(
        Object.entries(formData.moodBenefits).filter(([_, value]) => value && value.trim())
      )
      
      const payload = {
        name: formData.name,
        categoryId: formData.categoryId,
        price: Math.round(parseFloat(formData.price) * 100) / 100,
        cost: formData.cost ? Math.round(parseFloat(formData.cost) * 100) / 100 : undefined,
        prepTime: parseInt(formData.prepTime),
        image: formData.image || undefined,
        description: formData.description || undefined,
        available: formData.available,
        featured: formData.featured,
        nutrients: formData.nutrients || undefined,
        moodBenefits: Object.keys(filteredMoodBenefits).length > 0 
          ? JSON.stringify(filteredMoodBenefits) 
          : undefined,
        itemType: formData.itemType,
        showInMenu: formData.itemType === 'ADDON' ? formData.showInMenu : false
      }

      if (editingProduct) {
        await menuItemsApi.update(editingProduct.id, payload)
        toast.success('Product updated successfully!')
      } else {
        await menuItemsApi.create(payload)
        toast.success('Product created successfully!')
      }

      setIsModalOpen(false)
      resetForm()
      setEditingProduct(null)
      await fetchProducts()
    } catch (error) {
      console.error('Failed to save product:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to save product', err.response?.data?.message || 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      await menuItemsApi.delete(id)
      toast.success('Product deleted successfully!')
      await fetchProducts()
    } catch (error) {
      console.error('Failed to delete product:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to delete product', err.response?.data?.message || 'Please try again.')
    }
  }

  const toggleAvailability = async (id: string) => {
    try {
      const response = await menuItemsApi.toggleAvailability(id)
      const product = response.data
      // Update local state instead of re-fetching to prevent animation
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, available: product.available } : p
      ))
      toast.success(product.available ? 'Product added to sale' : 'Product removed from sale')
    } catch (error) {
      console.error('Failed to toggle availability:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to update product', err.response?.data?.message || 'Please try again.')
    }
  }

  const toggleOutOfStock = async (id: string) => {
    try {
      const response = await menuItemsApi.toggleOutOfStock(id)
      const product = response.data
      // Update local state instead of re-fetching to prevent animation
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, outOfStock: product.outOfStock ?? false } : p
      ))
      toast.success(product.outOfStock ? 'Product marked as out of stock' : 'Product marked as in stock')
    } catch (error) {
      console.error('Failed to toggle out of stock:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to update product', err.response?.data?.message || 'Please try again.')
    }
  }

  const toggleFeatured = async (id: string) => {
    try {
      const response = await menuItemsApi.toggleFeatured(id)
      const product = response.data
      // Update local state instead of re-fetching to prevent animation
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, featured: product.featured } : p
      ))
    } catch (error) {
      console.error('Failed to toggle featured:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to update product', err.response?.data?.message || 'Please try again.')
    }
  }

  // Batch selection handlers
  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAllProducts = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const clearSelection = () => {
    setSelectedProducts(new Set())
    setSelectedIngredient('')
    setSelectedIngredientProducts([])
    setIsSelectionMode(false)
    setIngredientSearchQuery('')
  }

  // Ref for dropdown click outside handling
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIngredientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch inventory items when selection mode is enabled
  useEffect(() => {
    if (isSelectionMode && inventoryItems.length === 0) {
      inventoryApi.getAll({ category: 'INGREDIENTS' }).then(items => {
        setInventoryItems(items)
      }).catch(err => {
        console.error('Failed to fetch inventory items:', err)
      })
    }
  }, [isSelectionMode, inventoryItems.length])

  // Memoized filter inventory items based on search and status filter
  // Sort: OUT_OF_STOCK items first, then LOW_STOCK, then IN_STOCK
  const filteredInventoryItems = useMemo(() => {
    const searchLower = ingredientSearchQuery.toLowerCase()
    const filtered = inventoryItems.filter(item => {
      const matchesSearch = !searchLower || item.name.toLowerCase().includes(searchLower)
      const matchesStatus = ingredientStatusFilter === 'all' || item.status === ingredientStatusFilter
      return matchesSearch && matchesStatus
    })
    
    // Sort: DISCREPANCY first, then OUT_OF_STOCK, then LOW_STOCK, then IN_STOCK
    return filtered.sort((a, b) => {
      const statusOrder: Record<string, number> = {
        'DISCREPANCY': 0,
        'OUT_OF_STOCK': 1,
        'LOW_STOCK': 2,
        'IN_STOCK': 3
      }
      return (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
    })
  }, [inventoryItems, ingredientSearchQuery, ingredientStatusFilter])

  // Handle ingredient selection to auto-select products using that ingredient
  const handleIngredientSelect = async (inventoryItemId: string) => {
    setSelectedIngredient(inventoryItemId)
    if (!inventoryItemId) {
      setSelectedIngredientProducts([])
      return
    }
    
    try {
      setLoadingIngredientProducts(true)
      const menuItems = await recipeApi.getMenuItemsUsingIngredient(inventoryItemId)
      if (menuItems && menuItems.length > 0) {
        const menuItemIds = menuItems.map((item: { id: string }) => item.id)
        setSelectedProducts(new Set(menuItemIds))
        // Store the product details for display
        const matchingProducts = products.filter(p => menuItemIds.includes(p.id))
        setSelectedIngredientProducts(matchingProducts)
        const ingredientName = inventoryItems.find(i => i.id === inventoryItemId)?.name || 'ingredient'
        toast.success(
          `Selected ${menuItems.length} products using ${ingredientName}`,
          'Ready to mark as out of stock'
        )
      } else {
        setSelectedIngredientProducts([])
        toast.info('No products found', 'No products use this ingredient in their recipe')
      }
    } catch (error) {
      console.error('Failed to find products by ingredient:', error)
      toast.error('Failed to find products', 'Could not find products using this ingredient')
    } finally {
      setLoadingIngredientProducts(false)
    }
  }

  const handleBatchOutOfStock = async (outOfStock: boolean) => {
    if (selectedProducts.size === 0) return
    
    try {
      await menuItemsApi.bulkUpdateOutOfStock(Array.from(selectedProducts), outOfStock)
      // Update local state
      setProducts(prev => prev.map(p => 
        selectedProducts.has(p.id) ? { ...p, outOfStock } : p
      ))
      toast.success(
        outOfStock 
          ? `${selectedProducts.size} products marked as out of stock` 
          : `${selectedProducts.size} products marked as in stock`
      )
      clearSelection()
    } catch (error) {
      console.error('Failed to batch update:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to update products', err.response?.data?.message || 'Please try again.')
    }
  }

  const handleBatchAvailability = async (available: boolean) => {
    if (selectedProducts.size === 0) return
    
    try {
      // Update each product's availability
      await Promise.all(
        Array.from(selectedProducts).map(id => 
          menuItemsApi.update(id, { available })
        )
      )
      // Update local state
      setProducts(prev => prev.map(p => 
        selectedProducts.has(p.id) ? { ...p, available } : p
      ))
      toast.success(
        available 
          ? `${selectedProducts.size} products marked as available` 
          : `${selectedProducts.size} products marked as unavailable`
      )
      clearSelection()
    } catch (error) {
      console.error('Failed to batch update:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to update products', err.response?.data?.message || 'Please try again.')
    }
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
    
    // Stock filter logic - includes needs-attention (marked out of stock but has available stock, OR available but has no stock)
    let matchesStock = true
    if (stockFilter === 'in-stock') {
      matchesStock = !product.outOfStock
    } else if (stockFilter === 'out-of-stock') {
      matchesStock = product.outOfStock
    } else if (stockFilter === 'needs-attention') {
      // Products that need attention:
      // 1. Marked as out of stock but actually have stock available (>= 1)
      // 2. NOT marked as out of stock but have 0 or negative stock (potential discrepancy)
      const availableServings = maxServings[product.id]
      const markedOutButHasStock = product.outOfStock && availableServings !== undefined && availableServings >= 1
      const availableButNoStock = !product.outOfStock && availableServings !== undefined && availableServings <= 0
      matchesStock = markedOutButHasStock || availableButNoStock
    }
    
    const matchesAvailability = availabilityFilter === 'all' || 
                                (availabilityFilter === 'available' && product.available) ||
                                (availabilityFilter === 'unavailable' && !product.available)
    const matchesItemType = itemTypeFilter === 'all' || product.itemType === itemTypeFilter
    // When an ingredient is selected, only show products using that ingredient
    const matchesIngredient = !selectedIngredient || selectedIngredientProducts.some(p => p.id === product.id)
    return matchesSearch && matchesCategory && matchesStock && matchesAvailability && matchesItemType && matchesIngredient
  })

  // Calculate statistics
  const totalProducts = products.length
  const availableProducts = products.filter(p => p.available).length
  const unavailableProducts = products.filter(p => !p.available).length
  const inStockProducts = products.filter(p => !p.outOfStock).length
  const outOfStockProducts = products.filter(p => p.outOfStock).length
  const featuredProducts = products.filter(p => p.featured).length
  
  // Products needing attention:
  // 1. Marked out of stock but have stock available
  // 2. NOT marked out of stock but have 0 or negative stock (potential discrepancy)
  const needsAttentionProducts = products.filter(p => {
    const availableServings = maxServings[p.id]
    if (availableServings === undefined) return false
    const markedOutButHasStock = p.outOfStock && availableServings >= 1
    const availableButNoStock = !p.outOfStock && availableServings <= 0
    return markedOutButHasStock || availableButNoStock
  }).length

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your menu items and inventory</p>
          </div>
          <Button 
            onClick={() => {
              setEditingProduct(null)
              resetForm()
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2"
            style={{ backgroundColor: '#F9C900', color: '#000000' }}
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Statistics Cards - Updated to match InventoryPage design */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-5 border border-blue-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Items</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalProducts}</p>
            <p className="text-xs text-gray-400 mt-2">in catalog</p>
          </div>

          {/* In Stock Card */}
          <div 
            className={`rounded-2xl shadow-sm p-5 border cursor-pointer transition-all duration-300 group ${
              stockFilter === 'in-stock' 
                ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-300 ring-2 ring-green-200' 
                : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 hover:shadow-lg'
            }`}
            onClick={() => setStockFilter(stockFilter === 'in-stock' ? 'all' : 'in-stock')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">In Stock</p>
            <p className="text-xl lg:text-2xl font-bold text-green-600">{inStockProducts}</p>
            <p className="text-xs text-gray-400 mt-2">ready for orders</p>
          </div>

          {/* Out of Stock Card */}
          <div 
            className={`rounded-2xl shadow-sm p-5 border cursor-pointer transition-all duration-300 group ${
              stockFilter === 'out-of-stock' 
                ? 'bg-gradient-to-br from-red-100 to-rose-100 border-red-300 ring-2 ring-red-200' 
                : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100 hover:shadow-lg'
            }`}
            onClick={() => setStockFilter(stockFilter === 'out-of-stock' ? 'all' : 'out-of-stock')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-red-100 rounded-xl group-hover:scale-110 transition-transform">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Out of Stock</p>
            <p className="text-xl lg:text-2xl font-bold text-red-600">{outOfStockProducts}</p>
            <p className="text-xs text-gray-400 mt-2">marked by staff</p>
          </div>

          {/* Needs Attention Card */}
          <div 
            className={`rounded-2xl shadow-sm p-5 border cursor-pointer transition-all duration-300 group relative ${
              stockFilter === 'needs-attention' 
                ? 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-400 ring-2 ring-amber-300' 
                : needsAttentionProducts > 0
                  ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 hover:shadow-lg animate-pulse'
                  : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100 hover:shadow-lg'
            }`}
            onClick={() => setStockFilter(stockFilter === 'needs-attention' ? 'all' : 'needs-attention')}
          >
            {needsAttentionProducts > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                !
              </span>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Needs Attention</p>
            <p className="text-xl lg:text-2xl font-bold text-amber-600">{needsAttentionProducts}</p>
            <p className="text-xs text-gray-400 mt-2">stock available</p>
          </div>

          {/* On Sale Card - Manager decision to include in menu */}
          <div 
            className={`rounded-2xl shadow-sm p-5 border cursor-pointer transition-all duration-300 group ${
              availabilityFilter === 'available' 
                ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-amber-300 ring-2 ring-amber-200' 
                : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 hover:shadow-lg'
            }`}
            onClick={() => setAvailabilityFilter(availabilityFilter === 'available' ? 'all' : 'available')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">On Sale</p>
            <p className="text-xl lg:text-2xl font-bold text-amber-600">{availableProducts}</p>
            <p className="text-xs text-gray-400 mt-2">included in menu</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="all">All Categories</option>
                {categories.filter(cat => cat.isActive).map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.displayName}
                  </option>
                ))}
              </select>

              {/* Item Type Filter */}
              <select
                value={itemTypeFilter}
                onChange={(e) => setItemTypeFilter(e.target.value as 'all' | 'BASE' | 'ADDON' | 'DRINK')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="all">All Types</option>
                <option value="BASE">Base Items</option>
                <option value="ADDON">Add-ons</option>
                <option value="DRINK">Drinks</option>
              </select>

              {/* Stock Status Filters - Based on ingredients availability */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Stock:</span>
                <Button
                  variant={stockFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('all')}
                  className="h-7 px-2 text-xs"
                >
                  All
                </Button>
                <Button
                  variant={stockFilter === 'in-stock' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('in-stock')}
                  className={`h-7 px-2 text-xs ${stockFilter === 'in-stock' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Available
                </Button>
                <Button
                  variant={stockFilter === 'out-of-stock' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('out-of-stock')}
                  className={`h-7 px-2 text-xs ${stockFilter === 'out-of-stock' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Out
                </Button>
                <Button
                  variant={stockFilter === 'needs-attention' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('needs-attention')}
                  className={`h-7 px-2 text-xs relative ${stockFilter === 'needs-attention' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Attention
                  {needsAttentionProducts > 0 && stockFilter !== 'needs-attention' && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {needsAttentionProducts > 9 ? '9+' : needsAttentionProducts}
                    </span>
                  )}
                </Button>
              </div>

              {/* For Sale Filters - Manager decision to include in sale */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Sale:</span>
                <Button
                  variant={availabilityFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAvailabilityFilter('all')}
                  className="h-7 px-2 text-xs"
                >
                  All
                </Button>
                <Button
                  variant={availabilityFilter === 'available' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAvailabilityFilter('available')}
                  className={`h-7 px-2 text-xs ${availabilityFilter === 'available' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                >
                  On Sale
                </Button>
                <Button
                  variant={availabilityFilter === 'unavailable' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAvailabilityFilter('unavailable')}
                  className={`h-7 px-2 text-xs ${availabilityFilter === 'unavailable' ? 'bg-gray-500 hover:bg-gray-600' : ''}`}
                >
                  Off Sale
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
                  className="px-3"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                  className="px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Selection Mode Toggle */}
              <Button
                variant={isSelectionMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode)
                  if (isSelectionMode) clearSelection()
                }}
                className={isSelectionMode ? 'bg-amber-500 hover:bg-amber-600' : ''}
              >
                <Layers className="h-4 w-4 mr-1" />
                {isSelectionMode ? 'Cancel' : 'Select'}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Batch Action Bar */}
        {isSelectionMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            {/* Row 1: Selection controls + Quick Select by Ingredient */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Selection controls */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllProducts}
                  className="bg-white"
                >
                  {selectedProducts.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm font-medium text-amber-800">
                  {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                </span>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-amber-300 hidden sm:block" />
              
              {/* Ingredient selector - compact */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-gray-600 hidden sm:inline">By Ingredient:</span>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <div 
                    className={`flex items-center h-8 px-2.5 text-sm border rounded-md bg-white cursor-pointer transition-colors min-w-[180px] ${
                      ingredientDropdownOpen ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setIngredientDropdownOpen(!ingredientDropdownOpen)}
                  >
                    {loadingIngredientProducts ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600 mr-2" />
                    ) : null}
                    <span className={`flex-1 truncate text-xs ${selectedIngredient ? 'text-gray-900' : 'text-gray-500'}`}>
                      {selectedIngredient ? (
                        (() => {
                          const item = inventoryItems.find(i => i.id === selectedIngredient)
                          if (!item) return 'Select...'
                          return (
                            <span className="flex items-center gap-1.5">
                              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                item.status === 'OUT_OF_STOCK' ? 'bg-red-500' : 
                                item.status === 'LOW_STOCK' ? 'bg-yellow-500' : 'bg-green-500'
                              }`} />
                              <span className="truncate">{item.name}</span>
                            </span>
                          )
                        })()
                      ) : 'Select ingredient...'}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 ml-1 text-gray-400 flex-shrink-0 transition-transform ${ingredientDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {/* Dropdown panel */}
                  {ingredientDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-[300px] flex flex-col w-[280px]">
                      {/* Search and filter inside dropdown */}
                      <div className="p-2 border-b border-gray-100 space-y-2 sticky top-0 bg-white">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search ingredients..."
                            value={ingredientSearchQuery}
                            onChange={(e) => setIngredientSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant={ingredientStatusFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setIngredientStatusFilter('all') }}
                            className="h-6 px-2 text-xs flex-1"
                          >
                            All
                          </Button>
                          <Button
                            variant={ingredientStatusFilter === 'DISCREPANCY' ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setIngredientStatusFilter('DISCREPANCY') }}
                            className={`h-6 px-2 text-xs flex-1 ${ingredientStatusFilter === 'DISCREPANCY' ? 'bg-purple-500 text-white' : ''}`}
                          >
                            ⚠️ Disc
                          </Button>
                          <Button
                            variant={ingredientStatusFilter === 'OUT_OF_STOCK' ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setIngredientStatusFilter('OUT_OF_STOCK') }}
                            className={`h-6 px-2 text-xs flex-1 ${ingredientStatusFilter === 'OUT_OF_STOCK' ? 'bg-red-500 text-white' : ''}`}
                          >
                            ❌ Out
                          </Button>
                          <Button
                            variant={ingredientStatusFilter === 'LOW_STOCK' ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setIngredientStatusFilter('LOW_STOCK') }}
                            className={`h-6 px-2 text-xs flex-1 ${ingredientStatusFilter === 'LOW_STOCK' ? 'bg-yellow-500' : ''}`}
                          >
                            ⚠️ Low
                          </Button>
                        </div>
                      </div>
                      
                      {/* Options list */}
                      <div className="overflow-y-auto flex-1">
                        {filteredInventoryItems.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No ingredients found
                          </div>
                        ) : (
                          filteredInventoryItems.map(item => (
                            <div
                              key={item.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-amber-50 flex items-center justify-between ${
                                selectedIngredient === item.id ? 'bg-amber-100' : ''
                              }`}
                              onClick={() => {
                                handleIngredientSelect(item.id)
                                setIngredientDropdownOpen(false)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`inline-block w-2 h-2 rounded-full ${
                                  item.status === 'DISCREPANCY' ? 'bg-purple-500' :
                                  item.status === 'OUT_OF_STOCK' ? 'bg-red-500' : 
                                  item.status === 'LOW_STOCK' ? 'bg-yellow-500' : 'bg-green-500'
                                }`} />
                                <span className="text-sm">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{item.currentStock} {item.unit}</span>
                                {item.status !== 'IN_STOCK' && (
                                  <Badge className={`text-[10px] px-1.5 py-0 ${
                                    item.status === 'DISCREPANCY' ? 'bg-purple-100 text-purple-700' :
                                    item.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {item.status === 'DISCREPANCY' ? 'Disc' : item.status === 'OUT_OF_STOCK' ? 'Out' : 'Low'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {selectedIngredient && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedIngredient('')
                      setSelectedIngredientProducts([])
                      setSelectedProducts(new Set())
                      setIngredientSearchQuery('')
                    }}
                    className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Row 2: Batch action buttons (only shown when items selected) */}
            {selectedProducts.size > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-amber-200">
                {/* Stock controls - for cashier/manager to mark ingredient availability */}
                <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
                  <span className="text-xs text-gray-500 mr-1">Stock:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchOutOfStock(true)}
                    className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Out
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchOutOfStock(false)}
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    In
                  </Button>
                </div>
                
                {/* Sale controls - for manager to include/exclude from daily menu */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 mr-1">Sale:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchAvailability(false)}
                    className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  >
                    Off Sale
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchAvailability(true)}
                    className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                  >
                    On Sale
                  </Button>
                </div>
              </div>
            )}

            {/* Selected ingredient info */}
            {selectedIngredient && (
              <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${(() => {
                  const item = inventoryItems.find(i => i.id === selectedIngredient)
                  if (!item) return 'bg-gray-100 text-gray-700'
                  return item.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' :
                    item.status === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                })()}`}>
                  {(() => {
                    const item = inventoryItems.find(i => i.id === selectedIngredient)
                    if (!item) return 'Unknown ingredient'
                    return `Stock: ${item.currentStock} ${item.unit} (Min: ${item.minStock})`
                  })()}
                </span>
                {selectedIngredientProducts.length > 0 && (
                  <span className="text-xs text-amber-700 font-medium">
                    Showing {selectedIngredientProducts.length} product{selectedIngredientProducts.length !== 1 ? 's' : ''} using this ingredient
                    {selectedIngredientProducts.filter(p => p.outOfStock).length > 0 && (
                      <span className="text-red-600 ml-1">
                        ({selectedIngredientProducts.filter(p => p.outOfStock).length} already out of stock)
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Products Display */}
        {!loading && viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => {
              const isSelected = selectedProducts.has(product.id)
              return (
                <div 
                  key={product.id} 
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                    isSelected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'
                  }`}
                  onClick={() => isSelectionMode && toggleProductSelection(product.id)}
                >
                  <div className="aspect-video bg-gray-100 relative">
                    {/* Selection Checkbox */}
                    {isSelectionMode && (
                      <div 
                        className="absolute top-1.5 left-1.5 z-10"
                        onClick={(e) => { e.stopPropagation(); toggleProductSelection(product.id) }}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-amber-500 border-amber-500 text-white' 
                            : 'bg-white border-gray-300 hover:border-amber-400'
                        }`}>
                          {isSelected && <CheckCircle className="h-3 w-3" />}
                        </div>
                      </div>
                    )}
                    {product.image ? (
                      <img
                        src={getImageUrl(product.image) || ''}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-1.5 right-1.5 flex gap-1 flex-wrap justify-end">
                      {/* Stock indicator badge - like POS */}
                      {maxServings[product.id] !== undefined && (
                        <Badge className={`text-[10px] px-1.5 py-0.5 flex items-center gap-0.5 ${
                          maxServings[product.id] === 0 
                            ? 'bg-red-100 text-red-700 border border-red-300' 
                            : maxServings[product.id] <= 5 
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                              : 'bg-green-100 text-green-700 border border-green-300'
                        }`}>
                          <Package className="h-2.5 w-2.5" />
                          {maxServings[product.id]}
                        </Badge>
                      )}
                      {product.itemType === 'ADDON' && (
                        <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5">Add-on</Badge>
                      )}
                      {product.itemType === 'DRINK' && (
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5">Drink</Badge>
                      )}
                      {product.itemType === 'ADDON' && product.showInMenu && (
                        <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5">In Menu</Badge>
                      )}
                      {product.featured && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5">Featured</Badge>
                      )}
                      {product.outOfStock && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white shadow-sm">Out of Stock</Badge>
                      )}
                      {!product.available && (
                        <Badge className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 border border-gray-300">Off Sale</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="mb-2">
                      <h3 className="font-semibold text-xs mb-0.5 line-clamp-1">{product.name}</h3>
                      <p className="text-[10px] text-gray-500">{product.category?.displayName || getCategoryDisplayName(product.categoryId)}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#F9C900' }}>₱{product.price}</p>
                        <p className="text-[10px] text-gray-500">Cost: ₱{product.cost ?? 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-900">{product.prepTime ?? 5}m</p>
                        <p className="text-[10px] text-green-600">+{getProfitMargin(product)}%</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      {/* Quick Stock Toggle - Staff marks when ingredients run out */}
                      <Button
                        size="sm"
                        onClick={() => toggleOutOfStock(product.id)}
                        className={`w-full font-medium text-xs h-7 ${
                          product.outOfStock 
                            ? 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300' 
                            : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'
                        }`}
                        variant="outline"
                        title={product.outOfStock ? 'Mark as in stock' : 'Mark as out of stock'}
                      >
                        {product.outOfStock ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark In Stock
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Mark Out
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="w-full text-xs h-7"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVariantsAddonsProduct(product)}
                        className="w-full text-xs h-7 text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <Layers className="h-3 w-3 mr-1" />
                        Variants
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {isSelectionMode && (
                      <th className="px-4 py-3 text-center w-10">
                        <div 
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer mx-auto ${
                            selectedProducts.size === filteredProducts.length && filteredProducts.length > 0
                              ? 'bg-amber-500 border-amber-500 text-white' 
                              : 'bg-white border-gray-300 hover:border-amber-400'
                          }`}
                          onClick={selectAllProducts}
                        >
                          {selectedProducts.size === filteredProducts.length && filteredProducts.length > 0 && <CheckCircle className="h-3 w-3" />}
                        </div>
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cost</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Prep Time</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map(product => {
                    const isSelected = selectedProducts.has(product.id)
                    return (
                      <tr 
                        key={product.id} 
                        className={`hover:bg-gray-50 ${isSelected ? 'bg-amber-50' : ''}`}
                        onClick={() => isSelectionMode && toggleProductSelection(product.id)}
                      >
                        {isSelectionMode && (
                          <td className="px-4 py-3 text-center">
                            <div 
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer mx-auto ${
                                isSelected 
                                  ? 'bg-amber-500 border-amber-500 text-white' 
                                  : 'bg-white border-gray-300 hover:border-amber-400'
                              }`}
                              onClick={(e) => { e.stopPropagation(); toggleProductSelection(product.id) }}
                            >
                              {isSelected && <CheckCircle className="h-3 w-3" />}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              {product.image ? (
                                <img src={getImageUrl(product.image) || ''} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{product.name}</p>
                                {product.featured && (
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">⭐</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">{product.category?.displayName || getCategoryDisplayName(product.categoryId)}</td>
                        <td className="px-4 py-3 text-right font-semibold">₱{product.price}</td>
                        <td className="px-4 py-3 text-right text-gray-600">₱{product.cost}</td>
                        <td className="px-4 py-3 text-center">
                          {maxServings[product.id] !== undefined ? (
                            <Badge className={`${
                              maxServings[product.id] === 0 
                                ? 'bg-red-100 text-red-700' 
                                : maxServings[product.id] <= 5 
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                            }`}>
                              {maxServings[product.id]}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-blue-100 text-blue-800">{product.prepTime} min</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {/* Stock status - controlled by staff */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleOutOfStock(product.id); }}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                product.outOfStock 
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                              title={product.outOfStock ? 'Click to mark in stock' : 'Click to mark out of stock'}
                            >
                              {product.outOfStock ? (
                                <span className="flex items-center justify-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Out
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  In Stock
                                </span>
                              )}
                            </button>
                            {/* Sale status indicator */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              product.available 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {product.available ? 'On Sale' : 'Off Sale'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setVariantsAddonsProduct(product)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                              title="Variants & Add-ons"
                            >
                              <Layers className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleFeatured(product.id)}
                              className={`p-1.5 rounded-md transition-colors ${
                                product.featured 
                                  ? 'text-yellow-500 hover:bg-yellow-50' 
                                  : 'text-gray-400 hover:bg-gray-50'
                              }`}
                              title={product.featured ? 'Remove from featured' : 'Mark as featured'}
                            >
                              <Star className={`h-4 w-4 ${product.featured ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No products found</p>
          </div>
        )}

        {/* Add/Edit Product Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Product Name */}
                    <div className="md:col-span-2">
                      <Label htmlFor="name" className="text-sm font-semibold text-gray-700 mb-2 block">
                        Product Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Bacon Pepperoni Pizza"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                          Category <span className="text-red-500">*</span>
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            resetCategoryForm()
                            setIsCategoryModalOpen(true)
                          }}
                          className="text-xs text-amber-600 hover:text-amber-700 h-6 px-2"
                      >
                        <FolderPlus className="h-3 w-3 mr-1" />
                        Manage Categories
                      </Button>
                    </div>
                    <select
                      id="category"
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category...</option>
                      {categories.filter(cat => cat.isActive).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.displayName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Item Type */}
                  <div>
                    <Label htmlFor="itemType" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Item Type
                    </Label>
                    <select
                      id="itemType"
                      value={formData.itemType}
                      onChange={(e) => setFormData({ ...formData, itemType: e.target.value as MenuItemType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ITEM_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {ITEM_TYPES.find(t => t.value === formData.itemType)?.description}
                    </p>
                  </div>

                  {/* Show in Menu (for ADDON type) */}
                  {formData.itemType === 'ADDON' && (
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.showInMenu}
                          onChange={(e) => setFormData({ ...formData, showInMenu: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Show in Menu</span>
                          <p className="text-xs text-gray-500">
                            When enabled, this add-on will also appear in the regular menu as a standalone item.
                            Otherwise, it will only appear as an option when ordering other products.
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                  </div>
                </div>

                {/* Pricing & Time Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2">Pricing & Time</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Price */}
                    <div>
                      <Label htmlFor="price" className="text-sm font-semibold text-gray-700 mb-2 block">
                        Price (₱) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    {/* Cost */}
                    <div>
                      <Label htmlFor="cost" className="text-sm font-semibold text-gray-700 mb-2 block">
                        Cost (₱)
                      </Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        min="0"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Prep Time */}
                  <div>
                    <Label htmlFor="prepTime" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Prep Time (min) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="prepTime"
                      type="number"
                      min="1"
                      required
                      value={formData.prepTime}
                      onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                  </div>
                </div>

                {/* Media & Description Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2">Media & Description</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Image Upload/URL */}
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                        Product Image
                      </Label>
                      <div className="space-y-3">
                        {/* Image Processing Options */}
                        <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={compressImage}
                              onChange={(e) => setCompressImage(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-gray-700">Compress Image</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer" title="AI background removal - may take 10-30 seconds">
                            <input
                              type="checkbox"
                              checked={removeBackground}
                              onChange={(e) => setRemoveBackground(e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            />
                            <Eraser className="h-4 w-4 text-purple-500" />
                            <span className="text-sm text-gray-700">Remove Background</span>
                            <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">AI</span>
                          </label>
                        </div>

                        {/* Warning for background removal */}
                        {removeBackground && !imageProcessingProgress && (
                          <div className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                            <AlertTriangle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-purple-700">
                              AI background removal may take 10-30 seconds depending on image size. The page may be briefly unresponsive.
                            </span>
                          </div>
                        )}

                        {/* Processing Progress */}
                        {imageProcessingProgress && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-sm text-blue-700">{imageProcessingProgress}</span>
                          </div>
                        )}

                        {/* File Upload Area - Shows preview inside when image exists */}
                        {formData.image ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 relative group">
                            <img
                              src={getImageUrl(formData.image) || ''}
                              alt="Preview"
                              className="w-full h-40 object-contain rounded cursor-pointer"
                              onClick={() => setImageViewerOpen(true)}
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbnZhbGlkPC90ZXh0Pjwvc3ZnPg=='
                              }}
                            />
                            {/* Overlay with view icon on hover */}
                            <div 
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
                              onClick={() => setImageViewerOpen(true)}
                            >
                              <Eye className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute top-1 right-1 flex gap-1">
                              <button
                                type="button"
                                onClick={() => setImageViewerOpen(true)}
                                className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                                title="View image"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, image: '' })
                                  setOriginalFileSize(null)
                                  setProcessedFileSize(null)
                                }}
                                className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                title="Remove image"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            {/* Click to view hint */}
                            <p className="text-xs text-gray-400 text-center mt-1">Click image to view full size</p>
                          </div>
                        ) : (
                          <div 
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                              isDragging 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-300 hover:border-blue-400'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                          >
                            {uploadingImage ? (
                              <div className="flex flex-col items-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                                <span className="text-sm text-blue-600">{imageProcessingProgress || 'Processing...'}</span>
                              </div>
                            ) : (
                              <>
                                <Upload className={`h-8 w-8 mx-auto mb-2 ${
                                  isDragging ? 'text-blue-500' : 'text-gray-400'
                                }`} />
                                <label htmlFor="imageFile" className="cursor-pointer">
                                  <span className="text-sm text-blue-600 font-medium hover:text-blue-700">
                                    Click to upload
                                  </span>
                                  <span className="text-sm text-gray-500"> or drag and drop</span>
                                  <input
                                    id="imageFile"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={uploadingImage}
                                  />
                                </label>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG, GIF, WebP up to 20MB</p>
                              </>
                            )}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Description
                    </Label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the product..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  </div>
                </div>

                {/* Mood Benefits Section - Only show for non-ADDON items */}
                {formData.itemType !== 'ADDON' && (
                <div className="space-y-4">
                  <div className="border border-purple-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setMoodSectionExpanded(!moodSectionExpanded)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between hover:from-purple-100 hover:to-indigo-100 transition-colors"
                    >
                      <span className="flex items-center gap-2 font-semibold text-purple-800">
                        <Brain className="h-5 w-5" />
                        Mood-Based Recommendations
                        {Object.values(formData.moodBenefits).filter(v => v).length > 0 && (
                          <Badge className="bg-purple-500 text-white text-xs ml-2">
                            {Object.values(formData.moodBenefits).filter(v => v).length} moods
                          </Badge>
                        )}
                      </span>
                      {moodSectionExpanded ? (
                        <ChevronUp className="h-5 w-5 text-purple-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-purple-600" />
                      )}
                    </button>
                    
                    {moodSectionExpanded && (
                      <div className="p-4 space-y-4 bg-white">
                        {/* Info Banner */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-800">
                            <p className="font-medium mb-1">Select Only Relevant Moods</p>
                            <p>Not all products help with all moods. Only add scientific explanations for moods this product genuinely helps with. Products with mood explanations appear in recommendations when customers select that mood.</p>
                          </div>
                        </div>

                        {/* Key Nutrients (moved here from above) */}
                        <div>
                          <Label htmlFor="nutrients" className="text-sm font-semibold text-gray-700 mb-2 block">
                            <span className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-green-600" />
                              Key Nutrients
                              <span className="text-xs font-normal text-gray-500">(from AI analysis or manual)</span>
                            </span>
                          </Label>
                          <Input
                            id="nutrients"
                            type="text"
                            value={formData.nutrients}
                            onChange={(e) => setFormData({ ...formData, nutrients: e.target.value })}
                            placeholder="e.g., Vitamin B12, Iron, Protein, Omega-3 (paste from AI response)"
                          />
                          <p className="text-xs text-gray-500 mt-1">The AI prompt below will identify nutrients - paste them here after getting the response</p>
                        </div>

                        {/* AI Prompt Template */}
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Wand2 className="h-4 w-4 text-purple-600" />
                              <span className="font-medium text-purple-800 text-sm">AI Prompt Generator</span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const prompt = `Analyze this menu item and identify which customer moods it can genuinely help with, based on its ingredients and nutritional content.

**MENU ITEM DETAILS:**
- Name: ${formData.name || '[Enter product name]'}
- Category: ${formData.categoryId ? getCategoryDisplayName(formData.categoryId) : '[Select category]'}
- Description: ${formData.description || '[Enter description with ingredients]'}

**YOUR TASK:**

1. **IDENTIFY KEY NUTRIENTS** in this item that affect mood/mental state (e.g., Omega-3, Vitamin B12, Magnesium, Tryptophan, Caffeine, L-Theanine, etc.)

2. **SELECT ONLY APPLICABLE MOODS** from this list - NOT every product helps every mood:
   - 😊 Happy (maintains positive mood)
   - ⚡ Energetic (sustains/boosts energy)
   - 😌 Relaxed (promotes calm)
   - 🎉 Excited (complements celebration)
   - 😴 Tired (combats fatigue)
   - 😰 Stressed (reduces stress)
   - 😟 Anxious (calms anxiety)
   - 😢 Sad (lifts mood)
   - 😔 Depressed (supports mental health)
   - 😠 Angry (helps cool down)

3. **PROVIDE SCIENTIFIC EXPLANATIONS** (2-3 sentences each) only for moods this item genuinely helps.

**RESPONSE FORMAT:**

KEY NUTRIENTS: [comma-separated list]

MOOD BENEFITS:
[Only include moods this product actually helps with]

😊 Happy: [explanation if applicable]
⚡ Energetic: [explanation if applicable]
[etc - skip moods that don't apply]

**IMPORTANT:** Be selective! A pizza might help "Happy" and "Excited" but not "Anxious" or "Depressed". A calming tea might help "Stressed" and "Relaxed" but not "Energetic".`
                                navigator.clipboard.writeText(prompt)
                                setPromptCopied(true)
                                setTimeout(() => setPromptCopied(false), 2000)
                              }}
                              className={`text-xs ${promptCopied ? 'bg-green-100 border-green-300 text-green-700' : 'border-purple-300 text-purple-700 hover:bg-purple-100'}`}
                            >
                              {promptCopied ? (
                                <><CheckCircle className="h-3 w-3 mr-1" /> Copied!</>
                              ) : (
                                <><Copy className="h-3 w-3 mr-1" /> Copy Prompt</>
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-purple-700 mb-2">
                            Copy this prompt → Paste in ChatGPT/Claude → Get nutrients & mood explanations → Paste results below
                          </p>
                          <div className="bg-white/70 rounded p-2 text-xs text-gray-600 max-h-20 overflow-y-auto">
                            <p className="font-semibold text-purple-800">Current Product Info:</p>
                            <p>• Name: <span className="text-gray-800">{formData.name || '(enter name above)'}</span></p>
                            <p>• Category: <span className="text-gray-800">{formData.categoryId ? getCategoryDisplayName(formData.categoryId) : '(select category)'}</span></p>
                            <p>• Description: <span className="text-gray-800">{formData.description ? formData.description.substring(0, 60) + '...' : '(add description with ingredients)'}</span></p>
                          </div>
                        </div>
                        
                        {/* Mood Benefits Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {MOOD_TYPES.map(mood => (
                            <div key={mood.value} className="space-y-1">
                              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <span className="text-lg">{mood.emoji}</span>
                                {mood.label}
                                {formData.moodBenefits[mood.value] && (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                )}
                              </Label>
                              <textarea
                                value={formData.moodBenefits[mood.value] || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  moodBenefits: {
                                    ...formData.moodBenefits,
                                    [mood.value]: e.target.value
                                  }
                                })}
                                placeholder={`How does this help when feeling ${mood.label.toLowerCase()}? (Scientific explanation)`}
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                              />
                            </div>
                          ))}
                        </div>
                        
                        {/* Quick Clear Button */}
                        {Object.values(formData.moodBenefits).some(v => v) && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData({ ...formData, moodBenefits: {} })}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Clear All Mood Benefits
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* Settings Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2">Settings</h3>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.available}
                        onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Available for sale</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Featured item</span>
                    </label>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  {editingProduct ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        if (editingProduct) {
                          setIsModalOpen(false)
                          await handleDelete(editingProduct.id)
                          resetForm()
                          setEditingProduct(null)
                        }
                      }}
                      disabled={submitting}
                      className="mr-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Product
                    </Button>
                  ) : (
                    <div></div>
                  )}
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsModalOpen(false)
                        resetForm()
                        setEditingProduct(null)
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="px-6"
                      style={{ backgroundColor: '#F9C900', color: '#000000' }}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {editingProduct ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        editingProduct ? 'Update Product' : 'Add Product'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Category Management Modal */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Settings className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Manage Categories</h2>
                    <p className="text-sm text-gray-500">Add, edit, or delete product categories</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setIsCategoryModalOpen(false)
                    resetCategoryForm()
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {/* Add/Edit Category Form */}
                <form onSubmit={handleCategorySubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="catName" className="text-xs font-medium text-gray-600">
                        Name (identifier) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="catName"
                        type="text"
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                        placeholder="e.g., HOT_DRINKS"
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="catDisplayName" className="text-xs font-medium text-gray-600">
                        Display Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="catDisplayName"
                        type="text"
                        value={categoryFormData.displayName}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, displayName: e.target.value })}
                        placeholder="e.g., Hot Drinks"
                        className="mt-1"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="catDesc" className="text-xs font-medium text-gray-600">
                        Description
                      </Label>
                      <Input
                        id="catDesc"
                        type="text"
                        value={categoryFormData.description}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                        placeholder="Optional description"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      type="submit"
                      size="sm"
                      style={{ backgroundColor: '#F9C900', color: '#000000' }}
                      disabled={submittingCategory}
                    >
                      {submittingCategory ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        editingCategory ? 'Update' : 'Add Category'
                      )}
                    </Button>
                    {editingCategory && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetCategoryForm}
                      >
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </form>
                
                {/* Category List */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Existing Categories</h3>
                  {loadingCategories ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No categories yet. Add your first category above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((cat, index, arr) => (
                        <div 
                          key={cat.id} 
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            cat.isActive ? 'bg-white' : 'bg-gray-100 opacity-60'
                          }`}
                        >
                          {/* Position Controls */}
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === 0}
                              onClick={() => handleMoveCategoryPosition(cat.id, 'up')}
                            >
                              <ArrowUp className={`h-3 w-3 ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === arr.length - 1}
                              onClick={() => handleMoveCategoryPosition(cat.id, 'down')}
                            >
                              <ArrowDown className={`h-3 w-3 ${index === arr.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`} />
                            </Button>
                          </div>
                          
                          {/* Position Number */}
                          <span className="text-xs text-gray-400 font-mono w-4 text-center">{index + 1}</span>
                          
                          {/* Category Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{cat.displayName}</span>
                              <span className="text-xs text-gray-400 font-mono">{cat.name}</span>
                              {!cat.isActive && (
                                <Badge variant="outline" className="text-xs">Inactive</Badge>
                              )}
                            </div>
                            {cat.description && (
                              <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingCategory(cat)
                                setCategoryFormData({
                                  name: cat.name,
                                  displayName: cat.displayName,
                                  description: cat.description || ''
                                })
                              }}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-50"
                              onClick={() => handleDeleteCategory(cat.id, cat.displayName)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 border-t bg-gray-50">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsCategoryModalOpen(false)
                    resetCategoryForm()
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Variants & Add-ons Manager Modal */}
        {variantsAddonsProduct && (
          <VariantsAddonsManager
            isOpen={true}
            onClose={() => setVariantsAddonsProduct(null)}
            menuItem={{
              id: variantsAddonsProduct.id,
              name: variantsAddonsProduct.name,
              price: variantsAddonsProduct.price
            }}
            onUpdate={fetchProducts}
          />
        )}
        
        {/* Image Viewer Modal */}
        {imageViewerOpen && formData.image && (
          <ImageViewer
            src={getImageUrl(formData.image) || ''}
            alt={formData.name || 'Product image'}
            onClose={() => setImageViewerOpen(false)}
          />
        )}
      </div>
    </AdminLayout>
  )
}
