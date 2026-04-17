import type { IPromptRepository } from "@/domain/repositories/prompt-repository";

export class GetSystemPromptUseCase {
  constructor(private repo: IPromptRepository) {}

  execute() {
    return this.repo.getCurrent();
  }
}
