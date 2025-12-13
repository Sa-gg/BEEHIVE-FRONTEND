# Interfaces

Repository and service interfaces (contracts) that define how the core layer interacts with external layers.

## Example:

```typescript
// IUserRepository.ts
import { User } from '../entities/User.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(user: Omit<User, 'id'>): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}
```
