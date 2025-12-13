# Custom Hooks

Reusable React hooks for common functionality.

## Examples:

```typescript
// useUser.ts
import { useState, useEffect } from 'react';
import { User } from '../../core/domain/entities/User.entity';
import { GetUserUseCase } from '../../core/usecases/GetUserUseCase';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';

export const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const repository = new UserRepository();
        const useCase = new GetUserUseCase(repository);
        const data = await useCase.execute(userId);
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  return { user, loading, error };
};
```

Other examples:
- useAuth.ts
- useLocalStorage.ts
- useDebounce.ts
- useFetch.ts
