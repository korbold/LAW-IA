"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Shield, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { SearchInput } from "@/presentation/components/shared/search-input";
import { DataTable, type Column } from "@/presentation/components/shared/data-table";
import { StatusBadge } from "@/presentation/components/shared/status-badge";
import { ExportButton } from "@/presentation/components/shared/export-button";
import { ConfirmDialog } from "@/presentation/components/shared/confirm-dialog";
import { useUsers, useUpdateUserRole, useToggleUserStatus } from "@/infrastructure/query/hooks/use-users";
import { useExportUsers } from "@/infrastructure/query/hooks/use-export";
import type { User, UserRole, UserStatus } from "@/domain/entities/user";

export default function UsersPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "danger" | "default";
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const filters = {
    page,
    size: 10,
    search: search || undefined,
    role: roleFilter !== "all" ? (roleFilter as UserRole) : undefined,
    status: statusFilter !== "all" ? (statusFilter as UserStatus) : undefined,
  };

  const { data, isLoading } = useUsers(filters);
  const updateRole = useUpdateUserRole();
  const toggleStatus = useToggleUserStatus();
  const exportUsers = useExportUsers();

  const handleRoleChange = (user: User, newRole: UserRole) => {
    setConfirmDialog({
      open: true,
      title: "Cambiar rol",
      description: `Cambiar rol de ${user.displayName} a ${newRole}?`,
      onConfirm: () => updateRole.mutate({ id: user.id, role: newRole }),
    });
  };

  const handleToggleStatus = (user: User) => {
    const newStatus: UserStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setConfirmDialog({
      open: true,
      title: newStatus === "SUSPENDED" ? "Suspender usuario" : "Activar usuario",
      description: `${newStatus === "SUSPENDED" ? "Suspender" : "Activar"} a ${user.displayName}?`,
      onConfirm: () => toggleStatus.mutate({ id: user.id, status: newStatus }),
      variant: newStatus === "SUSPENDED" ? "danger" : "default",
    });
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Usuario",
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {user.displayName?.slice(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (user) => <StatusBadge status={user.role} />,
    },
    {
      key: "status",
      header: "Estado",
      render: (user) => <StatusBadge status={user.status} />,
    },
    {
      key: "createdAt",
      header: "Registro",
      render: (user) =>
        new Date(user.createdAt).toLocaleDateString("es-EC"),
    },
    {
      key: "sessions",
      header: "Sesiones",
      render: (user) => user.sessionCount ?? 0,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg p-1.5 hover:bg-muted cursor-pointer outline-none">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/users/${user.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalle
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleRoleChange(
                  user,
                  user.role === "ADMIN" ? "USER" : "ADMIN"
                )
              }
            >
              <Shield className="mr-2 h-4 w-4" />
              {user.role === "ADMIN" ? "Quitar Admin" : "Hacer Admin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
              <Ban className="mr-2 h-4 w-4" />
              {user.status === "ACTIVE" ? "Suspender" : "Activar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios del sistema"
        actions={
          <ExportButton
            onClick={() => exportUsers.mutate(filters)}
            isLoading={exportUsers.isPending}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
        />
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v ?? "all"); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="USER">Usuario</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activo</SelectItem>
            <SelectItem value="SUSPENDED">Suspendido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
