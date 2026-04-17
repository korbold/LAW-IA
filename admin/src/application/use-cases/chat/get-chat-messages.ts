import type { IChatRepository } from "@/domain/repositories/chat-repository";

export class GetChatMessagesUseCase {
  constructor(private repo: IChatRepository) {}

  execute(sessionId: string) {
    return this.repo.getSessionDetail(sessionId);
  }
}
