import { api } from './axiosConfig';

export interface DashboardStats {
  totalSales: number;
  ordersToday: number;
  activeCustomers: number;
  pendingOrders: number;
  salesChange: number;
  ordersChange: number;
  customersChange: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
}

export const dashboardApi = {
  async getStats(): Promise<DashboardResponse> {
    const response = await api.get<DashboardResponse>('/api/dashboard/stats');
    return response.data;
  },
};
