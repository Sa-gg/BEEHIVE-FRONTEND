# Services

External services like authentication, logging, analytics, etc.

## Example:

```typescript
// authService.ts
export class AuthService {
  login(email: string, password: string): Promise<string> {
    // Return JWT token
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
```
