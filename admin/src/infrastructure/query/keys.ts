// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = any;

export const queryKeys = {
  users: {
    all: ["users"] as const,
    list: (params: Params) => ["users", "list", params] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  chatSessions: {
    all: ["chatSessions"] as const,
    list: (params: Params) => ["chatSessions", "list", params] as const,
    detail: (id: string) => ["chatSessions", "detail", id] as const,
  },
  dashboard: {
    stats: ["dashboard", "stats"] as const,
    usersOverTime: (days: number) =>
      ["dashboard", "usersOverTime", days] as const,
    messagesOverTime: (days: number) =>
      ["dashboard", "messagesOverTime", days] as const,
  },
  health: {
    status: ["health", "status"] as const,
  },
  audit: {
    list: (params: Params) => ["audit", "list", params] as const,
  },
  prompts: {
    current: ["prompts", "current"] as const,
    history: ["prompts", "history"] as const,
  },
  scraping: {
    status: ["scraping", "status"] as const,
    jobs: (params: Params) => ["scraping", "jobs", params] as const,
    catalog: ["scraping", "catalog"] as const,
    schedule: ["scraping", "schedule"] as const,
  },
} as const;
