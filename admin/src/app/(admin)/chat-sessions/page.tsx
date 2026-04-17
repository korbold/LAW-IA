"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { SearchInput } from "@/presentation/components/shared/search-input";
import { DataTable, type Column } from "@/presentation/components/shared/data-table";
import { DateRangePicker } from "@/presentation/components/shared/date-range-picker";
import { ExportButton } from "@/presentation/components/shared/export-button";
import { useChatSessions } from "@/infrastructure/query/hooks/use-chat-sessions";
import { useExportChatSessions } from "@/infrastructure/query/hooks/use-export";
import type { ChatSession } from "@/domain/entities/chat-session";

export default function ChatSessionsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters = {
    page,
    size: 10,
    userEmail: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading } = useChatSessions(filters);
  const exportSessions = useExportChatSessions();

  const columns: Column<ChatSession>[] = [
    {
      key: "id",
      header: "ID",
      render: (s) => (
        <span className="font-mono text-xs">{s.id.slice(0, 8)}...</span>
      ),
    },
    {
      key: "user",
      header: "Usuario",
      render: (s) => (
        <div>
          <p className="text-sm font-medium">{s.userDisplayName}</p>
          <p className="text-xs text-muted-foreground">{s.userEmail}</p>
        </div>
      ),
    },
    {
      key: "messages",
      header: "Mensajes",
      render: (s) => s.messageCount,
    },
    {
      key: "createdAt",
      header: "Inicio",
      render: (s) => new Date(s.createdAt).toLocaleString("es-EC"),
    },
    {
      key: "lastMessage",
      header: "Último mensaje",
      render: (s) => new Date(s.lastMessageAt).toLocaleString("es-EC"),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (s) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/chat-sessions/${s.id}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sesiones de Chat"
        description="Historial de conversaciones"
        actions={
          <ExportButton
            onClick={() =>
              exportSessions.mutate({
                userEmail: search,
                dateFrom,
                dateTo,
              })
            }
            isLoading={exportSessions.isPending}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          placeholder="Buscar por email de usuario..."
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
        />
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
