export interface DashboardStats {
  totalUsers: number;
  activeSessionsToday: number;
  totalMessages: number;
  systemUptime: string;
  usersTrend: number;
  sessionsTrend: number;
  messageTrend: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TimeSeriesData {
  label: string;
  data: TimeSeriesPoint[];
}
