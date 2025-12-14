import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  CASHIER = 'CASHIER',
  COOK = 'COOK',
  MANAGER = 'MANAGER'
}

export interface Customer {
  id: string
  email: string
  name: string
  role: UserRole
  phone: string | null
  loyaltyPoints: number
  cardNumber: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export interface CreateCustomerDTO {
  email: string
  password: string
  name: string
  phone?: string | null
  cardNumber?: string | null
}

export interface UpdateCustomerDTO {
  email?: string
  name?: string
  phone?: string | null
  loyaltyPoints?: number
  cardNumber?: string | null
  isActive?: boolean
}

export interface CustomerFilters {
  isActive?: boolean
  search?: string
}

export interface CustomerStats {
  totalCustomers: number
  activeCustomers: number
  totalLoyaltyPoints: number
  averageLoyaltyPoints: number
}

export const customersApi = {
  async getAll(filters?: CustomerFilters): Promise<Customer[]> {
    const params = new URLSearchParams()
    if (filters?.isActive !== undefined) {
      params.append('isActive', String(filters.isActive))
    }
    if (filters?.search) {
      params.append('search', filters.search)
    }

    const response = await axios.get(`${API_URL}/customers?${params}`)
    return response.data
  },

  async getById(id: string): Promise<Customer> {
    const response = await axios.get(`${API_URL}/customers/${id}`)
    return response.data
  },

  async create(data: CreateCustomerDTO): Promise<Customer> {
    const response = await axios.post(`${API_URL}/customers`, data)
    return response.data
  },

  async update(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    const response = await axios.put(`${API_URL}/customers/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_URL}/customers/${id}`)
  },

  async getStats(): Promise<CustomerStats> {
    const response = await axios.get(`${API_URL}/customers/stats`)
    return response.data
  },

  async addLoyaltyPoints(id: string, points: number): Promise<Customer> {
    const response = await axios.post(`${API_URL}/customers/${id}/loyalty`, { points })
    return response.data
  }
}

// Helper function to format customer status
export const getStatusDisplay = (isActive: boolean): string => {
  return isActive ? 'Active' : 'Inactive'
}

// Helper function to format role display
export const getRoleDisplay = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    [UserRole.CUSTOMER]: 'Customer',
    [UserRole.CASHIER]: 'Cashier',
    [UserRole.COOK]: 'Cook',
    [UserRole.MANAGER]: 'Manager'
  }
  return roleMap[role] || role
}
