import apiClient from "@/infrastructure/api/api-client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";
import type { IChatRepository } from "@/domain/repositories/chat-repository";
import type { PaginationParams, PaginatedResult } from "@/domain/entities/user";
import type {
  ChatSession,
  ChatSessionDetail,
  ChatSessionFilters,
} from "@/domain/entities/chat-session";

export class ApiChatRepository implements IChatRepository {
  async getSessions(
    params: PaginationParams & ChatSessionFilters
  ): Promise<PaginatedResult<ChatSession>> {
    const { data } = await apiClient.get(ENDPOINTS.chatSessions, { params });
    return data;
  }

  async getSessionDetail(id: string): Promise<ChatSessionDetail> {
    const { data } = await apiClient.get(ENDPOINTS.chatSessionDetail(id));
    return data;
  }
}
