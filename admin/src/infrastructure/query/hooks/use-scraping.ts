"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/infrastructure/api/api-client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";
import { queryKeys } from "@/infrastructure/query/keys";

export function useScrapingStatus() {
  return useQuery({
    queryKey: queryKeys.scraping.status,
    queryFn: async () => {
      const { data } = await apiClient.get(ENDPOINTS.scrapingStatus);
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useScrapingJobs(page: number = 0) {
  return useQuery({
    queryKey: queryKeys.scraping.jobs({ page }),
    queryFn: async () => {
      const { data } = await apiClient.get(ENDPOINTS.scrapingJobs, {
        params: { page, size: 20 },
      });
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useLegalCatalog() {
  return useQuery({
    queryKey: queryKeys.scraping.catalog,
    queryFn: async () => {
      const { data } = await apiClient.get(ENDPOINTS.scrapingCatalog);
      return data;
    },
  });
}

export function useScrapingSchedule() {
  return useQuery({
    queryKey: queryKeys.scraping.schedule,
    queryFn: async () => {
      const { data } = await apiClient.get(ENDPOINTS.scrapingSchedule);
      return data;
    },
  });
}

export function useTriggerInitialLoad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (priority?: number) => {
      const url = priority
        ? ENDPOINTS.scrapingInitialLoadPriority(priority)
        : ENDPOINTS.scrapingInitialLoad;
      const { data } = await apiClient.post(url);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping"] });
    },
  });
}

export function useTriggerScrape() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (section: string) => {
      const { data } = await apiClient.post(ENDPOINTS.scrapingRun(section));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping"] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ section, enabled, cronExpression }: {
      section: string;
      enabled?: boolean;
      cronExpression?: string;
    }) => {
      const { data } = await apiClient.put(
        ENDPOINTS.scrapingScheduleUpdate(section),
        { enabled, cronExpression }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping"] });
    },
  });
}
