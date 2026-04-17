"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/infrastructure/api/api-client";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

export function useDocuments(page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: ["documents", "list", page, size],
    queryFn: async () => {
      const { data } = await apiClient.get(`${BASE}/admin/documents`, {
        params: { page, size },
      });
      return data;
    },
    refetchInterval: 5000, // Poll for status updates
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, title }: { file: File; title: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      const { data } = await apiClient.post(`${BASE}/admin/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`${BASE}/admin/documents/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
