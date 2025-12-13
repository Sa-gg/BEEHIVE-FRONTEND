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
  Star
} from 'lucide-react'
import { menuItemsApi, uploadApi } from '../../../infrastructure/api/menuItems.api'

interface Product {
  id: string
  name: string
  category: string
  price: number
  cost: number | null
  image: string | null
  description: string | null
  available: boolean
  featured: boolean
  prepTime: number | null
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  'PIZZA',
  'APPETIZER',
  'HOT_DRINKS',
  'COLD_DRINKS',
  'SMOOTHIE',
  'PLATTER',
  'SAVERS',
  'VALUE_MEAL'
]

const CATEGORY_LABELS: Record<string, string> = {
  'PIZZA': 'Pizza',
  'APPETIZER': 'Appetizer',
  'HOT_DRINKS': 'Hot Drinks',
  'COLD_DRINKS': 'Cold Drinks',
  'SMOOTHIE': 'Smoothie',
  'PLATTER': 'Platter',
  'SAVERS': 'Savers',
  'VALUE_MEAL': 'Value Meal'
}

export const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    cost: '',
    prepTime: '',
    image: '',
    description: '',
    available: true,
    featured: false
  })

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

  // Fetch products on mount
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await menuItemsApi.getAll()
      setProducts(response.data)
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
      category: '',
      price: '',
      cost: '',
      prepTime: '',
      image: '',
      description: '',
      available: true,
      featured: false
    })
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
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      cost: product.cost?.toString() || '',
      prepTime: product.prepTime?.toString() || '',
      image: product.image || '',
      description: product.description || '',
      available: product.available,
      featured: product.featured
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.category || !formData.price || !formData.prepTime) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      
      const payload = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        prepTime: parseInt(formData.prepTime),
        image: formData.image || undefined,
        description: formData.description || undefined,
        available: formData.available,
        featured: formData.featured
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
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Calculate statistics
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.available).length
  const featuredProducts = products.filter(p => p.featured).length
  const avgProfitMargin = products.length > 0 
    ? (products.reduce((sum, p) => sum + parseFloat(getProfitMargin(p)), 0) / products.length).toFixed(1)
    : '0'

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Menu Items</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalProducts}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Items</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{activeProducts}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Featured Items</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{featuredProducts}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Profit Margin</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{avgProfitMargin}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>

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
                      <p className="text-xs text-gray-500">{CATEGORY_LABELS[product.category] || product.category}</p>
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
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="flex-1"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAvailability(product.id)}
                        className={product.available ? 'text-red-600' : 'text-green-600'}
                      >
                        {product.available ? 'Disable' : 'Enable'}
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
                        <td className="px-4 py-3 text-sm capitalize">{product.category}</td>
                        <td className="px-4 py-3 text-right font-semibold">₱{product.price}</td>
                        <td className="px-4 py-3 text-right text-gray-600">₱{product.cost}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-blue-100 text-blue-800">{product.prepTime} min</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={product.available ? 'default' : 'destructive'}>
                            {product.available ? 'Active' : 'Disabled'}
                          </Badge>
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
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="category"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category...</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
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
      </div>
    </AdminLayout>
  )
}
