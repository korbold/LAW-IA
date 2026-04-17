export type ServiceStatus = "UP" | "DOWN" | "DEGRADED";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  responseTimeMs: number | null;
  details: string | null;
}

export interface SystemHealth {
  services: ServiceHealth[];
  uptime: string;
  jvmMemoryUsed: number;
  jvmMemoryMax: number;
  activeThreads: number;
}
