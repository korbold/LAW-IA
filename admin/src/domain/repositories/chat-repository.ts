import type { PaginationParams, PaginatedResult } from "@/domain/entities/user";
import type {
  ChatSession,
  ChatSessionDetail,
  ChatSessionFilters,
} from "@/domain/entities/chat-session";

export interface IChatRepository {
  getSessions(
    params: PaginationParams & ChatSessionFilters
  ): Promise<PaginatedResult<ChatSession>>;
  getSessionDetail(id: string): Promise<ChatSessionDetail>;
}
