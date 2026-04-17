import type { IUserRepository } from "@/domain/repositories/user-repository";
import type { UserStatus } from "@/domain/entities/user";

export class ToggleUserStatusUseCase {
  constructor(private repo: IUserRepository) {}

  execute(id: string, status: UserStatus) {
    return this.repo.updateStatus(id, status);
  }
}
