import type { DashboardStats, TimeSeriesData } from "@/domain/entities/analytics";

export interface IAnalyticsRepository {
  getDashboardStats(): Promise<DashboardStats>;
  getUsersOverTime(days: number): Promise<TimeSeriesData>;
  getMessagesOverTime(days: number): Promise<TimeSeriesData>;
}
