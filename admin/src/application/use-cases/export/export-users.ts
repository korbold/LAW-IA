import type { UserFilters } from "@/domain/entities/user";

export interface IExportRepository {
  exportUsersCSV(filters: UserFilters): Promise<Blob>;
  exportChatSessionsCSV(filters: Record<string, string>): Promise<Blob>;
}

export class ExportUsersUseCase {
  constructor(private repo: IExportRepository) {}

  execute(filters: UserFilters) {
    return this.repo.exportUsersCSV(filters);
  }
}
