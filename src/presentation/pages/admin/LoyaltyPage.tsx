import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { 
  Coffee, 
  Award, 
  Star, 
  Search, 
  Gift, 
  Clock, 
  Phone,
  Mail,
  User,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  Plus,
  Trash2,
  Save,
  CreditCard,
  Link
} from 'lucide-react'
import { loyaltyApi, type CustomerLoyaltyDTO, type LoyaltyTransactionDTO, STAMPS_FOR_REWARD, type IssueCardDTO } from '../../../infrastructure/api/loyalty.api'
import { toast } from '../../components/common/ToastNotification'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/common/ui/dialog'
import { Label } from '../../components/common/ui/label'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import { categoriesApi, type CategoryDTO } from '../../../infrastructure/api/categories.api'

interface MenuItem {
  id: string
  name: string
  price: number
  itemType: string
  categoryId?: string
  available?: boolean
}

type TabType = 'customers' | 'settings'

export const LoyaltyPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('customers')
  const [customers, setCustomers] = useState<CustomerLoyaltyDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Record<string, LoyaltyTransactionDTO[]>>({})
  const [loadingTransactions, setLoadingTransactions] = useState<string | null>(null)
  
  // Redeem modal state
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLoyaltyDTO | null>(null)
  const [drinkItems, setDrinkItems] = useState<MenuItem[]>([])
  const [selectedDrink, setSelectedDrink] = useState<string>('')
  const [redeeming, setRedeeming] = useState(false)
  
  // Settings state
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  const [redeemableDrinks, setRedeemableDrinks] = useState<string[]>([])
  const [redeemableCategories, setRedeemableCategories] = useState<string[]>([])
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSearch, setSettingsSearch] = useState('')
  
  // Issue Card modal state
  const [showIssueCardModal, setShowIssueCardModal] = useState(false)
  const [cardCode, setCardCode] = useState('')
  const [cardCustomerName, setCardCustomerName] = useState('')
  const [cardCustomerPhone, setCardCustomerPhone] = useState('')
  const [issuingCard, setIssuingCard] = useState(false)
  
  // Link Card modal state
  const [showLinkCardModal, setShowLinkCardModal] = useState(false)
  const [linkCardCode, setLinkCardCode] = useState('')
  const [linkingCard, setLinkingCard] = useState(false)
  const [customerToLink, setCustomerToLink] = useState<CustomerLoyaltyDTO | null>(null)

  // Fetch all loyalty customers
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const result = await loyaltyApi.getAll()
      setCustomers(result.customers)
    } catch (error: any) {
      toast.error('Failed to load customers', error.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch drink items for redemption (from redeemable list or all drinks if none configured)
  const fetchDrinkItems = async () => {
    try {
      const response = await menuItemsApi.getAll()
      const allDrinks = (response.data || []).filter((item: any) => item.itemType === 'DRINK' && item.available)
      
      // Load saved redeemable drinks and categories from localStorage
      const savedRedeemable = localStorage.getItem('loyalty_redeemable_drinks')
      const savedCategories = localStorage.getItem('loyalty_redeemable_categories')
      
      let redeemableItemIds: string[] = []
      let redeemableCatIds: string[] = []
      
      if (savedRedeemable) {
        redeemableItemIds = JSON.parse(savedRedeemable) as string[]
        setRedeemableDrinks(redeemableItemIds)
      }
      
      if (savedCategories) {
        redeemableCatIds = JSON.parse(savedCategories) as string[]
        setRedeemableCategories(redeemableCatIds)
      }
      
      // Filter drinks based on selected items AND categories
      if (redeemableItemIds.length > 0 || redeemableCatIds.length > 0) {
        const redeemable = allDrinks.filter((d: MenuItem) => 
          redeemableItemIds.includes(d.id) || 
          (d.categoryId && redeemableCatIds.includes(d.categoryId))
        )
        setDrinkItems(redeemable.length > 0 ? redeemable : allDrinks)
      } else {
        setDrinkItems(allDrinks)
      }
    } catch (error) {
      console.error('Failed to fetch drink items:', error)
    }
  }
  
  // Fetch all menu items and categories for settings
  const fetchAllMenuItems = async () => {
    try {
      const [menuResponse, categoriesResponse] = await Promise.all([
        menuItemsApi.getAll(),
        categoriesApi.getAll()
      ])
      const drinks = (menuResponse.data || []).filter((item: any) => item.itemType === 'DRINK')
      setAllMenuItems(drinks)
      setCategories(categoriesResponse.data || [])
    } catch (error) {
      console.error('Failed to fetch all menu items:', error)
    }
  }

  useEffect(() => {
    fetchCustomers()
    fetchDrinkItems()
    fetchAllMenuItems()
  }, [])

  // Fetch transaction history for a customer
  const fetchTransactions = async (loyaltyId: string) => {
    if (transactions[loyaltyId]) return // Already loaded
    
    setLoadingTransactions(loyaltyId)
    try {
      const result = await loyaltyApi.getTransactions(loyaltyId, 20)
      setTransactions(prev => ({ ...prev, [loyaltyId]: result.transactions }))
    } catch (error: any) {
      toast.error('Failed to load history', error.message)
    } finally {
      setLoadingTransactions(null)
    }
  }

  const toggleExpand = (customerId: string) => {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null)
    } else {
      setExpandedCustomer(customerId)
      fetchTransactions(customerId)
    }
  }

  // Open redeem modal
  const handleRedeemClick = (customer: CustomerLoyaltyDTO) => {
    setSelectedCustomer(customer)
    setSelectedDrink('')
    setShowRedeemModal(true)
  }

  // Process redemption
  const handleRedeem = async () => {
    if (!selectedCustomer || !selectedDrink) return
    
    const drink = drinkItems.find(d => d.id === selectedDrink)
    if (!drink) return

    setRedeeming(true)
    try {
      await loyaltyApi.redeemReward({
        loyaltyId: selectedCustomer.id,
        rewardItemId: drink.id,
        rewardItemName: drink.name,
        processedBy: 'Admin',
        notes: `Redeemed for: ${drink.name}`
      })
      
      toast.success('Reward Redeemed!', `${selectedCustomer.customerName || 'Customer'} received a free ${drink.name}`)
      setShowRedeemModal(false)
      
      // Refresh customer data
      fetchCustomers()
      // Clear cached transactions for this customer
      setTransactions(prev => {
        const { [selectedCustomer.id]: _, ...rest } = prev
        return rest
      })
    } catch (error: any) {
      toast.error('Redemption failed', error.response?.data?.error || error.message)
    } finally {
      setRedeeming(false)
    }
  }

  // Issue new physical loyalty card
  const handleIssueCard = async () => {
    if (!cardCode) return
    
    // Validate card code format
    if (!/^[A-Za-z0-9-]{4,20}$/.test(cardCode)) {
      toast.error('Invalid Card Code', 'Card code must be 4-20 alphanumeric characters (dashes allowed)')
      return
    }
    
    setIssuingCard(true)
    try {
      const data: IssueCardDTO = {
        cardCode: cardCode.toUpperCase(),
        customerName: cardCustomerName || undefined,
        customerPhone: cardCustomerPhone || undefined
      }
      
      const result = await loyaltyApi.issueCard(data)
      
      toast.success('Card Issued!', result.message)
      setShowIssueCardModal(false)
      setCardCode('')
      setCardCustomerName('')
      setCardCustomerPhone('')
      
      // Refresh customer data
      fetchCustomers()
    } catch (error: any) {
      toast.error('Failed to issue card', error.response?.data?.error || error.message)
    } finally {
      setIssuingCard(false)
    }
  }

  // Link physical card to existing customer
  const handleLinkCard = async () => {
    if (!linkCardCode || !customerToLink) return
    
    // Validate card code format
    if (!/^[A-Za-z0-9-]{4,20}$/.test(linkCardCode)) {
      toast.error('Invalid Card Code', 'Card code must be 4-20 alphanumeric characters (dashes allowed)')
      return
    }
    
    setLinkingCard(true)
    try {
      const result = await loyaltyApi.linkCard({
        cardCode: linkCardCode.toUpperCase(),
        loyaltyId: customerToLink.id
      })
      
      toast.success('Card Linked!', result.message)
      setShowLinkCardModal(false)
      setLinkCardCode('')
      setCustomerToLink(null)
      
      // Refresh customer data
      fetchCustomers()
    } catch (error: any) {
      toast.error('Failed to link card', error.response?.data?.error || error.message)
    } finally {
      setLinkingCard(false)
    }
  }

  // Open link card modal
  const handleLinkCardClick = (customer: CustomerLoyaltyDTO) => {
    setCustomerToLink(customer)
    setLinkCardCode('')
    setShowLinkCardModal(true)
  }

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      c.customerName?.toLowerCase().includes(query) ||
      c.customerPhone?.includes(query) ||
      c.customerEmail?.toLowerCase().includes(query)
    )
  })

  // Sort: customers with available rewards first, then by stamps
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (a.availableRewards > 0 && b.availableRewards === 0) return -1
    if (a.availableRewards === 0 && b.availableRewards > 0) return 1
    return b.currentStamps - a.currentStamps
  })

  const customersWithRewards = customers.filter(c => c.availableRewards > 0).length
  const totalStampsIssued = customers.reduce((sum, c) => sum + c.totalStamps, 0)
  const totalRewardsRedeemed = customers.reduce((sum, c) => sum + c.rewardsRedeemed, 0)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Coffee className="h-7 w-7 text-amber-600" />
              Loyalty Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage customer stamps and rewards
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowIssueCardModal(true)} 
              className="gap-2"
              style={{ backgroundColor: '#F9C900', color: '#000' }}
            >
              <CreditCard className="h-4 w-4" />
              Issue Card
            </Button>
            <Button onClick={fetchCustomers} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 font-medium text-sm transition-colors relative ${
              activeTab === 'customers' 
                ? 'text-amber-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Customers
              {customersWithRewards > 0 && (
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  {customersWithRewards}
                </span>
              )}
            </div>
            {activeTab === 'customers' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium text-sm transition-colors relative ${
              activeTab === 'settings' 
                ? 'text-amber-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Reward Settings
            </div>
            {activeTab === 'settings' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            )}
          </button>
        </div>

        {activeTab === 'customers' && (
          <>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <User className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                <p className="text-xs text-gray-500">Total Customers</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Gift className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{customersWithRewards}</p>
                <p className="text-xs text-gray-500">Ready to Claim</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalStampsIssued}</p>
                <p className="text-xs text-gray-500">Total Stamps</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalRewardsRedeemed}</p>
                <p className="text-xs text-gray-500">Rewards Redeemed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : sortedCustomers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Coffee className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No loyalty customers found</p>
            <p className="text-sm mt-1">Customers will appear here when they place orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCustomers.map(customer => (
              <div 
                key={customer.id} 
                className={`bg-white rounded-xl border ${
                  customer.availableRewards > 0 
                    ? 'border-green-300 shadow-green-100' 
                    : 'border-gray-200'
                } shadow-sm overflow-hidden`}
              >
                {/* Customer Header */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(customer.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      customer.availableRewards > 0 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-amber-100 text-amber-600'
                    }`}>
                      {customer.availableRewards > 0 ? (
                        <Gift className="h-6 w-6" />
                      ) : (
                        <User className="h-6 w-6" />
                      )}
                    </div>
                    
                    {/* Customer Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {customer.customerName || 'Guest Customer'}
                        </h3>
                        {customer.availableRewards > 0 && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full animate-pulse">
                            {customer.availableRewards} FREE DRINK{customer.availableRewards > 1 ? 'S' : ''}!
                          </span>
                        )}
                        {customer.cardCode && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {customer.cardCode}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                        {customer.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.customerPhone}
                          </span>
                        )}
                        {customer.customerEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.customerEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Stamp Progress */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: STAMPS_FOR_REWARD }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            i < customer.currentStamps
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-100 text-gray-300'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${i < customer.currentStamps ? 'fill-current' : ''}`} />
                        </div>
                      ))}
                    </div>
                    
                    {/* Stats */}
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">{customer.totalStamps} stamps</p>
                      <p className="text-xs text-gray-500">{customer.rewardsRedeemed} redeemed</p>
                    </div>
                    
                    {/* Redeem Button */}
                    {customer.availableRewards > 0 && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRedeemClick(customer)
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white gap-1"
                      >
                        <Gift className="h-4 w-4" />
                        Redeem
                      </Button>
                    )}
                    
                    {/* Link Card Button (only show if no card) */}
                    {!customer.cardCode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLinkCardClick(customer)
                        }}
                        className="gap-1"
                      >
                        <Link className="h-4 w-4" />
                        Link Card
                      </Button>
                    )}
                    
                    {/* Expand Toggle */}
                    {expandedCustomer === customer.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {/* Expanded Transaction History */}
                {expandedCustomer === customer.id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recent Activity
                    </h4>
                    
                    {loadingTransactions === customer.id ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : transactions[customer.id]?.length ? (
                      <div className="space-y-2">
                        {transactions[customer.id].map(tx => (
                          <div 
                            key={tx.id} 
                            className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100"
                          >
                            <div className="flex items-center gap-3">
                              {tx.type === 'STAMP_EARNED' && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                              {tx.type === 'REWARD_REDEEMED' && (
                                <Gift className="h-5 w-5 text-purple-500" />
                              )}
                              {tx.type === 'REWARD_UNLOCKED' && (
                                <Award className="h-5 w-5 text-amber-500" />
                              )}
                              {tx.type === 'STAMP_REVERSED' && (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              )}
                              {tx.type === 'CARD_ISSUED' && (
                                <CreditCard className="h-5 w-5 text-blue-500" />
                              )}
                              {tx.type === 'CARD_LINKED' && (
                                <Link className="h-5 w-5 text-blue-500" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {tx.type === 'STAMP_EARNED' && 'Stamp Earned'}
                                  {tx.type === 'REWARD_REDEEMED' && `Reward Redeemed: ${tx.rewardItemName}`}
                                  {tx.type === 'REWARD_UNLOCKED' && 'Free Drink Unlocked! 🎉'}
                                  {tx.type === 'STAMP_REVERSED' && 'Stamp Reversed'}
                                  {tx.type === 'CARD_ISSUED' && 'Physical Card Issued'}
                                  {tx.type === 'CARD_LINKED' && 'Physical Card Linked'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {tx.orderNumber && `Order ${tx.orderNumber} • `}
                                  {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-medium ${
                                tx.stampsChange > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {tx.stampsChange > 0 ? '+' : ''}{tx.stampsChange} stamps
                              </span>
                              <p className="text-xs text-gray-400">
                                {tx.stampsBefore} → {tx.stampsAfter}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Redeemable Drinks Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-amber-600" />
                  Redeemable Drinks
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Choose which drinks customers can redeem with their loyalty stamps. If none selected, all drinks are redeemable.
                </p>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Current Loyalty Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Star className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">Current Configuration</p>
                      <p className="text-sm text-blue-700">
                        <strong>{STAMPS_FOR_REWARD} stamps</strong> = 1 free drink reward
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selected Drinks */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Selected Redeemable Drinks ({redeemableDrinks.length > 0 ? redeemableDrinks.length : 'All drinks'})
                  </Label>
                  
                  {redeemableDrinks.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {redeemableDrinks.map(drinkId => {
                        const drink = allMenuItems.find(d => d.id === drinkId)
                        if (!drink) return null
                        return (
                          <span 
                            key={drinkId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm"
                          >
                            <Coffee className="h-3.5 w-3.5" />
                            {drink.name}
                            <button
                              onClick={() => setRedeemableDrinks(prev => prev.filter(id => id !== drinkId))}
                              className="ml-1 p-0.5 hover:bg-amber-200 rounded-full transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  ) : redeemableCategories.length === 0 ? (
                    <p className="text-sm text-gray-500 mb-4 italic">
                      No specific drinks or categories selected - customers can redeem any drink
                    </p>
                  ) : null}
                  
                  {/* Selected Categories */}
                  {redeemableCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {redeemableCategories.map(catId => {
                        const category = categories.find(c => c.id === catId)
                        if (!category) return null
                        return (
                          <span 
                            key={catId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            <Star className="h-3.5 w-3.5" />
                            {category.displayName} (Category)
                            <button
                              onClick={() => setRedeemableCategories(prev => prev.filter(id => id !== catId))}
                              className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Redeemable Categories Selection */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Select Drink Categories (all drinks in selected categories will be redeemable)
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {categories
                      .filter(cat => {
                        // Only show categories that have DRINK items
                        const drinksInCat = allMenuItems.filter(item => item.categoryId === cat.id)
                        return drinksInCat.length > 0
                      })
                      .map(category => {
                        const isSelected = redeemableCategories.includes(category.id)
                        const drinksCount = allMenuItems.filter(item => item.categoryId === category.id).length
                        return (
                          <button
                            key={category.id}
                            onClick={() => {
                              if (isSelected) {
                                setRedeemableCategories(prev => prev.filter(id => id !== category.id))
                              } else {
                                setRedeemableCategories(prev => [...prev, category.id])
                              }
                            }}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-300 text-blue-800' 
                                : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                              }`}>
                                {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                              </div>
                              <span className="font-medium">{category.displayName}</span>
                            </div>
                            <span className="text-xs text-gray-500">{drinksCount} drinks</span>
                          </button>
                        )
                      })}
                  </div>
                </div>

                {/* Add Individual Drinks */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Add Individual Drinks to Redeemable List
                  </Label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search drinks..."
                      value={settingsSearch}
                      onChange={(e) => setSettingsSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {allMenuItems
                      .filter(drink => 
                        !redeemableDrinks.includes(drink.id) &&
                        drink.name.toLowerCase().includes(settingsSearch.toLowerCase())
                      )
                      .map(drink => (
                        <button
                          key={drink.id}
                          onClick={() => setRedeemableDrinks(prev => [...prev, drink.id])}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Coffee className="h-4 w-4 text-amber-500" />
                            <div>
                              <p className="font-medium text-gray-900">{drink.name}</p>
                              <p className="text-xs text-gray-500">₱{drink.price}</p>
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-green-500" />
                        </button>
                      ))}
                    {allMenuItems.filter(drink => 
                      !redeemableDrinks.includes(drink.id) &&
                      drink.name.toLowerCase().includes(settingsSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {settingsSearch ? 'No drinks found' : 'All drinks already added'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRedeemableDrinks([])
                      setRedeemableCategories([])
                      localStorage.removeItem('loyalty_redeemable_drinks')
                      localStorage.removeItem('loyalty_redeemable_categories')
                      fetchDrinkItems()
                      toast.success('Reset', 'All drinks are now redeemable')
                    }}
                  >
                    Reset to All Drinks
                  </Button>
                  <Button
                    onClick={() => {
                      setSavingSettings(true)
                      localStorage.setItem('loyalty_redeemable_drinks', JSON.stringify(redeemableDrinks))
                      localStorage.setItem('loyalty_redeemable_categories', JSON.stringify(redeemableCategories))
                      fetchDrinkItems()
                      setTimeout(() => {
                        setSavingSettings(false)
                        const drinksCount = redeemableDrinks.length
                        const catsCount = redeemableCategories.length
                        if (drinksCount > 0 || catsCount > 0) {
                          const parts = []
                          if (drinksCount > 0) parts.push(`${drinksCount} drinks`)
                          if (catsCount > 0) parts.push(`${catsCount} categories`)
                          toast.success('Settings Saved', `${parts.join(' and ')} available for redemption`)
                        } else {
                          toast.success('Settings Saved', 'All drinks available for redemption')
                        }
                      }, 500)
                    }}
                    disabled={savingSettings}
                    className="gap-2"
                    style={{ backgroundColor: '#F9C900', color: '#000' }}
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                How the Loyalty System Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">1</div>
                    <h4 className="font-medium text-gray-900">Earn Stamps</h4>
                  </div>
                  <p className="text-sm text-gray-600">Customers earn 1 stamp for every drink order they place.</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">2</div>
                    <h4 className="font-medium text-gray-900">Reach {STAMPS_FOR_REWARD} Stamps</h4>
                  </div>
                  <p className="text-sm text-gray-600">After collecting {STAMPS_FOR_REWARD} stamps, they unlock a free drink reward!</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">3</div>
                    <h4 className="font-medium text-gray-900">Redeem Reward</h4>
                  </div>
                  <p className="text-sm text-gray-600">Cashier processes the free drink from the redeemable options you've configured.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Redeem Modal */}
      <Dialog open={showRedeemModal} onOpenChange={setShowRedeemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-500" />
              Redeem Free Drink
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedCustomer && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-medium text-green-800">
                  {selectedCustomer.customerName || 'Guest Customer'}
                </p>
                <p className="text-sm text-green-600">
                  Has {selectedCustomer.availableRewards} free drink{selectedCustomer.availableRewards > 1 ? 's' : ''} to redeem
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Select Drink to Redeem</Label>
              <select
                value={selectedDrink}
                onChange={(e) => setSelectedDrink(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose a drink...</option>
                {drinkItems.map(drink => (
                  <option key={drink.id} value={drink.id}>
                    {drink.name} (₱{drink.price})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                The customer can redeem any drink on the menu
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedeemModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRedeem}
              disabled={!selectedDrink || redeeming}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {redeeming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Confirm Redemption
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Card Modal */}
      <Dialog open={showIssueCardModal} onOpenChange={setShowIssueCardModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
              Issue New Loyalty Card
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Issuing a card does NOT award a stamp. 
                Stamps are only earned when an order is paid.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cardCode">Card Code *</Label>
              <Input
                id="cardCode"
                placeholder="e.g., BEEHIVE-001"
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <p className="text-xs text-gray-500">
                Enter the code printed on the physical card (4-20 characters)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cardCustomerName">Customer Name (Optional)</Label>
              <Input
                id="cardCustomerName"
                placeholder="e.g., Juan Dela Cruz"
                value={cardCustomerName}
                onChange={(e) => setCardCustomerName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cardCustomerPhone">Phone Number (Optional)</Label>
              <Input
                id="cardCustomerPhone"
                placeholder="e.g., 09171234567"
                value={cardCustomerPhone}
                onChange={(e) => setCardCustomerPhone(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                If phone matches existing customer, card will be linked to their account
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueCardModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleIssueCard}
              disabled={!cardCode || issuingCard}
              style={{ backgroundColor: '#F9C900', color: '#000' }}
            >
              {issuingCard ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Issuing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Issue Card
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Card Modal */}
      <Dialog open={showLinkCardModal} onOpenChange={setShowLinkCardModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-blue-500" />
              Link Card to Account
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {customerToLink && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="font-medium text-amber-800">
                  {customerToLink.customerName || 'Guest Customer'}
                </p>
                <p className="text-sm text-amber-600">
                  {customerToLink.customerPhone || customerToLink.customerEmail || 'No contact info'}
                  {' • '}{customerToLink.currentStamps}/{STAMPS_FOR_REWARD} stamps
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="linkCardCode">Card Code *</Label>
              <Input
                id="linkCardCode"
                placeholder="e.g., BEEHIVE-001"
                value={linkCardCode}
                onChange={(e) => setLinkCardCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <p className="text-xs text-gray-500">
                Enter the code printed on the physical card to link to this account
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkCardModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleLinkCard}
              disabled={!linkCardCode || linkingCard}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {linkingCard ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Linking...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Link Card
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
