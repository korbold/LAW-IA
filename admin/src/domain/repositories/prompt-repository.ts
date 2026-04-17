import type { SystemPrompt, SystemPromptHistory } from "@/domain/entities/system-prompt";

export interface IPromptRepository {
  getCurrent(): Promise<SystemPrompt>;
  update(content: string): Promise<SystemPrompt>;
  getHistory(): Promise<SystemPromptHistory>;
}
