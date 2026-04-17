"use client";

import { useState } from "react";
import {
  Globe,
  BookOpen,
  Briefcase,
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Play,
  Pause,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { StatCard } from "@/presentation/components/shared/stat-card";
import {
  useScrapingStatus,
  useLegalCatalog,
  useScrapingJobs,
  useScrapingSchedule,
  useTriggerInitialLoad,
  useTriggerScrape,
  useUpdateSchedule,
} from "@/infrastructure/query/hooks/use-scraping";
import type { CatalogEntry, ScrapingJob, ScrapingSchedule, JobStatus } from "@/domain/entities/scraping";

type TabKey = "catalog" | "jobs" | "schedule";

const jobStatusConfig: Record<JobStatus, { label: string; color: string; dotColor: string }> = {
  PENDING: { label: "Pendiente", color: "text-yellow-400", dotColor: "bg-yellow-400" },
  DOWNLOADING: { label: "Descargando", color: "text-blue-400", dotColor: "bg-blue-400" },
  PROCESSING: { label: "Procesando", color: "text-cyan-400", dotColor: "bg-cyan-400" },
  COMPLETED: { label: "Completado", color: "text-emerald-400", dotColor: "bg-emerald-400" },
  FAILED: { label: "Error", color: "text-red-400", dotColor: "bg-red-400" },
  PAUSED: { label: "Pausado", color: "text-orange-400", dotColor: "bg-orange-400" },
};

const priorityColors: Record<number, string> = {
  1: "bg-red-400/10 text-red-400",
  2: "bg-orange-400/10 text-orange-400",
  3: "bg-yellow-400/10 text-yellow-400",
  4: "bg-blue-400/10 text-blue-400",
};

function catalogStatusBadge(entry: CatalogEntry) {
  if (entry.loaded) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Cargado
      </span>
    );
  }
  if (entry.status === "PROCESSING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-400/10 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Procesando
      </span>
    );
  }
  if (entry.status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/10 px-2.5 py-1 text-[11px] font-semibold text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(43,94,167,0.1)] px-2.5 py-1 text-[11px] font-semibold text-[#64748b]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#64748b]" />
      Pendiente
    </span>
  );
}

export default function ScrapingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("catalog");
  const [jobsPage, setJobsPage] = useState(0);

  const { data: status } = useScrapingStatus();
  const { data: catalog, isLoading: catalogLoading } = useLegalCatalog();
  const { data: jobsData, isLoading: jobsLoading } = useScrapingJobs(jobsPage);
  const { data: schedules, isLoading: schedulesLoading } = useScrapingSchedule();

  const triggerLoad = useTriggerInitialLoad();
  const triggerScrape = useTriggerScrape();
  const updateSchedule = useUpdateSchedule();

  const catalogEntries: CatalogEntry[] = Array.isArray(catalog) ? catalog : [];
  const jobs: ScrapingJob[] = jobsData?.content ?? (Array.isArray(jobsData) ? jobsData : []);
  const scheduleList: ScrapingSchedule[] = Array.isArray(schedules) ? schedules : [];

  const loadedCount = catalogEntries.filter((e) => e.loaded).length;
  const totalCount = catalogEntries.length || 65;
  const runningJobs = status?.runningJobs ?? 0;
  const scheduledSections = scheduleList.filter((s) => s.enabled).length;

  const handleInitialLoad = () => {
    triggerLoad.mutate(undefined, {
      onSuccess: () => toast.success("Carga inicial iniciada"),
      onError: () => toast.error("Error al iniciar carga"),
    });
  };

  const handleTriggerScrape = (section: string) => {
    triggerScrape.mutate(section, {
      onSuccess: () => toast.success(`Scraping de ${section} iniciado`),
      onError: () => toast.error("Error al iniciar scraping"),
    });
  };

  const handleToggleSchedule = (schedule: ScrapingSchedule) => {
    updateSchedule.mutate(
      { section: schedule.section, enabled: !schedule.enabled },
      {
        onSuccess: () =>
          toast.success(
            `Programacion ${!schedule.enabled ? "activada" : "desactivada"} para ${schedule.section}`
          ),
        onError: () => toast.error("Error al actualizar programacion"),
      }
    );
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "catalog", label: "Catalogo Legal" },
    { key: "jobs", label: "Jobs de Scraping" },
    { key: "schedule", label: "Programacion" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fuentes Legales"
        description="Gestion del catalogo legal ecuatoriano y procesos de scraping automatizado"
        actions={
          <Button
            onClick={handleInitialLoad}
            disabled={triggerLoad.isPending}
            className="border border-[#2b5ea7]/30 bg-[#1a3a5c] text-white hover:bg-[#2b5ea7]"
          >
            {triggerLoad.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Carga Inicial (65 Codigos)
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Codigos Cargados"
          value={`${loadedCount}/${totalCount}`}
          icon={BookOpen}
          description="del catalogo legal"
          delay={0}
        />
        <StatCard
          title="Jobs Activos"
          value={runningJobs}
          icon={Briefcase}
          description="en ejecucion"
          delay={100}
        />
        <StatCard
          title="Secciones Programadas"
          value={scheduledSections}
          icon={Calendar}
          description="con cron activo"
          delay={200}
        />
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "border border-[#2b5ea7]/30 bg-[#1a3a5c] text-white"
                : "border border-[rgba(43,94,167,0.1)] bg-[#0d1b2a] text-[#64748b] hover:text-[#94a3b8]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "catalog" && (
        <CatalogTab entries={catalogEntries} isLoading={catalogLoading} />
      )}
      {activeTab === "jobs" && (
        <JobsTab
          jobs={jobs}
          isLoading={jobsLoading}
          page={jobsPage}
          totalPages={jobsData?.totalPages ?? 1}
          onPageChange={setJobsPage}
        />
      )}
      {activeTab === "schedule" && (
        <ScheduleTab
          schedules={scheduleList}
          isLoading={schedulesLoading}
          onTrigger={handleTriggerScrape}
          onToggle={handleToggleSchedule}
          isTriggerPending={triggerScrape.isPending}
          isTogglePending={updateSchedule.isPending}
        />
      )}
    </div>
  );
}

/* ─── Catalog Tab ─── */

function CatalogTab({ entries, isLoading }: { entries: CatalogEntry[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-[rgba(43,94,167,0.12)] bg-[#0d1b2a] p-12 text-center">
        <Globe className="mx-auto mb-3 h-10 w-10 text-[#334155]" />
        <p className="text-sm text-[#64748b]">
          No hay entradas en el catalogo. Ejecuta la carga inicial.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(43,94,167,0.12)] bg-[#0d1b2a]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[rgba(43,94,167,0.1)]">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              Siglas
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              Nombre
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              Prioridad
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              Estado
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
              Chunks
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.abbreviation}
              className="border-b border-[rgba(43,94,167,0.06)] transition-colors hover:bg-[rgba(43,94,167,0.04)]"
            >
              <td className="px-4 py-3">
                <span className="rounded-lg bg-[rgba(43,94,167,0.1)] px-2 py-1 text-xs font-bold text-[#3b82f6]">
                  {entry.abbreviation}
                </span>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm text-[#e2e8f0]">{entry.name}</p>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    priorityColors[entry.priority] ?? "bg-gray-400/10 text-gray-400"
                  }`}
                >
                  P{entry.priority}
                </span>
              </td>
              <td className="px-4 py-3">{catalogStatusBadge(entry)}</td>
              <td className="px-4 py-3 text-right">
                <span className="font-mono text-sm text-[#94a3b8]">
                  {entry.loaded ? entry.totalChunks : "-"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Jobs Tab ─── */

function JobsTab({
  jobs,
  isLoading,
  page,
  totalPages,
  onPageChange,
}: {
  jobs: ScrapingJob[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-[rgba(43,94,167,0.12)] bg-[#0d1b2a] p-12 text-center">
        <Briefcase className="mx-auto mb-3 h-10 w-10 text-[#334155]" />
        <p className="text-sm text-[#64748b]">No hay jobs de scraping registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const cfg = jobStatusConfig[job.status];
        const total = job.documentsFound || 1;
        const progress = Math.round(
          ((job.documentsProcessed + job.documentsFailed) / total) * 100
        );

        return (
          <div
            key={job.id}
            className="rounded-2xl border border-[rgba(43,94,167,0.12)] bg-[#0d1b2a] p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#e2e8f0]">
                  {job.section}
                </span>
                <span className="text-xs text-[#475569]">{job.jobType}</span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.color} ${cfg.dotColor.replace("bg-", "bg-")}/10`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                {cfg.label}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(43,94,167,0.1)]">
                <div
                  className="h-full rounded-full bg-[#3b82f6] transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {/* Counters */}
            <div className="mt-3 flex gap-6 text-xs text-[#64748b]">
              <span>
                Encontrados:{" "}
                <span className="font-semibold text-[#94a3b8]">
                  {job.documentsFound}
                </span>
              </span>
              <span>
                Descargados:{" "}
                <span className="font-semibold text-[#94a3b8]">
                  {job.documentsDownloaded}
                </span>
              </span>
              <span>
                Procesados:{" "}
                <span className="font-semibold text-emerald-400">
                  {job.documentsProcessed}
                </span>
              </span>
              <span>
                Fallidos:{" "}
                <span className="font-semibold text-red-400">
                  {job.documentsFailed}
                </span>
              </span>
            </div>

            {/* Timestamps + error */}
            <div className="mt-2 flex gap-4 text-[11px] text-[#475569]">
              {job.startedAt && (
                <span>
                  Inicio: {new Date(job.startedAt).toLocaleString("es-EC")}
                </span>
              )}
              {job.completedAt && (
                <span>
                  Fin: {new Date(job.completedAt).toLocaleString("es-EC")}
                </span>
              )}
            </div>
            {job.errorMessage && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-400/5 p-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-400">{job.errorMessage}</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            className="text-[#64748b] hover:text-[#e2e8f0]"
          >
            Anterior
          </Button>
          <span className="text-xs text-[#475569]">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            className="text-[#64748b] hover:text-[#e2e8f0]"
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Schedule Tab ─── */

function ScheduleTab({
  schedules,
  isLoading,
  onTrigger,
  onToggle,
  isTriggerPending,
  isTogglePending,
}: {
  schedules: ScrapingSchedule[];
  isLoading: boolean;
  onTrigger: (section: string) => void;
  onToggle: (schedule: ScrapingSchedule) => void;
  isTriggerPending: boolean;
  isTogglePending: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="rounded-2xl border border-[rgba(43,94,167,0.12)] bg-[#0d1b2a] p-12 text-center">
        <Calendar className="mx-auto mb-3 h-10 w-10 text-[#334155]" />
        <p className="text-sm text-[#64748b]">No hay secciones programadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="rounded-2xl border border-[rgba(43,94,167,0.12)] bg-[#0d1b2a] p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#e2e8f0]">
                {schedule.section}
              </p>
              <p className="mt-1 font-mono text-xs text-[#64748b]">
                {schedule.cronExpression}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTrigger(schedule.section)}
                disabled={isTriggerPending}
                className="text-[#3b82f6] hover:bg-[rgba(43,94,167,0.1)] hover:text-[#60a5fa]"
                title="Ejecutar ahora"
              >
                <Play className="h-4 w-4" />
              </Button>
              <button
                onClick={() => onToggle(schedule)}
                disabled={isTogglePending}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  schedule.enabled ? "bg-[#3b82f6]" : "bg-[#1e293b]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    schedule.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-6 text-[11px] text-[#475569]">
            {schedule.lastExecutionAt && (
              <span>
                Ultima ejecucion:{" "}
                <span className="text-[#94a3b8]">
                  {new Date(schedule.lastExecutionAt).toLocaleString("es-EC")}
                </span>
              </span>
            )}
            {schedule.nextExecutionAt && (
              <span>
                Proxima ejecucion:{" "}
                <span className="text-[#94a3b8]">
                  {new Date(schedule.nextExecutionAt).toLocaleString("es-EC")}
                </span>
              </span>
            )}
            {schedule.lastStatus && (
              <span>
                Ultimo estado:{" "}
                <span
                  className={
                    schedule.lastStatus === "COMPLETED"
                      ? "text-emerald-400"
                      : schedule.lastStatus === "FAILED"
                        ? "text-red-400"
                        : "text-[#94a3b8]"
                  }
                >
                  {schedule.lastStatus}
                </span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
