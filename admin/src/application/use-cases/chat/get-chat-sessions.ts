import type { IChatRepository } from "@/domain/repositories/chat-repository";
import type { PaginationParams } from "@/domain/entities/user";
import type { ChatSessionFilters } from "@/domain/entities/chat-session";

export class GetChatSessionsUseCase {
  constructor(private repo: IChatRepository) {}

  execute(params: PaginationParams & ChatSessionFilters) {
    return this.repo.getSessions(params);
  }
}
