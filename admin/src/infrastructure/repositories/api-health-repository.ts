import apiClient from "@/infrastructure/api/api-client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";
import type { IHealthRepository } from "@/application/use-cases/health/get-system-health";
import type { SystemHealth } from "@/domain/entities/system-health";

export class ApiHealthRepository implements IHealthRepository {
  async getHealth(): Promise<SystemHealth> {
    const { data } = await apiClient.get(ENDPOINTS.health);
    return data;
  }
}
