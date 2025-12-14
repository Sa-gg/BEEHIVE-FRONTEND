import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export enum ExpenseCategory {
  RENT_LEASE = 'RENT_LEASE',
  UTILITIES = 'UTILITIES',
  ADMINISTRATIVE_SALARIES = 'ADMINISTRATIVE_SALARIES',
  SOFTWARE_SUBSCRIPTIONS = 'SOFTWARE_SUBSCRIPTIONS',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER'
}

export enum ExpenseFrequency {
  ONE_TIME = 'ONE_TIME',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL'
}

export interface Expense {
  id: string
  category: ExpenseCategory
  date: string
  amount: number
  description: string
  frequency: ExpenseFrequency
  attachment?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateExpenseDTO {
  category: ExpenseCategory
  date: string
  amount: number
  description: string
  frequency: ExpenseFrequency
  attachment?: string
}

export interface UpdateExpenseDTO {
  category?: ExpenseCategory
  date?: string
  amount?: number
  description?: string
  frequency?: ExpenseFrequency
  attachment?: string
}

export interface ExpenseFilters {
  startDate?: string
  endDate?: string
  category?: ExpenseCategory
  frequency?: ExpenseFrequency
}

export interface ExpenseSummary {
  totalExpenses: number
  monthlyTotal: number
  categoryBreakdown: {
    category: string
    total: number
    percentage: number
  }[]
  frequencyBreakdown: {
    frequency: string
    total: number
    count: number
  }[]
}

export const expensesApi = {
  async getAll(filters?: ExpenseFilters): Promise<Expense[]> {
    const params = new URLSearchParams()
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.category) params.append('category', filters.category)
    if (filters?.frequency) params.append('frequency', filters.frequency)

    const response = await axios.get(`${API_URL}/expenses?${params.toString()}`)
    return response.data
  },

  async getById(id: string): Promise<Expense> {
    const response = await axios.get(`${API_URL}/expenses/${id}`)
    return response.data
  },

  async create(data: CreateExpenseDTO): Promise<Expense> {
    const response = await axios.post(`${API_URL}/expenses`, data)
    return response.data
  },

  async update(id: string, data: UpdateExpenseDTO): Promise<Expense> {
    const response = await axios.put(`${API_URL}/expenses/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_URL}/expenses/${id}`)
  },

  async getSummary(startDate?: string, endDate?: string): Promise<ExpenseSummary> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await axios.get(`${API_URL}/expenses/summary?${params.toString()}`)
    return response.data
  }
}

// Helper function to convert category enum to display text
export const getCategoryDisplay = (category: ExpenseCategory | string): string => {
  const displayMap: Record<string, string> = {
    RENT_LEASE: 'Rent/Lease',
    UTILITIES: 'Utilities (Water/Electricity/Gas)',
    ADMINISTRATIVE_SALARIES: 'Administrative Salaries',
    SOFTWARE_SUBSCRIPTIONS: 'Software/Subscriptions',
    MAINTENANCE: 'Maintenance',
    OTHER: 'Other'
  }
  return displayMap[category] || category
}

// Helper function to convert frequency enum to display text
export const getFrequencyDisplay = (frequency: ExpenseFrequency | string): string => {
  const displayMap: Record<string, string> = {
    ONE_TIME: 'One-Time',
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    ANNUAL: 'Annual'
  }
  return displayMap[frequency] || frequency
}
