import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { Label } from '../../components/common/ui/label'
import { Badge } from '../../components/common/ui/badge'
import { 
  Brain,
  Settings,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Save,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  Heart,
  Activity,
  PieChart,
  Sliders,
  ToggleRight,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  Eye
} from 'lucide-react'
import { moodSettingsApi } from '../../../infrastructure/api/moodSettings.api'
import type { MoodSetting, MoodFeedbackConfig, MoodAnalytics, UpdateMoodSettingDTO, UpdateFeedbackConfigDTO } from '../../../infrastructure/api/moodSettings.api'
import { categoriesApi, type CategoryDTO } from '../../../infrastructure/api/categories.api'

// ==================== SCORE CALCULATION HELPERS ====================
// These mirror the exact algorithm in MenuPage.tsx for accurate analytics

/**
 * Wilson Score Confidence Interval (Lower Bound)
 * Used for statistically confident ranking
 */
const wilsonScore = (successes: number, total: number, confidence: number = 1.96): number => {
  if (total === 0) return 0
  
  const p = successes / total
  const n = total
  const z = confidence
  
  const denominator = 1 + z * z / n
  const center = p + z * z / (2 * n)
  const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
  
  return Math.max(0, (center - margin) / denominator)
}

/**
 * Calculate exploration bonus using UCB formula
 */
const calculateExplorationBonus = (itemExposures: number, totalExposures: number, maxBonus: number): number => {
  if (itemExposures === 0 || totalExposures === 0) return maxBonus
  const bonus = Math.sqrt((2 * Math.log(totalExposures + 1)) / itemExposures)
  return Math.min(bonus * 1.5, maxBonus)
}

/**
 * Determine the learning stage for an item
 */
const getItemStage = (
  timesOrdered: number, 
  minimumOrdersThreshold: number,
  feedbackEnabled: boolean
): 'cold-start' | 'data-collection' | 'feedback-enabled' => {
  if (timesOrdered < minimumOrdersThreshold) return 'cold-start'
  if (!feedbackEnabled) return 'data-collection'
  return 'feedback-enabled'
}

/**
 * Calculate score breakdown for a menu item
 */
interface ScoreBreakdown {
  moodBenefits: number
  preferredCategory: number
  excludedCategory: number
  historical: number
  featured: number
  timeOfDay: number
  explorationBonus: number
  total: number
  stage: 'cold-start' | 'data-collection' | 'feedback-enabled'
  wilsonOrderRate: number
  wilsonImprovementRate: number
}

const calculateScoreBreakdown = (
  item: any,
  selectedMood: string,
  moodConfig: MoodSetting | undefined,
  feedbackConfig: MoodFeedbackConfig | null,
  totalExposures: number
): ScoreBreakdown => {
  const weights = {
    moodBenefits: feedbackConfig?.moodBenefitsWeight ?? 20,
    preferredCategory: feedbackConfig?.preferredCategoryWeight ?? 10,
    excludedCategoryPenalty: feedbackConfig?.excludedCategoryPenalty ?? 0,
    historical: feedbackConfig?.historicalDataWeight ?? 15,
    featured: feedbackConfig?.featuredItemWeight ?? 5,
    timeOfDay: feedbackConfig?.timeOfDayWeight ?? 5,
    explorationBonus: feedbackConfig?.explorationBonusWeight ?? 8,
    minimumOrders: feedbackConfig?.minimumOrdersThreshold ?? 10
  }
  
  const stage = getItemStage(
    item.timesOrdered || 0,
    weights.minimumOrders,
    feedbackConfig?.feedbackEnabled ?? false
  )
  
  // 1. Mood Benefits - check both lowercase and uppercase mood keys
  // moodBenefits may be a JSON string or already parsed object
  // Structure is: {"ENERGETIC": "explanation text", "TIRED": "explanation text"}
  let moodBenefits = item.menuItem?.moodBenefits
  if (typeof moodBenefits === 'string') {
    try {
      moodBenefits = JSON.parse(moodBenefits)
    } catch {
      moodBenefits = null
    }
  }
  const moodLower = selectedMood?.toLowerCase()
  const moodUpper = selectedMood?.toUpperCase()
  // The moodBenefits structure is { "ENERGETIC": "explanation" } - just a string value, not an object with scientificExplanation
  const hasMoodBenefits = moodBenefits && 
    typeof moodBenefits === 'object' &&
    (moodBenefits[moodLower] || moodBenefits[moodUpper])
  const moodBenefitsScore = hasMoodBenefits ? weights.moodBenefits : 0
  
  // 2. Preferred Category - now using categoryId
  const itemCategoryId = item.menuItem?.categoryId
  const preferredCats = moodConfig?.preferredCategories || []
  const inPreferredCategory = preferredCats.includes(itemCategoryId)
  const preferredCategoryScore = inPreferredCategory ? weights.preferredCategory : 0
  
  // 2b. Excluded Category Penalty - now using categoryId
  const excludedCats = moodConfig?.excludeCategories || []
  const inExcludedCategory = excludedCats.includes(itemCategoryId)
  // Only apply penalty if excludedCategoryPenalty > 0, otherwise items are filtered out
  const excludedCategoryScore = (inExcludedCategory && weights.excludedCategoryPenalty > 0) 
    ? -weights.excludedCategoryPenalty 
    : 0
  
  // 3. Historical Score (stage-dependent)
  const wilsonOrderRate = wilsonScore(item.timesOrdered || 0, item.timesShown || 1)
  const wilsonImprovementRate = item.feedbackCount > 0 
    ? wilsonScore(item.moodImproved || 0, item.feedbackCount)
    : 0
  
  // FIX W3: Cap historical score at 2× neutral score
  const neutralScore = weights.historical / 2  // Neutral: 7.5
  const historicalCap = neutralScore * 2  // Cap at 2× neutral
  
  let historicalScore = 0
  if (stage === 'cold-start') {
    historicalScore = neutralScore // Neutral score for new items
  } else if (stage === 'data-collection') {
    historicalScore = Math.min(wilsonOrderRate * weights.historical, historicalCap)
  } else {
    // Feedback-Enabled: 60% order + 40% improvement
    const orderWeight = feedbackConfig?.orderRateWeight ?? 0.6
    const feedbackWeight = feedbackConfig?.feedbackRateWeight ?? 0.4
    const combinedRate = (wilsonOrderRate * orderWeight) + (wilsonImprovementRate * feedbackWeight)
    historicalScore = Math.min(combinedRate * weights.historical, historicalCap)
  }
  
  // 4. Featured
  const featuredScore = item.menuItem?.featured ? weights.featured : 0
  
  // 5. Time of Day - calculate based on current time
  const hour = new Date().getHours()
  const morningStart = feedbackConfig?.morningStartHour ?? 6
  const morningEnd = feedbackConfig?.morningEndHour ?? 12
  const afternoonEnd = feedbackConfig?.afternoonEndHour ?? 18
  
  let timeContext: 'morning' | 'afternoon' | 'evening'
  if (hour >= morningStart && hour < morningEnd) timeContext = 'morning'
  else if (hour >= morningEnd && hour < afternoonEnd) timeContext = 'afternoon'
  else timeContext = 'evening'
  
  // Parse time categories from config - now uses categoryIds
  const parseCategories = (cats: any): string[] => {
    if (!cats) return []
    if (typeof cats === 'string') return JSON.parse(cats)
    return cats
  }
  
  const morningCats = parseCategories(feedbackConfig?.morningCategories) || []
  const afternoonCats = parseCategories(feedbackConfig?.afternoonCategories) || []
  const eveningCats = parseCategories(feedbackConfig?.eveningCategories) || []
  
  // FIX W6: Skip time bonus if item is in excluded category for current mood
  const isExcludedForMood = excludedCats?.includes(itemCategoryId)
  
  let timeOfDayScore = 0
  // Only give time bonus if NOT in excluded categories
  if (!isExcludedForMood) {
    if (timeContext === 'morning' && morningCats.includes(itemCategoryId)) {
      timeOfDayScore = weights.timeOfDay
    } else if (timeContext === 'afternoon' && afternoonCats.includes(itemCategoryId)) {
      timeOfDayScore = weights.timeOfDay
    } else if (timeContext === 'evening' && eveningCats.includes(itemCategoryId)) {
      timeOfDayScore = weights.timeOfDay
    }
  }
  
  // 6. Exploration Bonus (UCB)
  const explorationScore = stage === 'cold-start' 
    ? calculateExplorationBonus(item.timesShown || 0, totalExposures, weights.explorationBonus)
    : calculateExplorationBonus(item.timesShown || 1, totalExposures, weights.explorationBonus)
  
  return {
    moodBenefits: Math.round(moodBenefitsScore * 10) / 10,
    preferredCategory: Math.round(preferredCategoryScore * 10) / 10,
    excludedCategory: Math.round(excludedCategoryScore * 10) / 10,
    historical: Math.round(historicalScore * 10) / 10,
    featured: Math.round(featuredScore * 10) / 10,
    timeOfDay: Math.round(timeOfDayScore * 10) / 10,
    explorationBonus: Math.round(explorationScore * 10) / 10,
    total: Math.round((moodBenefitsScore + preferredCategoryScore + excludedCategoryScore + historicalScore + featuredScore + timeOfDayScore + explorationScore) * 10) / 10,
    stage,
    wilsonOrderRate: Math.round(wilsonOrderRate * 100),
    wilsonImprovementRate: Math.round(wilsonImprovementRate * 100)
  }
}

// Toggle Switch Component
const ToggleSwitch = ({ 
  enabled, 
  onChange, 
  disabled = false 
}: { 
  enabled: boolean
  onChange: () => void
  disabled?: boolean 
}) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
      enabled ? 'bg-purple-500' : 'bg-gray-200'
    }`}
    role="switch"
    aria-checked={enabled}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
)

export const MoodSettingsPage = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics' | 'config' | 'how-it-works'>('settings')
  
  // Data
  const [moodSettings, setMoodSettings] = useState<MoodSetting[]>([])
  const [feedbackConfig, setFeedbackConfig] = useState<MoodFeedbackConfig | null>(null)
  const [analytics, setAnalytics] = useState<MoodAnalytics[]>([])
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  
  // Edit state
  const [editingMood, setEditingMood] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<UpdateMoodSettingDTO>({})
  const [expandedMoods, setExpandedMoods] = useState<Set<string>>(new Set())
  
  // Feedback config edit - use UpdateFeedbackConfigDTO type which has arrays for categories
  const [configDirty, setConfigDirty] = useState(false)
  const [editConfig, setEditConfig] = useState<UpdateFeedbackConfigDTO>({})
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  
  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetType, setResetType] = useState<'all' | 'mood-stats' | 'item-stats'>('all')
  const [resetMood, setResetMood] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  
  // Per-item analytics state
  const [selectedMoodForItems, setSelectedMoodForItems] = useState<string | null>(null)
  const [itemAnalytics, setItemAnalytics] = useState<any[]>([])
  const [loadingItemAnalytics, setLoadingItemAnalytics] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Helper to parse JSON string categories to arrays
  const parseCategoriesToArray = (cats: string | string[] | undefined): string[] => {
    if (!cats) return []
    if (Array.isArray(cats)) return cats
    try {
      return JSON.parse(cats)
    } catch {
      return []
    }
  }

  // Convert MoodFeedbackConfig to UpdateFeedbackConfigDTO (parse JSON strings to arrays)
  const configToEditConfig = (config: MoodFeedbackConfig): UpdateFeedbackConfigDTO => ({
    ...config,
    morningCategories: parseCategoriesToArray(config.morningCategories),
    afternoonCategories: parseCategoriesToArray(config.afternoonCategories),
    eveningCategories: parseCategoriesToArray(config.eveningCategories),
  })

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [settings, config, stats, categoriesResponse] = await Promise.all([
        moodSettingsApi.getAllMoodSettings(),
        moodSettingsApi.getFeedbackConfig(),
        moodSettingsApi.getMoodAnalytics(),
        categoriesApi.getAll()
      ])
      
      setMoodSettings(settings)
      setFeedbackConfig(config)
      // Convert config categories from JSON strings to arrays for editing
      setEditConfig(configToEditConfig(config))
      setAnalytics(stats)
      setCategories(categoriesResponse.data)
    } catch (error: any) {
      console.error('Error loading mood settings:', error)
      setError(error?.response?.data?.error || error?.message || 'Failed to load mood settings')
      // Try to initialize if no data
      try {
        await moodSettingsApi.initializeAll()
        const [settings, config, stats] = await Promise.all([
          moodSettingsApi.getAllMoodSettings(),
          moodSettingsApi.getFeedbackConfig(),
          moodSettingsApi.getMoodAnalytics()
        ])
        setMoodSettings(settings)
        setFeedbackConfig(config)
        setEditConfig(configToEditConfig(config))
        setAnalytics(stats)
        setError(null)
      } catch (initError: any) {
        console.error('Error initializing:', initError)
        setError(initError?.response?.data?.error || initError?.message || 'Failed to initialize mood settings')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEditMood = (mood: MoodSetting) => {
    setEditingMood(mood.mood)
    setEditForm({
      emoji: mood.emoji,
      label: mood.label,
      color: mood.color,
      description: mood.description,
      supportMessage: mood.supportMessage,
      scientificExplanation: mood.scientificExplanation,
      beneficialNutrients: mood.beneficialNutrients || [],
      preferredCategories: mood.preferredCategories || [],
      excludeCategories: mood.excludeCategories || [],
      preferredCategoryPoints: mood.preferredCategoryPoints ?? 10,
      isActive: mood.isActive
    })
  }

  const handleSaveMood = async () => {
    if (!editingMood) return
    
    try {
      setSaving(true)
      await moodSettingsApi.updateMoodSetting(editingMood, editForm)
      await loadData()
      setEditingMood(null)
      setEditForm({})
    } catch (error) {
      console.error('Error saving mood setting:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveConfig = async () => {
    try {
      setSaving(true)
      await moodSettingsApi.updateFeedbackConfig(editConfig)
      setConfigDirty(false)
      await loadData()
    } catch (error) {
      console.error('Error saving config:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleMoodExpanded = (mood: string) => {
    const newExpanded = new Set(expandedMoods)
    if (newExpanded.has(mood)) {
      newExpanded.delete(mood)
    } else {
      newExpanded.add(mood)
    }
    setExpandedMoods(newExpanded)
  }

  const toggleCategory = (field: 'preferredCategories' | 'excludeCategories', category: string) => {
    const current = editForm[field] || []
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category]
    setEditForm({ ...editForm, [field]: updated })
  }

  // Open reset modal
  const openResetModal = (type: 'all' | 'mood-stats' | 'item-stats', mood?: string) => {
    setResetType(type)
    setResetMood(mood || null)
    setShowResetModal(true)
  }

  // Handle reset confirmation
  const handleConfirmReset = async () => {
    try {
      setIsResetting(true)
      
      if (resetType === 'all') {
        // Reset both tables
        if (resetMood) {
          // Reset specific mood in both tables
          await Promise.all([
            moodSettingsApi.resetMoodOrderStatsByMood(resetMood),
            moodSettingsApi.resetMenuItemMoodStatsByMood(resetMood)
          ])
        } else {
          // Reset all data in both tables
          await moodSettingsApi.resetAllMoodStatistics()
        }
      } else if (resetType === 'mood-stats') {
        // Reset only mood_order_stats table
        if (resetMood) {
          await moodSettingsApi.resetMoodOrderStatsByMood(resetMood)
        } else {
          await moodSettingsApi.resetAllMoodOrderStats()
        }
      } else if (resetType === 'item-stats') {
        // Reset only menu_item_mood_stats table
        if (resetMood) {
          await moodSettingsApi.resetMenuItemMoodStatsByMood(resetMood)
        } else {
          await moodSettingsApi.resetAllMenuItemMoodStats()
        }
      }
      
      setShowResetModal(false)
      await loadData()
    } catch (error) {
      console.error('Error resetting stats:', error)
    } finally {
      setIsResetting(false)
    }
  }

  // Legacy function for quick reset (used by table row buttons)
  const handleResetStats = async (mood?: string) => {
    openResetModal('all', mood)
  }

  // Load per-item analytics for a specific mood
  const loadItemAnalytics = async (mood: string) => {
    try {
      setLoadingItemAnalytics(true)
      setSelectedMoodForItems(mood)
      const data = await moodSettingsApi.getDetailedMoodAnalytics(mood)
      setItemAnalytics(data.itemStats || [])
    } catch (error) {
      console.error('Error loading item analytics:', error)
      setItemAnalytics([])
    } finally {
      setLoadingItemAnalytics(false)
    }
  }

  const handleInitialize = async () => {
    try {
      setIsInitializing(true)
      await moodSettingsApi.initializeAll()
      await loadData()
    } catch (error) {
      console.error('Error initializing:', error)
    } finally {
      setIsInitializing(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </AdminLayout>
    )
  }

  if (error && moodSettings.length === 0) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-red-600 font-medium">{error}</p>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="h-7 w-7 text-purple-500" />
              Mood-Based Recommendations
            </h1>
            <p className="text-gray-500 mt-1">
              Configure mood settings, preferred categories, and feedback tracking
            </p>
          </div>
          
          <div className="flex gap-2">
            {moodSettings.length === 0 && (
              <Button
                onClick={handleInitialize}
                disabled={isInitializing}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isInitializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Initialize Settings
              </Button>
            )}
            <Button
              onClick={loadData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2 flex-wrap">
          <button
            onClick={() => setActiveTab('how-it-works')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'how-it-works'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Info className="h-4 w-4" />
            How It Works
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="h-4 w-4" />
            Mood Settings
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'config'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Algorithm Config
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'how-it-works' && (
          <div className="space-y-6">
            {/* Overview */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
              <h2 className="text-xl font-bold text-purple-900 mb-3 flex items-center gap-2">
                <Brain className="h-6 w-6" />
                Mood-Based Recommendation System
              </h2>
              <p className="text-purple-800 mb-4">
                Our intelligent system recommends menu items based on how customers feel, using a multi-factor scoring 
                algorithm that combines <strong>domain knowledge</strong> (nutritional science), <strong>historical data</strong> (what worked for others), 
                and <strong>statistical confidence</strong> (Wilson Score + UCB exploration). The system learns and improves over time.
              </p>
              <div className="bg-white/50 rounded-lg p-3 text-sm">
                <strong>Maximum Score: ~{20 + 10 + 15 + 5 + 5 + (feedbackConfig?.explorationBonusWeight ?? 8)} points</strong> = Mood Benefits (20) + Preferred Category (10) + Historical (15) + Featured (5) + Time of Day (5) + Exploration Bonus ({feedbackConfig?.explorationBonusWeight ?? 8})
                <br />
                <span className="text-red-600 text-xs mt-1 inline-block">
                  Note: Excluded categories can reduce score by -{feedbackConfig?.excludedCategoryPenalty ?? 0} pts (or filter out entirely if set to 0)
                </span>
              </div>
            </div>

            {/* How Scoring Works */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  How the Scoring Algorithm Works
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-gray-700">
                  Each menu item receives a score based on multiple factors. Items with higher scores are shown first 
                  in recommendations. <strong>Items with equal scores are shuffled randomly</strong> to prevent position bias.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 font-semibold text-green-800 mb-2">
                      <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded">+{feedbackConfig?.moodBenefitsWeight ?? 20} pts</span>
                      Mood Benefits Match
                    </div>
                    <p className="text-sm text-green-700">
                      Items with scientific explanations for why they help with the selected mood get the highest boost.
                      Based on nutritional psychology research (omega-3 for mood, magnesium for stress, etc.).
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 font-semibold text-blue-800 mb-2">
                      <span className="bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded">0-{feedbackConfig?.historicalDataWeight ?? 15} pts</span>
                      Historical Success (Wilson Score)
                    </div>
                    <p className="text-sm text-blue-700">
                      Uses <strong>Wilson Score Confidence Interval</strong> (like Reddit/Yelp) to rank items based on order rate 
                      AND sample size. Data Collection phase: order rate only. Feedback-Enabled: 60% order rate + 40% mood improvement.
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 font-semibold text-purple-800 mb-2">
                      <span className="bg-purple-200 text-purple-800 text-xs px-2 py-0.5 rounded">+{feedbackConfig?.preferredCategoryWeight ?? 10} pts</span>
                      Preferred Category
                    </div>
                    <p className="text-sm text-purple-700">
                      Items in categories scientifically linked to the mood (e.g., smoothies for stressed, hot drinks for tired).
                      Configure these in the Mood Settings tab.
                    </p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center gap-2 font-semibold text-red-800 mb-2">
                      <span className="bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded">{(feedbackConfig?.excludedCategoryPenalty ?? 0) === 0 ? 'Filter Out' : `-${feedbackConfig?.excludedCategoryPenalty} pts`}</span>
                      Excluded Category Penalty
                    </div>
                    <p className="text-sm text-red-700">
                      Items in categories that may <strong>negatively affect</strong> the mood (e.g., caffeine for stressed, cold drinks for tired).
                      <strong> If penalty = 0</strong>: Items are completely hidden. <strong>If penalty &gt; 0</strong>: Items get negative points but can still appear if other scores are high.
                    </p>
                  </div>

                  <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                    <div className="flex items-center gap-2 font-semibold text-cyan-800 mb-2">
                      <span className="bg-cyan-200 text-cyan-800 text-xs px-2 py-0.5 rounded">0-{feedbackConfig?.explorationBonusWeight ?? 8} pts</span>
                      Exploration Bonus (UCB)
                    </div>
                    <p className="text-sm text-cyan-700">
                      <strong>Upper Confidence Bound algorithm</strong> gives bonus to under-sampled items. Prevents popular items 
                      from dominating while new items never get a chance. Used by Google, Netflix, Spotify.
                    </p>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center gap-2 font-semibold text-orange-800 mb-2">
                      <span className="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded">+{feedbackConfig?.featuredItemWeight ?? 5} pts</span>
                      Featured Items
                    </div>
                    <p className="text-sm text-orange-700">
                      Items marked as "Featured" or "Best Sellers" get a small boost to encourage trying popular items.
                    </p>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center gap-2 font-semibold text-yellow-800 mb-2">
                      <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded">+{feedbackConfig?.timeOfDayWeight ?? 5} pts</span>
                      Time of Day (Configurable)
                    </div>
                    <p className="text-sm text-yellow-700">
                      Configurable time slots and categories. Default: Morning (6-12) boosts hot drinks, Evening (18+) boosts 
                      hot drinks & platters. Configure in Algorithm Config tab.
                    </p>
                  </div>
                </div>

                {/* Statistical Notes */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">📊 Statistical Safeguards</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Minimum Orders Threshold ({feedbackConfig?.minimumOrdersThreshold ?? 10}):</strong> Don't trust historical data until item has enough orders</li>
                    <li>• <strong>Neutral Score:</strong> Items with insufficient data get middle score (not penalized)</li>
                    <li>• <strong>Tiebreaker Shuffle:</strong> Items with equal scores are randomized to prevent Day 0 position bias</li>
                    <li>• <strong>Wilson Score:</strong> Accounts for sample size uncertainty (5/5 orders ≠ 500/500 orders)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Three-Stage Learning */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b">
                <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Three-Stage Learning System
                </h3>
              </div>
              <div className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-4">
                    <div className="bg-amber-200 text-amber-800 font-bold px-3 py-1 rounded text-sm">Stage 1</div>
                    <div>
                      <div className="font-semibold text-amber-900">Cold-Start Phase (0-{feedbackConfig?.minimumOrdersThreshold ?? 10} orders per item)</div>
                      <p className="text-sm text-amber-700 mt-1">
                        Recommendations use <strong>neutral priors + strong exploration</strong>. Historical score = neutral (7.5/15 pts).
                        UCB exploration bonus is at maximum. <strong>Items with equal scores are shuffled randomly</strong> to prevent position bias.
                        <span className="block mt-1 text-amber-600 italic">⚠️ System still shows recommendations, but feedback is NOT used for learning yet.</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-4">
                    <div className="bg-blue-200 text-blue-800 font-bold px-3 py-1 rounded text-sm">Stage 2</div>
                    <div>
                      <div className="font-semibold text-blue-900">Data Collection Phase ({feedbackConfig?.minimumOrdersThreshold ?? 10}+ orders, feedback disabled)</div>
                      <p className="text-sm text-blue-700 mt-1">
                        Historical score uses <strong>order rate only</strong> (Wilson Score). Feedback collection is still disabled - 
                        system observes ordering behavior under <strong>minimal influence</strong> before enabling feedback-driven optimization.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-green-50 rounded-lg p-4">
                    <div className="bg-green-200 text-green-800 font-bold px-3 py-1 rounded text-sm">Stage 3</div>
                    <div>
                      <div className="font-semibold text-green-900">Feedback-Enabled Phase</div>
                      <p className="text-sm text-green-700 mt-1">
                        Full algorithm: Historical = (60% × order rate) + (40% × mood improvement rate). Both use Wilson Score 
                        for statistical confidence. System can now measure if recommendations actually improve moods.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Flow */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <h3 className="font-semibold text-green-900 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Customer Experience Flow
                </h3>
              </div>
              <div className="p-4">
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">😊</div>
                    <div className="font-semibold">1. Select Mood</div>
                    <p className="text-sm text-gray-600">Customer selects how they're feeling</p>
                  </div>
                  <div className="hidden md:flex items-center text-gray-300 text-2xl">→</div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🍕</div>
                    <div className="font-semibold">2. Get Recommendations</div>
                    <p className="text-sm text-gray-600">Algorithm scores &amp; ranks items</p>
                  </div>
                  <div className="hidden md:flex items-center text-gray-300 text-2xl">→</div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">📦</div>
                    <div className="font-semibold">3. Place Order</div>
                    <p className="text-sm text-gray-600">System tracks mood + items ordered</p>
                  </div>
                  <div className="hidden md:flex items-center text-gray-300 text-2xl">→</div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">⭐</div>
                    <div className="font-semibold">4. Rate Experience</div>
                    <p className="text-sm text-gray-600">After threshold: "Did mood improve?"</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Why Cold-Start Phase Matters */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-pink-50 to-rose-50 border-b">
                <h3 className="font-semibold text-pink-900 flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Why Cold-Start Phase Matters
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <strong>⚠️ Important:</strong> This is NOT a "pure baseline" or control group. The system still shows mood-based recommendations 
                  from Day 1. However, it uses <strong>neutral priors + strong exploration</strong> while excluding feedback from learning.
                </div>
                <p className="text-gray-700">
                  The cold-start phase ({feedbackConfig?.baselineThreshold ?? 50} orders before feedback enabled) allows observation of ordering behavior 
                  under <strong>minimal algorithmic influence</strong> before feedback-driven optimization begins:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="font-semibold text-red-800 mb-1">❌ Without Cold-Start Safeguards</div>
                    <p className="text-sm text-red-700">
                      Day 1: System strongly recommends Chamomile Tea → Everyone orders it → Feedback says "mood improved" 
                      → System reinforces Chamomile → <strong>Self-fulfilling prophecy</strong> (rich-get-richer)
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="font-semibold text-green-800 mb-1">✅ With Cold-Start Safeguards</div>
                    <p className="text-sm text-green-700">
                      Neutral historical scores → UCB exploration spreads exposure → Feedback excluded from learning → 
                      <strong>No single item dominates early</strong> → Then enable feedback after sufficient diverse data
                    </p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <strong>Key safeguards:</strong> (1) Neutral historical score (7.5/15), (2) Maximum UCB exploration bonus, 
                  (3) Tiebreaker shuffle for equal scores, (4) Feedback excluded until threshold reached
                </div>
              </div>
            </div>

            {/* Quick Setup Guide */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-b">
                <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Setup Guide
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li><strong>Initialize Settings:</strong> Click "Initialize Settings" button if mood settings are empty.</li>
                  <li><strong>Configure Mood Categories:</strong> In Mood Settings tab, set preferred/excluded categories for each mood.</li>
                  <li><strong>Add Mood Benefits to Products:</strong> In Products page, add scientific explanations in "Mood Benefits" field.</li>
                  <li><strong>Adjust Algorithm Weights:</strong> Fine-tune point values and thresholds in Algorithm Config tab.</li>
                  <li><strong>Monitor Analytics:</strong> Track order rates and customer feedback in the Analytics tab.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Manage Mood Preferences</p>
                <p>Configure which product categories are recommended for each mood. These settings affect the recommendation algorithm's "Preferred Categories" factor (+10 points).</p>
              </div>
            </div>

            {/* Mood Settings List */}
            <div className="grid gap-4">
              {moodSettings.map(mood => (
                <div 
                  key={mood.mood}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                    !mood.isActive ? 'opacity-60' : ''
                  }`}
                  style={{ borderLeftColor: mood.color, borderLeftWidth: '4px' }}
                >
                  {/* Mood Header */}
                  <div 
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleMoodExpanded(mood.mood)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mood.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{mood.label}</h3>
                          {!mood.isActive && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{mood.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {mood.preferredCategories.slice(0, 3).map(catId => (
                          <Badge key={catId} variant="outline" className="text-xs">
                            {categories.find(c => c.id === catId)?.displayName || catId}
                          </Badge>
                        ))}
                        {mood.preferredCategories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{mood.preferredCategories.length - 3}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditMood(mood)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {expandedMoods.has(mood.mood) ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedMoods.has(mood.mood) && (
                    <div className="px-4 py-3 bg-gray-50 border-t">
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-600 mb-2 block">Preferred Categories</Label>
                          <div className="flex flex-wrap gap-1">
                            {mood.preferredCategories.length > 0 ? (
                              mood.preferredCategories.map(catId => (
                                <Badge key={catId} className="bg-green-100 text-green-700 border-green-200">
                                  {categories.find(c => c.id === catId)?.displayName || catId}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400">None set</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-600 mb-2 block">Excluded Categories</Label>
                          <div className="flex flex-wrap gap-1">
                            {mood.excludeCategories.length > 0 ? (
                              mood.excludeCategories.map(catId => (
                                <Badge key={catId} className="bg-red-100 text-red-700 border-red-200">
                                  {categories.find(c => c.id === catId)?.displayName || catId}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400">None</span>
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-gray-600 mb-2 block">Scientific Explanation</Label>
                          <p className="text-gray-700">{mood.scientificExplanation || 'Not set'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-gray-600 mb-2 block">Beneficial Nutrients</Label>
                          <div className="flex flex-wrap gap-1">
                            {mood.beneficialNutrients.length > 0 ? (
                              mood.beneficialNutrients.map((nutrient, i) => (
                                <Badge key={i} variant="outline">{nutrient}</Badge>
                              ))
                            ) : (
                              <span className="text-gray-400">None set</span>
                            )}
                          </div>
                        </div>
                        {mood.supportMessage && (
                          <div className="md:col-span-2">
                            <Label className="text-gray-600 mb-2 block">Support Message</Label>
                            <p className="text-gray-700 italic">"{mood.supportMessage}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <Activity className="h-5 w-5" />
                  <span className="text-sm font-medium">Total Orders</span>
                </div>
                <p className="text-2xl font-bold">
                  {analytics.reduce((sum, a) => sum + a.totalOrdered, 0)}
                </p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Target className="h-5 w-5" />
                  <span className="text-sm font-medium">Avg Order Rate</span>
                </div>
                <p className="text-2xl font-bold">
                  {Math.round(analytics.reduce((sum, a) => sum + a.orderRate, 0) / Math.max(analytics.length, 1))}%
                </p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Heart className="h-5 w-5" />
                  <span className="text-sm font-medium">Feedback Count</span>
                </div>
                <p className="text-2xl font-bold">
                  {analytics.reduce((sum, a) => sum + a.feedbackCount, 0)}
                </p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Zap className="h-5 w-5" />
                  <span className="text-sm font-medium">Data Thresholds Reached</span>
                </div>
                <p className="text-2xl font-bold">
                  {analytics.filter(a => a.baselineReached).length}/{analytics.length}
                </p>
              </div>
            </div>

            {/* Feedback Status Banner */}
            <div className={`rounded-xl border p-4 flex items-center justify-between ${
              feedbackConfig?.feedbackEnabled
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                {feedbackConfig?.feedbackEnabled ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                )}
                <div>
                  <p className={`font-semibold ${feedbackConfig?.feedbackEnabled ? 'text-green-800' : 'text-amber-800'}`}>
                    {feedbackConfig?.feedbackEnabled 
                      ? 'Feedback Tracking Active'
                      : 'Feedback Tracking Inactive'}
                  </p>
                  <p className={`text-sm ${feedbackConfig?.feedbackEnabled ? 'text-green-600' : 'text-amber-600'}`}>
                    {feedbackConfig?.feedbackEnabled 
                      ? 'Customers can provide mood feedback after orders'
                      : `Waiting for data threshold (${feedbackConfig?.baselineThreshold || 50} orders per mood)`}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('config')}
                className={feedbackConfig?.feedbackEnabled ? 'border-green-300' : 'border-amber-300'}
              >
                Configure
              </Button>
            </div>

            {/* Analytics Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-500" />
                  Mood Performance Analytics
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mood</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Progress</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Shown</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ordered</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Order Rate</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Feedback</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Improvement</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analytics.map(stat => {
                      const moodSetting = moodSettings.find(m => m.mood === stat.mood)
                      return (
                        <tr key={stat.mood} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{moodSetting?.emoji}</span>
                              <span className="font-medium">{moodSetting?.label || stat.mood}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center">
                              {stat.baselineReached ? (
                                <Badge className="bg-green-100 text-green-700">Reached</Badge>
                              ) : (
                                <>
                                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-purple-500 rounded-full"
                                      style={{ width: `${stat.baselineProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500 mt-1">{stat.baselineProgress}%</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{stat.totalShown}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{stat.totalOrdered}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={stat.orderRate >= 25 ? 'default' : 'secondary'} 
                                   className={stat.orderRate >= 25 ? 'bg-green-100 text-green-700' : ''}>
                              {stat.orderRate}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-xs">
                              <span className="text-green-600 flex items-center gap-0.5">
                                <TrendingUp className="h-3 w-3" />{stat.moodImproved}
                              </span>
                              <span className="text-gray-400 flex items-center gap-0.5">
                                <Minus className="h-3 w-3" />{stat.moodSame}
                              </span>
                              <span className="text-red-600 flex items-center gap-0.5">
                                <TrendingDown className="h-3 w-3" />{stat.moodWorse}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={stat.improvementRate >= 70 ? 'default' : 'secondary'}
                                   className={stat.improvementRate >= 70 ? 'bg-blue-100 text-blue-700' : ''}>
                              {stat.improvementRate}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${
                              stat.historicalScore >= 50 ? 'text-green-600' : 
                              stat.historicalScore >= 25 ? 'text-amber-600' : 'text-gray-400'
                            }`}>
                              {stat.historicalScore}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => loadItemAnalytics(stat.mood)}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                title="View item analytics"
                              >
                                <Package className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetStats(stat.mood)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Reset stats"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Reset options allow you to clear statistics for testing or recalibration
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openResetModal('mood-stats')}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Reset Mood Stats
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openResetModal('item-stats')}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Reset Item Stats
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openResetModal('all')}
                    className="text-red-500 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Reset All
                  </Button>
                </div>
              </div>
            </div>

            {/* Per-Item Analytics Section - Enhanced with Score Breakdown */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  Menu Item Score Breakdown by Mood
                </h3>
                {selectedMoodForItems && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMoodForItems(null)
                      setItemAnalytics([])
                    }}
                    className="text-gray-500"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              {!selectedMoodForItems ? (
                <div className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Select a mood to view detailed score breakdown per item</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {moodSettings.filter(m => m.isActive).map(mood => (
                      <Button
                        key={mood.mood}
                        variant="outline"
                        size="sm"
                        onClick={() => loadItemAnalytics(mood.mood)}
                        className="flex items-center gap-2"
                      >
                        <span>{mood.emoji}</span>
                        <span>{mood.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : loadingItemAnalytics ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : itemAnalytics.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No item data available for this mood yet</p>
                  <p className="text-xs text-gray-400 mt-1">Items will appear once customers start ordering with this mood selected</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="px-4 py-2 bg-blue-50 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{moodSettings.find(m => m.mood === selectedMoodForItems)?.emoji}</span>
                      <span className="font-medium text-blue-900">
                        {moodSettings.find(m => m.mood === selectedMoodForItems)?.label} - Score Breakdown
                      </span>
                    </div>
                    <div className="text-xs text-blue-700">
                      Total items: {itemAnalytics.length} | 
                      Weights: Benefits={feedbackConfig?.moodBenefitsWeight ?? 20}, 
                      Category={feedbackConfig?.preferredCategoryWeight ?? 10}, 
                      Historical={feedbackConfig?.historicalDataWeight ?? 15}
                    </div>
                  </div>
                  
                  {/* Score Legend */}
                  <div className="px-4 py-2 bg-gray-50 border-b">
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-purple-500"></div>
                        Mood Benefits (0-{feedbackConfig?.moodBenefitsWeight ?? 20})
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-blue-500"></div>
                        Preferred Category (0-{feedbackConfig?.preferredCategoryWeight ?? 10})
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-500"></div>
                        Excluded Category ({(feedbackConfig?.excludedCategoryPenalty ?? 0) === 0 ? 'Filter Out' : `-${feedbackConfig?.excludedCategoryPenalty}`})
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        Historical (0-{feedbackConfig?.historicalDataWeight ?? 15})
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-amber-500"></div>
                        Featured (0-{feedbackConfig?.featuredItemWeight ?? 5})
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-orange-500"></div>
                        Time of Day (0-{feedbackConfig?.timeOfDayWeight ?? 5})
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-cyan-500"></div>
                        Exploration (0-{feedbackConfig?.explorationBonusWeight ?? 8})
                      </span>
                    </div>
                  </div>
                  
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Menu Item</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stage</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          <div className="flex flex-col items-center">
                            <span className="text-purple-600">Benefits</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          <div className="flex flex-col items-center">
                            <span className="text-blue-600">Cat+</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          <div className="flex flex-col items-center">
                            <span className="text-red-600">Cat-</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          <div className="flex flex-col items-center">
                            <span className="text-green-600">Historical</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          <div className="flex flex-col items-center">
                            <span className="text-amber-600">Featured</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          <div className="flex flex-col items-center">
                            <span className="text-orange-600">TimeOD</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          <div className="flex flex-col items-center">
                            <span className="text-cyan-600">Explore</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-gray-100">
                          <div className="flex flex-col items-center font-bold">
                            <span>TOTAL</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          <div className="flex items-center justify-center gap-1">
                            <Eye className="h-3 w-3" />
                            Stats
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        // Calculate total exposures for UCB
                        const totalExposures = itemAnalytics.reduce((sum, item) => sum + (item.timesShown || 0), 0)
                        const selectedMoodConfig = moodSettings.find(m => m.mood === selectedMoodForItems)
                        
                        // Sort items by calculated total score
                        const itemsWithScores = itemAnalytics.map(item => ({
                          ...item,
                          scoreBreakdown: calculateScoreBreakdown(
                            item,
                            selectedMoodForItems || '',
                            selectedMoodConfig,
                            feedbackConfig,
                            totalExposures
                          )
                        })).sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total)
                        
                        return itemsWithScores.map((item, idx) => {
                          const scores = item.scoreBreakdown
                          
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {item.menuItem?.image ? (
                                    <img 
                                      src={item.menuItem.image.startsWith('http') 
                                        ? item.menuItem.image 
                                        : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${item.menuItem.image}`}
                                      alt={item.menuItem?.name}
                                      className="w-10 h-10 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                      <Package className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{item.menuItem?.name || 'Unknown Item'}</p>
                                    <p className="text-xs text-gray-500 capitalize">{item.menuItem?.category?.displayName || item.menuItem?.category?.name || 'No Category'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge 
                                  variant="outline"
                                  className={
                                    scores.stage === 'cold-start' 
                                      ? 'border-gray-300 text-gray-600 bg-gray-50' 
                                      : scores.stage === 'data-collection'
                                        ? 'border-amber-300 text-amber-700 bg-amber-50'
                                        : 'border-green-300 text-green-700 bg-green-50'
                                  }
                                >
                                  {scores.stage === 'cold-start' ? 'Cold-Start' : scores.stage === 'data-collection' ? 'Collecting' : 'Feedback'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-mono text-sm ${scores.moodBenefits > 0 ? 'text-purple-700 font-semibold' : 'text-gray-400'}`}>
                                  {scores.moodBenefits}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-mono text-sm ${scores.preferredCategory > 0 ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
                                  {scores.preferredCategory}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-mono text-sm ${scores.excludedCategory < 0 ? 'text-red-700 font-semibold' : 'text-gray-400'}`}>
                                  {scores.excludedCategory}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex flex-col items-center">
                                  <span className={`font-mono text-sm ${scores.historical > 0 ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
                                    {scores.historical}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    W:{scores.wilsonOrderRate}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-mono text-sm ${scores.featured > 0 ? 'text-amber-700 font-semibold' : 'text-gray-400'}`}>
                                  {scores.featured}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-mono text-sm ${scores.timeOfDay > 0 ? 'text-orange-700 font-semibold' : 'text-gray-400'}`}>
                                  {scores.timeOfDay}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-mono text-sm ${scores.explorationBonus > 0.5 ? 'text-cyan-700 font-semibold' : 'text-gray-400'}`}>
                                  {scores.explorationBonus}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center bg-gray-50">
                                <span className="font-mono text-sm font-bold text-gray-900">
                                  {scores.total}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-center">
                                  <div className="text-gray-600">{item.timesShown} shown</div>
                                  <div className="text-gray-600">{item.timesOrdered} ordered</div>
                                  <Badge 
                                    variant="secondary"
                                    className={`mt-1 ${item.orderRate >= 25 ? 'bg-green-100 text-green-700' : ''}`}
                                  >
                                    {item.orderRate}%
                                  </Badge>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                  
                  {/* Stage Explanation Footer */}
                  <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
                    <div className="flex flex-wrap gap-4">
                      <span><strong>Cold-Start:</strong> &lt;{feedbackConfig?.minimumOrdersThreshold ?? 10} orders, neutral score (7.5) + max exploration</span>
                      <span><strong>Data Collection:</strong> Order rate only (Wilson Score)</span>
                      <span><strong>Feedback-Enabled:</strong> 60% order + 40% improvement rate</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Feedback Settings */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                  <ToggleRight className="h-5 w-5" />
                  Feedback Collection Settings
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <Label className="font-medium">Enable Feedback Collection</Label>
                    <p className="text-sm text-gray-500">Allow customers to rate their mood after orders</p>
                  </div>
                  <ToggleSwitch
                    enabled={editConfig.feedbackEnabled ?? false}
                    onChange={() => {
                      setEditConfig({ ...editConfig, feedbackEnabled: !editConfig.feedbackEnabled })
                      setConfigDirty(true)
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <Label className="font-medium">Auto-Enable at Data Threshold</Label>
                    <p className="text-sm text-gray-500">Automatically enable feedback when data threshold is reached</p>
                  </div>
                  <ToggleSwitch
                    enabled={editConfig.autoEnableFeedback ?? true}
                    onChange={() => {
                      setEditConfig({ ...editConfig, autoEnableFeedback: !editConfig.autoEnableFeedback })
                      setConfigDirty(true)
                    }}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <Label className="font-medium">Show Mood Reflection Modal</Label>
                    <p className="text-sm text-gray-500">Show reflection prompt after order completion</p>
                  </div>
                  <ToggleSwitch
                    enabled={editConfig.showMoodReflection ?? true}
                    onChange={() => {
                      setEditConfig({ ...editConfig, showMoodReflection: !editConfig.showMoodReflection })
                      setConfigDirty(true)
                    }}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <Label className="font-medium">Show Ranking Numbers</Label>
                    <p className="text-sm text-gray-500">Display #1, #2, #3 badges on recommended items</p>
                  </div>
                  <ToggleSwitch
                    enabled={editConfig.showRankingNumbers ?? false}
                    onChange={() => {
                      setEditConfig({ ...editConfig, showRankingNumbers: !editConfig.showRankingNumbers })
                      setConfigDirty(true)
                    }}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4 py-3">
                  <div>
                    <Label className="font-medium mb-2 block">Data Threshold (orders per mood)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={String(editConfig.baselineThreshold ?? 50)}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        const numVal = val === '' ? 0 : Math.min(500, Math.max(0, parseInt(val)))
                        setEditConfig({ ...editConfig, baselineThreshold: numVal })
                        setConfigDirty(true)
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value) || 10
                        setEditConfig({ ...editConfig, baselineThreshold: Math.min(500, Math.max(10, val)) })
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum orders needed before feedback is meaningful (10-500)</p>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Reflection Delay (minutes)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={String(editConfig.reflectionDelayMinutes ?? 15)}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        const numVal = val === '' ? 0 : Math.min(60, Math.max(0, parseInt(val)))
                        setEditConfig({ ...editConfig, reflectionDelayMinutes: numVal })
                        setConfigDirty(true)
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value) || 1
                        setEditConfig({ ...editConfig, reflectionDelayMinutes: Math.min(60, Math.max(1, val)) })
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Wait time before showing mood reflection (1-60 minutes)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Algorithm Weights */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Sliders className="h-5 w-5" />
                  Recommendation Algorithm Weights
                </h3>
                <p className="text-sm text-blue-600 mt-1">Adjust how different factors contribute to recommendation scores</p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium mb-2 flex items-center justify-between">
                      <span>Mood Benefits Match</span>
                      <Badge>{editConfig.moodBenefitsWeight ?? 20} pts</Badge>
                    </Label>
                    <Input
                      type="range"
                      min={0}
                      max={50}
                      value={editConfig.moodBenefitsWeight ?? 20}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, moodBenefitsWeight: parseInt(e.target.value) })
                        setConfigDirty(true)
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Items with mood-specific explanations</p>
                  </div>
                  
                  <div>
                    <Label className="font-medium mb-2 flex items-center justify-between">
                      <span>Preferred Category</span>
                      <Badge>{editConfig.preferredCategoryWeight ?? 10} pts</Badge>
                    </Label>
                    <Input
                      type="range"
                      min={0}
                      max={30}
                      value={editConfig.preferredCategoryWeight ?? 10}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, preferredCategoryWeight: parseInt(e.target.value) })
                        setConfigDirty(true)
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Items in mood's preferred categories</p>
                  </div>
                  
                  <div>
                    <Label className="font-medium mb-2 flex items-center justify-between">
                      <span>Excluded Category Penalty</span>
                      <Badge variant="destructive">{editConfig.excludedCategoryPenalty ?? 0 > 0 ? `-${editConfig.excludedCategoryPenalty}` : 'Filter Out'}</Badge>
                    </Label>
                    <Input
                      type="range"
                      min={0}
                      max={50}
                      value={editConfig.excludedCategoryPenalty ?? 0}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, excludedCategoryPenalty: parseInt(e.target.value) })
                        setConfigDirty(true)
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {(editConfig.excludedCategoryPenalty ?? 0) === 0 
                        ? 'Items in excluded categories are filtered out completely' 
                        : `Items in excluded categories get -${editConfig.excludedCategoryPenalty} pts (still shown)`}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="font-medium mb-2 flex items-center justify-between">
                      <span>Historical Success</span>
                      <Badge>{editConfig.historicalDataWeight ?? 15} pts</Badge>
                    </Label>
                    <Input
                      type="range"
                      min={0}
                      max={30}
                      value={editConfig.historicalDataWeight ?? 15}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, historicalDataWeight: parseInt(e.target.value) })
                        setConfigDirty(true)
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Based on order & feedback history</p>
                  </div>
                  
                  <div>
                    <Label className="font-medium mb-2 flex items-center justify-between">
                      <span>Featured Items</span>
                      <Badge>{editConfig.featuredItemWeight ?? 5} pts</Badge>
                    </Label>
                    <Input
                      type="range"
                      min={0}
                      max={20}
                      value={editConfig.featuredItemWeight ?? 5}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, featuredItemWeight: parseInt(e.target.value) })
                        setConfigDirty(true)
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Boost for featured/best seller items</p>
                  </div>
                  
                  <div>
                    <Label className="font-medium mb-2 flex items-center justify-between">
                      <span>Time of Day</span>
                      <Badge>{editConfig.timeOfDayWeight ?? 5} pts</Badge>
                    </Label>
                    <Input
                      type="range"
                      min={0}
                      max={20}
                      value={editConfig.timeOfDayWeight ?? 5}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, timeOfDayWeight: parseInt(e.target.value) })
                        setConfigDirty(true)
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Morning: hot drinks | Evening: hot drinks & platters</p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <Label className="font-medium mb-2 block">Historical Score Weights</Label>
                  <p className="text-sm text-gray-500 mb-3">How order rate and feedback contribute to historical scoring</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm flex items-center justify-between">
                        <span>Order Rate Weight</span>
                        <Badge variant="outline">{Math.round((editConfig.orderRateWeight ?? 0.6) * 100)}%</Badge>
                      </Label>
                      <Input
                        type="range"
                        min={0}
                        max={100}
                        value={(editConfig.orderRateWeight ?? 0.6) * 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) / 100
                          setEditConfig({ 
                            ...editConfig, 
                            orderRateWeight: val,
                            feedbackRateWeight: 1 - val
                          })
                          setConfigDirty(true)
                        }}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-sm flex items-center justify-between">
                        <span>Feedback Rate Weight</span>
                        <Badge variant="outline">{Math.round((editConfig.feedbackRateWeight ?? 0.4) * 100)}%</Badge>
                      </Label>
                      <Input
                        type="range"
                        min={0}
                        max={100}
                        value={(editConfig.feedbackRateWeight ?? 0.4) * 100}
                        disabled
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Statistical Settings */}
                <div className="border-t pt-4 mt-4">
                  <Label className="font-medium mb-2 block">Statistical &amp; Exploration Settings</Label>
                  <p className="text-sm text-gray-500 mb-3">Configure Wilson Score and UCB exploration parameters</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium mb-2 flex items-center justify-between">
                        <span>Exploration Bonus (UCB)</span>
                        <Badge>{editConfig.explorationBonusWeight ?? 8} pts</Badge>
                      </Label>
                      <Input
                        type="range"
                        min={0}
                        max={15}
                        value={editConfig.explorationBonusWeight ?? 8}
                        onChange={(e) => {
                          setEditConfig({ ...editConfig, explorationBonusWeight: parseInt(e.target.value) })
                          setConfigDirty(true)
                        }}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">Max bonus for under-sampled items (prevents position bias)</p>
                    </div>
                    <div>
                      <Label className="font-medium mb-2 flex items-center justify-between">
                        <span>Minimum Orders Threshold</span>
                        <Badge variant="outline">{editConfig.minimumOrdersThreshold ?? 10} orders</Badge>
                      </Label>
                      <Input
                        type="range"
                        min={1}
                        max={50}
                        value={editConfig.minimumOrdersThreshold ?? 10}
                        onChange={(e) => {
                          setEditConfig({ ...editConfig, minimumOrdersThreshold: parseInt(e.target.value) })
                          setConfigDirty(true)
                        }}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">Don't trust historical data until item has this many orders</p>
                    </div>
                  </div>
                  
                  {/* Day 0 Position Shuffle Toggle */}
                  <div className="mt-4 flex items-center justify-between py-3 border-t">
                    <div>
                      <Label className="font-medium">Day 0 Position Shuffle</Label>
                      <p className="text-sm text-gray-500">Randomize display order of recommended items to prevent left-position bias</p>
                    </div>
                    <ToggleSwitch
                      enabled={editConfig.day0PositionShuffle ?? true}
                      onChange={() => {
                        setEditConfig({ ...editConfig, day0PositionShuffle: !(editConfig.day0PositionShuffle ?? true) })
                        setConfigDirty(true)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Time of Day Configuration */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Time of Day Configuration
                </h3>
                <p className="text-sm text-amber-600 mt-1">Configure which categories get boosted at different times</p>
              </div>
              <div className="p-4 space-y-4">
                {/* Time Slots */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="font-medium mb-2 block">Morning Starts</Label>
                    <Input
                      type="number"
                      min={0}
                      max={11}
                      value={editConfig.morningStartHour ?? 6}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, morningStartHour: parseInt(e.target.value) || 6 })
                        setConfigDirty(true)
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">{(editConfig.morningStartHour ?? 6)}:00 AM</p>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Morning Ends (Afternoon Starts)</Label>
                    <Input
                      type="number"
                      min={8}
                      max={15}
                      value={editConfig.morningEndHour ?? 12}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, morningEndHour: parseInt(e.target.value) || 12 })
                        setConfigDirty(true)
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">{(editConfig.morningEndHour ?? 12)}:00 {(editConfig.morningEndHour ?? 12) >= 12 ? 'PM' : 'AM'}</p>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Afternoon Ends (Evening Starts)</Label>
                    <Input
                      type="number"
                      min={14}
                      max={22}
                      value={editConfig.afternoonEndHour ?? 18}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, afternoonEndHour: parseInt(e.target.value) || 18 })
                        setConfigDirty(true)
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">{(editConfig.afternoonEndHour ?? 18) > 12 ? (editConfig.afternoonEndHour ?? 18) - 12 : (editConfig.afternoonEndHour ?? 18)}:00 PM</p>
                  </div>
                </div>

                {/* Category Boosts */}
                <div className="border-t pt-4 mt-4">
                  <Label className="font-medium mb-3 block">Categories Boosted by Time Period</Label>
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Morning Categories */}
                    <div className="bg-amber-50 rounded-lg p-3">
                      <Label className="text-sm font-medium text-amber-900 mb-2 block">🌅 Morning Categories</Label>
                      <div className="space-y-2">
                        {categories.map(cat => {
                          const morningCats = editConfig.morningCategories || []
                          const isSelected = morningCats.includes(cat.id)
                          return (
                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const newCats = isSelected
                                    ? morningCats.filter((c: string) => c !== cat.id)
                                    : [...morningCats, cat.id]
                                  setEditConfig({ ...editConfig, morningCategories: newCats })
                                  setConfigDirty(true)
                                }}
                                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span className="text-sm text-gray-700">{cat.displayName}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* Afternoon Categories */}
                    <div className="bg-blue-50 rounded-lg p-3">
                      <Label className="text-sm font-medium text-blue-900 mb-2 block">☀️ Afternoon Categories</Label>
                      <div className="space-y-2">
                        {categories.map(cat => {
                          const afternoonCats = editConfig.afternoonCategories || []
                          const isSelected = afternoonCats.includes(cat.id)
                          return (
                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const newCats = isSelected
                                    ? afternoonCats.filter((c: string) => c !== cat.id)
                                    : [...afternoonCats, cat.id]
                                  setEditConfig({ ...editConfig, afternoonCategories: newCats })
                                  setConfigDirty(true)
                                }}
                                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{cat.displayName}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* Evening Categories */}
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <Label className="text-sm font-medium text-indigo-900 mb-2 block">🌙 Evening Categories</Label>
                      <div className="space-y-2">
                        {categories.map(cat => {
                          const eveningCats = editConfig.eveningCategories || []
                          const isSelected = eveningCats.includes(cat.id)
                          return (
                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const newCats = isSelected
                                    ? eveningCats.filter((c: string) => c !== cat.id)
                                    : [...eveningCats, cat.id]
                                  setEditConfig({ ...editConfig, eveningCategories: newCats })
                                  setConfigDirty(true)
                                }}
                                className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700">{cat.displayName}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            {configDirty && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Configuration
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Edit Mood Modal */}
        {editingMood && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-4 py-3 border-b flex items-center justify-between sticky top-0 bg-white">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">{editForm.emoji}</span>
                  Edit {editForm.label} Mood Settings
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingMood(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Basic Info */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-2 block">Emoji</Label>
                    <Input
                      value={editForm.emoji || ''}
                      onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Label</Label>
                    <Input
                      value={editForm.label || ''}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editForm.color || '#000000'}
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={editForm.color || ''}
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        placeholder="#F9C900"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Description</Label>
                  <Input
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Support Message (optional)</Label>
                  <Input
                    value={editForm.supportMessage || ''}
                    onChange={(e) => setEditForm({ ...editForm, supportMessage: e.target.value })}
                    placeholder="A supportive message for customers feeling this way"
                  />
                </div>

                {/* Preferred Categories */}
                <div>
                  <Label className="mb-2 block text-green-700">Preferred Categories (Recommended)</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory('preferredCategories', cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          editForm.preferredCategories?.includes(cat.id)
                            ? 'bg-green-100 text-green-700 border-2 border-green-400'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                        }`}
                      >
                        {cat.displayName}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Label className="text-sm text-gray-600">Points for Preferred Category Match</Label>
                    <Input
                      type="number"
                      value={editForm.preferredCategoryPoints ?? 10}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        setEditForm({ ...editForm, preferredCategoryPoints: isNaN(value) ? 10 : Math.max(0, value) })
                      }}
                      min={0}
                      max={50}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Points awarded when menu item is in a preferred category (0-50)</p>
                  </div>
                </div>

                {/* Excluded Categories */}
                <div>
                  <Label className="mb-2 block text-red-700">Excluded Categories (Not Recommended)</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory('excludeCategories', cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          editForm.excludeCategories?.includes(cat.id)
                            ? 'bg-red-100 text-red-700 border-2 border-red-400'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                        }`}
                      >
                        {cat.displayName}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Scientific Explanation</Label>
                  <textarea
                    value={editForm.scientificExplanation || ''}
                    onChange={(e) => setEditForm({ ...editForm, scientificExplanation: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Explain the science behind food recommendations for this mood..."
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Beneficial Nutrients (comma-separated)</Label>
                  <Input
                    value={editForm.beneficialNutrients?.join(', ') || ''}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      beneficialNutrients: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Omega-3, Vitamin B12, Magnesium..."
                  />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <ToggleSwitch
                    enabled={editForm.isActive ?? true}
                    onChange={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                  />
                  <Label>Active (show this mood to customers)</Label>
                </div>
              </div>

              <div className="px-4 py-3 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
                <Button variant="outline" onClick={() => setEditingMood(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveMood}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Statistics Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold text-gray-900">Reset Statistics</h3>
                </div>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Warning:</strong> This action cannot be undone. All selected statistics will be permanently reset to zero.
                  </p>
                </div>

                {/* Reset Scope Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">What to reset:</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="resetType"
                        value="all"
                        checked={resetType === 'all'}
                        onChange={() => setResetType('all')}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">All Statistics</p>
                        <p className="text-xs text-gray-500">Reset both mood stats and per-item stats</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="resetType"
                        value="mood-stats"
                        checked={resetType === 'mood-stats'}
                        onChange={() => setResetType('mood-stats')}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Mood Order Stats Only</p>
                        <p className="text-xs text-gray-500">Reset total shown, ordered, feedback counts per mood</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="resetType"
                        value="item-stats"
                        checked={resetType === 'item-stats'}
                        onChange={() => setResetType('item-stats')}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Menu Item Stats Only</p>
                        <p className="text-xs text-gray-500">Reset per-item tracking data for each mood</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Mood Selection (if resetting specific mood) */}
                {resetMood ? (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">
                      Resetting stats for: <strong>{moodSettings.find(m => m.mood === resetMood)?.emoji} {moodSettings.find(m => m.mood === resetMood)?.label || resetMood}</strong>
                    </p>
                    <button
                      onClick={() => setResetMood(null)}
                      className="text-sm text-purple-600 hover:text-purple-800 mt-1"
                    >
                      Reset all moods instead
                    </button>
                  </div>
                ) : (
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-sm text-red-700 font-medium">
                      ⚠️ This will reset statistics for ALL moods
                    </p>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isResetting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Reset Statistics
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
