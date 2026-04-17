import apiClient from "@/infrastructure/api/api-client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";
import type { IAuditRepository } from "@/domain/repositories/audit-repository";
import type { PaginationParams, PaginatedResult } from "@/domain/entities/user";
import type { AuditLog, AuditLogFilters } from "@/domain/entities/audit-log";

export class ApiAuditRepository implements IAuditRepository {
  async getLogs(
    params: PaginationParams & AuditLogFilters
  ): Promise<PaginatedResult<AuditLog>> {
    const { data } = await apiClient.get(ENDPOINTS.auditLogs, { params });
    return data;
  }
}
