import apiClient from "@/infrastructure/api/api-client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";
import type { IAnalyticsRepository } from "@/domain/repositories/analytics-repository";
import type { DashboardStats, TimeSeriesData } from "@/domain/entities/analytics";

export class ApiAnalyticsRepository implements IAnalyticsRepository {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get(ENDPOINTS.dashboardStats);
    return data;
  }

  async getUsersOverTime(days: number): Promise<TimeSeriesData> {
    const { data } = await apiClient.get(ENDPOINTS.usersOverTime, {
      params: { days },
    });
    return data;
  }

  async getMessagesOverTime(days: number): Promise<TimeSeriesData> {
    const { data } = await apiClient.get(ENDPOINTS.messagesOverTime, {
      params: { days },
    });
    return data;
  }
}
