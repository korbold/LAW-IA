"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { DataTable, type Column } from "@/presentation/components/shared/data-table";
import { DateRangePicker } from "@/presentation/components/shared/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { useAuditLogs } from "@/infrastructure/query/hooks/use-audit-logs";
import type { AuditLog, AuditAction } from "@/domain/entities/audit-log";

const actionLabels: Record<AuditAction, string> = {
  USER_ROLE_CHANGED: "Cambio de rol",
  USER_STATUS_CHANGED: "Cambio de estado",
  SYSTEM_PROMPT_UPDATED: "Prompt actualizado",
  DATA_EXPORTED: "Datos exportados",
  ADMIN_LOGIN: "Inicio de sesión",
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters = {
    page,
    size: 15,
    action: actionFilter !== "all" ? (actionFilter as AuditAction) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading } = useAuditLogs(filters);

  const columns: Column<AuditLog>[] = [
    {
      key: "createdAt",
      header: "Fecha",
      render: (log) => (
        <span className="text-sm">
          {new Date(log.createdAt).toLocaleString("es-EC")}
        </span>
      ),
    },
    {
      key: "admin",
      header: "Admin",
      render: (log) => (
        <span className="text-sm">{log.adminEmail}</span>
      ),
    },
    {
      key: "action",
      header: "Acción",
      render: (log) => (
        <Badge variant="outline">{actionLabels[log.action]}</Badge>
      ),
    },
    {
      key: "entity",
      header: "Entidad",
      render: (log) => (
        <span className="text-sm">
          {log.entityType}
          {log.entityId && (
            <span className="ml-1 font-mono text-xs text-muted-foreground">
              ({log.entityId.slice(0, 8)})
            </span>
          )}
        </span>
      ),
    },
    {
      key: "details",
      header: "Detalles",
      render: (log) => (
        <span className="text-sm text-muted-foreground">{log.details}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs de Auditoría"
        description="Registro de acciones administrativas"
      />

      <div className="flex flex-wrap items-center gap-4">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v ?? "all"); setPage(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo de acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            <SelectItem value="USER_ROLE_CHANGED">Cambio de rol</SelectItem>
            <SelectItem value="USER_STATUS_CHANGED">Cambio de estado</SelectItem>
            <SelectItem value="SYSTEM_PROMPT_UPDATED">Prompt actualizado</SelectItem>
            <SelectItem value="DATA_EXPORTED">Datos exportados</SelectItem>
            <SelectItem value="ADMIN_LOGIN">Inicio de sesión</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
