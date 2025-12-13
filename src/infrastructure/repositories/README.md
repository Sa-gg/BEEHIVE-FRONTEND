# Repositories

Concrete implementations of repository interfaces. Handle data fetching from APIs.

## Example:

```typescript
// UserRepository.ts
import { IUserRepository } from '../../core/domain/interfaces/IUserRepository';
import { User } from '../../core/domain/entities/User.entity';
import { apiClient } from '../api/apiClient';

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    try {
      const response = await apiClient.get<User>(`/users/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async findAll(): Promise<User[]> {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  }

  async create(user: Omit<User, 'id'>): Promise<User> {
    const response = await apiClient.post<User>('/users', user);
    return response.data;
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}`, user);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }
}
```
