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
  ToggleLeft,
  ToggleRight,
  X,
  Pencil
} from 'lucide-react'
import { moodSettingsApi } from '../../../infrastructure/api/moodSettings.api'
import type { MoodSetting, MoodFeedbackConfig, MoodAnalytics, UpdateMoodSettingDTO } from '../../../infrastructure/api/moodSettings.api'

const CATEGORIES = [
  { value: 'PIZZA', label: 'Pizza' },
  { value: 'APPETIZER', label: 'Appetizer' },
  { value: 'HOT_DRINKS', label: 'Hot Drinks' },
  { value: 'COLD_DRINKS', label: 'Cold Drinks' },
  { value: 'SMOOTHIE', label: 'Smoothie' },
  { value: 'PLATTER', label: 'Platter' },
  { value: 'SAVERS', label: 'Savers' },
  { value: 'VALUE_MEAL', label: 'Value Meal' }
]

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
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics' | 'config'>('settings')
  
  // Data
  const [moodSettings, setMoodSettings] = useState<MoodSetting[]>([])
  const [feedbackConfig, setFeedbackConfig] = useState<MoodFeedbackConfig | null>(null)
  const [analytics, setAnalytics] = useState<MoodAnalytics[]>([])
  
  // Edit state
  const [editingMood, setEditingMood] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<UpdateMoodSettingDTO>({})
  const [expandedMoods, setExpandedMoods] = useState<Set<string>>(new Set())
  
  // Feedback config edit
  const [configDirty, setConfigDirty] = useState(false)
  const [editConfig, setEditConfig] = useState<Partial<MoodFeedbackConfig>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [settings, config, stats] = await Promise.all([
        moodSettingsApi.getAllMoodSettings(),
        moodSettingsApi.getFeedbackConfig(),
        moodSettingsApi.getMoodAnalytics()
      ])
      
      setMoodSettings(settings)
      setFeedbackConfig(config)
      setEditConfig(config)
      setAnalytics(stats)
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
        setEditConfig(config)
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

  const handleResetStats = async (mood?: string) => {
    if (!confirm(mood ? `Reset stats for ${mood}?` : 'Reset ALL mood stats? This cannot be undone.')) {
      return
    }
    
    try {
      await moodSettingsApi.resetMoodStats(mood)
      await loadData()
    } catch (error) {
      console.error('Error resetting stats:', error)
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
          
          <Button
            onClick={loadData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
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
                        {mood.preferredCategories.slice(0, 3).map(cat => (
                          <Badge key={cat} variant="outline" className="text-xs">
                            {CATEGORIES.find(c => c.value === cat)?.label || cat}
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
                              mood.preferredCategories.map(cat => (
                                <Badge key={cat} className="bg-green-100 text-green-700 border-green-200">
                                  {CATEGORIES.find(c => c.value === cat)?.label || cat}
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
                              mood.excludeCategories.map(cat => (
                                <Badge key={cat} className="bg-red-100 text-red-700 border-red-200">
                                  {CATEGORIES.find(c => c.value === cat)?.label || cat}
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
                  <span className="text-sm font-medium">Baselines Reached</span>
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
                      : `Waiting for baseline (${feedbackConfig?.baselineThreshold || 50} orders per mood)`}
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
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Baseline</th>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetStats(stat.mood)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetStats()}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Reset All Stats
                </Button>
              </div>
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
                    <Label className="font-medium">Auto-Enable at Baseline</Label>
                    <p className="text-sm text-gray-500">Automatically enable feedback when baseline is reached</p>
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

                <div className="grid md:grid-cols-2 gap-4 py-3">
                  <div>
                    <Label className="font-medium mb-2 block">Baseline Threshold (orders per mood)</Label>
                    <Input
                      type="number"
                      value={editConfig.baselineThreshold ?? 50}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, baselineThreshold: parseInt(e.target.value) || 50 })
                        setConfigDirty(true)
                      }}
                      min={10}
                      max={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum orders needed before feedback is meaningful</p>
                  </div>
                  <div>
                    <Label className="font-medium mb-2 block">Reflection Delay (minutes)</Label>
                    <Input
                      type="number"
                      value={editConfig.reflectionDelayMinutes ?? 15}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, reflectionDelayMinutes: parseInt(e.target.value) || 15 })
                        setConfigDirty(true)
                      }}
                      min={5}
                      max={60}
                    />
                    <p className="text-xs text-gray-500 mt-1">Wait time before showing mood reflection</p>
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
                      <span>Price Range Match</span>
                      <Badge>{editConfig.priceRangeWeight ?? 5} pts</Badge>
                    </Label>
                    <Input
                      type="range"
                      min={0}
                      max={20}
                      value={editConfig.priceRangeWeight ?? 5}
                      onChange={(e) => {
                        setEditConfig({ ...editConfig, priceRangeWeight: parseInt(e.target.value) })
                        setConfigDirty(true)
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Items matching typical price range</p>
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
                    <p className="text-xs text-gray-500 mt-1">Morning coffee, afternoon snacks, etc.</p>
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
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => toggleCategory('preferredCategories', cat.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          editForm.preferredCategories?.includes(cat.value)
                            ? 'bg-green-100 text-green-700 border-2 border-green-400'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Excluded Categories */}
                <div>
                  <Label className="mb-2 block text-red-700">Excluded Categories (Not Recommended)</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => toggleCategory('excludeCategories', cat.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          editForm.excludeCategories?.includes(cat.value)
                            ? 'bg-red-100 text-red-700 border-2 border-red-400'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                        }`}
                      >
                        {cat.label}
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
      </div>
    </AdminLayout>
  )
}
