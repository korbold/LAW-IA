import type { IAnalyticsRepository } from "@/domain/repositories/analytics-repository";

export class GetDashboardStatsUseCase {
  constructor(private repo: IAnalyticsRepository) {}

  execute() {
    return this.repo.getDashboardStats();
  }
}
