"use client";

import { useState } from "react";
import { RefreshCw, Server, Database, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { StatusBadge } from "@/presentation/components/shared/status-badge";
import { useSystemHealth } from "@/infrastructure/query/hooks/use-system-health";
import type { ServiceStatus } from "@/domain/entities/system-health";

const serviceIcons: Record<string, typeof Server> = {
  "Backend API": Server,
  Database: Database,
  "Gemini API": Cpu,
};

export default function SystemPage() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { data: health, isLoading, refetch } = useSystemHealth(autoRefresh);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48 bg-[#162a48]" />
        <div className="grid gap-5 md:grid-cols-3">
          <Skeleton className="h-44 rounded-2xl bg-[#162a48]" />
          <Skeleton className="h-44 rounded-2xl bg-[#162a48]" />
          <Skeleton className="h-44 rounded-2xl bg-[#162a48]" />
        </div>
        <Skeleton className="h-48 rounded-2xl bg-[#162a48]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Estado del Sistema"
        description="Monitoreo de servicios y recursos"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`border-[rgba(43,94,167,0.12)] bg-transparent text-[#7a7670] hover:text-[#3b82f6] hover:bg-[rgba(43,94,167,0.06)] ${autoRefresh ? "border-[#3b82f6]/30 text-[#3b82f6]" : ""}`}
            >
              <RefreshCw
                className={`mr-2 h-3.5 w-3.5 ${autoRefresh ? "animate-spin" : ""}`}
              />
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-[rgba(43,94,167,0.12)] bg-transparent text-[#7a7670] hover:text-[#3b82f6] hover:bg-[rgba(43,94,167,0.06)]"
            >
              Refrescar
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 md:grid-cols-3">
        {health?.services.map((service, i) => {
          const Icon = serviceIcons[service.name] ?? Server;
          const isUp = service.status === "UP";
          return (
            <div
              key={service.name}
              className="animate-fade-up group relative overflow-hidden rounded-2xl border border-[rgba(43,94,167,0.08)] bg-[#0f1d32] p-6 transition-all hover:border-[rgba(43,94,167,0.15)]"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {isUp && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
              )}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-[rgba(43,94,167,0.1)] bg-[rgba(43,94,167,0.06)] p-2.5">
                    <Icon className="h-5 w-5 text-[#3b82f6]" />
                  </div>
                  <h3 className="font-semibold text-sm text-[#e2e8f0]">{service.name}</h3>
                </div>
                <StatusBadge status={service.status as ServiceStatus} />
              </div>
              {service.responseTimeMs !== null && (
                <p className="text-xs text-[#475569]">
                  Tiempo de respuesta:{" "}
                  <span className="text-[#cbd5e1] font-mono">{service.responseTimeMs}ms</span>
                </p>
              )}
              {service.details && (
                <p className="text-xs text-[#475569] mt-1">{service.details}</p>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="animate-fade-up rounded-2xl border border-[rgba(43,94,167,0.08)] bg-[#0f1d32] p-6"
        style={{ animationDelay: "300ms" }}
      >
        <h3
          className="mb-6 text-sm font-semibold text-[#e2e8f0]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Recursos del Sistema
        </h3>
        <dl className="grid gap-8 sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#475569] mb-2">
              Uptime
            </dt>
            <dd
              className="text-2xl font-bold text-[#e2e8f0]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {health?.uptime ?? "N/A"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#475569] mb-2">
              Memoria JVM
            </dt>
            <dd>
              <span className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "var(--font-heading)" }}>
                {health ? Math.round(health.jvmMemoryUsed / 1024 / 1024) : 0}MB
              </span>
              <span className="text-sm text-[#475569] ml-1">
                / {health ? Math.round(health.jvmMemoryMax / 1024 / 1024) : 0}MB
              </span>
              {health && (
                <div className="mt-3 h-1.5 w-full rounded-full bg-[#162a48] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] transition-all duration-500"
                    style={{
                      width: `${Math.max(2, (health.jvmMemoryUsed / health.jvmMemoryMax) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#475569] mb-2">
              Threads Activos
            </dt>
            <dd
              className="text-2xl font-bold text-[#e2e8f0]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {health?.activeThreads ?? "N/A"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
