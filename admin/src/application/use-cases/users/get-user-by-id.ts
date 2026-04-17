import type { IUserRepository } from "@/domain/repositories/user-repository";

export class GetUserByIdUseCase {
  constructor(private repo: IUserRepository) {}

  execute(id: string) {
    return this.repo.getById(id);
  }
}
