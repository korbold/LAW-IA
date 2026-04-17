import apiClient from "@/infrastructure/api/api-client";
import { ENDPOINTS } from "@/infrastructure/api/endpoints";
import type { IUserRepository } from "@/domain/repositories/user-repository";
import type {
  User,
  UserRole,
  UserStatus,
  PaginationParams,
  UserFilters,
  PaginatedResult,
} from "@/domain/entities/user";

export class ApiUserRepository implements IUserRepository {
  async getAll(
    params: PaginationParams & UserFilters
  ): Promise<PaginatedResult<User>> {
    const { data } = await apiClient.get(ENDPOINTS.users, { params });
    return data;
  }

  async getById(id: string): Promise<User> {
    const { data } = await apiClient.get(ENDPOINTS.userDetail(id));
    return data;
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    const { data } = await apiClient.put(ENDPOINTS.userRole(id), { role });
    return data;
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const { data } = await apiClient.put(ENDPOINTS.userStatus(id), { status });
    return data;
  }
}
