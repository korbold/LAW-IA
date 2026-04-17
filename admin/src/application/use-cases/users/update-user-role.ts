import type { IUserRepository } from "@/domain/repositories/user-repository";
import type { UserRole } from "@/domain/entities/user";

export class UpdateUserRoleUseCase {
  constructor(private repo: IUserRepository) {}

  execute(id: string, role: UserRole) {
    return this.repo.updateRole(id, role);
  }
}
