import type { SystemHealth } from "@/domain/entities/system-health";

export interface IHealthRepository {
  getHealth(): Promise<SystemHealth>;
}

export class GetSystemHealthUseCase {
  constructor(private repo: IHealthRepository) {}

  execute() {
    return this.repo.getHealth();
  }
}
