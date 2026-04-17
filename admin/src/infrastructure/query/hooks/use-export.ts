"use client";

import { useMutation } from "@tanstack/react-query";
import { ApiExportRepository } from "@/infrastructure/repositories/api-export-repository";
import type { UserFilters } from "@/domain/entities/user";

const repo = new ApiExportRepository();

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useExportUsers() {
  return useMutation({
    mutationFn: (filters: UserFilters) => repo.exportUsersCSV(filters),
    onSuccess: (blob) => {
      downloadBlob(blob, `usuarios_${new Date().toISOString().split("T")[0]}.csv`);
    },
  });
}

export function useExportChatSessions() {
  return useMutation({
    mutationFn: (filters: Record<string, string>) =>
      repo.exportChatSessionsCSV(filters),
    onSuccess: (blob) => {
      downloadBlob(blob, `sesiones_${new Date().toISOString().split("T")[0]}.csv`);
    },
  });
}
