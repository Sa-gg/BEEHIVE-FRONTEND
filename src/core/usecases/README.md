# Use Cases

Business logic and application-specific rules. Use cases orchestrate the flow of data between entities and repositories.

## Example:

```typescript
// GetUserUseCase.ts
import { IUserRepository } from '../domain/interfaces/IUserRepository';
import { User } from '../domain/entities/User.entity';

export class GetUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }
}
```
