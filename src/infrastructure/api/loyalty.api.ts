import { api } from './axiosConfig'

// Types
export interface CustomerLoyaltyDTO {
  id: string
  customerPhone?: string | null
  customerEmail?: string | null
  deviceId?: string | null
  customerName?: string | null
  cardCode?: string | null    // Physical card code
  currentStamps: number       // 0-9 (resets after reward)
  totalStamps: number         // Lifetime total
  rewardsEarned: number       // Total 10-stamp milestones
  rewardsRedeemed: number     // Rewards already used
  availableRewards: number    // rewardsEarned - rewardsRedeemed
  stampsToNextReward: number  // 10 - currentStamps
  createdAt: string
  updatedAt: string
  transactions?: LoyaltyTransactionDTO[]
}

export interface LoyaltyTransactionDTO {
  id: string
  customerLoyaltyId: string
  type: 'STAMP_EARNED' | 'STAMP_REVERSED' | 'REWARD_UNLOCKED' | 'REWARD_REDEEMED' | 'CARD_ISSUED' | 'CARD_LINKED'
  orderId?: string | null
  orderNumber?: string | null
  stampsBefore: number
  stampsAfter: number
  stampsChange: number
  rewardItemId?: string | null
  rewardItemName?: string | null
  notes?: string | null
  processedBy?: string | null
  createdAt: string
}

export interface LoyaltyLookupDTO {
  customerPhone?: string
  customerEmail?: string
  deviceId?: string
  cardCode?: string           // Look up by physical card
}

export interface AwardStampDTO {
  orderId: string
  orderNumber: string
  customerPhone?: string
  customerEmail?: string
  deviceId?: string
  customerName?: string
}

export interface RedeemRewardDTO {
  loyaltyId: string
  rewardItemId: string
  rewardItemName: string
  processedBy?: string
  notes?: string
}

export interface LoyaltyStatusResponse {
  success: boolean
  found: boolean
  currentStamps?: number
  stampsToNextReward?: number
  availableRewards?: number
  totalStamps?: number
}

export interface AwardStampResponse {
  success: boolean
  loyalty: CustomerLoyaltyDTO
  transaction: LoyaltyTransactionDTO
  rewardUnlocked: boolean
  message: string
}

export interface RedeemRewardResponse {
  success: boolean
  loyalty: CustomerLoyaltyDTO
  transaction: LoyaltyTransactionDTO
  message: string
}

// Physical card types
export interface IssueCardDTO {
  cardCode: string            // Unique code printed on physical card
  customerName?: string       // Optional name
  customerPhone?: string      // Optional - link to existing phone
}

export interface LinkCardDTO {
  cardCode: string
  loyaltyId: string           // Link by ID
}

export interface IssueCardResponse {
  success: boolean
  loyalty: CustomerLoyaltyDTO
  transaction: LoyaltyTransactionDTO
  isNewAccount: boolean        // True if new account was created
  linkedToExisting: boolean    // True if linked to existing phone account
  message: string
}

// Constants
export const STAMPS_FOR_REWARD = 10

export const loyaltyApi = {
  // Look up customer by phone, email, or deviceId
  lookup: async (params: LoyaltyLookupDTO): Promise<{ success: boolean; found: boolean; customer: CustomerLoyaltyDTO | null }> => {
    const queryParams = new URLSearchParams()
    if (params.customerPhone) queryParams.append('phone', params.customerPhone)
    if (params.customerEmail) queryParams.append('email', params.customerEmail)
    if (params.deviceId) queryParams.append('deviceId', params.deviceId)
    
    const response = await api.get(`/api/loyalty/lookup?${queryParams.toString()}`)
    return response.data
  },

  // Get loyalty status (simpler response)
  getStatus: async (params: LoyaltyLookupDTO): Promise<LoyaltyStatusResponse> => {
    const queryParams = new URLSearchParams()
    if (params.customerPhone) queryParams.append('phone', params.customerPhone)
    if (params.customerEmail) queryParams.append('email', params.customerEmail)
    if (params.deviceId) queryParams.append('deviceId', params.deviceId)
    
    const response = await api.get(`/api/loyalty/status?${queryParams.toString()}`)
    return response.data
  },

  // Find or create customer loyalty record
  findOrCreate: async (params: LoyaltyLookupDTO & { customerName?: string }): Promise<{ success: boolean; customer: CustomerLoyaltyDTO }> => {
    const response = await api.post('/api/loyalty/customer', params)
    return response.data
  },

  // Get customer by ID
  getById: async (id: string): Promise<{ success: boolean; customer: CustomerLoyaltyDTO }> => {
    const response = await api.get(`/api/loyalty/customer/${id}`)
    return response.data
  },

  // Get all loyalty customers
  getAll: async (): Promise<{ success: boolean; customers: CustomerLoyaltyDTO[] }> => {
    const response = await api.get('/api/loyalty/customers')
    return response.data
  },

  // Award stamp (called automatically when order is paid)
  awardStamp: async (data: AwardStampDTO): Promise<AwardStampResponse> => {
    const response = await api.post('/api/loyalty/stamp/award', data)
    return response.data
  },

  // Reverse stamp (called when order is voided)
  reverseStamp: async (data: { orderId: string; orderNumber: string } & LoyaltyLookupDTO & { notes?: string }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/loyalty/stamp/reverse', data)
    return response.data
  },

  // Check if stamp can be awarded
  canAwardStamp: async (orderId: string): Promise<{ success: boolean; canAward: boolean }> => {
    const response = await api.get(`/api/loyalty/stamp/check/${orderId}`)
    return response.data
  },

  // Redeem a reward
  redeemReward: async (data: RedeemRewardDTO): Promise<RedeemRewardResponse> => {
    const response = await api.post('/api/loyalty/reward/redeem', data)
    return response.data
  },

  // Get transaction history
  getTransactions: async (loyaltyId: string, limit?: number): Promise<{ success: boolean; transactions: LoyaltyTransactionDTO[] }> => {
    const url = limit ? `/api/loyalty/transactions/${loyaltyId}?limit=${limit}` : `/api/loyalty/transactions/${loyaltyId}`
    const response = await api.get(url)
    return response.data
  },

  // Look up by physical card code
  lookupByCard: async (cardCode: string): Promise<{ success: boolean; found: boolean; customer: CustomerLoyaltyDTO | null }> => {
    const response = await api.get(`/api/loyalty/card/${encodeURIComponent(cardCode)}`)
    return response.data
  },

  // Issue new physical loyalty card
  issueCard: async (data: IssueCardDTO): Promise<IssueCardResponse> => {
    const response = await api.post('/api/loyalty/card/issue', data)
    return response.data
  },

  // Link physical card to existing account
  linkCard: async (data: LinkCardDTO): Promise<IssueCardResponse> => {
    const response = await api.post('/api/loyalty/card/link', data)
    return response.data
  }
}
