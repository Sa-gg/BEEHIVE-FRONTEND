import { useState, useEffect } from 'react'
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
  Settings
} from 'lucide-react'
import { menuItemsApi, uploadApi } from '../../../infrastructure/api/menuItems.api'
import type { MenuItemDTO } from '../../../infrastructure/api/menuItems.api'
import { categoriesApi } from '../../../infrastructure/api/categories.api'
import type { CategoryDTO } from '../../../infrastructure/api/categories.api'

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
  createdAt: string
  updatedAt: string
}

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
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'out-of-stock'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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
    moodBenefits: {} as Record<string, string>
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

  // Fetch products and categories on mount
  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

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
        category: item.category
      }))
      setProducts(mappedProducts)
    } catch (error) {
      console.error('Failed to fetch products:', error)
      alert('Failed to load products. Please try again.')
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
      moodBenefits: {}
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
      alert('Please fill in name and display name')
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
        alert('Category updated successfully!')
      } else {
        await categoriesApi.create({
          name: categoryFormData.name,
          displayName: categoryFormData.displayName,
          description: categoryFormData.description || undefined
        })
        alert('Category created successfully!')
      }
      
      setIsCategoryModalOpen(false)
      resetCategoryForm()
      await fetchCategories()
    } catch (error) {
      console.error('Failed to save category:', error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Failed to save category. Please try again.')
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
      alert('Category deleted successfully!')
      await fetchCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Failed to delete category. Please try again.')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)
      const uploadFormData = new FormData()
      uploadFormData.append('image', file)
      
      const response = await uploadApi.uploadImage(uploadFormData)
      setFormData(prev => ({ ...prev, image: response.data.path }))
      alert('Image uploaded successfully!')
    } catch (error) {
      console.error('Failed to upload image:', error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
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
      alert('Please drop an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      const uploadFormData = new FormData()
      uploadFormData.append('image', file)
      
      const response = await uploadApi.uploadImage(uploadFormData)
      setFormData(prev => ({ ...prev, image: response.data.path }))
      alert('Image uploaded successfully!')
    } catch (error) {
      console.error('Failed to upload image:', error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
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
      moodBenefits: parsedMoodBenefits
    })
    
    // Expand mood section if there are any mood benefits
    setMoodSectionExpanded(Object.keys(parsedMoodBenefits).length > 0)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.categoryId || !formData.price || !formData.prepTime) {
      alert('Please fill in all required fields')
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
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        prepTime: parseInt(formData.prepTime),
        image: formData.image || undefined,
        description: formData.description || undefined,
        available: formData.available,
        featured: formData.featured,
        nutrients: formData.nutrients || undefined,
        moodBenefits: Object.keys(filteredMoodBenefits).length > 0 
          ? JSON.stringify(filteredMoodBenefits) 
          : undefined
      }

      if (editingProduct) {
        await menuItemsApi.update(editingProduct.id, payload)
        alert('Product updated successfully!')
      } else {
        await menuItemsApi.create(payload)
        alert('Product created successfully!')
      }

      setIsModalOpen(false)
      resetForm()
      setEditingProduct(null)
      await fetchProducts()
    } catch (error) {
      console.error('Failed to save product:', error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Failed to save product. Please try again.')
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
      alert('Product deleted successfully!')
      await fetchProducts()
    } catch (error) {
      console.error('Failed to delete product:', error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Failed to delete product. Please try again.')
    }
  }

  const toggleAvailability = async (id: string) => {
    try {
      await menuItemsApi.toggleAvailability(id)
      await fetchProducts()
    } catch (error) {
      console.error('Failed to toggle availability:', error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Failed to update product. Please try again.')
    }
  }

  const toggleFeatured = async (id: string) => {
    try {
      await menuItemsApi.toggleFeatured(id)
      await fetchProducts()
    } catch (error) {
      console.error('Failed to toggle featured:', error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Failed to update product. Please try again.')
    }
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
    const matchesAvailability = availabilityFilter === 'all' || 
                                (availabilityFilter === 'available' && product.available) ||
                                (availabilityFilter === 'out-of-stock' && !product.available)
    return matchesSearch && matchesCategory && matchesAvailability
  })

  // Calculate statistics
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.available).length
  const outOfStockProducts = products.filter(p => !p.available).length
  const featuredProducts = products.filter(p => p.featured).length
  const avgProfitMargin = products.length > 0 
    ? (products.reduce((sum, p) => sum + parseFloat(getProfitMargin(p)), 0) / products.length).toFixed(1)
    : '0'

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

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalProducts}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div 
            className={`bg-white rounded-xl p-5 shadow-sm border cursor-pointer transition-all ${
              availabilityFilter === 'available' ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-200 hover:border-green-300'
            }`}
            onClick={() => setAvailabilityFilter(availabilityFilter === 'available' ? 'all' : 'available')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{activeProducts}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div 
            className={`bg-white rounded-xl p-5 shadow-sm border cursor-pointer transition-all ${
              availabilityFilter === 'out-of-stock' ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-200 hover:border-red-300'
            }`}
            onClick={() => setAvailabilityFilter(availabilityFilter === 'out-of-stock' ? 'all' : 'out-of-stock')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockProducts}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Featured</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{featuredProducts}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
            </div>
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

              {/* Availability Quick Filters */}
              <div className="flex items-center gap-2">
                <Button
                  variant={availabilityFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAvailabilityFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={availabilityFilter === 'available' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAvailabilityFilter('available')}
                  className={availabilityFilter === 'available' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Available
                </Button>
                <Button
                  variant={availabilityFilter === 'out-of-stock' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAvailabilityFilter('out-of-stock')}
                  className={availabilityFilter === 'out-of-stock' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Out of Stock
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
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Products Display */}
        {!loading && viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              return (
                <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 relative">
                    {product.image ? (
                      <img
                        src={getImageUrl(product.image) || ''}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      {product.featured && (
                        <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
                      )}
                      {!product.available && (
                        <Badge variant="destructive">Unavailable</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-gray-500">{product.category?.displayName || getCategoryDisplayName(product.categoryId)}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-lg font-bold" style={{ color: '#F9C900' }}>₱{product.price}</p>
                        <p className="text-xs text-gray-500">Cost: ₱{product.cost ?? 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{product.prepTime ?? 5} mins</p>
                        <p className="text-xs text-green-600">+{getProfitMargin(product)}% margin</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {/* Quick Stock Toggle - Prominent for rush hours */}
                      <Button
                        size="sm"
                        onClick={() => toggleAvailability(product.id)}
                        className={`w-full font-medium ${
                          product.available 
                            ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300' 
                            : 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300'
                        }`}
                        variant="outline"
                      >
                        {product.available ? (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Mark Out of Stock
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Available
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="w-full"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit Details
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cost</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Prep Time</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map(product => {
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
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
                          <Badge className="bg-blue-100 text-blue-800">{product.prepTime} min</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleAvailability(product.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              product.available 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                            title={product.available ? 'Click to mark out of stock' : 'Click to mark available'}
                          >
                            {product.available ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Available
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Out of Stock
                              </span>
                            )}
                          </button>
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

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                      Preparation Time (minutes) <span className="text-red-500">*</span>
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

                  {/* Image Upload/URL */}
                  <div className="md:col-span-2">
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                      Product Image
                    </Label>
                    <div className="space-y-3">
                      {/* File Upload Area */}
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
                        <Upload className={`h-8 w-8 mx-auto mb-2 ${
                          isDragging ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                        <label htmlFor="imageFile" className="cursor-pointer">
                          <span className="text-sm text-blue-600 font-medium hover:text-blue-700">
                            {uploadingImage ? 'Uploading...' : 'Click to upload'}
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
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG, GIF, WebP up to 5MB</p>
                      </div>
                      
                      {/* Or separator */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-gray-500">Or enter image path</span>
                        </div>
                      </div>
                      
                      {/* URL Input */}
                      <Input
                        id="imageUrl"
                        type="text"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        placeholder="/uploads/menu-images/image.jpg"
                      />
                      
                      {/* Image Preview */}
                      {formData.image && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-2">Preview:</p>
                          <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={getImageUrl(formData.image) || ''}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbnZhbGlkPC90ZXh0Pjwvc3ZnPg=='
                              }}
                            />
                          </div>
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

                  {/* Nutrients (from AI or manual) */}
                  <div className="md:col-span-2">
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

                  {/* Mood Benefits Section (Collapsible) */}
                  <div className="md:col-span-2 border border-purple-200 rounded-xl overflow-hidden">
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
                          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-800">
                            <p className="font-medium mb-1">Select Only Relevant Moods</p>
                            <p>Not all products help with all moods. Only add scientific explanations for moods this product genuinely helps with. Products with mood explanations appear in recommendations when customers select that mood.</p>
                          </div>
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

                  {/* Availability & Featured */}
                  <div className="md:col-span-2 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.available}
                        onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Product is available for sale</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Mark as featured item (Best Seller/Recommended)</span>
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
                      {categories.map(cat => (
                        <div 
                          key={cat.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            cat.isActive ? 'bg-white' : 'bg-gray-100 opacity-60'
                          }`}
                        >
                          <div>
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
      </div>
    </AdminLayout>
  )
}
