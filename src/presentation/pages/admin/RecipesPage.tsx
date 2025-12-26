import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Badge } from '../../components/common/ui/badge'
import { Button } from '../../components/common/ui/button'
import { Search, ChefHat, AlertTriangle, CheckCircle, Book, Package, Filter, XCircle } from 'lucide-react'
import { menuItemsApi, type MenuItemDTO } from '../../../infrastructure/api/menuItems.api'
import { recipeApi } from '../../../infrastructure/api/recipe.api'
import { RecipeEditorModal } from '../../components/features/Admin/RecipeEditorModal'

type RecipeFilter = 'all' | 'with-recipe' | 'no-recipe'

export const RecipesPage = () => {
  const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([])
  const [recipeStats, setRecipeStats] = useState<Map<string, number>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemDTO | null>(null)
  const [showRecipeEditor, setShowRecipeEditor] = useState(false)

  useEffect(() => {
    loadMenuItems()
  }, [selectedCategory, searchQuery])

  useEffect(() => {
    document.title = 'Recipes - BEEHIVE Admin'
  }, [])

  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    return `${API_BASE_URL}${imagePath}`
  }

  const loadMenuItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery || undefined
      }
      const response = await menuItemsApi.getAll(filters)
      const items = response.data
      setMenuItems(items)

      // Load recipe counts for all items
      const stats = new Map<string, number>()
      await Promise.all(
        items.map(async (item) => {
          try {
            const recipe = await recipeApi.getRecipe(item.id)
            stats.set(item.id, recipe.length)
          } catch {
            stats.set(item.id, 0)
          }
        })
      )
      setRecipeStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu items')
      console.error('Error loading menu items:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditRecipe = (menuItem: MenuItemDTO) => {
    setSelectedMenuItem(menuItem)
    setShowRecipeEditor(true)
  }

  const handleRecipeSuccess = () => {
    loadMenuItems()
  }

  const categories = [
    { value: 'all', label: 'All Items', icon: '📋' },
    { value: 'PIZZA', label: 'Pizza', icon: '🍕' },
    { value: 'APPETIZER', label: 'Appetizers', icon: '🍟' },
    { value: 'SMOOTHIE', label: 'Smoothies', icon: '🥤' },
    { value: 'HOT_DRINKS', label: 'Hot Drinks', icon: '☕' },
    { value: 'COLD_DRINKS', label: 'Cold Drinks', icon: '🧃' },
    { value: 'VALUE_MEAL', label: 'Value Meals', icon: '🍱' },
    { value: 'PLATTER', label: 'Platters', icon: '🍽️' },
    { value: 'SAVERS', label: 'Savers', icon: '💰' },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl">👨‍🍳</span>
            Recipe Management
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            Define ingredients for each menu item to enable automatic inventory deduction
          </p>
        </div>

        {/* Info Banner */}
        <div className="border-2 rounded-xl p-5 shadow-sm" style={{ backgroundColor: '#FFFEF5', borderColor: '#F9C900' }}>
          <div className="flex items-start gap-3">
            <div className="rounded-full p-2" style={{ backgroundColor: '#F9C900' }}>
              <Book className="h-5 w-5 text-black" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 mb-1">How Recipe Management Works</p>
              <p className="text-sm text-gray-700">
                Define which ingredients are needed for each menu item. When an order is marked as 
                <span className="font-bold" style={{ color: '#F9C900' }}> COMPLETED</span>, the system will automatically deduct 
                the required ingredients from your inventory.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Search and Recipe Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: '#F9C900' }} />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:border-2 transition-all shadow-sm hover:border-gray-400"
                style={{ 
                  borderColor: searchQuery ? '#F9C900' : undefined,
                  boxShadow: searchQuery ? '0 0 0 3px rgba(249, 201, 0, 0.1)' : undefined 
                }}
              />
            </div>

            {/* Recipe Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setRecipeFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    recipeFilter === 'all' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setRecipeFilter('with-recipe')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    recipeFilter === 'with-recipe' 
                      ? 'bg-green-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Has Recipe
                </button>
                <button
                  onClick={() => setRecipeFilter('no-recipe')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    recipeFilter === 'no-recipe' 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  No Recipe
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === cat.value
                    ? 'text-black shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
                style={selectedCategory === cat.value ? { backgroundColor: '#F9C900' } : {}}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Menu Items Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" style={{ borderTopColor: '#F9C900' }}></div>
            <p className="text-gray-500 mt-4">Loading menu items...</p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                Showing {menuItems.filter(item => {
                  const ingredientCount = recipeStats.get(item.id) || 0
                  const hasRecipe = ingredientCount > 0
                  if (recipeFilter === 'with-recipe') return hasRecipe
                  if (recipeFilter === 'no-recipe') return !hasRecipe
                  return true
                }).length} of {menuItems.length} items
              </span>
              {recipeFilter !== 'all' && (
                <button
                  onClick={() => setRecipeFilter('all')}
                  className="flex items-center gap-1 text-amber-600 hover:text-amber-700"
                >
                  <XCircle className="h-4 w-4" />
                  Clear filter
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {menuItems.filter(item => {
                const ingredientCount = recipeStats.get(item.id) || 0
                const hasRecipe = ingredientCount > 0
                if (recipeFilter === 'with-recipe') return hasRecipe
                if (recipeFilter === 'no-recipe') return !hasRecipe
                return true
              }).length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No menu items found</p>
                {searchQuery && (
                  <p className="text-sm text-gray-400 mt-2">Try adjusting your search or filters</p>
                )}
              </div>
            ) : (
              menuItems.filter(item => {
                const ingredientCount = recipeStats.get(item.id) || 0
                const hasRecipe = ingredientCount > 0
                if (recipeFilter === 'with-recipe') return hasRecipe
                if (recipeFilter === 'no-recipe') return !hasRecipe
                return true
              }).map((item) => {
                const ingredientCount = recipeStats.get(item.id) || 0
                const hasRecipe = ingredientCount > 0

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border-2 border-gray-200 hover:shadow-lg transition-all overflow-hidden group"
                    style={{ 
                      borderColor: hasRecipe ? '#E5E7EB' : '#FEF3C7',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#F9C900'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = hasRecipe ? '#E5E7EB' : '#FEF3C7'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Image */}
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      {item.image ? (
                        <img
                          src={getImageUrl(item.image) || ''}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to emoji if image fails to load
                            e.currentTarget.style.display = 'none'
                            if (e.currentTarget.parentElement) {
                              const fallback = document.createElement('div')
                              fallback.className = 'w-full h-full flex items-center justify-center text-4xl'
                              fallback.textContent = '🍽️'
                              e.currentTarget.parentElement.appendChild(fallback)
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🍽️
                        </div>
                      )}
                      {!item.available && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge className="bg-red-500 text-white">Unavailable</Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                          <p className="text-sm text-gray-500 capitalize">
                            {item.category.replace(/_/g, ' ').toLowerCase()}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`ml-2 ${
                            hasRecipe
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}
                        >
                          {hasRecipe ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {ingredientCount} {ingredientCount === 1 ? 'ingredient' : 'ingredients'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <p className="text-lg font-bold" style={{ color: '#F9C900' }}>
                            ₱{item.price.toFixed(2)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleEditRecipe(item)}
                          style={{ backgroundColor: '#F9C900', color: '#000000' }}
                          className="font-medium"
                        >
                          <Book className="h-4 w-4 mr-2" />
                          Edit Recipe
                        </Button>
                      </div>

                      {!hasRecipe && (
                        <p className="text-xs text-yellow-600 mt-3 flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span>No recipe defined. Orders won't deduct inventory.</span>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          </>
        )}
      </div>

      {/* Recipe Editor Modal */}
      {showRecipeEditor && selectedMenuItem && (
        <RecipeEditorModal
          menuItemId={selectedMenuItem.id}
          menuItemName={selectedMenuItem.name}
          onClose={() => {
            setShowRecipeEditor(false)
            setSelectedMenuItem(null)
          }}
          onSuccess={handleRecipeSuccess}
        />
      )}
    </AdminLayout>
  )
}
