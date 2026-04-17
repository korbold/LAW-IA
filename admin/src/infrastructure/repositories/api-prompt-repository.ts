import apiClient from "@/infrastructure/api/api-client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";
import type { IPromptRepository } from "@/domain/repositories/prompt-repository";
import type { SystemPrompt, SystemPromptHistory } from "@/domain/entities/system-prompt";

export class ApiPromptRepository implements IPromptRepository {
  async getCurrent(): Promise<SystemPrompt> {
    const { data } = await apiClient.get(ENDPOINTS.systemPrompt);
    return data;
  }

  async update(content: string): Promise<SystemPrompt> {
    const { data } = await apiClient.put(ENDPOINTS.systemPrompt, { content });
    return data;
  }

  async getHistory(): Promise<SystemPromptHistory> {
    const { data } = await apiClient.get(ENDPOINTS.systemPromptHistory);
    return data;
  }
}
