export interface SystemPrompt {
  id: string;
  content: string;
  updatedBy: string;
  updatedByEmail: string;
  createdAt: string;
}

export interface SystemPromptHistory {
  current: SystemPrompt;
  versions: SystemPrompt[];
}
