import apiClient from "@/infrastructure/api/api-client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";
import type { IExportRepository } from "@/application/use-cases/export/export-users";
import type { UserFilters } from "@/domain/entities/user";

export class ApiExportRepository implements IExportRepository {
  async exportUsersCSV(filters: UserFilters): Promise<Blob> {
    const { data } = await apiClient.get(ENDPOINTS.exportUsers, {
      params: filters,
      responseType: "blob",
    });
    return data;
  }

  async exportChatSessionsCSV(
    filters: Record<string, string>
  ): Promise<Blob> {
    const { data } = await apiClient.get(ENDPOINTS.exportChatSessions, {
      params: filters,
      responseType: "blob",
    });
    return data;
  }
}
