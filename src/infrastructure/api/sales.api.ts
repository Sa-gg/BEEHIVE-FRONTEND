import axios from 'axios';

const API_URL = 'http://localhost:3000/api/sales';

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  dailyAverage: number;
  previousPeriodRevenue: number;
  revenueGrowth: number;
}

export interface DailySales {
  date: string;
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
}

export interface TopSellingItem {
  itemId: string;
  itemName: string;
  quantity: number;
  revenue: number;
}

export interface CategorySales {
  category: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface HourlySales {
  hour: number;
  orders: number;
  revenue: number;
}

export interface SalesReport {
  metrics: SalesMetrics;
  dailySales: DailySales[];
  topSellingItems: TopSellingItem[];
  categorySales: CategorySales[];
  hourlySales: HourlySales[];
  period: {
    startDate: string;
    endDate: string;
    type: 'today' | 'week' | 'month' | 'custom';
  };
}

export const salesApi = {
  async getReport(filters: {
    period?: 'today' | 'week' | 'month';
    startDate?: string;
    endDate?: string;
  }): Promise<SalesReport> {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await axios.get(`${API_URL}/report?${params.toString()}`);
    return response.data;
  }
};
