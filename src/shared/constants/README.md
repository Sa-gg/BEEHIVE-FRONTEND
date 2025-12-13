# Constants

Application-wide constants and configuration values.

## Example:

```typescript
// routes.ts
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const;

// api.ts
export const API_ENDPOINTS = {
  USERS: '/users',
  AUTH: '/auth',
  POSTS: '/posts',
} as const;

// app.ts
export const APP_CONFIG = {
  NAME: 'BEEHIVE',
  VERSION: '1.0.0',
  API_TIMEOUT: 10000,
} as const;
```
