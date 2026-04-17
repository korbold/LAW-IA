"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/infrastructure/query/keys";
import { ApiChatRepository } from "@/infrastructure/repositories/api-chat-repository";
import type { PaginationParams } from "@/domain/entities/user";
import type { ChatSessionFilters } from "@/domain/entities/chat-session";

const repo = new ApiChatRepository();

export function useChatSessions(params: PaginationParams & ChatSessionFilters) {
  return useQuery({
    queryKey: queryKeys.chatSessions.list(params),
    queryFn: () => repo.getSessions(params),
  });
}

export function useChatSessionDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.chatSessions.detail(id),
    queryFn: () => repo.getSessionDetail(id),
    enabled: !!id,
  });
}
