"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/infrastructure/query/keys";
import { ApiHealthRepository } from "@/infrastructure/repositories/api-health-repository";

const repo = new ApiHealthRepository();

export function useSystemHealth(autoRefresh: boolean = false) {
  return useQuery({
    queryKey: queryKeys.health.status,
    queryFn: () => repo.getHealth(),
    refetchInterval: autoRefresh ? 30000 : false,
  });
}
