export type AuditAction =
  | "USER_ROLE_CHANGED"
  | "USER_STATUS_CHANGED"
  | "SYSTEM_PROMPT_UPDATED"
  | "DATA_EXPORTED"
  | "ADMIN_LOGIN";

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  details: string;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: AuditAction;
  dateFrom?: string;
  dateTo?: string;
}
