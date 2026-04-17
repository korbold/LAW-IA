"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/infrastructure/query/keys";
import { ApiAnalyticsRepository } from "@/infrastructure/repositories/api-analytics-repository";

const repo = new ApiAnalyticsRepository();

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () => repo.getDashboardStats(),
  });
}

export function useUsersOverTime(days: number = 30) {
  return useQuery({
    queryKey: queryKeys.dashboard.usersOverTime(days),
    queryFn: () => repo.getUsersOverTime(days),
  });
}

export function useMessagesOverTime(days: number = 30) {
  return useQuery({
    queryKey: queryKeys.dashboard.messagesOverTime(days),
    queryFn: () => repo.getMessagesOverTime(days),
  });
}
