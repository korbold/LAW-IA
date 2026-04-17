import type { IUserRepository } from "@/domain/repositories/user-repository";
import type { PaginationParams, UserFilters } from "@/domain/entities/user";

export class GetUsersUseCase {
  constructor(private repo: IUserRepository) {}

  execute(params: PaginationParams & UserFilters) {
    return this.repo.getAll(params);
  }
}
