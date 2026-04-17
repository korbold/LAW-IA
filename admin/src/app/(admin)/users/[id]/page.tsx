"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Ban, MessageSquare, Clock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { StatCard } from "@/presentation/components/shared/stat-card";
import { StatusBadge } from "@/presentation/components/shared/status-badge";
import { ConfirmDialog } from "@/presentation/components/shared/confirm-dialog";
import {
  useUser,
  useUpdateUserRole,
  useToggleUserStatus,
} from "@/infrastructure/query/hooks/use-users";
import type { UserRole, UserStatus } from "@/domain/entities/user";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: user, isLoading } = useUser(id);
  const updateRole = useUpdateUserRole();
  const toggleStatus = useToggleUserStatus();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "danger" | "default";
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleRoleChange = () => {
    const newRole: UserRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    setConfirmDialog({
      open: true,
      title: "Cambiar rol",
      description: `Cambiar rol de ${user.displayName} a ${newRole}?`,
      onConfirm: () => updateRole.mutate({ id: user.id, role: newRole }),
    });
  };

  const handleToggleStatus = () => {
    const newStatus: UserStatus =
      user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setConfirmDialog({
      open: true,
      title: newStatus === "SUSPENDED" ? "Suspender usuario" : "Activar usuario",
      description: `${newStatus === "SUSPENDED" ? "Suspender" : "Activar"} a ${user.displayName}?`,
      onConfirm: () => toggleStatus.mutate({ id: user.id, status: newStatus }),
      variant: newStatus === "SUSPENDED" ? "danger" : "default",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalle de Usuario"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {user.displayName?.slice(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{user.displayName}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={user.role} />
                  <StatusBadge status={user.status} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRoleChange}>
                <Shield className="mr-2 h-4 w-4" />
                {user.role === "ADMIN" ? "Quitar Admin" : "Hacer Admin"}
              </Button>
              <Button
                variant={user.status === "ACTIVE" ? "destructive" : "default"}
                size="sm"
                onClick={handleToggleStatus}
              >
                <Ban className="mr-2 h-4 w-4" />
                {user.status === "ACTIVE" ? "Suspender" : "Activar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Sesiones"
          value={user.sessionCount ?? 0}
          icon={Hash}
        />
        <StatCard
          title="Total Mensajes"
          value={user.messageCount ?? 0}
          icon={MessageSquare}
        />
        <StatCard
          title="Última Actividad"
          value={
            user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString("es-EC")
              : "Sin actividad"
          }
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                ID
              </dt>
              <dd className="mt-1 text-sm font-mono">{user.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Fecha de registro
              </dt>
              <dd className="mt-1 text-sm">
                {new Date(user.createdAt).toLocaleString("es-EC")}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Último inicio de sesión
              </dt>
              <dd className="mt-1 text-sm">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString("es-EC")
                  : "Nunca"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

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
