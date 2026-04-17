"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/infrastructure/query/keys";
import { ApiUserRepository } from "@/infrastructure/repositories/api-user-repository";
import type {
  PaginationParams,
  UserFilters,
  UserRole,
  UserStatus,
} from "@/domain/entities/user";

const repo = new ApiUserRepository();

export function useUsers(params: PaginationParams & UserFilters) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => repo.getAll(params),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => repo.getById(id),
    enabled: !!id,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      repo.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      repo.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
