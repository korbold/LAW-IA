import type { IAuditRepository } from "@/domain/repositories/audit-repository";
import type { PaginationParams } from "@/domain/entities/user";
import type { AuditLogFilters } from "@/domain/entities/audit-log";

export class GetAuditLogsUseCase {
  constructor(private repo: IAuditRepository) {}

  execute(params: PaginationParams & AuditLogFilters) {
    return this.repo.getLogs(params);
  }
}
