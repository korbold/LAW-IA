export interface ChatSession {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  messageCount: number;
  createdAt: string;
  lastMessageAt: string;
}

export type MessageRole = "USER" | "ASSISTANT";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ChatSessionDetail {
  session: ChatSession;
  messages: ChatMessage[];
}

export interface ChatSessionFilters {
  userId?: string;
  userEmail?: string;
  dateFrom?: string;
  dateTo?: string;
}
