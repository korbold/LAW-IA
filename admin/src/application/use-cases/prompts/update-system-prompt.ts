import type { IPromptRepository } from "@/domain/repositories/prompt-repository";

export class UpdateSystemPromptUseCase {
  constructor(private repo: IPromptRepository) {}

  execute(content: string) {
    return this.repo.update(content);
  }
}
