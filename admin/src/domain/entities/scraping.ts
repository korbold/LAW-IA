export type JobStatus = "PENDING" | "DOWNLOADING" | "PROCESSING" | "COMPLETED" | "FAILED" | "PAUSED";

export interface ScrapingJob {
  id: string;
  jobType: string;
  section: string;
  status: JobStatus;
  documentsFound: number;
  documentsDownloaded: number;
  documentsProcessed: number;
  documentsFailed: number;
  startedAt: string;
  completedAt: string;
  errorMessage: string;
  createdAt: string;
}

export interface ScrapingSchedule {
  id: string;
  section: string;
  cronExpression: string;
  enabled: boolean;
  lastExecutionAt: string;
  lastStatus: string;
  nextExecutionAt: string;
}

export interface CatalogEntry {
  abbreviation: string;
  name: string;
  priority: number;
  sourceUrl: string;
  loaded: boolean;
  documentId: string | null;
  status: string;
  totalChunks: number;
  loadedAt: string | null;
}

export interface ScrapingStatus {
  runningJobs: number;
  recentJobs: ScrapingJob[];
  schedules: ScrapingSchedule[];
}
