import type {
  User,
  UserRole,
  UserStatus,
  PaginationParams,
  UserFilters,
  PaginatedResult,
} from "@/domain/entities/user";

export interface IUserRepository {
  getAll(
    params: PaginationParams & UserFilters
  ): Promise<PaginatedResult<User>>;
  getById(id: string): Promise<User>;
  updateRole(id: string, role: UserRole): Promise<User>;
  updateStatus(id: string, status: UserStatus): Promise<User>;
}
