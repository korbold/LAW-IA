const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

export const ENDPOINTS = {
  // Dashboard
  dashboardStats: `${BASE}/admin/dashboard/stats`,

  // Users
  users: `${BASE}/admin/users`,
  userDetail: (id: string) => `${BASE}/admin/users/${id}`,
  userRole: (id: string) => `${BASE}/admin/users/${id}/role`,
  userStatus: (id: string) => `${BASE}/admin/users/${id}/status`,

  // Chat Sessions
  chatSessions: `${BASE}/admin/chat-sessions`,
  chatSessionDetail: (id: string) => `${BASE}/admin/chat-sessions/${id}`,

  // Analytics
  usersOverTime: `${BASE}/admin/analytics/users-over-time`,
  messagesOverTime: `${BASE}/admin/analytics/messages-over-time`,

  // Audit Logs
  auditLogs: `${BASE}/admin/audit-logs`,

  // System Prompt
  systemPrompt: `${BASE}/admin/prompts/system`,
  systemPromptHistory: `${BASE}/admin/prompts/system/history`,

  // Export
  exportUsers: `${BASE}/admin/export/users`,
  exportChatSessions: `${BASE}/admin/export/chat-sessions`,

  // Health
  health: `${BASE}/admin/health`,

  // Scraping
  scrapingStatus: `${BASE}/admin/scraping/status`,
  scrapingJobs: `${BASE}/admin/scraping/jobs`,
  scrapingJobDetail: (id: string) => `${BASE}/admin/scraping/jobs/${id}`,
  scrapingInitialLoad: `${BASE}/admin/scraping/initial-load`,
  scrapingInitialLoadPriority: (priority: number) => `${BASE}/admin/scraping/initial-load/priority/${priority}`,
  scrapingRun: (section: string) => `${BASE}/admin/scraping/run/${section}`,
  scrapingCatalog: `${BASE}/admin/scraping/catalog`,
  scrapingSchedule: `${BASE}/admin/scraping/schedule`,
  scrapingScheduleUpdate: (section: string) => `${BASE}/admin/scraping/schedule/${section}`,
} as const;
