import type { IExportRepository } from "./export-users";

export class ExportChatSessionsUseCase {
  constructor(private repo: IExportRepository) {}

  execute(filters: Record<string, string>) {
    return this.repo.exportChatSessionsCSV(filters);
  }
}
