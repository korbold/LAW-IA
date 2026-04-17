"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/infrastructure/query/keys";
import { ApiAuditRepository } from "@/infrastructure/repositories/api-audit-repository";
import type { PaginationParams } from "@/domain/entities/user";
import type { AuditLogFilters } from "@/domain/entities/audit-log";

const repo = new ApiAuditRepository();

export function useAuditLogs(params: PaginationParams & AuditLogFilters) {
  return useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: () => repo.getLogs(params),
  });
}
