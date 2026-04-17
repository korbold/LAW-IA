"use client";

import { Users, MessageSquare, Activity, Clock } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { StatCard } from "@/presentation/components/shared/stat-card";
import {
  useDashboardStats,
  useMessagesOverTime,
  useUsersOverTime,
} from "@/infrastructure/query/hooks/use-dashboard-stats";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: messagesData } = useMessagesOverTime(30);
  const { data: usersData } = useUsersOverTime(30);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Resumen general del sistema"
      />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Usuarios"
          value={statsLoading ? "..." : (stats?.totalUsers ?? 0)}
          icon={Users}
          trend={stats?.usersTrend}
          description="vs. mes anterior"
          delay={0}
        />
        <StatCard
          title="Sesiones Activas Hoy"
          value={statsLoading ? "..." : (stats?.activeSessionsToday ?? 0)}
          icon={Activity}
          trend={stats?.sessionsTrend}
          description="vs. ayer"
          delay={80}
        />
        <StatCard
          title="Total Mensajes"
          value={statsLoading ? "..." : (stats?.totalMessages ?? 0)}
          icon={MessageSquare}
          trend={stats?.messageTrend}
          description="vs. mes anterior"
          delay={160}
        />
        <StatCard
          title="Uptime"
          value={stats?.systemUptime ?? "..."}
          icon={Clock}
          delay={240}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div
          className="animate-fade-up rounded-2xl border border-[rgba(43,94,167,0.1)] bg-[#0f1d32] p-6"
          style={{ animationDelay: "300ms" }}
        >
          <h3 className="mb-6 text-sm font-semibold text-[#e2e8f0]" style={{ fontFamily: "var(--font-heading)" }}>
            Mensajes
            <span className="ml-2 text-xs font-normal text-[#475569]">Ultimos 30 dias</span>
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={messagesData?.data ?? []}>
              <defs>
                <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2b5ea7" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2b5ea7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,94,167,0.08)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => new Date(v).toLocaleDateString("es-EC", { day: "2-digit", month: "short" })} />
              <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#132442", border: "1px solid rgba(43,94,167,0.2)", borderRadius: "12px", color: "#e2e8f0", fontSize: "12px" }}
                labelFormatter={(v) => new Date(v).toLocaleDateString("es-EC")} />
              <Area type="monotone" dataKey="value" name="Mensajes" stroke="#3b82f6" strokeWidth={2} fill="url(#msgGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className="animate-fade-up rounded-2xl border border-[rgba(43,94,167,0.1)] bg-[#0f1d32] p-6"
          style={{ animationDelay: "400ms" }}
        >
          <h3 className="mb-6 text-sm font-semibold text-[#e2e8f0]" style={{ fontFamily: "var(--font-heading)" }}>
            Nuevos Usuarios
            <span className="ml-2 text-xs font-normal text-[#475569]">Ultimos 30 dias</span>
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={usersData?.data ?? []}>
              <defs>
                <linearGradient id="usrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,94,167,0.08)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => new Date(v).toLocaleDateString("es-EC", { day: "2-digit", month: "short" })} />
              <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#132442", border: "1px solid rgba(43,94,167,0.2)", borderRadius: "12px", color: "#e2e8f0", fontSize: "12px" }}
                labelFormatter={(v) => new Date(v).toLocaleDateString("es-EC")} />
              <Area type="monotone" dataKey="value" name="Usuarios" stroke="#22c55e" strokeWidth={2} fill="url(#usrGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
