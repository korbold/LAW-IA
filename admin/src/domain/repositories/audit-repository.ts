import type { PaginationParams, PaginatedResult } from "@/domain/entities/user";
import type { AuditLog, AuditLogFilters } from "@/domain/entities/audit-log";

export interface IAuditRepository {
  getLogs(
    params: PaginationParams & AuditLogFilters
  ): Promise<PaginatedResult<AuditLog>>;
}
